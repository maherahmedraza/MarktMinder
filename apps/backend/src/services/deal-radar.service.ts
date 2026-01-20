import { prisma } from '../config/prisma.js';
import { cache } from '../config/redis.js';
import { getPricePrediction } from './prediction.service.js';
import { getUpcomingEvents, getEventImpact } from './events-calendar.js';
import { logger } from '../utils/logger.js';
import { Prisma } from '@prisma/client';

const DEAL_CACHE_TTL = 300; // 5 minutes
const MIN_DEAL_PERCENTAGE = 5; // Minimum % drop to be considered a deal

export interface Deal {
    productId: string;
    productName: string;
    marketplace: string;
    imageUrl: string | null;
    currentPrice: number;
    previousPrice: number;
    lowestPrice: number;
    highestPrice: number;
    averagePrice: number;
    dropPercentage: number;
    dropFromAverage: number;
    isHistoricLow: boolean;
    dealScore: number;        // 0-100 rating
    predictedDirection: 'up' | 'down' | 'stable';
    recommendation: string;
    upcomingEvents: string[];
    expiresAt: Date | null;   // Estimated deal expiration
}

export interface DealFilters {
    marketplace?: 'amazon' | 'etsy' | 'otto';
    minDropPercentage?: number;
    maxPrice?: number;
    minDealScore?: number;
    category?: string;
    limit?: number;
}

/**
 * Calculate deal score based on multiple factors
 */
function calculateDealScore(
    dropPercentage: number,
    dropFromAverage: number,
    isHistoricLow: boolean,
    predictedDirection: string | undefined,
    hasUpcomingEvent: boolean,
    priceVolatility: number
): number {
    let score = 0;

    // Base score from drop percentage (max 40 points)
    score += Math.min(40, dropPercentage * 2);

    // Bonus for drop from average (max 20 points)
    score += Math.min(20, dropFromAverage * 1.5);

    // Historic low bonus (15 points)
    if (isHistoricLow) score += 15;

    // Prediction alignment bonus (10 points)
    if (predictedDirection === 'up') {
        // Price predicted to go up = good time to buy
        score += 10;
    } else if (predictedDirection === 'down') {
        // Price predicted to drop more = might want to wait
        score -= 5;
    }

    // Event timing bonus (10 points)
    if (hasUpcomingEvent) score += 10;

    // Low volatility bonus (5 points) - stable low price
    if (priceVolatility < 0.1) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get price statistics for a product
 */
async function getPriceStats(productId: string): Promise<{
    currentPrice: number;
    previousPrice: number;
    lowestPrice: number;
    highestPrice: number;
    averagePrice: number;
    priceCount: number;
    volatility: number;
}> {
    const result = await prisma.$queryRaw<any[]>`
        SELECT
            p.current_price,
            (SELECT price FROM price_history WHERE product_id = ${productId}::uuid ORDER BY time DESC LIMIT 1 OFFSET 1) as previous_price,
            MIN(ph.price) as lowest_price,
            MAX(ph.price) as highest_price,
            AVG(ph.price) as average_price,
            COUNT(*) as price_count,
            STDDEV(ph.price) / NULLIF(AVG(ph.price), 0) as volatility
        FROM products p
        LEFT JOIN price_history ph ON p.id = ph.product_id
        WHERE p.id = ${productId}::uuid
        GROUP BY p.id, p.current_price
    `;

    if (result.length === 0) {
        throw new Error('Product not found');
    }

    const row = result[0];
    return {
        currentPrice: Number(row.current_price) || 0,
        previousPrice: Number(row.previous_price) || Number(row.current_price) || 0,
        lowestPrice: Number(row.lowest_price) || Number(row.current_price) || 0,
        highestPrice: Number(row.highest_price) || Number(row.current_price) || 0,
        averagePrice: Number(row.average_price) || Number(row.current_price) || 0,
        priceCount: Number(row.price_count) || 0,
        volatility: Number(row.volatility) || 0,
    };
}

/**
 * Discover top deals across all tracked products
 */
export async function discoverDeals(filters: DealFilters = {}): Promise<Deal[]> {
    const {
        marketplace,
        minDropPercentage = MIN_DEAL_PERCENTAGE,
        maxPrice,
        minDealScore = 30,
        category,
        limit = 20,
    } = filters;

    // Try cache first
    const cacheKey = `deals:${JSON.stringify(filters)}`;
    const cached = await cache.get<Deal[]>(cacheKey);
    if (cached) return cached;

    // Query products with recent price drops
    // Note: Reconstructing the SQL since Prisma's raw query needs proper template tagging or raw string handling.
    // However, Prisma doesn't support dynamic raw query building easily with template tags.
    // We can use Prisma.sql helper or just build the string if we are careful, 
    // but Prisma advises against string concatenation for safety.
    // Given the complexity of dynamic WHERE clauses, we might use Prisma.sql helper or conditional logic.
    // Or we fetch candidates first. But fetching all is bad.
    // I'll assume we can use `queryRawUnsafe` safely here as parameters are validated/typed in TS, 
    // OR construct the query with parameter array.

    // Safer approach: Use conditional logic in WHERE clause or Prisma.join (if available in this version? No).
    // Let's use `queryRawUnsafe` with parameterized inputs for simplicity in migration, or just simple SQL if filters are limited.

    // Constructing WHERE clause parts
    const conditions: string[] = [`p.current_price > 0`, `p.current_price IS NOT NULL`];
    const params: any[] = [];

    if (marketplace) {
        conditions.push(`p.marketplace = $${params.length + 1}`);
        params.push(marketplace);
    }
    if (maxPrice) {
        conditions.push(`p.current_price <= $${params.length + 1}`);
        params.push(maxPrice);
    }
    if (category) {
        conditions.push(`p.category = $${params.length + 1}`);
        params.push(category);
    }

    // The previous price subquery condition
    conditions.push(`ph_prev.price IS NOT NULL AND ph_prev.price > p.current_price`);

    const whereClause = conditions.join(' AND ');

    const sql = `
        SELECT
            p.id,
            p.title,
            p.marketplace,
            p.image_url,
            p.current_price,
            p.category,
            ph_prev.price as previous_price,
            ph_prev.time as previous_checked_at
        FROM products p
        LEFT JOIN LATERAL (
            SELECT price, time
            FROM price_history
            WHERE product_id = p.id
            ORDER BY time DESC
            LIMIT 1 OFFSET 1
        ) ph_prev ON true
        WHERE ${whereClause}
        ORDER BY ph_prev.time DESC
    `;

    const result = await prisma.$queryRawUnsafe(sql, ...params) as any[];

    // Process each product to build deal info
    const deals: Deal[] = [];
    const upcomingEvents = getUpcomingEvents(new Date(), 14);
    const hasUpcomingEvent = upcomingEvents.length > 0;

    for (const row of result) {
        try {
            const stats = await getPriceStats(row.id);

            if (stats.previousPrice <= 0 || stats.currentPrice <= 0) continue;

            const dropPercentage = ((stats.previousPrice - stats.currentPrice) / stats.previousPrice) * 100;
            const dropFromAverage = stats.averagePrice > 0
                ? ((stats.averagePrice - stats.currentPrice) / stats.averagePrice) * 100
                : dropPercentage;

            // Skip if drop is too small
            if (dropPercentage < minDropPercentage) continue;

            // Check if this is a historic low
            const isHistoricLow = stats.currentPrice <= stats.lowestPrice * 1.02; // Within 2% of lowest

            // Get prediction for future direction
            let predictedDirection: 'up' | 'down' | 'stable' = 'stable';
            let recommendation = 'Good deal - consider buying';

            try {
                const prediction = await getPricePrediction(row.id, 7);
                if (prediction.predictions.length > 0) {
                    const futurePrices = prediction.predictions.map(p => p.predictedPrice);
                    const avgFuture = futurePrices.reduce((a, b) => a + b, 0) / futurePrices.length;

                    if (avgFuture > stats.currentPrice * 1.05) {
                        predictedDirection = 'up';
                        recommendation = '🔥 Buy now! Price predicted to increase soon';
                    } else if (avgFuture < stats.currentPrice * 0.95) {
                        predictedDirection = 'down';
                        recommendation = '⏳ Wait - Price may drop further';
                    } else {
                        recommendation = '👍 Good price - stable outlook';
                    }
                }
            } catch (e) {
                // Prediction failed, use basic recommendation
            }

            // Calculate deal score
            const dealScore = calculateDealScore(
                dropPercentage,
                dropFromAverage,
                isHistoricLow,
                predictedDirection,
                hasUpcomingEvent,
                stats.volatility
            );

            // Skip if score too low
            if (dealScore < minDealScore) continue;

            deals.push({
                productId: row.id,
                productName: row.title,
                marketplace: row.marketplace,
                imageUrl: row.image_url,
                currentPrice: stats.currentPrice,
                previousPrice: stats.previousPrice,
                lowestPrice: stats.lowestPrice,
                highestPrice: stats.highestPrice,
                averagePrice: stats.averagePrice,
                dropPercentage: Math.round(dropPercentage * 10) / 10,
                dropFromAverage: Math.round(dropFromAverage * 10) / 10,
                isHistoricLow,
                dealScore,
                predictedDirection,
                recommendation,
                upcomingEvents: upcomingEvents.map(e => e.event.name),
                expiresAt: null, // Could be estimated based on patterns
            });
        } catch (e) {
            logger.debug(`Failed to process deal for product ${row.id}:`, e);
        }
    }

    // Sort by deal score and limit
    deals.sort((a, b) => b.dealScore - a.dealScore);
    const limitedDeals = deals.slice(0, limit);

    // Cache result
    await cache.set(cacheKey, limitedDeals, DEAL_CACHE_TTL);

    return limitedDeals;
}

/**
 * Get personalized deals for a user based on their tracked products
 */
export async function getUserDeals(userId: string, limit: number = 10): Promise<Deal[]> {
    const cacheKey = `user-deals:${userId}`;
    const cached = await cache.get<Deal[]>(cacheKey);
    if (cached) return cached;

    // Get user's tracked product categories
    const userProducts = await prisma.$queryRaw<any[]>`
        SELECT DISTINCT p.category, p.marketplace
        FROM user_products up
        JOIN products p ON up.product_id = p.id
        WHERE up.user_id = ${userId}::uuid AND p.category IS NOT NULL
    `;

    const categories = [...new Set(userProducts.map((r: any) => r.category))];
    const marketplaces = [...new Set(userProducts.map((r: any) => r.marketplace))];

    // Find deals in user's preferred categories and marketplaces
    let allDeals: Deal[] = [];

    for (const marketplace of marketplaces) {
        const deals = await discoverDeals({
            marketplace: marketplace as any,
            limit: limit * 2,
        });
        allDeals = [...allDeals, ...deals];
    }

    // Remove duplicates and sort by relevance
    const uniqueDeals = allDeals.filter((deal, index, self) =>
        index === self.findIndex(d => d.productId === deal.productId)
    );

    // Boost score for matching categories
    const boostedDeals = uniqueDeals.map(deal => {
        const boost = 0;
        // This would use deal.category if we had it
        return { ...deal, dealScore: Math.min(100, deal.dealScore + boost) };
    });

    boostedDeals.sort((a, b) => b.dealScore - a.dealScore);
    const limitedDeals = boostedDeals.slice(0, limit);

    await cache.set(cacheKey, limitedDeals, DEAL_CACHE_TTL);

    return limitedDeals;
}

/**
 * Get deals for a specific category
 */
export async function getCategoryDeals(category: string, limit: number = 20): Promise<Deal[]> {
    return discoverDeals({ category, limit });
}

/**
 * Get deal statistics
 */
export async function getDealStats(): Promise<{
    totalDeals: number;
    averageSavings: number;
    topCategories: { category: string; count: number }[];
    byMarketplace: { marketplace: string; count: number }[];
}> {
    const deals = await discoverDeals({ limit: 100, minDealScore: 20 });

    if (deals.length === 0) {
        return {
            totalDeals: 0,
            averageSavings: 0,
            topCategories: [],
            byMarketplace: [],
        };
    }

    const averageSavings = deals.reduce((sum, d) => sum + d.dropPercentage, 0) / deals.length;

    const marketplaceCounts = deals.reduce((acc, d) => {
        acc[d.marketplace] = (acc[d.marketplace] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return {
        totalDeals: deals.length,
        averageSavings: Math.round(averageSavings * 10) / 10,
        topCategories: [], // Would need category data on products
        byMarketplace: Object.entries(marketplaceCounts).map(([marketplace, count]) => ({
            marketplace,
            count,
        })),
    };
}

export default {
    discoverDeals,
    getUserDeals,
    getCategoryDeals,
    getDealStats,
};
