/**
 * AI Shopping Assistant Service
 * 
 * Provides intelligent buy/wait recommendations by combining:
 * - Price prediction trends
 * - Discount authenticity analysis
 * - Upcoming shopping events calendar
 * - Historical price patterns
 */

import { query } from '../config/database.js';
import { cache } from '../config/redis.js';
import { getPricePrediction, getBestBuyingWindowsForProduct } from './prediction.service.js';
import discountAnalysis from './discount-analysis.service.js';
import { getUpcomingEvents, getEventImpact, ShoppingEvent } from './events-calendar.js';
import { logger } from '../utils/logger.js';

const ASSISTANT_CACHE_TTL = 1800; // 30 minutes

export interface BuyWaitRecommendation {
    productId: string;
    productName: string;
    currentPrice: number;
    marketplace: string;

    // Core recommendation
    recommendation: 'BUY_NOW' | 'WAIT' | 'CONSIDER_WAITING' | 'STRONG_BUY';
    confidenceScore: number; // 0-100

    // Reasoning
    primaryReason: string;
    factors: RecommendationFactor[];

    // Timing insights
    optimalBuyWindow: {
        startDate: Date;
        endDate: Date;
        eventName?: string;
        expectedDiscount: number;
    } | null;

    // Price context
    priceContext: {
        isAtHistoricalLow: boolean;
        percentFromLow: number;
        percentFromHigh: number;
        trend: 'rising' | 'falling' | 'stable';
        volatility: 'low' | 'medium' | 'high';
    };

    // Trust assessment
    discountTrust: {
        trustLevel: 'genuine' | 'suspicious' | 'likely_fake';
        trustScore: number;
        warnings: string[];
    };

    // Upcoming opportunities
    upcomingEvents: {
        name: string;
        daysUntil: number;
        expectedDiscount: number;
    }[];

    analyzedAt: Date;
}

interface RecommendationFactor {
    type: 'price_trend' | 'event_timing' | 'discount_trust' | 'historical_pattern' | 'volatility';
    signal: 'buy' | 'wait' | 'neutral';
    weight: number; // 0-1
    description: string;
}

/**
 * Get AI-powered buy/wait recommendation for a product
 */
export async function getBuyWaitRecommendation(productId: string): Promise<BuyWaitRecommendation> {
    const cacheKey = `shopping-assistant:${productId}`;

    // Check cache
    const cached = await cache.get<string>(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    try {
        // Fetch product details
        const productResult = await query(
            `SELECT p.*, 
                    (SELECT price FROM price_history WHERE product_id = p.id ORDER BY recorded_at DESC LIMIT 1) as latest_price
             FROM products p WHERE p.id = $1`,
            [productId]
        );

        if (productResult.rows.length === 0) {
            throw new Error(`Product not found: ${productId}`);
        }

        const product = productResult.rows[0];
        const currentPrice = product.latest_price || product.current_price || 0;
        const marketplace = product.marketplace || 'amazon';

        // Gather intelligence from multiple services
        const [prediction, discountInfo, buyingWindows, priceStats] = await Promise.all([
            getPricePrediction(productId, 30, marketplace).catch(() => null),
            discountAnalysis.analyzeDiscount(productId, currentPrice, product.original_price).catch(() => null),
            getBestBuyingWindowsForProduct(productId).catch(() => []),
            getProductPriceStats(productId),
        ]);

        // Get upcoming events
        const upcomingEvents = getUpcomingEvents(new Date(), 60, marketplace);

        // Analyze factors
        const factors = analyzeFactors(currentPrice, prediction, discountInfo, upcomingEvents, priceStats, buyingWindows);

        // Calculate weighted recommendation
        const { recommendation, confidenceScore, primaryReason } = calculateRecommendation(factors);

        // Find optimal buy window
        const optimalBuyWindow = findOptimalBuyWindow(upcomingEvents, buyingWindows, prediction);

        // Build price context
        const priceContext = buildPriceContext(currentPrice, priceStats, prediction);

        // Build discount trust info
        const discountTrust = buildDiscountTrust(discountInfo);

        const result: BuyWaitRecommendation = {
            productId,
            productName: product.name || product.title || 'Unknown Product',
            currentPrice,
            marketplace,
            recommendation,
            confidenceScore,
            primaryReason,
            factors,
            optimalBuyWindow,
            priceContext,
            discountTrust,
            upcomingEvents: upcomingEvents.slice(0, 3).map(e => ({
                name: e.event.name,
                daysUntil: e.daysUntil,
                expectedDiscount: e.event.impactScore,
            })),
            analyzedAt: new Date(),
        };

        // Cache result
        await cache.set(cacheKey, JSON.stringify(result), ASSISTANT_CACHE_TTL);

        return result;
    } catch (error) {
        logger.error('Shopping assistant error:', error);
        throw error;
    }
}

/**
 * Get price statistics for a product
 */
async function getProductPriceStats(productId: string): Promise<{
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    recordCount: number;
    daysSinceLowest: number | null;
}> {
    const result = await query(
        `SELECT 
            MIN(price) as min_price,
            MAX(price) as max_price,
            AVG(price) as avg_price,
            COUNT(*) as record_count,
            (SELECT recorded_at FROM price_history WHERE product_id = $1 ORDER BY price ASC LIMIT 1) as lowest_date
         FROM price_history WHERE product_id = $1`,
        [productId]
    );

    const row = result.rows[0];
    const daysSinceLowest = row.lowest_date
        ? Math.floor((Date.now() - new Date(row.lowest_date).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    return {
        minPrice: parseFloat(row.min_price) || 0,
        maxPrice: parseFloat(row.max_price) || 0,
        avgPrice: parseFloat(row.avg_price) || 0,
        recordCount: parseInt(row.record_count) || 0,
        daysSinceLowest,
    };
}

/**
 * Analyze all factors that influence buy/wait decision
 */
function analyzeFactors(
    currentPrice: number,
    prediction: any | null,
    discountInfo: any | null,
    upcomingEvents: any[],
    priceStats: any,
    buyingWindows: any[]
): RecommendationFactor[] {
    const factors: RecommendationFactor[] = [];

    // Factor 1: Price Trend
    if (prediction) {
        const trendDirection = prediction.trend?.direction || 'stable';
        const trendStrength = Math.abs(prediction.trend?.strength || 0);

        if (trendDirection === 'falling' && trendStrength > 0.5) {
            factors.push({
                type: 'price_trend',
                signal: 'wait',
                weight: 0.25,
                description: `Price is trending downward (${(trendStrength * 100).toFixed(0)}% confidence)`,
            });
        } else if (trendDirection === 'rising' && trendStrength > 0.3) {
            factors.push({
                type: 'price_trend',
                signal: 'buy',
                weight: 0.2,
                description: `Price is trending upward - buy before further increases`,
            });
        } else {
            factors.push({
                type: 'price_trend',
                signal: 'neutral',
                weight: 0.1,
                description: 'Price is relatively stable',
            });
        }
    }

    // Factor 2: Upcoming Events
    const nearbyEvent = upcomingEvents.find(e => e.daysUntil <= 14 && e.event.impactScore >= 25);
    if (nearbyEvent) {
        factors.push({
            type: 'event_timing',
            signal: 'wait',
            weight: 0.35,
            description: `${nearbyEvent.event.name} in ${nearbyEvent.daysUntil} days (avg ${nearbyEvent.event.impactScore}% off)`,
        });
    } else if (upcomingEvents.length === 0 || upcomingEvents[0]?.daysUntil > 45) {
        factors.push({
            type: 'event_timing',
            signal: 'buy',
            weight: 0.15,
            description: 'No major sales events in the near future',
        });
    }

    // Factor 3: Discount Trust
    if (discountInfo) {
        if (discountInfo.trustLevel === 'likely_fake') {
            factors.push({
                type: 'discount_trust',
                signal: 'wait',
                weight: 0.3,
                description: `Current discount appears manipulated (trust score: ${discountInfo.trustScore}/100)`,
            });
        } else if (discountInfo.trustLevel === 'genuine' && discountInfo.actualDiscount > 15) {
            factors.push({
                type: 'discount_trust',
                signal: 'buy',
                weight: 0.25,
                description: `Genuine ${discountInfo.actualDiscount.toFixed(0)}% discount verified`,
            });
        }
    }

    // Factor 4: Historical Low
    if (priceStats && priceStats.minPrice > 0) {
        const percentFromLow = ((currentPrice - priceStats.minPrice) / priceStats.minPrice) * 100;

        if (percentFromLow <= 5) {
            factors.push({
                type: 'historical_pattern',
                signal: 'buy',
                weight: 0.4,
                description: `Price is at or near historical low (within ${percentFromLow.toFixed(0)}%)`,
            });
        } else if (percentFromLow >= 30) {
            factors.push({
                type: 'historical_pattern',
                signal: 'wait',
                weight: 0.2,
                description: `Price is ${percentFromLow.toFixed(0)}% above historical low`,
            });
        }
    }

    // Factor 5: Volatility
    if (prediction?.volatility !== undefined) {
        const vol = prediction.volatility;
        if (vol > 0.15) {
            factors.push({
                type: 'volatility',
                signal: 'wait',
                weight: 0.15,
                description: 'High price volatility - better deals likely to appear',
            });
        } else if (vol < 0.05) {
            factors.push({
                type: 'volatility',
                signal: 'neutral',
                weight: 0.05,
                description: 'Low volatility - price is stable',
            });
        }
    }

    return factors;
}

/**
 * Calculate final recommendation from weighted factors
 */
function calculateRecommendation(factors: RecommendationFactor[]): {
    recommendation: BuyWaitRecommendation['recommendation'];
    confidenceScore: number;
    primaryReason: string;
} {
    let buyScore = 0;
    let waitScore = 0;
    let totalWeight = 0;
    let primaryFactor: RecommendationFactor | null = null;

    for (const factor of factors) {
        totalWeight += factor.weight;

        if (factor.signal === 'buy') {
            buyScore += factor.weight;
            if (!primaryFactor || factor.weight > primaryFactor.weight) {
                primaryFactor = factor;
            }
        } else if (factor.signal === 'wait') {
            waitScore += factor.weight;
            if (!primaryFactor || factor.weight > primaryFactor.weight) {
                primaryFactor = factor;
            }
        }
    }

    // Normalize scores
    const normalizedBuy = totalWeight > 0 ? buyScore / totalWeight : 0;
    const normalizedWait = totalWeight > 0 ? waitScore / totalWeight : 0;
    const scoreDiff = normalizedBuy - normalizedWait;

    let recommendation: BuyWaitRecommendation['recommendation'];
    let confidenceScore: number;

    if (scoreDiff >= 0.4) {
        recommendation = 'STRONG_BUY';
        confidenceScore = Math.min(95, 60 + scoreDiff * 70);
    } else if (scoreDiff >= 0.15) {
        recommendation = 'BUY_NOW';
        confidenceScore = Math.min(85, 50 + scoreDiff * 60);
    } else if (scoreDiff <= -0.25) {
        recommendation = 'WAIT';
        confidenceScore = Math.min(90, 55 + Math.abs(scoreDiff) * 65);
    } else {
        recommendation = 'CONSIDER_WAITING';
        confidenceScore = 40 + Math.abs(scoreDiff) * 30;
    }

    return {
        recommendation,
        confidenceScore: Math.round(confidenceScore),
        primaryReason: primaryFactor?.description || 'Based on overall market analysis',
    };
}

/**
 * Find the optimal buying window
 */
function findOptimalBuyWindow(
    upcomingEvents: any[],
    buyingWindows: any[],
    prediction: any | null
): BuyWaitRecommendation['optimalBuyWindow'] {
    // Check if a major event is coming
    const majorEvent = upcomingEvents.find(e => e.event.impactScore >= 30 && e.daysUntil <= 45);

    if (majorEvent) {
        return {
            startDate: majorEvent.start,
            endDate: majorEvent.end,
            eventName: majorEvent.event.name,
            expectedDiscount: majorEvent.event.impactScore,
        };
    }

    // Check category-specific buying windows
    if (buyingWindows.length > 0) {
        const bestWindow = buyingWindows[0];
        const now = new Date();
        const nextOccurrence = bestWindow.nextOccurrence || new Date(now.getFullYear(), now.getMonth() + 1, 1);

        return {
            startDate: nextOccurrence,
            endDate: new Date(nextOccurrence.getTime() + 7 * 24 * 60 * 60 * 1000),
            eventName: bestWindow.eventName,
            expectedDiscount: bestWindow.expectedDiscount,
        };
    }

    return null;
}

/**
 * Build price context information
 */
function buildPriceContext(
    currentPrice: number,
    priceStats: any,
    prediction: any | null
): BuyWaitRecommendation['priceContext'] {
    const { minPrice, maxPrice } = priceStats;

    // Calculate percentages
    const percentFromLow = minPrice > 0 ? ((currentPrice - minPrice) / minPrice) * 100 : 0;
    const percentFromHigh = maxPrice > 0 ? ((maxPrice - currentPrice) / maxPrice) * 100 : 0;

    // Determine trend
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (prediction?.trend?.direction === 'falling') trend = 'falling';
    else if (prediction?.trend?.direction === 'rising') trend = 'rising';

    // Determine volatility
    let volatility: 'low' | 'medium' | 'high' = 'medium';
    if (prediction?.volatility !== undefined) {
        if (prediction.volatility < 0.05) volatility = 'low';
        else if (prediction.volatility > 0.15) volatility = 'high';
    }

    return {
        isAtHistoricalLow: percentFromLow <= 2,
        percentFromLow: Math.round(percentFromLow),
        percentFromHigh: Math.round(percentFromHigh),
        trend,
        volatility,
    };
}

/**
 * Build discount trust information
 */
function buildDiscountTrust(
    discountInfo: any | null
): BuyWaitRecommendation['discountTrust'] {
    if (!discountInfo) {
        return {
            trustLevel: 'genuine',
            trustScore: 50,
            warnings: ['Insufficient data for full discount analysis'],
        };
    }

    return {
        trustLevel: discountInfo.trustLevel,
        trustScore: discountInfo.trustScore,
        warnings: discountInfo.insights?.filter((i: string) =>
            i.toLowerCase().includes('warning') ||
            i.toLowerCase().includes('caution') ||
            i.toLowerCase().includes('inflat')
        ) || [],
    };
}

/**
 * Get batch recommendations for multiple products
 */
export async function getBatchRecommendations(
    productIds: string[]
): Promise<BuyWaitRecommendation[]> {
    const results = await Promise.allSettled(
        productIds.map(id => getBuyWaitRecommendation(id))
    );

    return results
        .filter((r): r is PromiseFulfilledResult<BuyWaitRecommendation> => r.status === 'fulfilled')
        .map(r => r.value);
}

export default {
    getBuyWaitRecommendation,
    getBatchRecommendations,
};
