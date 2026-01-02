import { Page } from 'puppeteer';
import { BaseScraper, ScrapedProduct, Availability } from './BaseScraper.js';
import logger from '../logger.js';

/**
 * Otto.de product scraper
 * Supports: otto.de product pages
 */
export class OttoScraper extends BaseScraper {
    constructor() {
        super('otto', 'OttoScraper');
    }

    getUrlPatterns(): RegExp[] {
        return [
            /otto\.de\/p\/([^\/\?#]+)/i,
            /otto\.de\/[^\/]+\/p\/([^\/\?#]+)/i,
            /otto\.de\/p\/share\/w\/([A-Z0-9]+)/i,
        ];
    }

    parseUrl(url: string): { marketplaceId: string; region?: string } | null {
        // Handle share URLs: https://www.otto.de/p/share/w/S0TBG0TCFAAA
        const shareMatch = url.match(/\/p\/share\/w\/([A-Z0-9]+)/);
        if (shareMatch) {
            return {
                marketplaceId: shareMatch[1],
                region: 'de',
            };
        }

        // Otto URLs: https://www.otto.de/p/produktname-123456789/
        const match = url.match(/\/p\/([^\/\?#]+)/);
        if (!match) return null;

        // Extract article number from end of slug
        const slug = match[1];
        const articleMatch = slug.match(/(\d{9,})$/);

        return {
            marketplaceId: articleMatch ? articleMatch[1] : slug,
            region: 'de',
        };
    }

    protected async waitForContent(page: Page): Promise<void> {
        try {
            await Promise.race([
                page.waitForSelector('[data-qa="product-name"]', { timeout: 10000 }),
                page.waitForSelector('.pdp_product-name', { timeout: 10000 }),
                page.waitForSelector('h1', { timeout: 10000 }),
            ]);
        } catch {
            // Continue anyway
        }
        await this.delay(500);
    }

    protected async checkForBlocks(page: Page): Promise<boolean> {
        const content = await page.content();
        const blockIndicators = [
            'captcha',
            'robot',
            'automated access',
            'sicherheitsabfrage',
        ];

        const lowerContent = content.toLowerCase();
        return blockIndicators.some((indicator) => lowerContent.includes(indicator));
    }

    protected async extractProduct(page: Page, url: string): Promise<ScrapedProduct> {
        const parsed = this.parseUrl(url);
        if (!parsed) {
            throw new Error('Failed to parse Otto URL');
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
                getText('[data-qa="product-name"]') ||
                getText('.pdp_product-name') ||
                getText('h1.p_name');

            // Brand
            const brand =
                getText('[data-qa="brand-name"]') ||
                getText('.pdp_brand-name') ||
                getText('.p_brand');

            // Price
            const priceText =
                getText('[data-qa="product-price"]') ||
                getText('.pdp_price__main') ||
                getText('.p_price') ||
                getText('[data-qa="price"]');

            // Original price (if discounted)
            const originalPriceText =
                getText('[data-qa="crossed-out-price"]') ||
                getText('.pdp_price__crossed') ||
                getText('.p_price--old');

            // Image
            const imageUrl =
                getAttr('[data-qa="product-image"] img', 'src') ||
                getAttr('.pdp_gallery__main-image img', 'src') ||
                getAttr('.p_image img', 'src');

            // Availability
            const availabilityText =
                getText('[data-qa="delivery-promise"]') ||
                getText('.pdp_delivery-promise') ||
                getText('[data-qa="availability"]');

            // Category (breadcrumb)
            const breadcrumbs = document.querySelectorAll('[data-qa="breadcrumb"] a, .p_breadcrumb a');
            const category = breadcrumbs.length > 0
                ? breadcrumbs[breadcrumbs.length - 1]?.textContent?.trim()
                : null;

            // Description
            const description =
                getText('[data-qa="product-description"]') ||
                getText('.pdp_description') ||
                getText('.p_description');

            // Rating
            const ratingEl = document.querySelector('[data-qa="rating"] .rating__value, .p_rating__value');
            const ratingText = ratingEl?.textContent;

            const reviewCountEl = document.querySelector('[data-qa="review-count"], .p_rating__count');
            const reviewCountText = reviewCountEl?.textContent;

            // Seller info
            const sellerName =
                getText('[data-qa="seller-name"]') ||
                getText('.pdp_seller-name');

            // Check if sold by Otto or third party
            const isOttoSeller =
                document.querySelector('[data-qa="sold-by-otto"]') !== null ||
                (sellerName && sellerName.toLowerCase().includes('otto'));

            return {
                title,
                brand,
                priceText,
                originalPriceText,
                imageUrl,
                availabilityText,
                category,
                description,
                ratingText,
                reviewCountText,
                sellerName,
                isOttoSeller,
            };
        });

        // Parse availability
        let availability: Availability = 'unknown';
        if (data.availabilityText) {
            const lower = data.availabilityText.toLowerCase();
            if (
                lower.includes('sofort') ||
                lower.includes('lieferbar') ||
                lower.includes('auf lager') ||
                lower.includes('versandfertig')
            ) {
                availability = 'in_stock';
            } else if (
                lower.includes('nicht lieferbar') ||
                lower.includes('ausverkauft') ||
                lower.includes('nicht verfügbar')
            ) {
                availability = 'out_of_stock';
            } else if (lower.includes('wenige')) {
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
            const countMatch = data.reviewCountText.replace(/[.\s]/g, '').match(/(\d+)/);
            if (countMatch) {
                reviewCount = parseInt(countMatch[1], 10);
            }
        }

        const product: ScrapedProduct = {
            marketplace: 'otto',
            marketplaceId: parsed.marketplaceId,
            region: 'de',
            url,
            title: this.cleanText(data.title),
            description: this.cleanText(data.description)?.substring(0, 1000),
            imageUrl: data.imageUrl || undefined,
            brand: this.cleanText(data.brand),
            category: this.cleanText(data.category),
            price: this.parsePrice(data.priceText || ''),
            currency: 'EUR',
            availability,
            sellerType: data.isOttoSeller ? 'marketplace' : 'third_party_new',
            sellerName: this.cleanText(data.sellerName),
            rating,
            reviewCount,
            scrapedAt: new Date(),
        };

        logger.debug(`[OttoScraper] Extracted: ${product.title}, €${product.price}`);
        return product;
    }
}

export default OttoScraper;
