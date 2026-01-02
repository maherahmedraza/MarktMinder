/**
 * Price DNA Service
 * 
 * Analyzes price patterns to create a "DNA profile" for each product:
 * 1. Weekly patterns (day-of-week pricing)
 * 2. Monthly patterns (beginning/end of month trends)  
 * 3. Seasonal patterns (quarterly/annual cycles)
 * 4. Event correlation (sales events impact)
 * 5. Volatility profiling
 */

import { query } from '../config/database.js';
import { cache } from '../config/redis.js';
import { getUpcomingEvents, ShoppingEvent } from './events-calendar.js';
import { logger } from '../utils/logger.js';

const DNA_CACHE_TTL = 3600; // 1 hour

export interface DayPattern {
    day: number;          // 0-6 (Sunday-Saturday)
    dayName: string;
    averagePrice: number;
    priceChange: number;  // % change from overall average
    sampleSize: number;
}

export interface MonthPattern {
    period: 'beginning' | 'middle' | 'end';
    averagePrice: number;
    priceChange: number;
    bestBuyWindow: boolean;
}

export interface SeasonalPattern {
    quarter: 1 | 2 | 3 | 4;
    quarterName: string;
    averagePrice: number;
    priceChange: number;
    typicalEvents: string[];
}

export interface EventImpact {
    eventName: string;
    averageDiscount: number;
    occurrences: number;
    predictedImpact: number;
}

export interface PriceDNA {
    productId: string;
    productName: string;

    // Overall stats
    overallAverage: number;
    volatilityScore: number;      // 0-100 (0=stable, 100=highly volatile)
    volatilityClass: 'stable' | 'moderate' | 'volatile';
    priceRange: { min: number; max: number };
    totalDataPoints: number;
    dataSpanDays: number;

    // Patterns
    weeklyPattern: DayPattern[];
    bestDayToBuy: { day: string; savings: number };
    worstDayToBuy: { day: string; premium: number };

    monthlyPattern: MonthPattern[];
    bestTimeOfMonth: string;

    seasonalPattern: SeasonalPattern[];
    bestQuarter: { quarter: string; savings: number };

    // Event correlation
    eventImpacts: EventImpact[];
    upcomingOpportunities: { event: string; expectedDiscount: number; daysAway: number }[];

    // Insights
    insights: string[];
    buyingRecommendation: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const QUARTER_NAMES = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];

/**
 * Calculate volatility score from standard deviation
 */
function calculateVolatilityScore(stdDev: number, mean: number): number {
    if (mean === 0) return 0;
    const cv = (stdDev / mean) * 100; // Coefficient of variation as percentage
    // Map CV to 0-100 score (0-5% = stable, 5-15% = moderate, 15%+ = volatile)
    return Math.min(100, Math.round(cv * 5));
}

function getVolatilityClass(score: number): 'stable' | 'moderate' | 'volatile' {
    if (score < 25) return 'stable';
    if (score < 60) return 'moderate';
    return 'volatile';
}

/**
 * Analyze weekly patterns
 */
async function analyzeWeeklyPattern(productId: string): Promise<{
    patterns: DayPattern[];
    bestDay: { day: string; savings: number };
    worstDay: { day: string; premium: number };
}> {
    const result = await query(`
        SELECT 
            EXTRACT(DOW FROM time) as day_of_week,
            AVG(price) as avg_price,
            COUNT(*) as sample_size
        FROM price_history
        WHERE product_id = $1
        GROUP BY EXTRACT(DOW FROM time)
        ORDER BY day_of_week
    `, [productId]);

    if (result.rows.length === 0) {
        return {
            patterns: [],
            bestDay: { day: 'Unknown', savings: 0 },
            worstDay: { day: 'Unknown', premium: 0 },
        };
    }

    // Calculate overall average
    const totalAvg = result.rows.reduce((sum, r) => sum + parseFloat(r.avg_price), 0) / result.rows.length;

    const patterns: DayPattern[] = result.rows.map(row => ({
        day: parseInt(row.day_of_week),
        dayName: DAY_NAMES[parseInt(row.day_of_week)],
        averagePrice: parseFloat(row.avg_price),
        priceChange: ((parseFloat(row.avg_price) - totalAvg) / totalAvg) * 100,
        sampleSize: parseInt(row.sample_size),
    }));

    // Find best and worst days
    const sorted = [...patterns].sort((a, b) => a.averagePrice - b.averagePrice);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    return {
        patterns,
        bestDay: {
            day: best?.dayName || 'Unknown',
            savings: best ? Math.abs(best.priceChange) : 0,
        },
        worstDay: {
            day: worst?.dayName || 'Unknown',
            premium: worst ? Math.abs(worst.priceChange) : 0,
        },
    };
}

/**
 * Analyze monthly patterns (beginning, middle, end of month)
 */
async function analyzeMonthlyPattern(productId: string): Promise<{
    patterns: MonthPattern[];
    bestTime: string;
}> {
    const result = await query(`
        SELECT 
            CASE 
                WHEN EXTRACT(DAY FROM time) <= 10 THEN 'beginning'
                WHEN EXTRACT(DAY FROM time) <= 20 THEN 'middle'
                ELSE 'end'
            END as period,
            AVG(price) as avg_price
        FROM price_history
        WHERE product_id = $1
        GROUP BY period
    `, [productId]);

    if (result.rows.length === 0) {
        return { patterns: [], bestTime: 'Unknown' };
    }

    const totalAvg = result.rows.reduce((sum, r) => sum + parseFloat(r.avg_price), 0) / result.rows.length;

    const patterns: MonthPattern[] = result.rows.map(row => ({
        period: row.period as 'beginning' | 'middle' | 'end',
        averagePrice: parseFloat(row.avg_price),
        priceChange: ((parseFloat(row.avg_price) - totalAvg) / totalAvg) * 100,
        bestBuyWindow: parseFloat(row.avg_price) === Math.min(...result.rows.map(r => parseFloat(r.avg_price))),
    }));

    const best = patterns.find(p => p.bestBuyWindow);

    return {
        patterns,
        bestTime: best ? `${best.period} of month` : 'Any time',
    };
}

/**
 * Analyze seasonal patterns
 */
async function analyzeSeasonalPattern(productId: string): Promise<{
    patterns: SeasonalPattern[];
    bestQuarter: { quarter: string; savings: number };
}> {
    const result = await query(`
        SELECT 
            EXTRACT(QUARTER FROM time) as quarter,
            AVG(price) as avg_price
        FROM price_history
        WHERE product_id = $1
        GROUP BY quarter
        ORDER BY quarter
    `, [productId]);

    if (result.rows.length === 0) {
        return {
            patterns: [],
            bestQuarter: { quarter: 'Unknown', savings: 0 },
        };
    }

    const totalAvg = result.rows.reduce((sum, r) => sum + parseFloat(r.avg_price), 0) / result.rows.length;

    const typicalEvents: Record<number, string[]> = {
        1: ['New Year Sales', 'Winter Sales'],
        2: ['Easter Sales', 'Spring Deals'],
        3: ['Summer Sales', 'Prime Day'],
        4: ['Black Friday', 'Cyber Monday', 'Christmas Sales'],
    };

    const patterns: SeasonalPattern[] = result.rows.map(row => {
        const quarter = parseInt(row.quarter) as 1 | 2 | 3 | 4;
        return {
            quarter,
            quarterName: QUARTER_NAMES[quarter - 1],
            averagePrice: parseFloat(row.avg_price),
            priceChange: ((parseFloat(row.avg_price) - totalAvg) / totalAvg) * 100,
            typicalEvents: typicalEvents[quarter] || [],
        };
    });

    const sorted = [...patterns].sort((a, b) => a.averagePrice - b.averagePrice);
    const best = sorted[0];

    return {
        patterns,
        bestQuarter: {
            quarter: best?.quarterName || 'Unknown',
            savings: best ? Math.abs(best.priceChange) : 0,
        },
    };
}

/**
 * Generate insights from DNA analysis
 */
function generateInsights(dna: Partial<PriceDNA>): string[] {
    const insights: string[] = [];

    // Volatility insight
    if (dna.volatilityClass === 'stable') {
        insights.push('📊 Price is very stable - buy anytime');
    } else if (dna.volatilityClass === 'volatile') {
        insights.push('⚠️ Highly volatile pricing - timing is crucial');
    }

    // Best day insight
    if (dna.bestDayToBuy && dna.bestDayToBuy.savings > 1) {
        insights.push(`📅 Best day to buy: ${dna.bestDayToBuy.day} (avg ${dna.bestDayToBuy.savings.toFixed(1)}% cheaper)`);
    }

    // Monthly pattern insight
    if (dna.bestTimeOfMonth && dna.bestTimeOfMonth !== 'Any time') {
        insights.push(`📆 Best time of month: ${dna.bestTimeOfMonth}`);
    }

    // Seasonal insight
    if (dna.bestQuarter && dna.bestQuarter.savings > 3) {
        insights.push(`🗓️ Best quarter: ${dna.bestQuarter.quarter} (avg ${dna.bestQuarter.savings.toFixed(1)}% cheaper)`);
    }

    // Data span insight
    if (dna.dataSpanDays && dna.dataSpanDays < 30) {
        insights.push(`⏳ Limited history (${dna.dataSpanDays} days) - patterns may be incomplete`);
    } else if (dna.dataSpanDays && dna.dataSpanDays > 180) {
        insights.push(`✓ Rich history (${dna.dataSpanDays} days) - patterns are reliable`);
    }

    return insights;
}

/**
 * Generate buying recommendation
 */
function generateRecommendation(dna: Partial<PriceDNA>): string {
    const recommendations: string[] = [];

    if (dna.volatilityClass === 'stable') {
        recommendations.push('Price is stable, so buy when needed.');
    } else if (dna.volatilityClass === 'volatile') {
        if (dna.bestDayToBuy && dna.bestDayToBuy.savings > 2) {
            recommendations.push(`Consider buying on ${dna.bestDayToBuy.day}.`);
        }
        if (dna.upcomingOpportunities && dna.upcomingOpportunities.length > 0) {
            const upcoming = dna.upcomingOpportunities[0];
            recommendations.push(`${upcoming.event} in ${upcoming.daysAway} days may offer ~${upcoming.expectedDiscount}% off.`);
        }
    }

    if (recommendations.length === 0) {
        return 'Buy when the price drops below average.';
    }

    return recommendations.join(' ');
}

/**
 * Generate complete Price DNA for a product
 */
export async function analyzePriceDNA(productId: string): Promise<PriceDNA> {
    // Check cache
    const cacheKey = `price-dna:${productId}`;
    const cached = await cache.get<PriceDNA>(cacheKey);
    if (cached) return cached;

    // Get product info
    const productResult = await query(`
        SELECT p.id, p.title, p.current_price
        FROM products p
        WHERE p.id = $1
    `, [productId]);

    if (productResult.rows.length === 0) {
        throw new Error('Product not found');
    }

    const product = productResult.rows[0];

    // Get overall stats
    const statsResult = await query(`
        SELECT 
            AVG(price) as avg_price,
            STDDEV(price) as std_dev,
            MIN(price) as min_price,
            MAX(price) as max_price,
            COUNT(*) as total_points,
            EXTRACT(EPOCH FROM (MAX(time) - MIN(time))) / 86400 as data_span_days
        FROM price_history
        WHERE product_id = $1
    `, [productId]);

    const stats = statsResult.rows[0];
    const overallAverage = parseFloat(stats.avg_price) || parseFloat(product.current_price) || 0;
    const stdDev = parseFloat(stats.std_dev) || 0;
    const volatilityScore = calculateVolatilityScore(stdDev, overallAverage);

    // Get patterns
    const [weekly, monthly, seasonal] = await Promise.all([
        analyzeWeeklyPattern(productId),
        analyzeMonthlyPattern(productId),
        analyzeSeasonalPattern(productId),
    ]);

    // Get upcoming opportunities
    const upcomingEventsList = getUpcomingEvents(new Date(), 30);
    const upcomingOpportunities = upcomingEventsList
        .filter((e: { event: ShoppingEvent; start: Date; end: Date; daysUntil: number }) => e.daysUntil > 0 && e.daysUntil <= 30)
        .map((e: { event: ShoppingEvent; start: Date; end: Date; daysUntil: number }) => ({
            event: e.event.name,
            expectedDiscount: e.event.impactScore, // Impact score as percentage
            daysAway: e.daysUntil,
        }));

    // Build DNA profile
    const dna: PriceDNA = {
        productId,
        productName: product.title,
        overallAverage,
        volatilityScore,
        volatilityClass: getVolatilityClass(volatilityScore),
        priceRange: {
            min: parseFloat(stats.min_price) || overallAverage,
            max: parseFloat(stats.max_price) || overallAverage,
        },
        totalDataPoints: parseInt(stats.total_points) || 0,
        dataSpanDays: Math.round(parseFloat(stats.data_span_days) || 0),

        weeklyPattern: weekly.patterns,
        bestDayToBuy: weekly.bestDay,
        worstDayToBuy: weekly.worstDay,

        monthlyPattern: monthly.patterns,
        bestTimeOfMonth: monthly.bestTime,

        seasonalPattern: seasonal.patterns,
        bestQuarter: seasonal.bestQuarter,

        eventImpacts: [], // Would need historical event correlation data
        upcomingOpportunities,

        insights: [],
        buyingRecommendation: '',
    };

    // Generate insights and recommendation
    dna.insights = generateInsights(dna);
    dna.buyingRecommendation = generateRecommendation(dna);

    // Cache result
    await cache.set(cacheKey, dna, DNA_CACHE_TTL);

    return dna;
}

/**
 * Get summary DNA for multiple products
 */
export async function getProductsDNASummary(productIds: string[]): Promise<{
    productId: string;
    volatilityClass: string;
    bestDayToBuy: string;
    primaryInsight: string;
}[]> {
    const summaries = [];

    for (const productId of productIds.slice(0, 20)) { // Limit to 20
        try {
            const dna = await analyzePriceDNA(productId);
            summaries.push({
                productId,
                volatilityClass: dna.volatilityClass,
                bestDayToBuy: dna.bestDayToBuy.day,
                primaryInsight: dna.insights[0] || 'No insights available',
            });
        } catch (e) {
            logger.debug(`Failed to get DNA for product ${productId}:`, e);
        }
    }

    return summaries;
}

export default {
    analyzePriceDNA,
    getProductsDNASummary,
};
