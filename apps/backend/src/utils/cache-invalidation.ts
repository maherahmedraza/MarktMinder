import { cache as redisCache } from '../config/redis.js';
import { logger } from './logger.js';
import { CacheKeys } from './cache.js';

/**
 * Invalidate product cache (product details + price history)
 */
export async function invalidateProduct(productId: string | number): Promise<void> {
    try {
        await Promise.all([
            redisCache.del(CacheKeys.product(productId)),
            redisCache.del(CacheKeys.priceHistory(productId)),
        ]);

        logger.debug('Invalidated product cache', { productId });
    } catch (error) {
        logger.error('Failed to invalidate product cache', { productId, error });
    }
}

/**
 * Invalidate user's alerts cache
 */
export async function invalidateUserAlerts(userId: string | number): Promise<void> {
    try {
        await redisCache.del(CacheKeys.alerts(userId));
        logger.debug('Invalidated alerts cache', { userId });
    } catch (error) {
        logger.error('Failed to invalidate alerts cache', { userId, error });
    }
}

/**
 * Invalidate user's subscription cache
 */
export async function invalidateUserSubscription(userId: string | number): Promise<void> {
    try {
        await redisCache.del(CacheKeys.subscription(userId));
        logger.debug('Invalidated subscription cache', { userId });
    } catch (error) {
        logger.error('Failed to invalidate subscription cache', { userId, error });
    }
}

/**
 * Invalidate user's product list cache (all pages)
 */
export async function invalidateUserProducts(userId: string | number): Promise<void> {
    try {
        // Delete all pages for this user
        await redisCache.delPattern(`products:${userId}:page:*`);
        logger.debug('Invalidated product list cache', { userId });
    } catch (error) {
        logger.error('Failed to invalidate product list cache', { userId, error });
    }
}

/**
 * Invalidate user's deals cache
 */
export async function invalidateUserDeals(userId: string | number): Promise<void> {
    try {
        await redisCache.del(CacheKeys.deals(userId));
        logger.debug('Invalidated deals cache', { userId });
    } catch (error) {
        logger.error('Failed to invalidate deals cache', { userId, error });
    }
}

/**
 * Invalidate multiple cache keys at once
 */
export async function invalidateMultiple(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
        await Promise.all(keys.map(key => redisCache.del(key)));
        logger.debug('Invalidated multiple cache keys', { count: keys.length });
    } catch (error) {
        logger.error('Failed to invalidate multiple keys', { keys, error });
    }
}

/**
 * Invalidate all caches matching a pattern
 */
export async function invalidatePattern(pattern: string): Promise<void> {
    try {
        await redisCache.delPattern(pattern);
        logger.info('Invalidated cache pattern', { pattern });
    } catch (error) {
        logger.error('Failed to invalidate cache pattern', { pattern, error });
    }
}

/**
 * Clear all application caches (emergency use only)
 */
export async function clearAllCaches(): Promise<void> {
    try {
        await invalidatePattern('*');
        logger.warn('Cleared all application caches');
    } catch (error) {
        logger.error('Failed to clear all caches', { error });
    }
}
