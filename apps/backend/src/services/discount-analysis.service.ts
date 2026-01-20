/**
 * Discount Analysis Service
 * 
 * Detects fake discounts and price manipulation tactics:
 * 1. Price inflation before sales
 * 2. Fake original prices (never sold at MSRP)
 * 3. Recurring fake sales (always "on sale")
 * 4. Comparison price manipulation
 * 
 * Generates a Trust Score (0-100) for each deal.
 */

// import { query } from '../config/database.js';
import { cache } from '../config/redis.js';
import { PriceHistoryModel, PriceHistoryEntry } from '../models/PriceHistory.js';
import { logger } from '../utils/logger.js';

const ANALYSIS_CACHE_TTL = 1800; // 30 minutes

// Manipulation types detected
export type ManipulationType =
    | 'price_inflation_before_sale'
    | 'fake_original_price'
    | 'recurring_fake_sale'
    | 'comparison_price_manipulation'
    | 'sudden_price_spike'
    | 'none';

export interface DiscountAnalysis {
    productId: string;
    advertisedDiscount: string;           // e.g., "50% OFF!"
    actualDiscount: number;               // e.g., 12 (percent)
    manipulationDetected: boolean;
    manipulationType: ManipulationType;
    trustScore: number;                   // 0-100 (100 = trustworthy)
    trustLevel: 'genuine' | 'suspicious' | 'likely_fake';
    evidence: {
        currentPrice: number;
        claimedOriginalPrice?: number;
        price30DaysAgo: number;
        price90DaysAgo: number;
        lowestRecorded: number;
        highestRecorded: number;
        averagePrice: number;
        timesAtCurrentPrice: number;
        totalPriceRecords: number;
        priceWasHigherBefore: boolean;
        daysUntilSale: number | null;       // Days before a known sale event
    };
    insights: string[];
    recommendation: string;
    analyzedAt: Date;
}

/**
 * Analyze discount authenticity for a product
 */
export async function analyzeDiscount(
    productId: string,
    currentPrice: number,
    claimedOriginalPrice?: number
): Promise<DiscountAnalysis> {
    const cacheKey = `discount:${productId}`;

    // Check cache first
    const cached = await cache.get<DiscountAnalysis>(cacheKey);
    if (cached) {
        return cached;
    }

    // Get price history
    const history = await PriceHistoryModel.getHistory(productId, '90d', 1000);
    const stats = await PriceHistoryModel.getStats(productId);

    if (!stats || history.length < 3) {
        // Not enough data for analysis
        return {
            productId,
            advertisedDiscount: 'Unknown',
            actualDiscount: 0,
            manipulationDetected: false,
            manipulationType: 'none',
            trustScore: 50, // Neutral
            trustLevel: 'suspicious',
            evidence: {
                currentPrice,
                claimedOriginalPrice,
                price30DaysAgo: currentPrice,
                price90DaysAgo: currentPrice,
                lowestRecorded: currentPrice,
                highestRecorded: currentPrice,
                averagePrice: currentPrice,
                timesAtCurrentPrice: 1,
                totalPriceRecords: history.length,
                priceWasHigherBefore: false,
                daysUntilSale: null,
            },
            insights: ['Insufficient price history for reliable analysis'],
            recommendation: 'Wait for more price data before deciding',
            analyzedAt: new Date(),
        };
    }

    // Calculate key metrics
    const evidence = await calculateEvidence(productId, currentPrice, history, stats);

    // Detect manipulation
    const { manipulationDetected, manipulationType, penalties } = detectManipulation(
        currentPrice,
        claimedOriginalPrice,
        evidence
    );

    // Calculate trust score
    const trustScore = calculateTrustScore(evidence, penalties);
    const trustLevel = getTrustLevel(trustScore);

    // Calculate actual discount
    const actualDiscount = calculateActualDiscount(currentPrice, evidence);
    const advertisedDiscount = claimedOriginalPrice
        ? `${Math.round(((claimedOriginalPrice - currentPrice) / claimedOriginalPrice) * 100)}% OFF`
        : 'Unknown';

    // Generate insights
    const insights = generateInsights(evidence, manipulationType, actualDiscount);
    const recommendation = generateRecommendation(trustLevel, manipulationType, evidence);

    const analysis: DiscountAnalysis = {
        productId,
        advertisedDiscount,
        actualDiscount,
        manipulationDetected,
        manipulationType,
        trustScore,
        trustLevel,
        evidence,
        insights,
        recommendation,
        analyzedAt: new Date(),
    };

    // Cache result
    await cache.set(cacheKey, analysis, ANALYSIS_CACHE_TTL);

    return analysis;
}

/**
 * Calculate evidence metrics from price history
 */
async function calculateEvidence(
    productId: string,
    currentPrice: number,
    history: PriceHistoryEntry[],
    stats: { min_price: number; max_price: number; avg_price: number }
): Promise<DiscountAnalysis['evidence']> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Find prices at specific points
    const price30DaysAgo = findPriceNearDate(history, thirtyDaysAgo) || currentPrice;
    const price90DaysAgo = findPriceNearDate(history, ninetyDaysAgo) || currentPrice;

    // Count how many times we've seen this price
    const tolerance = currentPrice * 0.02; // 2% tolerance
    const timesAtCurrentPrice = history.filter(
        h => Math.abs(h.price - currentPrice) < tolerance
    ).length;

    // Check if price was ever higher in the last 30 days
    const recentHistory = history.filter(h => new Date(h.time) > thirtyDaysAgo);
    const priceWasHigherBefore = recentHistory.some(h => h.price > currentPrice * 1.05);

    return {
        currentPrice,
        price30DaysAgo,
        price90DaysAgo,
        lowestRecorded: stats.min_price,
        highestRecorded: stats.max_price,
        averagePrice: stats.avg_price,
        timesAtCurrentPrice,
        totalPriceRecords: history.length,
        priceWasHigherBefore,
        daysUntilSale: null, // TODO: Calculate based on shopping calendar
    };
}

/**
 * Find price closest to a specific date
 */
function findPriceNearDate(history: PriceHistoryEntry[], targetDate: Date): number | null {
    if (history.length === 0) return null;

    let closest = history[0];
    let minDiff = Math.abs(new Date(history[0].time).getTime() - targetDate.getTime());

    for (const entry of history) {
        const diff = Math.abs(new Date(entry.time).getTime() - targetDate.getTime());
        if (diff < minDiff) {
            minDiff = diff;
            closest = entry;
        }
    }

    return closest.price;
}

/**
 * Detect manipulation patterns
 */
function detectManipulation(
    currentPrice: number,
    claimedOriginalPrice: number | undefined,
    evidence: DiscountAnalysis['evidence']
): { manipulationDetected: boolean; manipulationType: ManipulationType; penalties: number } {
    let penalties = 0;
    let manipulationType: ManipulationType = 'none';

    // Pattern 1: Price inflation before sale
    // If price 30 days ago was LOWER than 90 days ago, they might have inflated
    if (evidence.price30DaysAgo > evidence.price90DaysAgo * 1.1) {
        if (currentPrice < evidence.price30DaysAgo) {
            penalties += 30;
            manipulationType = 'price_inflation_before_sale';
        }
    }

    // Pattern 2: Fake original price
    // If claimed original is significantly higher than historical max
    if (claimedOriginalPrice && claimedOriginalPrice > evidence.highestRecorded * 1.15) {
        penalties += 40;
        manipulationType = 'fake_original_price';
    }

    // Pattern 3: Recurring fake sale
    // If price is almost always at "sale" price (>70% of records)
    const saleFrequency = evidence.timesAtCurrentPrice / evidence.totalPriceRecords;
    if (saleFrequency > 0.7 && evidence.totalPriceRecords > 10) {
        penalties += 25;
        manipulationType = 'recurring_fake_sale';
    }

    // Pattern 4: Comparison price manipulation
    // Current price is above 90-day average despite "discount" claims
    if (claimedOriginalPrice && currentPrice > evidence.averagePrice * 1.05) {
        penalties += 35;
        manipulationType = 'comparison_price_manipulation';
    }

    // Pattern 5: Sudden price spike (pump before sale)
    // If price spiked significantly in recent history then "dropped"
    if (evidence.priceWasHigherBefore && currentPrice > evidence.lowestRecorded * 1.3) {
        penalties += 20;
        if (manipulationType === 'none') {
            manipulationType = 'sudden_price_spike';
        }
    }

    return {
        manipulationDetected: penalties >= 25,
        manipulationType,
        penalties,
    };
}

/**
 * Calculate trust score (0-100)
 */
function calculateTrustScore(
    evidence: DiscountAnalysis['evidence'],
    penalties: number
): number {
    let score = 100;

    // Deduct penalties from manipulation detection
    score -= penalties;

    // Bonus: Current price is at or near all-time low
    if (evidence.currentPrice <= evidence.lowestRecorded * 1.05) {
        score += 15;
    }

    // Bonus: Price is below 90-day average
    if (evidence.currentPrice < evidence.averagePrice * 0.9) {
        score += 10;
    }

    // Penalty: Not enough history
    if (evidence.totalPriceRecords < 10) {
        score -= 10;
    }

    // Penalty: Current price is above average
    if (evidence.currentPrice > evidence.averagePrice * 1.1) {
        score -= 15;
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
}

/**
 * Get trust level from score
 */
function getTrustLevel(score: number): 'genuine' | 'suspicious' | 'likely_fake' {
    if (score >= 70) return 'genuine';
    if (score >= 40) return 'suspicious';
    return 'likely_fake';
}

/**
 * Calculate actual discount vs historical data
 */
function calculateActualDiscount(
    currentPrice: number,
    evidence: DiscountAnalysis['evidence']
): number {
    // Compare to 90-day average, which is more reliable
    const discount = ((evidence.averagePrice - currentPrice) / evidence.averagePrice) * 100;
    return Math.round(Math.max(0, discount));
}

/**
 * Generate human-readable insights
 */
function generateInsights(
    evidence: DiscountAnalysis['evidence'],
    manipulationType: ManipulationType,
    actualDiscount: number
): string[] {
    const insights: string[] = [];

    // Actual vs advertised
    if (actualDiscount > 0) {
        insights.push(`Real discount is ${actualDiscount}% below 90-day average`);
    } else {
        insights.push(`Current price is at or above 90-day average`);
    }

    // Manipulation insights
    switch (manipulationType) {
        case 'price_inflation_before_sale':
            insights.push('⚠️ Price was raised before this "sale" - classic manipulation');
            break;
        case 'fake_original_price':
            insights.push('⚠️ Claimed original price is higher than ever recorded');
            break;
        case 'recurring_fake_sale':
            insights.push('⚠️ This product is almost always at "sale" price - not a real discount');
            break;
        case 'comparison_price_manipulation':
            insights.push('⚠️ Despite discount claims, price is above historical average');
            break;
        case 'sudden_price_spike':
            insights.push('⚠️ Price recently spiked before this "drop"');
            break;
    }

    // Historical context
    if (evidence.currentPrice === evidence.lowestRecorded) {
        insights.push('✅ This is the lowest price ever recorded');
    } else {
        const aboveLowest = ((evidence.currentPrice - evidence.lowestRecorded) / evidence.lowestRecorded) * 100;
        insights.push(`Price is ${Math.round(aboveLowest)}% above all-time low (€${evidence.lowestRecorded.toFixed(2)})`);
    }

    return insights;
}

/**
 * Generate recommendation
 */
function generateRecommendation(
    trustLevel: 'genuine' | 'suspicious' | 'likely_fake',
    manipulationType: ManipulationType,
    evidence: DiscountAnalysis['evidence']
): string {
    if (trustLevel === 'genuine') {
        if (evidence.currentPrice === evidence.lowestRecorded) {
            return '🎯 GREAT DEAL: This is a genuine all-time low price. Buy now if you need it!';
        }
        return '✅ This appears to be a legitimate discount. Safe to purchase.';
    }

    if (trustLevel === 'suspicious') {
        return '⚠️ This deal has some red flags. Consider waiting for better pricing or comparing alternatives.';
    }

    // Likely fake
    switch (manipulationType) {
        case 'price_inflation_before_sale':
            return '❌ AVOID: Price was artificially inflated before this "sale". Wait for a genuine price drop.';
        case 'fake_original_price':
            return '❌ AVOID: The "original price" is fabricated. This product was never sold at that price.';
        case 'recurring_fake_sale':
            return '❌ AVOID: This product is perpetually "on sale". There is no actual discount.';
        default:
            return '❌ AVOID: This deal shows signs of price manipulation. Wait for verified price drops.';
    }
}

/**
 * Batch analyze discounts for multiple products
 */
export async function batchAnalyzeDiscounts(
    products: { id: string; currentPrice: number; claimedOriginalPrice?: number }[]
): Promise<DiscountAnalysis[]> {
    const results = await Promise.all(
        products.map(p => analyzeDiscount(p.id, p.currentPrice, p.claimedOriginalPrice))
    );
    return results;
}

export default {
    analyzeDiscount,
    batchAnalyzeDiscounts,
};
