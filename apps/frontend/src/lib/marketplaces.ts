/**
 * Regional Marketplace Configuration
 * 
 * Defines marketplace URLs, shipping databases, and regional settings
 * for each supported marketplace region.
 */

export type MarketplaceRegion = 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'jp';

export interface MarketplaceConfig {
    id: MarketplaceRegion;
    name: string;
    flag: string;
    currency: string;
    amazonDomain: string;
    amazonAffiliateTag?: string;
    ottoDomain?: string;
    etsyDomain: string;
    shippingZones: ShippingZone[];
    defaultVat: number;
}

export interface ShippingZone {
    name: string;
    countries: string[];
    estimatedDays: { min: number; max: number };
    baseCost: number;
    perKgCost: number;
}

export const marketplaces: Record<MarketplaceRegion, MarketplaceConfig> = {
    de: {
        id: 'de',
        name: 'Germany',
        flag: '🇩🇪',
        currency: 'EUR',
        amazonDomain: 'amazon.de',
        ottoDomain: 'otto.de',
        etsyDomain: 'etsy.com',
        defaultVat: 0.19,
        shippingZones: [
            {
                name: 'Domestic (Germany)',
                countries: ['DE'],
                estimatedDays: { min: 1, max: 3 },
                baseCost: 3.99,
                perKgCost: 0.50,
            },
            {
                name: 'EU',
                countries: ['AT', 'NL', 'BE', 'FR', 'IT', 'ES', 'PL', 'CZ'],
                estimatedDays: { min: 3, max: 7 },
                baseCost: 9.99,
                perKgCost: 1.50,
            },
            {
                name: 'International',
                countries: ['*'],
                estimatedDays: { min: 7, max: 21 },
                baseCost: 19.99,
                perKgCost: 5.00,
            },
        ],
    },
    us: {
        id: 'us',
        name: 'United States',
        flag: '🇺🇸',
        currency: 'USD',
        amazonDomain: 'amazon.com',
        etsyDomain: 'etsy.com',
        defaultVat: 0, // Sales tax varies by state
        shippingZones: [
            {
                name: 'Domestic (US)',
                countries: ['US'],
                estimatedDays: { min: 2, max: 5 },
                baseCost: 5.99,
                perKgCost: 0.75,
            },
            {
                name: 'Canada',
                countries: ['CA'],
                estimatedDays: { min: 5, max: 10 },
                baseCost: 12.99,
                perKgCost: 2.00,
            },
            {
                name: 'International',
                countries: ['*'],
                estimatedDays: { min: 10, max: 30 },
                baseCost: 24.99,
                perKgCost: 6.00,
            },
        ],
    },
    uk: {
        id: 'uk',
        name: 'United Kingdom',
        flag: '🇬🇧',
        currency: 'GBP',
        amazonDomain: 'amazon.co.uk',
        etsyDomain: 'etsy.com',
        defaultVat: 0.20,
        shippingZones: [
            {
                name: 'Domestic (UK)',
                countries: ['GB'],
                estimatedDays: { min: 1, max: 3 },
                baseCost: 3.99,
                perKgCost: 0.60,
            },
            {
                name: 'EU',
                countries: ['DE', 'FR', 'NL', 'BE', 'IE'],
                estimatedDays: { min: 5, max: 10 },
                baseCost: 12.99,
                perKgCost: 2.50,
            },
            {
                name: 'International',
                countries: ['*'],
                estimatedDays: { min: 7, max: 21 },
                baseCost: 18.99,
                perKgCost: 5.00,
            },
        ],
    },
    fr: {
        id: 'fr',
        name: 'France',
        flag: '🇫🇷',
        currency: 'EUR',
        amazonDomain: 'amazon.fr',
        etsyDomain: 'etsy.com',
        defaultVat: 0.20,
        shippingZones: [
            {
                name: 'Domestic (France)',
                countries: ['FR'],
                estimatedDays: { min: 1, max: 3 },
                baseCost: 4.99,
                perKgCost: 0.50,
            },
            {
                name: 'EU',
                countries: ['DE', 'BE', 'ES', 'IT', 'NL', 'AT'],
                estimatedDays: { min: 3, max: 7 },
                baseCost: 9.99,
                perKgCost: 1.50,
            },
            {
                name: 'International',
                countries: ['*'],
                estimatedDays: { min: 7, max: 21 },
                baseCost: 19.99,
                perKgCost: 5.00,
            },
        ],
    },
    es: {
        id: 'es',
        name: 'Spain',
        flag: '🇪🇸',
        currency: 'EUR',
        amazonDomain: 'amazon.es',
        etsyDomain: 'etsy.com',
        defaultVat: 0.21,
        shippingZones: [
            {
                name: 'Domestic (Spain)',
                countries: ['ES'],
                estimatedDays: { min: 1, max: 4 },
                baseCost: 4.99,
                perKgCost: 0.60,
            },
            {
                name: 'EU',
                countries: ['FR', 'PT', 'DE', 'IT', 'NL'],
                estimatedDays: { min: 3, max: 8 },
                baseCost: 11.99,
                perKgCost: 1.80,
            },
            {
                name: 'International',
                countries: ['*'],
                estimatedDays: { min: 8, max: 25 },
                baseCost: 22.99,
                perKgCost: 5.50,
            },
        ],
    },
    it: {
        id: 'it',
        name: 'Italy',
        flag: '🇮🇹',
        currency: 'EUR',
        amazonDomain: 'amazon.it',
        etsyDomain: 'etsy.com',
        defaultVat: 0.22,
        shippingZones: [
            {
                name: 'Domestic (Italy)',
                countries: ['IT'],
                estimatedDays: { min: 1, max: 4 },
                baseCost: 5.99,
                perKgCost: 0.70,
            },
            {
                name: 'EU',
                countries: ['DE', 'FR', 'AT', 'SI', 'CH'],
                estimatedDays: { min: 4, max: 9 },
                baseCost: 12.99,
                perKgCost: 2.00,
            },
            {
                name: 'International',
                countries: ['*'],
                estimatedDays: { min: 8, max: 25 },
                baseCost: 24.99,
                perKgCost: 6.00,
            },
        ],
    },
    jp: {
        id: 'jp',
        name: 'Japan',
        flag: '🇯🇵',
        currency: 'JPY',
        amazonDomain: 'amazon.co.jp',
        etsyDomain: 'etsy.com',
        defaultVat: 0.10,
        shippingZones: [
            {
                name: 'Domestic (Japan)',
                countries: ['JP'],
                estimatedDays: { min: 1, max: 3 },
                baseCost: 500,
                perKgCost: 100,
            },
            {
                name: 'Asia',
                countries: ['KR', 'CN', 'TW', 'HK', 'SG'],
                estimatedDays: { min: 3, max: 7 },
                baseCost: 1500,
                perKgCost: 500,
            },
            {
                name: 'International',
                countries: ['*'],
                estimatedDays: { min: 7, max: 21 },
                baseCost: 3000,
                perKgCost: 1000,
            },
        ],
    },
};

/**
 * Get marketplace config by region ID
 */
export function getMarketplace(region: MarketplaceRegion): MarketplaceConfig {
    return marketplaces[region];
}

/**
 * Get shipping estimate for a destination country
 */
export function getShippingEstimate(
    region: MarketplaceRegion,
    destinationCountry: string,
    weightKg: number = 0
): { zone: ShippingZone; totalCost: number } | null {
    const marketplace = marketplaces[region];

    for (const zone of marketplace.shippingZones) {
        if (zone.countries.includes(destinationCountry) || zone.countries.includes('*')) {
            const totalCost = zone.baseCost + (weightKg * zone.perKgCost);
            return { zone, totalCost };
        }
    }

    return null;
}

/**
 * Parse a marketplace URL to identify the region
 */
export function parseMarketplaceUrl(url: string): MarketplaceRegion | null {
    for (const [region, config] of Object.entries(marketplaces)) {
        if (url.includes(config.amazonDomain)) {
            return region as MarketplaceRegion;
        }
        if (config.ottoDomain && url.includes(config.ottoDomain)) {
            return region as MarketplaceRegion;
        }
    }
    return null;
}
