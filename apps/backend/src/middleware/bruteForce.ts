/**
 * Brute Force Protection Middleware
 * 
 * Protects authentication endpoints from brute force attacks:
 * - Rate limits login attempts per IP
 * - Slows down responses after multiple failures
 * - Tracks failed attempts in Redis
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

// Keys for tracking in Redis
const FAILED_ATTEMPTS_PREFIX = 'failed_login:';
const BLOCKED_IP_PREFIX = 'blocked_ip:';

// Configuration
const MAX_FAILED_ATTEMPTS = 5;      // Max attempts before temporary block
const BLOCK_DURATION = 15 * 60;     // 15 minutes block
const SLOW_DOWN_AFTER = 3;          // Start slowing after 3 attempts
const SLOW_DOWN_DELAY_MS = 500;     // Add 500ms per attempt

/**
 * Rate limiter specifically for login endpoint
 * More restrictive than general API rate limiter
 */
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window per IP
    message: {
        error: {
            code: 'TOO_MANY_LOGIN_ATTEMPTS',
            message: 'Too many login attempts. Please try again in 15 minutes.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Remove custom keyGenerator to use default which handles IPv6 properly
    validate: { xForwardedForHeader: false },
});

/**
 * Slow down responses after multiple attempts
 * This makes brute force attacks less efficient
 */
export const loginSlowDown = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: SLOW_DOWN_AFTER,
    delayMs: (hits) => hits * SLOW_DOWN_DELAY_MS, // Progressive delay
    maxDelayMs: 10000, // Max 10 second delay
    validate: { xForwardedForHeader: false },
});

/**
 * Check if IP is blocked due to too many failed attempts
 */
export async function checkBlocked(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    try {
        const isBlocked = await redis?.get(`${BLOCKED_IP_PREFIX}${ip}`);

        if (isBlocked) {
            const ttl = await redis?.ttl(`${BLOCKED_IP_PREFIX}${ip}`);
            logger.warn(`Blocked IP attempted login: ${ip}`);

            return res.status(429).json({
                error: {
                    code: 'IP_BLOCKED',
                    message: `Too many failed login attempts. Please try again in ${Math.ceil((ttl || 900) / 60)} minutes.`,
                    retryAfter: ttl || 900,
                },
            });
        }
    } catch (error) {
        // If Redis fails, allow the request (fail open for availability)
        logger.error('Redis error in checkBlocked:', error);
    }

    next();
}

/**
 * Record a failed login attempt
 */
export async function recordFailedAttempt(ip: string, email: string): Promise<number> {
    const key = `${FAILED_ATTEMPTS_PREFIX}${ip}`;

    try {
        // Increment failed attempts
        const attempts = await redis?.incr(key) || 1;

        // Set expiry on first attempt
        if (attempts === 1) {
            await redis?.expire(key, BLOCK_DURATION);
        }

        // Block IP if too many attempts
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            await redis?.setex(`${BLOCKED_IP_PREFIX}${ip}`, BLOCK_DURATION, '1');
            logger.warn(`IP ${ip} blocked after ${attempts} failed login attempts for ${email}`);
        }

        logger.info(`Failed login attempt ${attempts}/${MAX_FAILED_ATTEMPTS} for ${email} from ${ip}`);

        return attempts;
    } catch (error) {
        logger.error('Redis error in recordFailedAttempt:', error);
        return 0;
    }
}

/**
 * Clear failed attempts after successful login
 */
export async function clearFailedAttempts(ip: string): Promise<void> {
    try {
        await redis?.del(`${FAILED_ATTEMPTS_PREFIX}${ip}`);
        await redis?.del(`${BLOCKED_IP_PREFIX}${ip}`);
    } catch (error) {
        logger.error('Redis error in clearFailedAttempts:', error);
    }
}

/**
 * Get remaining login attempts for an IP
 */
export async function getRemainingAttempts(ip: string): Promise<number> {
    try {
        const attempts = await redis?.get(`${FAILED_ATTEMPTS_PREFIX}${ip}`);
        return MAX_FAILED_ATTEMPTS - (parseInt(attempts || '0', 10));
    } catch (error) {
        return MAX_FAILED_ATTEMPTS;
    }
}

// Export combined middleware for easy use
export const bruteForceProtection = [
    loginRateLimiter,
    loginSlowDown,
    checkBlocked,
];
