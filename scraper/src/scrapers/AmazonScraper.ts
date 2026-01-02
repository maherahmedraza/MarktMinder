import { Page } from 'puppeteer';
import { BaseScraper, ScrapedProduct, Availability } from './BaseScraper.js';
import logger from '../logger.js';

/**
 * Amazon product scraper
 * Supports: amazon.com, amazon.de, amazon.co.uk, amazon.fr, amazon.it, amazon.es
 */
export class AmazonScraper extends BaseScraper {
    private static readonly REGIONS: Record<string, string> = {
        'amazon.com': 'us',
        'amazon.de': 'de',
        'amazon.co.uk': 'uk',
        'amazon.fr': 'fr',
        'amazon.it': 'it',
        'amazon.es': 'es',
        'amazon.nl': 'nl',
        'amazon.ca': 'ca',
    };

    constructor() {
        super('amazon', 'AmazonScraper');
    }

    getUrlPatterns(): RegExp[] {
        return [
            /amazon\.(com|de|co\.uk|fr|it|es|nl|ca)\/.*\/dp\/[A-Z0-9]{10}/i,
            /amazon\.(com|de|co\.uk|fr|it|es|nl|ca)\/dp\/[A-Z0-9]{10}/i,
            /amazon\.(com|de|co\.uk|fr|it|es|nl|ca)\/gp\/product\/[A-Z0-9]{10}/i,
            /amazon\.(com|de|co\.uk|fr|it|es|nl|ca)\/gp\/aw\/d\/[A-Z0-9]{10}/i,
        ];
    }

    parseUrl(url: string): { marketplaceId: string; region?: string } | null {
        // Extract ASIN
        const asinMatch = url.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
        if (!asinMatch) return null;

        // Extract region from domain
        const domainMatch = url.match(/amazon\.(com|de|co\.uk|fr|it|es|nl|ca)/i);
        const domain = domainMatch ? `amazon.${domainMatch[1]}` : 'amazon.com';
        const region = AmazonScraper.REGIONS[domain.toLowerCase()] || 'us';

        return {
            marketplaceId: asinMatch[1].toUpperCase(),
            region,
        };
    }

    protected async waitForContent(page: Page): Promise<void> {
        try {
            // Wait for product title or price to appear
            await Promise.race([
                page.waitForSelector('#productTitle', { timeout: 10000 }),
                page.waitForSelector('#title', { timeout: 10000 }),
                page.waitForSelector('.a-price', { timeout: 10000 }),
            ]);
        } catch {
            // Continue anyway - page might have loaded differently
        }
        await this.delay(500);
    }

    protected async checkForBlocks(page: Page): Promise<boolean> {
        const url = page.url();

        // Check for CAPTCHA page
        if (url.includes('captcha') || url.includes('validateCaptcha')) {
            return true;
        }

        // Check page content for block indicators
        const content = await page.content();
        const blockIndicators = [
            'enter the characters you see below',
            'sorry, we just need to make sure',
            'robot',
            'automated access',
        ];

        const lowerContent = content.toLowerCase();
        return blockIndicators.some((indicator) => lowerContent.includes(indicator));
    }

    protected async extractProduct(page: Page, url: string): Promise<ScrapedProduct> {
        const parsed = this.parseUrl(url);
        if (!parsed) {
            throw new Error('Failed to parse Amazon URL');
        }

        // Extract data using page.evaluate
        const data = await page.evaluate(() => {
            // Helper to get text content
            const getText = (selector: string): string | null => {
                const el = document.querySelector(selector);
                return el?.textContent?.trim() || null;
            };

            // Helper to get attribute
            const getAttr = (selector: string, attr: string): string | null => {
                const el = document.querySelector(selector);
                return el?.getAttribute(attr) || null;
            };

            // Title
            const title = getText('#productTitle') || getText('#title') || getText('h1.a-size-large');

            // Price - try multiple selectors
            let priceText =
                getText('.a-price .a-offscreen') ||
                getText('#priceblock_ourprice') ||
                getText('#priceblock_dealprice') ||
                getText('#priceblock_saleprice') ||
                getText('.a-price-whole') ||
                getText('#corePrice_feature_div .a-price .a-offscreen') ||
                getText('#apex_offerDisplay_desktop .a-price .a-offscreen') ||
                getText('.priceToPay .a-offscreen');

            // If no direct price, try combining whole and fraction
            if (!priceText) {
                const whole = getText('.a-price-whole');
                const fraction = getText('.a-price-fraction');
                if (whole) {
                    priceText = whole.replace(',', '') + (fraction ? '.' + fraction : '');
                }
            }

            // Image
            const imageUrl =
                getAttr('#landingImage', 'src') ||
                getAttr('#imgBlkFront', 'src') ||
                getAttr('#main-image', 'src') ||
                getAttr('.a-dynamic-image', 'src');

            // Availability
            const availabilityText =
                getText('#availability span') ||
                getText('#availability') ||
                getText('#outOfStock');

            // Brand
            const brand =
                getText('#bylineInfo') ||
                getText('.po-brand .po-break-word') ||
                getText('a#bylineInfo');

            // Category (breadcrumb)
            const categoryEl = document.querySelector('#wayfinding-breadcrumbs_container ul li:last-child a');
            const category = categoryEl?.textContent?.trim();

            // Description
            const description =
                getText('#productDescription p') ||
                getText('#feature-bullets ul');

            // Rating
            const ratingText = getText('.a-icon-alt');
            const reviewCountText = getText('#acrCustomerReviewText');

            // Seller info
            const sellerName =
                getText('#sellerProfileTriggerId') ||
                getText('#merchant-info a');

            return {
                title,
                priceText,
                imageUrl,
                availabilityText,
                brand,
                category,
                description,
                ratingText,
                reviewCountText,
                sellerName,
            };
        });

        // Parse availability
        let availability: Availability = 'unknown';
        if (data.availabilityText) {
            const lower = data.availabilityText.toLowerCase();
            if (lower.includes('in stock') || lower.includes('auf lager') || lower.includes('en stock')) {
                availability = 'in_stock';
            } else if (lower.includes('out of stock') || lower.includes('nicht verfügbar') || lower.includes('no disponible')) {
                availability = 'out_of_stock';
            } else if (lower.includes('only') || lower.includes('nur noch') || lower.includes('limited')) {
                availability = 'limited';
            }
        }

        // Parse rating
        let rating: number | undefined;
        if (data.ratingText) {
            const ratingMatch = data.ratingText.match(/(\d+[.,]\d+)/);
            if (ratingMatch) {
                rating = parseFloat(ratingMatch[1].replace(',', '.'));
            }
        }

        // Parse review count
        let reviewCount: number | undefined;
        if (data.reviewCountText) {
            const countMatch = data.reviewCountText.replace(/[.,\s]/g, '').match(/(\d+)/);
            if (countMatch) {
                reviewCount = parseInt(countMatch[1], 10);
            }
        }

        // Detect seller type
        let sellerType: 'marketplace' | 'third_party_new' | 'third_party_used' = 'marketplace';
        if (data.sellerName && !data.sellerName.toLowerCase().includes('amazon')) {
            sellerType = 'third_party_new';
        }

        const product: ScrapedProduct = {
            marketplace: 'amazon',
            marketplaceId: parsed.marketplaceId,
            region: parsed.region,
            url,
            title: this.cleanText(data.title),
            description: this.cleanText(data.description)?.substring(0, 1000),
            imageUrl: data.imageUrl || undefined,
            brand: this.cleanText(data.brand)?.replace(/^(Visit the |Besuche den |Brand: )/i, ''),
            category: this.cleanText(data.category),
            price: this.parsePrice(data.priceText || ''),
            currency: this.detectCurrency(data.priceText || ''),
            availability,
            sellerType,
            sellerName: this.cleanText(data.sellerName),
            rating,
            reviewCount,
            scrapedAt: new Date(),
        };

        logger.debug(`[AmazonScraper] Extracted: ${product.title}, €${product.price}`);
        return product;
    }
}

export default AmazonScraper;
