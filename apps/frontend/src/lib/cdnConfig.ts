/**
 * CDN Configuration for Regional Assets
 * 
 * Manages CDN endpoints for serving static assets optimized by region.
 * This includes translation bundles, images, and other locale-specific content.
 */

export interface CDNEndpoint {
    region: string;
    baseUrl: string;
    fallbackUrl: string;
    latencyMs?: number;
}

export interface AssetConfig {
    path: string;
    localizedVersions: string[];
    cacheControl: string;
    priority: 'high' | 'medium' | 'low';
}

// CDN endpoints optimized for different regions
export const cdnEndpoints: CDNEndpoint[] = [
    {
        region: 'eu-west',
        baseUrl: 'https://cdn-eu.marktminder.de',
        fallbackUrl: 'https://cdn.marktminder.de',
        latencyMs: 20,
    },
    {
        region: 'eu-central',
        baseUrl: 'https://cdn-de.marktminder.de',
        fallbackUrl: 'https://cdn-eu.marktminder.de',
        latencyMs: 15,
    },
    {
        region: 'us-east',
        baseUrl: 'https://cdn-us.marktminder.de',
        fallbackUrl: 'https://cdn.marktminder.de',
        latencyMs: 100,
    },
    {
        region: 'us-west',
        baseUrl: 'https://cdn-usw.marktminder.de',
        fallbackUrl: 'https://cdn-us.marktminder.de',
        latencyMs: 120,
    },
    {
        region: 'asia-pacific',
        baseUrl: 'https://cdn-ap.marktminder.de',
        fallbackUrl: 'https://cdn.marktminder.de',
        latencyMs: 150,
    },
];

// Map user locales to CDN regions
const localeToCdnRegion: Record<string, string> = {
    en: 'eu-west',
    de: 'eu-central',
    fr: 'eu-west',
    es: 'eu-west',
    pt: 'eu-west',
    ja: 'asia-pacific',
};

// Map user countries to CDN regions
const countryToCdnRegion: Record<string, string> = {
    DE: 'eu-central',
    AT: 'eu-central',
    CH: 'eu-central',
    FR: 'eu-west',
    GB: 'eu-west',
    IE: 'eu-west',
    ES: 'eu-west',
    PT: 'eu-west',
    IT: 'eu-west',
    NL: 'eu-west',
    BE: 'eu-west',
    US: 'us-east',
    CA: 'us-east',
    JP: 'asia-pacific',
    AU: 'asia-pacific',
    NZ: 'asia-pacific',
    SG: 'asia-pacific',
    KR: 'asia-pacific',
};

/**
 * Get optimal CDN endpoint for a locale
 */
export function getCdnEndpointForLocale(locale: string): CDNEndpoint {
    const region = localeToCdnRegion[locale] || 'eu-west';
    return cdnEndpoints.find(e => e.region === region) || cdnEndpoints[0];
}

/**
 * Get optimal CDN endpoint for a country
 */
export function getCdnEndpointForCountry(country: string): CDNEndpoint {
    const region = countryToCdnRegion[country] || 'eu-west';
    return cdnEndpoints.find(e => e.region === region) || cdnEndpoints[0];
}

/**
 * Build CDN URL for an asset
 */
export function buildCdnUrl(assetPath: string, locale: string): string {
    const endpoint = getCdnEndpointForLocale(locale);

    // Check if asset has localized version
    const localizedPath = assetPath.includes('/messages/')
        ? assetPath.replace('/messages/', `/messages/${locale}/`)
        : assetPath;

    return `${endpoint.baseUrl}${localizedPath}`;
}

/**
 * Preload critical assets for a locale
 */
export function getPreloadAssets(locale: string): AssetConfig[] {
    const endpoint = getCdnEndpointForLocale(locale);

    return [
        {
            path: `/messages/${locale}.json`,
            localizedVersions: [locale],
            cacheControl: 'public, max-age=86400, stale-while-revalidate=3600',
            priority: 'high',
        },
        {
            path: '/fonts/inter.woff2',
            localizedVersions: ['*'],
            cacheControl: 'public, max-age=31536000, immutable',
            priority: 'high',
        },
        {
            path: '/icons/sprite.svg',
            localizedVersions: ['*'],
            cacheControl: 'public, max-age=604800',
            priority: 'medium',
        },
    ];
}

/**
 * Generate link preload tags for critical assets
 */
export function generatePreloadTags(locale: string): string[] {
    const assets = getPreloadAssets(locale);
    const endpoint = getCdnEndpointForLocale(locale);

    return assets
        .filter(a => a.priority === 'high')
        .map(asset => {
            const url = `${endpoint.baseUrl}${asset.path}`;
            const as = asset.path.endsWith('.json') ? 'fetch' :
                asset.path.endsWith('.woff2') ? 'font' : 'image';
            return `<link rel="preload" href="${url}" as="${as}" crossorigin="anonymous">`;
        });
}

/**
 * Cache-busting configuration
 */
export const cacheConfig = {
    translationBundles: {
        maxAge: 86400, // 24 hours
        staleWhileRevalidate: 3600, // 1 hour
    },
    staticAssets: {
        maxAge: 31536000, // 1 year
        immutable: true,
    },
    dynamicContent: {
        maxAge: 0,
        mustRevalidate: true,
    },
};

export default {
    cdnEndpoints,
    getCdnEndpointForLocale,
    getCdnEndpointForCountry,
    buildCdnUrl,
    getPreloadAssets,
    generatePreloadTags,
    cacheConfig,
};
