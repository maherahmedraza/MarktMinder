import Redis from 'ioredis';
import config from './index.js';
import { logger } from '../utils/logger.js';

// Create Redis client
const redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
        if (times > 3) {
            logger.error('Redis connection failed after 3 retries');
            return null;
        }
        return Math.min(times * 200, 2000);
    },
});

redis.on('connect', () => {
    logger.info('Redis connected');
});

redis.on('error', (err) => {
    logger.error('Redis error:', err);
});

redis.on('close', () => {
    logger.warn('Redis connection closed');
});

/**
 * Cache helper functions
 */
export const cache = {
    /**
     * Get a value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await redis.get(key);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch (error) {
            logger.error('Cache get error:', { key, error });
            return null;
        }
    },

    /**
     * Set a value in cache with optional TTL (in seconds)
     */
    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await redis.setex(key, ttlSeconds, serialized);
            } else {
                await redis.set(key, serialized);
            }
        } catch (error) {
            logger.error('Cache set error:', { key, error });
        }
    },

    /**
     * Delete a key from cache
     */
    async del(key: string): Promise<void> {
        try {
            await redis.del(key);
        } catch (error) {
            logger.error('Cache delete error:', { key, error });
        }
    },

    /**
     * Delete all keys matching a pattern
     */
    async delPattern(pattern: string): Promise<void> {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } catch (error) {
            logger.error('Cache delete pattern error:', { pattern, error });
        }
    },

    /**
     * Check if a key exists
     */
    async exists(key: string): Promise<boolean> {
        try {
            return (await redis.exists(key)) === 1;
        } catch (error) {
            logger.error('Cache exists error:', { key, error });
            return false;
        }
    },

    /**
     * Increment a counter
     */
    async incr(key: string): Promise<number> {
        return redis.incr(key);
    },

    /**
     * Set expiration on a key
     */
    async expire(key: string, seconds: number): Promise<void> {
        await redis.expire(key, seconds);
    },
};

/**
 * Check Redis connection health
 */
export async function checkHealth(): Promise<boolean> {
    try {
        const pong = await redis.ping();
        return pong === 'PONG';
    } catch {
        return false;
    }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
    await redis.quit();
    logger.info('Redis connection closed');
}

export { redis };
export default { redis, cache, checkHealth, closeRedis };
