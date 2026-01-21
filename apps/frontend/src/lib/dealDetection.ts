/**
 * Regional Deal Detection Service
 * 
 * Analyzes prices across regions to detect deals, arbitrage opportunities,
 * and regional pricing anomalies using statistical analysis.
 */

import { MarketplaceRegion, marketplaces } from './marketplaces';

export interface RegionalPrice {
    region: MarketplaceRegion;
    price: number;
    currency: string;
    timestamp: Date;
}

export interface DealScore {
    score: number; // 0-100, higher = better deal
    reason: string;
    urgency: 'low' | 'medium' | 'high';
    confidence: number; // 0-1
}

export interface RegionalDeal {
    productId: string;
    productName: string;
    region: MarketplaceRegion;
    currentPrice: number;
    averagePrice: number;
    lowestHistoricPrice: number;
    dealScore: DealScore;
    priceDropPercent: number;
    isAllTimeLow: boolean;
    isBelowAverage: boolean;
    predictedTrend: 'rising' | 'falling' | 'stable';
    recommendedAction: 'buy_now' | 'wait' | 'set_alert';
}

export interface PricePrediction {
    predictedPrice: number;
    confidence: number;
    predictedDate: Date;
    direction: 'up' | 'down' | 'stable';
    reasoning: string;
}

/**
 * Calculate deal score based on multiple factors
 */
export function calculateDealScore(
    currentPrice: number,
    averagePrice: number,
    lowestPrice: number,
    highestPrice: number,
    recentTrend: number[], // Last 7 days of prices
    seasonality?: 'sale' | 'normal' | 'high_demand'
): DealScore {
    let score = 50; // Start neutral
    const reasons: string[] = [];

    // Factor 1: Current vs Average (30 points max)
    const avgDiff = ((averagePrice - currentPrice) / averagePrice) * 100;
    if (avgDiff > 0) {
        score += Math.min(avgDiff, 30);
        if (avgDiff > 15) reasons.push(`${avgDiff.toFixed(0)}% below average`);
    } else {
        score += avgDiff * 0.5; // Penalize but less harshly
    }

    // Factor 2: Current vs All-time Low (25 points max)
    const lowDiff = ((currentPrice - lowestPrice) / lowestPrice) * 100;
    if (lowDiff <= 0) {
        score += 25;
        reasons.push('At or below all-time low!');
    } else if (lowDiff < 5) {
        score += 20;
        reasons.push('Near all-time low');
    } else if (lowDiff < 10) {
        score += 10;
    }

    // Factor 3: Recent trend analysis (15 points max)
    if (recentTrend.length >= 3) {
        const recentAvg = recentTrend.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const trendDiff = ((recentAvg - currentPrice) / recentAvg) * 100;
        if (trendDiff > 0) {
            score += Math.min(trendDiff * 2, 15);
            if (trendDiff > 5) reasons.push('Price dropping');
        }
    }

    // Factor 4: Seasonality bonus (10 points max)
    if (seasonality === 'sale') {
        score += 10;
        reasons.push('Sale season');
    } else if (seasonality === 'high_demand') {
        score -= 5;
    }

    // Determine urgency
    let urgency: 'low' | 'medium' | 'high' = 'low';
    if (score >= 80) urgency = 'high';
    else if (score >= 65) urgency = 'medium';

    // Calculate confidence based on data quality
    const confidence = Math.min(0.95, 0.5 + (recentTrend.length * 0.05));

    return {
        score: Math.max(0, Math.min(100, score)),
        reason: reasons.length > 0 ? reasons.join(', ') : 'Standard pricing',
        urgency,
        confidence,
    };
}

/**
 * Simple ML-like price prediction using linear regression
 */
export function predictPrice(
    priceHistory: { date: Date; price: number }[],
    daysAhead: number = 7
): PricePrediction {
    if (priceHistory.length < 5) {
        return {
            predictedPrice: priceHistory[priceHistory.length - 1]?.price || 0,
            confidence: 0.3,
            predictedDate: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
            direction: 'stable',
            reasoning: 'Insufficient data for accurate prediction',
        };
    }

    // Prepare data for linear regression
    const prices = priceHistory.map(h => h.price);
    const n = prices.length;

    // Calculate linear regression (y = mx + b)
    const xMean = (n - 1) / 2;
    const yMean = prices.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (prices[i] - yMean);
        denominator += (i - xMean) ** 2;
    }

    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;

    // Predict future price
    const predictedPrice = slope * (n + daysAhead) + intercept;

    // Determine direction
    let direction: 'up' | 'down' | 'stable' = 'stable';
    const slopePercent = (slope / yMean) * 100;
    if (slopePercent > 1) direction = 'up';
    else if (slopePercent < -1) direction = 'down';

    // Calculate confidence based on R-squared
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
        const predicted = slope * i + intercept;
        ssRes += (prices[i] - predicted) ** 2;
        ssTot += (prices[i] - yMean) ** 2;
    }
    const rSquared = 1 - (ssRes / ssTot);
    const confidence = Math.max(0.2, Math.min(0.9, rSquared));

    // Generate reasoning
    let reasoning = '';
    if (direction === 'down') {
        reasoning = `Price trending down ${Math.abs(slopePercent).toFixed(1)}% per day. Good time to wait for better deals.`;
    } else if (direction === 'up') {
        reasoning = `Price trending up ${slopePercent.toFixed(1)}% per day. Consider buying soon.`;
    } else {
        reasoning = 'Price is relatively stable. Set an alert for price drops.';
    }

    return {
        predictedPrice: Math.max(0, predictedPrice),
        confidence,
        predictedDate: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000),
        direction,
        reasoning,
    };
}

/**
 * Detect deals across all regions for a product
 */
export function detectRegionalDeals(
    productId: string,
    productName: string,
    regionalPrices: RegionalPrice[],
    priceHistories: Record<MarketplaceRegion, { date: Date; price: number }[]>
): RegionalDeal[] {
    const deals: RegionalDeal[] = [];

    for (const price of regionalPrices) {
        const history = priceHistories[price.region] || [];
        const prices = history.map(h => h.price);

        if (prices.length === 0) continue;

        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const lowestPrice = Math.min(...prices);
        const highestPrice = Math.max(...prices);
        const recentPrices = prices.slice(-7);

        const dealScore = calculateDealScore(
            price.price,
            avgPrice,
            lowestPrice,
            highestPrice,
            recentPrices
        );

        const prediction = predictPrice(history, 7);
        const priceDropPercent = ((avgPrice - price.price) / avgPrice) * 100;

        // Determine recommended action
        let recommendedAction: 'buy_now' | 'wait' | 'set_alert' = 'set_alert';
        if (dealScore.score >= 75 && prediction.direction !== 'down') {
            recommendedAction = 'buy_now';
        } else if (prediction.direction === 'down' && prediction.confidence > 0.6) {
            recommendedAction = 'wait';
        }

        deals.push({
            productId,
            productName,
            region: price.region,
            currentPrice: price.price,
            averagePrice: avgPrice,
            lowestHistoricPrice: lowestPrice,
            dealScore,
            priceDropPercent,
            isAllTimeLow: price.price <= lowestPrice,
            isBelowAverage: price.price < avgPrice,
            predictedTrend: prediction.direction === 'up' ? 'rising' :
                prediction.direction === 'down' ? 'falling' : 'stable',
            recommendedAction,
        });
    }

    // Sort by deal score (best deals first)
    return deals.sort((a, b) => b.dealScore.score - a.dealScore.score);
}

/**
 * Find arbitrage opportunities where same product is cheaper in one region
 */
export function findArbitrageOpportunities(
    regionalPrices: RegionalPrice[],
    minSavingsPercent: number = 10
): { cheapest: RegionalPrice; mostExpensive: RegionalPrice; savingsPercent: number }[] {
    if (regionalPrices.length < 2) return [];

    // Convert all prices to EUR for comparison
    const exchangeRates: Record<string, number> = {
        EUR: 1, USD: 0.92, GBP: 1.17, JPY: 0.0062,
    };

    const normalized = regionalPrices.map(p => ({
        ...p,
        normalizedPrice: p.price * (exchangeRates[p.currency] || 1),
    }));

    normalized.sort((a, b) => a.normalizedPrice - b.normalizedPrice);

    const opportunities: { cheapest: RegionalPrice; mostExpensive: RegionalPrice; savingsPercent: number }[] = [];

    const cheapest = normalized[0];
    for (let i = 1; i < normalized.length; i++) {
        const expensive = normalized[i];
        const savingsPercent = ((expensive.normalizedPrice - cheapest.normalizedPrice) / expensive.normalizedPrice) * 100;

        if (savingsPercent >= minSavingsPercent) {
            opportunities.push({
                cheapest,
                mostExpensive: expensive,
                savingsPercent,
            });
        }
    }

    return opportunities;
}

export default {
    calculateDealScore,
    predictPrice,
    detectRegionalDeals,
    findArbitrageOpportunities,
};
