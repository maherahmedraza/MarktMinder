import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { redis } from '../config/redis.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Rate Limit Tiers
 * Requests per 15 minutes based on subscription tier
 */
const TIER_LIMITS = {
    free: 100,
    pro: 500,
    power: 2000,
    business: 10000,
    admin: 100000, // Admins have very high limits
} as const;

/**
 * Window duration in seconds (15 minutes)
 */
const WINDOW_DURATION = 15 * 60;

/**
 * Cache for user tier lookups (to avoid DB hits on every request)
 */
const tierCache = new Map<string, { tier: string; expiresAt: number }>();
const TIER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user's subscription tier with caching
 */
async function getUserTier(userId: string): Promise<keyof typeof TIER_LIMITS> {
    // Check cache first
    const cached = tierCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.tier as keyof typeof TIER_LIMITS;
    }

    // Fetch from database
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            role: true,
            subscription: {
                select: { tier: true, status: true }
            }
        },
    });

    let tier: keyof typeof TIER_LIMITS = 'free';

    if (user?.role === 'admin') {
        tier = 'admin';
    } else if (user?.subscription?.status === 'active') {
        tier = (user.subscription.tier as keyof typeof TIER_LIMITS) || 'free';
    }

    // Cache the result
    tierCache.set(userId, {
        tier,
        expiresAt: Date.now() + TIER_CACHE_TTL,
    });

    return tier;
}

/**
 * Create rate limiter for each tier
 */
const rateLimiters: Record<string, RateLimiterRedis> = {};

function getRateLimiter(tier: keyof typeof TIER_LIMITS): RateLimiterRedis {
    if (!rateLimiters[tier]) {
        rateLimiters[tier] = new RateLimiterRedis({
            storeClient: redis,
            keyPrefix: `ratelimit:${tier}:`,
            points: TIER_LIMITS[tier],
            duration: WINDOW_DURATION,
            blockDuration: 0, // Don't block, just return 429
        });
    }
    return rateLimiters[tier];
}

/**
 * Tier-based rate limiting middleware
 * Applies different limits based on user subscription
 */
export async function tierRateLimit(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Skip for unauthenticated requests (use global rate limiter)
        if (!req.user) {
            return next();
        }

        const userId = req.user.id;
        const tier = await getUserTier(userId);
        const limiter = getRateLimiter(tier);

        try {
            // Consume 1 point
            const result = await limiter.consume(userId);

            // Add rate limit headers
            res.setHeader('X-RateLimit-Limit', TIER_LIMITS[tier].toString());
            res.setHeader('X-RateLimit-Remaining', result.remainingPoints.toString());
            res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());

            next();
        } catch (rateLimiterRes) {
            // Rate limit exceeded
            const retryAfter = Math.ceil((rateLimiterRes as RateLimiterRes).msBeforeNext / 1000);

            logger.warn('Rate limit exceeded', {
                userId,
                tier,
                limit: TIER_LIMITS[tier],
                path: req.path,
            });

            res.setHeader('X-RateLimit-Limit', TIER_LIMITS[tier].toString());
            res.setHeader('X-RateLimit-Remaining', '0');
            res.setHeader('X-RateLimit-Reset', new Date(Date.now() + (rateLimiterRes as RateLimiterRes).msBeforeNext).toISOString());
            res.setHeader('Retry-After', retryAfter.toString());

            res.status(429).json({
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: `Rate limit exceeded for ${tier} tier. Try again in ${retryAfter} seconds.`,
                    limit: TIER_LIMITS[tier],
                    retryAfter,
                    upgradeUrl: tier === 'free' ? '/pricing' : undefined,
                },
            });
        }
    } catch (error) {
        // If rate limiting fails (Redis down), log and allow request
        logger.error('Rate limiting error', { error, userId: req.user?.id });
        next();
    }
}

/**
 * Clear cached tier for a user (call when subscription changes)
 */
export function clearTierCache(userId: string): void {
    tierCache.delete(userId);
}

export default tierRateLimit;
