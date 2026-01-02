import { Page } from 'puppeteer';
import { browserManager } from '../browser/BrowserManager.js';
import { scraperApi } from '../browser/ScraperApi.js';
import config from '../config.js';
import logger from '../logger.js';

export type Marketplace = 'amazon' | 'etsy' | 'otto';
export type Availability = 'in_stock' | 'out_of_stock' | 'limited' | 'unknown';

export interface ScrapedProduct {
    marketplace: Marketplace;
    marketplaceId: string;
    region?: string;
    url: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    brand?: string;
    category?: string;
    price?: number;
    currency?: string;
    availability?: Availability;
    sellerType?: 'marketplace' | 'third_party_new' | 'third_party_used';
    sellerName?: string;
    shippingCost?: number;
    rating?: number;
    reviewCount?: number;
    scrapedAt: Date;
}

export interface ScrapeResult {
    success: boolean;
    product?: ScrapedProduct;
    error?: string;
    duration: number;
}

/**
 * Abstract base class for marketplace scrapers
 * Now with ScraperAPI integration for difficult sites
 */
export abstract class BaseScraper {
    protected marketplace: Marketplace;
    protected name: string;

    constructor(marketplace: Marketplace, name: string) {
        this.marketplace = marketplace;
        this.name = name;
    }

    /**
     * Scrape a product URL
     * Uses ScraperAPI for Amazon if enabled, otherwise uses Puppeteer
     */
    async scrape(url: string): Promise<ScrapeResult> {
        const startTime = Date.now();

        // Try ScraperAPI first for supported marketplaces
        if (scraperApi.shouldUseFor(this.marketplace)) {
            const result = await this.scrapeWithApi(url);
            if (result.success) {
                return result;
            }
            logger.warn(`[${this.name}] ScraperAPI failed, falling back to Puppeteer`);
        }

        // Standard Puppeteer scraping
        return this.scrapeWithPuppeteer(url, startTime);
    }

    /**
     * Scrape using ScraperAPI (for sites with heavy anti-bot like Amazon)
     */
    private async scrapeWithApi(url: string): Promise<ScrapeResult> {
        const startTime = Date.now();

        try {
            logger.debug(`[${this.name}] Using ScraperAPI for: ${url}`);

            // Determine country code from URL
            const country = this.getCountryFromUrl(url);

            const result = await scraperApi.fetch(url, {
                render: true, // Enable JavaScript rendering
                country: country,
            });

            if (!result.success || !result.html) {
                return {
                    success: false,
                    error: result.error || 'ScraperAPI returned no content',
                    duration: Date.now() - startTime,
                };
            }

            // Parse the HTML using a temporary page
            const page = await browserManager.getPage();
            try {
                await page.setContent(result.html, { waitUntil: 'domcontentloaded' });
                const product = await this.extractProduct(page, url);

                const duration = Date.now() - startTime;
                logger.info(`[${this.name}] ScraperAPI success in ${duration}ms: ${url}`);

                browserManager.markProxySuccess();

                return {
                    success: true,
                    product,
                    duration,
                };
            } finally {
                await browserManager.releasePage(page);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`[${this.name}] ScraperAPI error: ${errorMessage}`);

            return {
                success: false,
                error: errorMessage,
                duration: Date.now() - startTime,
            };
        }
    }

    /**
     * Standard Puppeteer scraping
     */
    private async scrapeWithPuppeteer(url: string, startTime: number): Promise<ScrapeResult> {
        let page: Page | null = null;

        try {
            logger.debug(`[${this.name}] Starting Puppeteer scrape: ${url}`);

            // Get page from pool
            page = await browserManager.getPage();

            // Navigate to URL with timeout
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: config.scraping.timeoutMs,
            });

            // Wait for dynamic content
            await this.waitForContent(page);

            // Check for blocks/captchas
            const blocked = await this.checkForBlocks(page);
            if (blocked) {
                throw new Error('Access blocked - possible CAPTCHA or rate limit');
            }

            // Extract product data
            const product = await this.extractProduct(page, url);

            const duration = Date.now() - startTime;
            logger.info(`[${this.name}] Scraped successfully in ${duration}ms: ${url}`);

            browserManager.markProxySuccess();

            return {
                success: true,
                product,
                duration,
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            logger.error(`[${this.name}] Scrape failed: ${errorMessage}`, { url });

            return {
                success: false,
                error: errorMessage,
                duration,
            };
        } finally {
            if (page) {
                await browserManager.releasePage(page);
            }
        }
    }

    /**
     * Extract country code from URL for ScraperAPI
     */
    private getCountryFromUrl(url: string): string {
        if (url.includes('amazon.de')) return 'de';
        if (url.includes('amazon.co.uk')) return 'uk';
        if (url.includes('amazon.fr')) return 'fr';
        if (url.includes('amazon.it')) return 'it';
        if (url.includes('amazon.es')) return 'es';
        if (url.includes('etsy.com')) return 'us';
        return 'us'; // Default
    }

    /**
     * Wait for page content to load (override in subclasses)
     */
    protected async waitForContent(page: Page): Promise<void> {
        // Default: wait a bit for any JS to execute
        await this.delay(1000);
    }

    /**
     * Check if page is blocked (CAPTCHA, rate limit, etc.)
     */
    protected async checkForBlocks(page: Page): Promise<boolean> {
        const content = await page.content();
        const blockedPatterns = [
            'captcha',
            'robot',
            'blocked',
            'access denied',
            'too many requests',
            'unusual traffic',
        ];

        const lowerContent = content.toLowerCase();
        return blockedPatterns.some((pattern) => lowerContent.includes(pattern));
    }

    /**
     * Extract product data from page (must be implemented by subclasses)
     */
    protected abstract extractProduct(page: Page, url: string): Promise<ScrapedProduct>;

    /**
     * Parse marketplace ID from URL (must be implemented by subclasses)
     */
    abstract parseUrl(url: string): { marketplaceId: string; region?: string } | null;

    /**
     * Get supported URL patterns
     */
    abstract getUrlPatterns(): RegExp[];

    /**
     * Check if this scraper can handle the URL
     */
    canHandle(url: string): boolean {
        return this.getUrlPatterns().some((pattern) => pattern.test(url));
    }

    /**
     * Delay helper
     */
    protected delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Parse price string to number
     */
    protected parsePrice(priceText: string): number | undefined {
        if (!priceText) return undefined;

        // Remove currency symbols and normalize
        const normalized = priceText
            .replace(/[€$£¥]/g, '')
            .replace(/\s/g, '')
            .replace(/,(\d{2})$/, '.$1')  // Handle European format (1.234,56)
            .replace(/\./g, '')           // Remove thousand separators
            .replace(',', '.');           // Convert comma to decimal

        const price = parseFloat(normalized);
        return isNaN(price) ? undefined : price;
    }

    /**
     * Detect currency from text
     */
    protected detectCurrency(text: string): string {
        if (text.includes('€') || text.includes('EUR')) return 'EUR';
        if (text.includes('$') || text.includes('USD')) return 'USD';
        if (text.includes('£') || text.includes('GBP')) return 'GBP';
        return 'EUR'; // Default for European markets
    }

    /**
     * Clean text by removing extra whitespace
     */
    protected cleanText(text: string | null | undefined): string | undefined {
        if (!text) return undefined;
        return text.replace(/\s+/g, ' ').trim() || undefined;
    }
}

export default BaseScraper;
