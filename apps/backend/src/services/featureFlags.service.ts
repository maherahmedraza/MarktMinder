import { redis } from '../config/redis.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Feature Flags Service
 * 
 * Provides runtime feature toggles for controlled rollouts and A/B testing.
 * Flags are cached in Redis for performance (<5ms lookups).
 */

// Cache TTL: 5 minutes
const CACHE_TTL = 300;
const CACHE_PREFIX = 'feature-flag:';

/**
 * Feature flag definitions with defaults
 */
export const FeatureFlags = {
    // UI Features
    NEW_PRICE_CHART: 'new_price_chart',
    DARK_MODE_V2: 'dark_mode_v2',
    AI_PREDICTIONS: 'ai_predictions',

    // Backend Features
    ENHANCED_CACHING: 'enhanced_caching',
    RATE_LIMIT_V2: 'rate_limit_v2',
    WEBHOOK_RETRIES: 'webhook_retries',

    // Experimental
    ML_PRICE_FORECAST: 'ml_price_forecast',
    COMPETITOR_TRACKING: 'competitor_tracking',
    MULTI_MARKETPLACE: 'multi_marketplace',
} as const;

type FeatureFlagName = typeof FeatureFlags[keyof typeof FeatureFlags];

/**
 * Default flag states (all false unless enabled)
 */
const defaultFlags: Record<string, boolean> = {
    [FeatureFlags.NEW_PRICE_CHART]: false,
    [FeatureFlags.DARK_MODE_V2]: false,
    [FeatureFlags.AI_PREDICTIONS]: false,
    [FeatureFlags.ENHANCED_CACHING]: true, // Already implemented
    [FeatureFlags.RATE_LIMIT_V2]: true, // Already implemented
    [FeatureFlags.WEBHOOK_RETRIES]: false,
    [FeatureFlags.ML_PRICE_FORECAST]: false,
    [FeatureFlags.COMPETITOR_TRACKING]: false,
    [FeatureFlags.MULTI_MARKETPLACE]: false,
};

/**
 * Percentage rollout configuration (0-100)
 */
const rolloutPercentages: Record<string, number> = {
    [FeatureFlags.NEW_PRICE_CHART]: 0, // 0% - disabled
    [FeatureFlags.AI_PREDICTIONS]: 0,
    [FeatureFlags.ML_PRICE_FORECAST]: 0,
};

/**
 * User tier overrides (always enable for certain tiers)
 */
const tierOverrides: Record<string, string[]> = {
    [FeatureFlags.AI_PREDICTIONS]: ['pro', 'power', 'business'],
    [FeatureFlags.ML_PRICE_FORECAST]: ['power', 'business'],
    [FeatureFlags.COMPETITOR_TRACKING]: ['business'],
};

/**
 * Check if a feature flag is enabled for a user
 */
export async function isEnabled(
    flagName: FeatureFlagName,
    userId?: string
): Promise<boolean> {
    try {
        // Check cache first
        const cached = await redis.get(`${CACHE_PREFIX}${flagName}:${userId || 'global'}`);
        if (cached !== null) {
            return cached === 'true';
        }

        // Get default value
        let enabled = defaultFlags[flagName] ?? false;

        // Check tier overrides if user provided
        if (userId && tierOverrides[flagName]) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    subscription: {
                        select: { tier: true }
                    }
                }
            });

            if (user?.subscription?.tier && tierOverrides[flagName].includes(user.subscription.tier)) {
                enabled = true;
            }
        }

        // Check percentage rollout
        if (!enabled && userId && rolloutPercentages[flagName] > 0) {
            const hash = simpleHash(userId + flagName);
            enabled = (hash % 100) < rolloutPercentages[flagName];
        }

        // Cache result
        await redis.setex(
            `${CACHE_PREFIX}${flagName}:${userId || 'global'}`,
            CACHE_TTL,
            enabled.toString()
        );

        return enabled;
    } catch (error) {
        logger.error('Feature flag check failed, using default', { flagName, error });
        return defaultFlags[flagName] ?? false;
    }
}

/**
 * Get all feature flags for a user (for frontend)
 */
export async function getAllFlags(userId?: string): Promise<Record<string, boolean>> {
    const flags: Record<string, boolean> = {};

    for (const flagName of Object.values(FeatureFlags)) {
        flags[flagName] = await isEnabled(flagName, userId);
    }

    return flags;
}

/**
 * Clear feature flag cache (call when settings change)
 */
export async function clearCache(flagName?: string, userId?: string): Promise<void> {
    try {
        if (flagName && userId) {
            await redis.del(`${CACHE_PREFIX}${flagName}:${userId}`);
        } else if (flagName) {
            // Clear all users for this flag
            const keys = await redis.keys(`${CACHE_PREFIX}${flagName}:*`);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } else {
            // Clear all flags
            const keys = await redis.keys(`${CACHE_PREFIX}*`);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        }
    } catch (error) {
        logger.error('Failed to clear feature flag cache', { flagName, userId, error });
    }
}

/**
 * Simple hash function for consistent percentage rollouts
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

export default {
    FeatureFlags,
    isEnabled,
    getAllFlags,
    clearCache,
};
