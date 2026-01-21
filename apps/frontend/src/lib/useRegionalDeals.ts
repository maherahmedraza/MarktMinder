'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useCurrency } from './useCurrency';
import {
    comparePricesAcrossRegions,
    analyzeWorthiness,
    CrossBorderComparisonResult
} from './crossBorderComparison';
import {
    detectRegionalDeals,
    predictPrice,
    findArbitrageOpportunities,
    RegionalDeal,
    PricePrediction
} from './dealDetection';
import { MarketplaceRegion } from './marketplaces';

interface RegionalPrice {
    region: MarketplaceRegion;
    price: number;
    url?: string;
}

interface PriceHistoryEntry {
    date: Date;
    price: number;
}

/**
 * Hook for regional deal analysis and cross-border comparison
 */
export function useRegionalDeals(
    productId: string,
    productName: string,
    regionalPrices: RegionalPrice[],
    priceHistories: Record<MarketplaceRegion, PriceHistoryEntry[]>
) {
    const locale = useLocale();
    const { currency } = useCurrency();

    // Map locale to user country
    const userCountry = useMemo(() => {
        const localeCountryMap: Record<string, string> = {
            en: 'GB',
            de: 'DE',
            fr: 'FR',
            es: 'ES',
            pt: 'PT',
            ja: 'JP',
        };
        return localeCountryMap[locale] || 'DE';
    }, [locale]);

    // Cross-border comparison
    const crossBorderComparison = useMemo((): CrossBorderComparisonResult & { recommendation: ReturnType<typeof analyzeWorthiness> } => {
        const comparison = comparePricesAcrossRegions(regionalPrices, userCountry, currency);
        const recommendation = analyzeWorthiness(comparison);
        return { ...comparison, recommendation };
    }, [regionalPrices, userCountry, currency]);

    // Regional deals detection
    const regionalDeals = useMemo((): RegionalDeal[] => {
        const priceData = regionalPrices.map(p => ({
            region: p.region,
            price: p.price,
            currency: 'EUR' as string, // Simplified; in production use marketplace currency
            timestamp: new Date(),
        }));
        return detectRegionalDeals(productId, productName, priceData, priceHistories);
    }, [productId, productName, regionalPrices, priceHistories]);

    // Price predictions for all regions
    const predictions = useMemo((): Record<MarketplaceRegion, PricePrediction> => {
        const result: Partial<Record<MarketplaceRegion, PricePrediction>> = {};
        for (const [region, history] of Object.entries(priceHistories)) {
            result[region as MarketplaceRegion] = predictPrice(history, 7);
        }
        return result as Record<MarketplaceRegion, PricePrediction>;
    }, [priceHistories]);

    // Arbitrage opportunities
    const arbitrageOpportunities = useMemo(() => {
        const priceData = regionalPrices.map(p => ({
            region: p.region,
            price: p.price,
            currency: 'EUR' as string,
            timestamp: new Date(),
        }));
        return findArbitrageOpportunities(priceData, 10);
    }, [regionalPrices]);

    // Best deal summary
    const bestDeal = useMemo(() => {
        if (regionalDeals.length === 0) return null;

        const topDeal = regionalDeals[0];
        return {
            ...topDeal,
            prediction: predictions[topDeal.region],
            crossBorder: crossBorderComparison.comparisons.find(c => c.region === topDeal.region),
        };
    }, [regionalDeals, predictions, crossBorderComparison]);

    return {
        crossBorderComparison,
        regionalDeals,
        predictions,
        arbitrageOpportunities,
        bestDeal,
        userCountry,
        userCurrency: currency,
    };
}

/**
 * Hook for simple price prediction on a single product
 */
export function usePricePrediction(priceHistory: PriceHistoryEntry[], daysAhead: number = 7) {
    const prediction = useMemo(() => {
        return predictPrice(priceHistory, daysAhead);
    }, [priceHistory, daysAhead]);

    return prediction;
}

export default useRegionalDeals;
