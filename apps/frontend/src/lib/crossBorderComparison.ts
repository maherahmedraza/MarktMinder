/**
 * Cross-Border Price Comparison Engine
 * 
 * Compares product prices across different regional marketplaces,
 * accounting for currency conversion, shipping costs, and taxes.
 */

import { marketplaces, MarketplaceRegion, getShippingEstimate } from './marketplaces';

export interface CrossBorderPrice {
    region: MarketplaceRegion;
    marketplace: string;
    originalPrice: number;
    originalCurrency: string;
    convertedPrice: number; // In user's preferred currency
    shippingCost: number;
    estimatedTax: number;
    totalCost: number;
    savings: number; // Compared to base region
    savingsPercent: number;
    deliveryDays: { min: number; max: number };
    url?: string;
}

export interface CrossBorderComparisonResult {
    productName: string;
    baseRegion: MarketplaceRegion;
    basePrice: number;
    baseCurrency: string;
    userCurrency: string;
    userCountry: string;
    comparisons: CrossBorderPrice[];
    bestDeal: CrossBorderPrice | null;
    potentialSavings: number;
}

// Exchange rates (would be fetched from API in production)
const exchangeRates: Record<string, number> = {
    EUR: 1,
    USD: 0.92,  // 1 USD = 0.92 EUR
    GBP: 1.17,  // 1 GBP = 1.17 EUR
    JPY: 0.0062, // 1 JPY = 0.0062 EUR
};

/**
 * Convert price from one currency to another
 */
function convertCurrency(amount: number, from: string, to: string): number {
    const inEur = amount * (exchangeRates[from] || 1);
    return inEur / (exchangeRates[to] || 1);
}

/**
 * Calculate import tax/duty for cross-border orders
 */
function calculateImportTax(price: number, fromRegion: MarketplaceRegion, toCountry: string): number {
    const euCountries = ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'PL', 'CZ', 'GR'];

    // EU to EU: No additional import tax
    if (euCountries.includes(toCountry) && ['de', 'fr', 'es', 'it'].includes(fromRegion)) {
        return 0;
    }

    // UK/US/JP to EU: Import duty (simplified)
    if (fromRegion === 'uk' || fromRegion === 'us' || fromRegion === 'jp') {
        if (euCountries.includes(toCountry)) {
            // Orders over €150 typically incur customs (simplified 15%)
            if (price > 150) {
                return price * 0.15;
            }
        }
    }

    return 0;
}

/**
 * Compare prices across multiple marketplaces for a product
 */
export function comparePricesAcrossRegions(
    productPrices: { region: MarketplaceRegion; price: number; url?: string }[],
    userCountry: string = 'DE',
    userCurrency: string = 'EUR'
): CrossBorderComparisonResult {
    // Find the base price (user's home region)
    const homeRegion = userCountry === 'US' ? 'us' :
        userCountry === 'GB' ? 'uk' :
            userCountry === 'JP' ? 'jp' : 'de';

    const basePrice = productPrices.find(p => p.region === homeRegion);
    const basePriceConverted = basePrice
        ? convertCurrency(basePrice.price, marketplaces[basePrice.region].currency, userCurrency)
        : 0;

    const comparisons: CrossBorderPrice[] = productPrices.map(({ region, price, url }) => {
        const marketplace = marketplaces[region];
        const convertedPrice = convertCurrency(price, marketplace.currency, userCurrency);

        // Get shipping estimate
        const shippingEstimate = getShippingEstimate(region, userCountry, 0.5); // Assume 0.5kg
        const shippingCost = shippingEstimate
            ? convertCurrency(shippingEstimate.totalCost, marketplace.currency, userCurrency)
            : 0;

        // Calculate import tax
        const importTax = calculateImportTax(convertedPrice, region, userCountry);

        // Total cost including shipping and taxes
        const totalCost = convertedPrice + shippingCost + importTax;

        // Calculate savings vs base price
        const savings = basePriceConverted - totalCost;
        const savingsPercent = basePriceConverted > 0 ? (savings / basePriceConverted) * 100 : 0;

        return {
            region,
            marketplace: marketplace.name,
            originalPrice: price,
            originalCurrency: marketplace.currency,
            convertedPrice,
            shippingCost,
            estimatedTax: importTax,
            totalCost,
            savings,
            savingsPercent,
            deliveryDays: shippingEstimate?.zone.estimatedDays || { min: 7, max: 21 },
            url,
        };
    });

    // Sort by total cost to find best deal
    const sortedComparisons = [...comparisons].sort((a, b) => a.totalCost - b.totalCost);
    const bestDeal = sortedComparisons[0] || null;

    // Calculate potential savings from best deal vs home region
    const potentialSavings = bestDeal && basePrice
        ? basePriceConverted - bestDeal.totalCost
        : 0;

    return {
        productName: '',
        baseRegion: homeRegion,
        basePrice: basePrice?.price || 0,
        baseCurrency: marketplaces[homeRegion].currency,
        userCurrency,
        userCountry,
        comparisons: sortedComparisons,
        bestDeal: potentialSavings > 0 ? bestDeal : null,
        potentialSavings: Math.max(0, potentialSavings),
    };
}

/**
 * Analyze if cross-border purchase is worth it
 */
export function analyzeWorthiness(comparison: CrossBorderComparisonResult): {
    recommendation: 'buy_local' | 'buy_abroad' | 'wait';
    reason: string;
    confidence: number;
} {
    const { bestDeal, potentialSavings, basePrice } = comparison;

    if (!bestDeal || potentialSavings <= 0) {
        return {
            recommendation: 'buy_local',
            reason: 'Local prices are the same or better',
            confidence: 0.9,
        };
    }

    const savingsPercent = (potentialSavings / basePrice) * 100;

    // If savings > 20%, definitely worth buying abroad
    if (savingsPercent > 20 && bestDeal.deliveryDays.max <= 14) {
        return {
            recommendation: 'buy_abroad',
            reason: `Save ${savingsPercent.toFixed(0)}% by buying from ${bestDeal.marketplace}`,
            confidence: 0.95,
        };
    }

    // If savings 10-20%, consider it
    if (savingsPercent > 10) {
        return {
            recommendation: 'buy_abroad',
            reason: `${savingsPercent.toFixed(0)}% savings available, but consider delivery time (${bestDeal.deliveryDays.min}-${bestDeal.deliveryDays.max} days)`,
            confidence: 0.7,
        };
    }

    // Small savings, probably not worth the hassle
    return {
        recommendation: 'buy_local',
        reason: 'Savings are minimal after shipping and potential customs',
        confidence: 0.6,
    };
}

export default {
    comparePricesAcrossRegions,
    analyzeWorthiness,
};
