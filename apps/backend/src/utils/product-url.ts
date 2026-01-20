export type Marketplace = 'amazon' | 'etsy' | 'otto';

export interface ParsedProductUrl {
    marketplace: Marketplace;
    marketplaceId: string;
    region?: string;
}

/**
 * Parse product URL to extract marketplace info
 */
export function parseProductUrl(url: string): ParsedProductUrl | null {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // Amazon
        if (hostname.includes('amazon')) {
            const asinMatch = url.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
            if (asinMatch) {
                let region = 'us';
                if (hostname.includes('amazon.de')) region = 'de';
                else if (hostname.includes('amazon.co.uk')) region = 'uk';
                else if (hostname.includes('amazon.fr')) region = 'fr';
                else if (hostname.includes('amazon.it')) region = 'it';
                else if (hostname.includes('amazon.es')) region = 'es';

                return {
                    marketplace: 'amazon',
                    marketplaceId: asinMatch[1].toUpperCase(),
                    region,
                };
            }
        }

        // Etsy
        if (hostname.includes('etsy.com')) {
            const listingMatch = url.match(/\/listing\/(\d+)/);
            if (listingMatch) {
                return {
                    marketplace: 'etsy',
                    marketplaceId: listingMatch[1],
                };
            }
        }

        // Otto
        if (hostname.includes('otto.de')) {
            // Handle share URLs: https://www.otto.de/p/share/w/ID
            const shareMatch = url.match(/\/p\/share\/w\/([A-Z0-9]+)/);
            if (shareMatch) {
                return {
                    marketplace: 'otto',
                    marketplaceId: shareMatch[1],
                    region: 'de',
                };
            }

            const productMatch = url.match(/\/p\/([^\/\?#]+)/);
            if (productMatch) {
                return {
                    marketplace: 'otto',
                    marketplaceId: productMatch[1],
                    region: 'de',

                };
            }
        }

        return null;
    } catch {
        return null;
    }
}
