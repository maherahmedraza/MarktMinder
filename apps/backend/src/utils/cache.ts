import { cache as redisCache } from '../config/redis.js';
import { logger } from './logger.js';

/**
 * Cache key prefixes for consistent naming
 */
export const CacheKeys = {
    product: (id: string | number) => `product:${id}`,
    priceHistory: (productId: string | number) => `price-history:${productId}`,
    subscription: (userId: string | number) => `subscription:${userId}`,
    alerts: (userId: string | number) => `alerts:${userId}`,
    productList: (userId: string | number, page: number = 1) => `products:${userId}:page:${page}`,
    deals: (userId: string | number) => `deals:${userId}`,
} as const;

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
    product: 300,           // 5 minutes
    priceHistory: 600,      // 10 minutes
    subscription: 3600,     // 1 hour
    alerts: 120,            // 2 minutes
    productList: 60,        // 1 minute
    deals: 180,             // 3 minutes
} as const;

/**
 * Cache metrics for monitoring
 */
const metrics = {
    hits: 0,
    misses: 0,
    errors: 0,
};

/**
 * Get cache hit rate
 */
export function getCacheStats() {
    const total = metrics.hits + metrics.misses;
    const hitRate = total > 0 ? (metrics.hits / total) * 100 : 0;

    return {
        hits: metrics.hits,
        misses: metrics.misses,
        errors: metrics.errors,
        total,
        hitRate: hitRate.toFixed(2) + '%',
    };
}

/**
 * Reset cache metrics
 */
export function resetCacheStats() {
    metrics.hits = 0;
    metrics.misses = 0;
    metrics.errors = 0;
}

/**
 * Cache-aside pattern wrapper
 * 
 * @template T The type of data to cache
 * @param key Cache key
 * @param fetchFn Function to fetch data if cache miss
 * @param ttl Time to live in seconds
 * @param options Additional options
 * @returns Cached or freshly fetched data
 * 
 * @example
 * const product = await cacheWrapper(
 *   CacheKeys.product(id),
 *   () => prisma.product.findUnique({ where: { id } }),
 *   CacheTTL.product
 * );
 */
export async function cacheWrapper<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number,
    options: {
        skipCache?: boolean;
        logMisses?: boolean;
    } = {}
): Promise<T> {
    const { skipCache = false, logMisses = false } = options;

    // Skip cache if requested (useful for testing or forcing fresh data)
    if (skipCache) {
        const data = await fetchFn();
        return data;
    }

    try {
        // Try to get from cache
        const cached = await redisCache.get<T>(key);

        if (cached !== null) {
            metrics.hits++;
            logger.debug('Cache hit', { key });
            return cached;
        }

        // Cache miss - fetch from source
        metrics.misses++;
        if (logMisses) {
            logger.debug('Cache miss', { key });
        }

        const data = await fetchFn();

        // Store in cache (fire-and-forget, don't block on cache write)
        redisCache.set(key, data, ttl).catch(error => {
            metrics.errors++;
            logger.error('Cache write failed', { key, error });
        });

        return data;
    } catch (error) {
        metrics.errors++;
        logger.error('Cache error, falling back to source', { key, error });

        // Graceful degradation - return fresh data on cache error
        return fetchFn();
    }
}

/**
 * Wrapper for multiple cache operations with Promise.all
 * 
 * @example
 * const [products, alerts] = await cacheMultiple([
 *   { key: CacheKeys.productList(userId), fn: () => getProducts(), ttl: CacheTTL.productList },
 *   { key: CacheKeys.alerts(userId), fn: () => getAlerts(), ttl: CacheTTL.alerts }
 * ]);
 */
export async function cacheMultiple<T extends any[]>(
    operations: Array<{
        key: string;
        fn: () => Promise<any>;
        ttl: number;
        skipCache?: boolean;
    }>
): Promise<T> {
    const results = await Promise.all(
        operations.map(op =>
            cacheWrapper(op.key, op.fn, op.ttl, { skipCache: op.skipCache })
        )
    );

    return results as T;
}

/**
 * Conditional cache - only cache if condition is met
 * 
 * @example
 * // Only cache if product is public
 * const product = await conditionalCache(
 *   CacheKeys.product(id),
 *   () => getProduct(id),
 *   CacheTTL.product,
 *   (data) => data.isPublic === true
 * );
 */
export async function conditionalCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number,
    shouldCache: (data: T) => boolean
): Promise<T> {
    // Try cache first
    try {
        const cached = await redisCache.get<T>(key);
        if (cached !== null) {
            metrics.hits++;
            return cached;
        }
    } catch (error) {
        logger.error('Cache read error', { key, error });
    }

    // Fetch data
    metrics.misses++;
    const data = await fetchFn();

    // Only cache if condition is met
    if (shouldCache(data)) {
        redisCache.set(key, data, ttl).catch(error => {
            metrics.errors++;
            logger.error('Cache write failed', { key, error });
        });
    }

    return data;
}
