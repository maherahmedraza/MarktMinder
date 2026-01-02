import { query } from '../config/database.js';
import { cache } from '../config/redis.js';
import { getUpcomingEvents, getEventImpact, getBestBuyingWindows } from './events-calendar.js';

interface PricePoint {
    time: Date;
    price: number;
}

interface DayOfWeekPattern {
    dayOfWeek: number;
    avgPrice: number;
    sampleCount: number;
    deviation: number;
}

interface PredictionResult {
    predictions: Array<{
        date: string;
        dayName: string;
        predictedPrice: number;
        lowerBound: number;
        upperBound: number;
        eventImpact?: {
            eventName: string;
            expectedDiscount: number;
        };
    }>;
    trend: 'rising' | 'falling' | 'stable';
    trendStrength: number; // 0-100
    confidence: number; // 0-100
    analysis: {
        volatility: number;
        averagePrice: number;
        priceRange: { min: number; max: number };
        recommendation: string;
        dayOfWeekPatterns: DayOfWeekPattern[];
        upcomingEvents: Array<{
            name: string;
            daysUntil: number;
            expectedDiscount: number;
        }>;
        bestTimeToBuy: string;
    };
}

// Cache predictions for 30 minutes
const PREDICTION_CACHE_TTL = 30 * 60;

/**
 * Simple linear regression for trend calculation
 */
function linearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
        const predicted = slope * i + intercept;
        ssRes += Math.pow(data[i] - predicted, 2);
        ssTot += Math.pow(data[i] - yMean, 2);
    }
    const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

    return { slope, intercept, r2: Math.abs(r2) };
}

/**
 * Exponential smoothing (Holt-Winters - Simple version)
 * Better for time-series with trends
 */
function exponentialSmoothing(
    data: number[],
    alpha: number = 0.3,  // Level smoothing
    beta: number = 0.1    // Trend smoothing
): { level: number; trend: number; forecast: (steps: number) => number } {
    if (data.length < 2) {
        return {
            level: data[0] || 0,
            trend: 0,
            forecast: () => data[0] || 0,
        };
    }

    let level = data[0];
    let trend = data[1] - data[0];

    for (let i = 1; i < data.length; i++) {
        const prevLevel = level;
        level = alpha * data[i] + (1 - alpha) * (level + trend);
        trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }

    return {
        level,
        trend,
        forecast: (steps: number) => level + trend * steps,
    };
}

/**
 * Calculate price volatility (standard deviation / mean)
 */
function calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    return (stdDev / mean) * 100; // As percentage
}

/**
 * Analyze day-of-week patterns
 */
function analyzeDayOfWeekPatterns(pricePoints: PricePoint[]): DayOfWeekPattern[] {
    const dayData: Map<number, number[]> = new Map();

    for (let i = 0; i < 7; i++) {
        dayData.set(i, []);
    }

    for (const point of pricePoints) {
        const day = point.time.getDay();
        dayData.get(day)!.push(point.price);
    }

    const patterns: DayOfWeekPattern[] = [];
    const overallAvg = pricePoints.reduce((sum, p) => sum + p.price, 0) / pricePoints.length;

    for (let i = 0; i < 7; i++) {
        const prices = dayData.get(i)!;
        if (prices.length === 0) {
            patterns.push({ dayOfWeek: i, avgPrice: overallAvg, sampleCount: 0, deviation: 0 });
            continue;
        }

        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        const deviation = ((avg - overallAvg) / overallAvg) * 100;

        patterns.push({
            dayOfWeek: i,
            avgPrice: Math.round(avg * 100) / 100,
            sampleCount: prices.length,
            deviation: Math.round(deviation * 10) / 10,
        });
    }

    return patterns;
}

/**
 * Get the day name
 */
function getDayName(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

/**
 * Get price prediction for a product (enhanced version)
 */
export async function getPricePrediction(
    productId: string,
    daysAhead: number = 7,
    marketplace?: 'amazon' | 'otto' | 'etsy'
): Promise<PredictionResult> {
    // Check cache first
    const cacheKey = `prediction:${productId}:${daysAhead}`;
    const cached = await cache.get<PredictionResult>(cacheKey);
    if (cached) {
        return cached;
    }

    // Get price history for the last 60 days (more data for better patterns)
    const historyResult = await query(`
        SELECT time, price 
        FROM price_history 
        WHERE product_id = $1 AND time >= NOW() - INTERVAL '60 days'
        ORDER BY time ASC
    `, [productId]);

    const pricePoints: PricePoint[] = historyResult.rows.map(row => ({
        time: new Date(row.time),
        price: parseFloat(row.price)
    }));

    if (pricePoints.length < 5) {
        throw new Error('Not enough price history for prediction (minimum 5 data points required)');
    }

    const prices = pricePoints.map(p => p.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const volatility = calculateVolatility(prices);

    // Use both linear regression and exponential smoothing
    const linearResult = linearRegression(prices);
    const expSmoothing = exponentialSmoothing(prices);

    // Analyze day-of-week patterns
    const dayPatterns = analyzeDayOfWeekPatterns(pricePoints);

    // Get upcoming events
    const upcomingEvents = getUpcomingEvents(new Date(), daysAhead + 7, marketplace);

    // Determine trend
    const priceRange = maxPrice - minPrice;
    const slopeSignificance = priceRange > 0
        ? Math.abs(linearResult.slope * prices.length) / priceRange
        : 0;

    let trend: 'rising' | 'falling' | 'stable';
    let trendStrength: number;

    if (slopeSignificance < 0.1) {
        trend = 'stable';
        trendStrength = 10;
    } else if (linearResult.slope > 0) {
        trend = 'rising';
        trendStrength = Math.min(100, slopeSignificance * 100);
    } else {
        trend = 'falling';
        trendStrength = Math.min(100, slopeSignificance * 100);
    }

    // Generate predictions
    const predictions: PredictionResult['predictions'] = [];
    const baseIndex = prices.length;
    const uncertaintyGrowth = volatility / 10;

    for (let i = 1; i <= daysAhead; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        // Blend linear regression and exponential smoothing
        const linearPrediction = linearResult.slope * (baseIndex + i) + linearResult.intercept;
        const expPrediction = expSmoothing.forecast(i);
        const blendedPrediction = (linearPrediction * 0.4 + expPrediction * 0.6);

        // Apply day-of-week adjustment
        const dayPattern = dayPatterns[date.getDay()];
        const dayAdjustment = dayPattern.sampleCount > 0 ? 1 + (dayPattern.deviation / 100) : 1;

        // Check for event impact
        const eventImpact = getEventImpact(date, marketplace);
        let eventAdjustment = 1;
        let eventInfo: { eventName: string; expectedDiscount: number } | undefined;

        if (eventImpact.isEventPeriod && eventImpact.events.length > 0) {
            const topEvent = eventImpact.events.reduce((a, b) =>
                a.impactScore > b.impactScore ? a : b
            );
            eventAdjustment = 1 - (topEvent.impactScore / 200); // Conservative estimate
            eventInfo = {
                eventName: topEvent.name,
                expectedDiscount: topEvent.impactScore,
            };
        }

        // Final prediction with adjustments
        let predictedValue = blendedPrediction * dayAdjustment * eventAdjustment;

        // Clamp to reasonable range
        predictedValue = Math.max(minPrice * 0.85, Math.min(maxPrice * 1.15, predictedValue));

        // Calculate uncertainty bounds
        const uncertainty = avgPrice * (uncertaintyGrowth * i / 100);
        const lowerBound = Math.max(minPrice * 0.8, predictedValue - uncertainty);
        const upperBound = Math.min(maxPrice * 1.2, predictedValue + uncertainty);

        predictions.push({
            date: date.toISOString().split('T')[0],
            dayName: getDayName(date),
            predictedPrice: Math.round(predictedValue * 100) / 100,
            lowerBound: Math.round(lowerBound * 100) / 100,
            upperBound: Math.round(upperBound * 100) / 100,
            eventImpact: eventInfo,
        });
    }

    // Calculate confidence
    const dataConfidence = Math.min(100, pricePoints.length * 2);
    const modelConfidence = linearResult.r2 * 100;
    const stabilityConfidence = Math.max(0, 100 - volatility * 3);
    const confidence = Math.round((dataConfidence + modelConfidence + stabilityConfidence) / 3);

    // Find best day to buy (lowest predicted price)
    const lowestPrediction = predictions.reduce((a, b) =>
        a.predictedPrice < b.predictedPrice ? a : b
    );

    // Generate smart recommendation
    let recommendation: string;
    const currentPrice = prices[prices.length - 1];

    if (upcomingEvents.length > 0 && upcomingEvents[0].daysUntil <= 7) {
        const event = upcomingEvents[0];
        recommendation = `🗓️ ${event.event.name} is ${event.daysUntil === 0 ? 'today' : `in ${event.daysUntil} days`}! Expect up to ${event.event.impactScore}% discounts.`;
    } else if (trend === 'falling' && trendStrength > 30) {
        recommendation = '💡 Price is trending down. Consider waiting for a better deal.';
    } else if (trend === 'rising' && trendStrength > 30) {
        recommendation = '⚡ Price is trending up. Buy soon to avoid higher prices.';
    } else if (currentPrice <= minPrice * 1.05) {
        recommendation = '🎯 Current price is near the lowest recorded. Good time to buy!';
    } else if (currentPrice >= maxPrice * 0.95) {
        recommendation = '⏳ Current price is near the highest. Wait for a price drop.';
    } else {
        const bestDay = lowestPrediction.eventImpact
            ? lowestPrediction.dayName + ` (${lowestPrediction.eventImpact.eventName})`
            : lowestPrediction.dayName;
        recommendation = `📊 Best predicted day to buy: ${bestDay} at €${lowestPrediction.predictedPrice}`;
    }

    const result: PredictionResult = {
        predictions,
        trend,
        trendStrength: Math.round(trendStrength),
        confidence,
        analysis: {
            volatility: Math.round(volatility * 10) / 10,
            averagePrice: Math.round(avgPrice * 100) / 100,
            priceRange: { min: minPrice, max: maxPrice },
            recommendation,
            dayOfWeekPatterns: dayPatterns,
            upcomingEvents: upcomingEvents.slice(0, 3).map(e => ({
                name: e.event.name,
                daysUntil: e.daysUntil,
                expectedDiscount: e.event.impactScore,
            })),
            bestTimeToBuy: lowestPrediction.date,
        },
    };

    // Cache the result
    await cache.set(cacheKey, result, PREDICTION_CACHE_TTL);

    return result;
}

/**
 * Get best buying windows for a product category
 */
export async function getBestBuyingWindowsForProduct(
    productId: string
): Promise<Array<{ eventName: string; expectedDiscount: number; nextOccurrence: Date }>> {
    // Get product info
    const productResult = await query(`
        SELECT marketplace, category FROM products WHERE id = $1
    `, [productId]);

    if (productResult.rows.length === 0) {
        return [];
    }

    const product = productResult.rows[0];
    const windows = getBestBuyingWindows(
        product.category || 'general',
        product.marketplace
    );

    return windows.slice(0, 5).map(w => ({
        eventName: w.event.name,
        expectedDiscount: w.expectedDiscount,
        nextOccurrence: w.event.getDates(new Date().getFullYear()).start,
    }));
}

/**
 * Get products with biggest price drops
 */
export async function getTopPriceDrops(limit: number = 5): Promise<any[]> {
    const result = await query(`
        WITH latest_prices AS (
            SELECT DISTINCT ON (product_id)
                product_id,
                price as current_price,
                time as current_time
            FROM price_history
            WHERE time >= NOW() - INTERVAL '7 days'
            ORDER BY product_id, time DESC
        ),
        week_ago_prices AS (
            SELECT DISTINCT ON (product_id)
                product_id,
                price as old_price,
                time as old_time
            FROM price_history
            WHERE time >= NOW() - INTERVAL '14 days' 
              AND time < NOW() - INTERVAL '6 days'
            ORDER BY product_id, time DESC
        )
        SELECT 
            p.id,
            p.title,
            p.image_url,
            p.marketplace,
            p.url,
            lp.current_price,
            wp.old_price,
            ROUND(((wp.old_price - lp.current_price) / wp.old_price * 100)::numeric, 1) as drop_percentage,
            ROUND((wp.old_price - lp.current_price)::numeric, 2) as savings
        FROM products p
        JOIN latest_prices lp ON p.id = lp.product_id
        JOIN week_ago_prices wp ON p.id = wp.product_id
        WHERE lp.current_price < wp.old_price
        ORDER BY drop_percentage DESC
        LIMIT $1
    `, [limit]);

    return result.rows;
}

/**
 * Get trending products (most tracked recently)
 */
export async function getTrendingProducts(limit: number = 5): Promise<any[]> {
    const result = await query(`
        SELECT 
            p.id,
            p.title,
            p.image_url,
            p.marketplace,
            p.current_price,
            p.url,
            COUNT(up.user_id) as tracker_count
        FROM products p
        LEFT JOIN user_products up ON p.id = up.product_id
        GROUP BY p.id
        HAVING COUNT(up.user_id) > 0
        ORDER BY tracker_count DESC, p.created_at DESC
        LIMIT $1
    `, [limit]);

    return result.rows;
}
