import { BaseScraper, Marketplace } from './BaseScraper.js';
import { AmazonScraper } from './AmazonScraper.js';
import { EtsyScraper } from './EtsyScraper.js';
import { OttoScraper } from './OttoScraper.js';
import logger from '../logger.js';

/**
 * Scraper factory - returns appropriate scraper for a URL
 */
export class ScraperFactory {
    private scrapers: BaseScraper[];

    constructor() {
        this.scrapers = [
            new AmazonScraper(),
            new EtsyScraper(),
            new OttoScraper(),
        ];

        logger.info(`Initialized ${this.scrapers.length} scrapers`);
    }

    /**
     * Get scraper that can handle the given URL
     */
    getScraperForUrl(url: string): BaseScraper | null {
        for (const scraper of this.scrapers) {
            if (scraper.canHandle(url)) {
                return scraper;
            }
        }
        return null;
    }

    /**
     * Get scraper by marketplace name
     */
    getScraperByMarketplace(marketplace: Marketplace): BaseScraper | null {
        return this.scrapers.find((s) => s['marketplace'] === marketplace) || null;
    }

    /**
     * Detect marketplace from URL
     */
    detectMarketplace(url: string): Marketplace | null {
        const scraper = this.getScraperForUrl(url);
        if (scraper) {
            return scraper['marketplace'] as Marketplace;
        }
        return null;
    }

    /**
     * Parse URL to get marketplace ID and region
     */
    parseUrl(url: string): { marketplace: Marketplace; marketplaceId: string; region?: string } | null {
        const scraper = this.getScraperForUrl(url);
        if (!scraper) return null;

        const parsed = scraper.parseUrl(url);
        if (!parsed) return null;

        return {
            marketplace: scraper['marketplace'] as Marketplace,
            ...parsed,
        };
    }

    /**
     * Get all supported URL patterns
     */
    getSupportedPatterns(): { marketplace: Marketplace; patterns: RegExp[] }[] {
        return this.scrapers.map((s) => ({
            marketplace: s['marketplace'] as Marketplace,
            patterns: s.getUrlPatterns(),
        }));
    }
}

// Singleton instance
export const scraperFactory = new ScraperFactory();

// Re-export everything
export { BaseScraper, AmazonScraper, EtsyScraper, OttoScraper };
export type { ScrapedProduct, ScrapeResult, Marketplace, Availability } from './BaseScraper.js';
