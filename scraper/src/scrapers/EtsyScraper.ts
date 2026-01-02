import { Page } from 'puppeteer';
import { BaseScraper, ScrapedProduct, Availability } from './BaseScraper.js';
import config from '../config.js';
import logger from '../logger.js';

/**
 * Etsy product scraper
 * Supports: etsy.com listings
 */
export class EtsyScraper extends BaseScraper {
    constructor() {
        super('etsy', 'EtsyScraper');
    }

    getUrlPatterns(): RegExp[] {
        return [
            /etsy\.com\/listing\/(\d+)/i,
            /etsy\.com\/[a-z]{2}\/listing\/(\d+)/i,
        ];
    }

    parseUrl(url: string): { marketplaceId: string; region?: string } | null {
        const match = url.match(/\/listing\/(\d+)/);
        if (!match) return null;

        return {
            marketplaceId: match[1],
        };
    }

    protected async waitForContent(page: Page): Promise<void> {
        try {
            await Promise.race([
                page.waitForSelector('[data-buy-box-listing-id]', { timeout: 10000 }),
                page.waitForSelector('h1', { timeout: 10000 }),
                page.waitForSelector('[data-selector="listing-page-title"]', { timeout: 10000 }),
            ]);
        } catch {
            // Continue anyway
        }
        await this.delay(500);
    }

    protected async checkForBlocks(page: Page): Promise<boolean> {
        const content = await page.content();
        const blockIndicators = [
            'verify you are a human',
            'captcha',
            'automated access',
            'please confirm you are not a robot',
        ];

        const lowerContent = content.toLowerCase();
        return blockIndicators.some((indicator) => lowerContent.includes(indicator));
    }

    protected async extractProduct(page: Page, url: string): Promise<ScrapedProduct> {
        const parsed = this.parseUrl(url);
        if (!parsed) {
            throw new Error('Failed to parse Etsy URL');
        }

        const data = await page.evaluate(() => {
            const getText = (selector: string): string | null => {
                const el = document.querySelector(selector);
                return el?.textContent?.trim() || null;
            };

            const getAttr = (selector: string, attr: string): string | null => {
                const el = document.querySelector(selector);
                return el?.getAttribute(attr) || null;
            };

            // Title
            const title =
                getText('h1[data-buy-box-listing-title]') ||
                getText('[data-selector="listing-page-title"]') ||
                getText('h1');

            // Price
            const priceText =
                getText('[data-selector="price-only"] .wt-text-title-larger') ||
                getText('.wt-text-title-larger.lc-price') ||
                getText('[data-buy-box-region="price"] .wt-text-title-larger') ||
                getText('.wt-mr-xs-2.lc-price');

            // Original price (if on sale)
            const originalPriceText = getText('[data-selector="price-only"] .wt-text-strikethrough');

            // Image
            const imageUrl =
                getAttr('.wt-max-width-full.wt-horizontal-center img', 'src') ||
                getAttr('[data-carousel-pagination] img', 'src') ||
                getAttr('.carousel-container img', 'src');

            // Shop name (seller)
            const sellerName =
                getText('[data-shop-name-link]') ||
                getText('a[href*="/shop/"]');

            // Description
            const description = getText('[data-product-details-description-text-content]');

            // Category (breadcrumb)
            const categoryBreadcrumbs = document.querySelectorAll('[data-ui="breadcrumbs"] li');
            const category = categoryBreadcrumbs.length > 0
                ? categoryBreadcrumbs[categoryBreadcrumbs.length - 1]?.textContent?.trim()
                : null;

            // Rating
            const ratingText = getAttr('[data-reviews-carousel] [aria-label]', 'aria-label');
            const reviewCountEl = document.querySelector('[data-reviews-carousel] a');
            const reviewCountText = reviewCountEl?.textContent;

            // Stock/availability
            const availabilityText =
                getText('[data-selector="inventory-label"]') ||
                getText('.wt-badge--status-warning');

            // Shipping
            const shippingText = getText('[data-estimated-delivery] .wt-text-caption');

            return {
                title,
                priceText,
                originalPriceText,
                imageUrl,
                sellerName,
                description,
                category,
                ratingText,
                reviewCountText,
                availabilityText,
                shippingText,
            };
        });

        // Parse availability
        let availability: Availability = 'in_stock';
        if (data.availabilityText) {
            const lower = data.availabilityText.toLowerCase();
            if (lower.includes('only') || lower.includes('low in stock') || lower.includes('few left')) {
                availability = 'limited';
            } else if (lower.includes('sold out') || lower.includes('unavailable')) {
                availability = 'out_of_stock';
            }
        }

        // Parse rating
        let rating: number | undefined;
        if (data.ratingText) {
            const ratingMatch = data.ratingText.match(/(\d+(?:\.\d+)?)\s*(?:out of|stars)/i);
            if (ratingMatch) {
                rating = parseFloat(ratingMatch[1]);
            }
        }

        // Parse review count
        let reviewCount: number | undefined;
        if (data.reviewCountText) {
            const countMatch = data.reviewCountText.replace(/[,.\s]/g, '').match(/(\d+)/);
            if (countMatch) {
                reviewCount = parseInt(countMatch[1], 10);
            }
        }

        const product: ScrapedProduct = {
            marketplace: 'etsy',
            marketplaceId: parsed.marketplaceId,
            url,
            title: this.cleanText(data.title),
            description: this.cleanText(data.description)?.substring(0, 1000),
            imageUrl: data.imageUrl || undefined,
            category: this.cleanText(data.category),
            price: this.parsePrice(data.priceText || ''),
            currency: this.detectCurrency(data.priceText || ''),
            availability,
            sellerType: 'third_party_new',
            sellerName: this.cleanText(data.sellerName),
            rating,
            reviewCount,
            scrapedAt: new Date(),
        };

        logger.debug(`[EtsyScraper] Extracted: ${product.title}, €${product.price}`);
        return product;
    }

    /**
     * Alternative: Use Etsy Open API if configured
     */
    async scrapeViaApi(listingId: string): Promise<ScrapedProduct | null> {
        if (!config.etsy.apiKey) {
            return null;
        }

        try {
            const response = await fetch(
                `https://openapi.etsy.com/v3/application/listings/${listingId}`,
                {
                    headers: {
                        'x-api-key': config.etsy.apiKey,
                    },
                }
            );

            if (!response.ok) {
                logger.warn(`Etsy API returned ${response.status}`);
                return null;
            }

            interface EtsyApiResponse {
                url: string;
                title: string;
                description?: string;
                price?: { amount: number; divisor: number; currency_code?: string };
                state: string;
            }

            const data = await response.json() as EtsyApiResponse;

            return {
                marketplace: 'etsy',
                marketplaceId: listingId,
                url: data.url,
                title: data.title,
                description: data.description?.substring(0, 1000),
                price: data.price ? data.price.amount / data.price.divisor : undefined,
                currency: data.price?.currency_code || 'USD',
                availability: data.state === 'active' ? 'in_stock' : 'out_of_stock',
                sellerType: 'third_party_new',
                scrapedAt: new Date(),
            };
        } catch (error) {
            logger.error('Etsy API error:', error);
            return null;
        }
    }
}

export default EtsyScraper;

