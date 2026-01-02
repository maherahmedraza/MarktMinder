import { scraperFactory, ScrapedProduct } from '../scrapers/index.js';
import { query } from '../database.js';
import logger from '../logger.js';
import Redis from 'ioredis';
import config from '../config.js';

export interface ScrapeResult {
    success: boolean;
    product?: ScrapedProduct;
    error?: string;
}

export class ScraperService {
    private redis: Redis;

    constructor() {
        this.redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
    }

    /**
     * Process a product scrape: Scrape -> Save -> Alert
     */
    async processProduct(productId: string, url: string): Promise<ScrapeResult> {
        try {
            // 1. Get appropriate scraper
            const scraper = scraperFactory.getScraperForUrl(url);
            if (!scraper) {
                throw new Error(`No scraper available for URL: ${url}`);
            }

            // 2. Perform scrape
            const result = await scraper.scrape(url);

            if (!result.success || !result.product) {
                const errorMsg = result.error || 'Unknown error';
                await this.recordScrapeError(productId, errorMsg);
                return { success: false, error: errorMsg };
            }

            // 3. Save results to database
            await this.saveScrapedData(productId, result.product);

            // 4. Check and trigger alerts
            await this.checkAlerts(productId, result.product.price);

            // 5. Publish completion event for WebSockets
            await this.redis.publish('scrape:completed', JSON.stringify({
                productId,
                price: result.product.price,
                title: result.product.title,
                timestamp: new Date().toISOString()
            }));

            return { success: true, product: result.product };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await this.recordScrapeError(productId, errorMessage);
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Save scraped data to database
     */
    private async saveScrapedData(productId: string, data: ScrapedProduct): Promise<void> {
        // Update product
        await query(
            `UPDATE products SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        image_url = COALESCE($3, image_url),
        brand = COALESCE($4, brand),
        category = COALESCE($5, category),
        current_price = $6,
        currency = $7,
        availability = $8,
        last_scraped_at = NOW(),
        scrape_error_count = 0,
        last_scrape_error = NULL,
        -- Update price statistics
        lowest_price = CASE 
          WHEN lowest_price IS NULL OR $6 < lowest_price THEN $6 
          ELSE lowest_price 
        END,
        lowest_price_date = CASE 
          WHEN lowest_price IS NULL OR $6 < lowest_price THEN NOW() 
          ELSE lowest_price_date 
        END,
        highest_price = CASE 
          WHEN highest_price IS NULL OR $6 > highest_price THEN $6 
          ELSE highest_price 
        END,
        highest_price_date = CASE 
          WHEN highest_price IS NULL OR $6 > highest_price THEN NOW() 
          ELSE highest_price_date 
        END,
        updated_at = NOW()
       WHERE id = $9`,
            [
                data.title,
                data.description,
                data.imageUrl,
                data.brand,
                data.category,
                data.price,
                data.currency,
                data.availability,
                productId,
            ]
        );

        // Insert into price history
        if (data.price !== undefined) {
            await query(
                `INSERT INTO price_history (
          time, product_id, price, currency, availability, seller_type, seller_name
        ) VALUES (NOW(), $1, $2, $3, $4, $5, $6)`,
                [
                    productId,
                    data.price,
                    data.currency || 'EUR',
                    data.availability,
                    data.sellerType,
                    data.sellerName,
                ]
            );
        }

        logger.debug(`Saved scraped data for product ${productId}: €${data.price}`);
    }

    /**
     * Record scrape error
     */
    private async recordScrapeError(productId: string, error: string): Promise<void> {
        await query(
            `UPDATE products SET 
        scrape_error_count = scrape_error_count + 1,
        last_scrape_error = $1,
        last_scraped_at = NOW(),
        updated_at = NOW()
       WHERE id = $2`,
            [error, productId]
        );
    }

    /**
     * Check and trigger price alerts
     */
    private async checkAlerts(productId: string, newPrice?: number): Promise<void> {
        if (newPrice === undefined) return;

        // Get product's lowest price for all-time-low alerts
        const productResult = await query(
            'SELECT lowest_price FROM products WHERE id = $1',
            [productId]
        );
        const lowestPrice = productResult.rows[0]?.lowest_price;

        // Get active alerts for this product
        const alertsResult = await query(
            `SELECT a.*, u.email, u.notification_email, u.notification_push
       FROM alerts a
       JOIN users u ON a.user_id = u.id
       WHERE a.product_id = $1 AND a.is_active = TRUE`,
            [productId]
        );

        for (const alert of alertsResult.rows) {
            let shouldTrigger = false;

            switch (alert.alert_type) {
                case 'price_below':
                    shouldTrigger = alert.target_price && newPrice <= alert.target_price;
                    break;
                case 'price_above':
                    shouldTrigger = alert.target_price && newPrice >= alert.target_price;
                    break;
                case 'all_time_low':
                    shouldTrigger = lowestPrice === null || newPrice < lowestPrice;
                    break;
            }

            if (shouldTrigger) {
                await this.triggerAlert(alert, newPrice);
            }
        }
    }

    /**
     * Trigger an alert
     */
    private async triggerAlert(alert: any, price: number): Promise<void> {
        // Update alert
        await query(
            `UPDATE alerts SET 
        is_triggered = TRUE,
        trigger_count = trigger_count + 1,
        last_triggered_at = NOW(),
        last_triggered_price = $1,
        is_active = CASE WHEN notify_once THEN FALSE ELSE is_active END,
        updated_at = NOW()
       WHERE id = $2`,
            [price, alert.id]
        );

        // Record in alert history
        await query(
            `INSERT INTO alert_history (
        alert_id, user_id, product_id, old_price, new_price
      ) VALUES ($1, $2, $3, $4, $5)`,
            [alert.id, alert.user_id, alert.product_id, alert.last_triggered_price, price]
        );

        logger.info(`Alert ${alert.id} triggered for user ${alert.user_id} at price €${price}`);
    }
}

export const scraperService = new ScraperService();
