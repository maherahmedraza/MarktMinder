import { query } from '../database.js';
import { queueManager, ScrapeJobData } from './QueueManager.js';
import config from '../config.js';
import logger from '../logger.js';

/**
 * Smart Scheduler for prioritizing and scheduling scrape jobs
 * 
 * Features:
 * - Priority-based scheduling (user alerts get higher priority)
 * - Frequency adjustment based on price volatility
 * - Time-of-day optimization
 * - Error backoff for problematic products
 */
export class SmartScheduler {
    private isRunning = false;
    private schedulerInterval: NodeJS.Timeout | null = null;

    /**
     * Start the scheduler
     */
    start(intervalMinutes: number = 5): void {
        if (this.isRunning) {
            logger.warn('Scheduler already running');
            return;
        }

        this.isRunning = true;

        // Run immediately
        this.scheduleJobs().catch((err) => {
            logger.error('Error in initial scheduling:', err);
        });

        // Then run at interval
        this.schedulerInterval = setInterval(
            () => {
                this.scheduleJobs().catch((err) => {
                    logger.error('Error in scheduled run:', err);
                });
            },
            intervalMinutes * 60 * 1000
        );

        logger.info(`Smart scheduler started (interval: ${intervalMinutes} minutes)`);
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
        this.isRunning = false;
        logger.info('Smart scheduler stopped');
    }

    /**
     * Schedule jobs for products that need scraping
     */
    async scheduleJobs(): Promise<void> {
        const startTime = Date.now();

        try {
            // Get products that need scraping
            const products = await this.getProductsToScrape();

            if (products.length === 0) {
                logger.debug('No products to schedule');
                return;
            }

            // Calculate priorities
            const jobs = await this.calculatePriorities(products);

            // Add to queue
            await queueManager.addBulkJobs(jobs);

            const duration = Date.now() - startTime;
            logger.info(`Scheduled ${jobs.length} scrape jobs in ${duration}ms`);
        } catch (error) {
            logger.error('Error scheduling jobs:', error);
        }
    }

    /**
     * Get products that are due for scraping
     */
    private async getProductsToScrape(): Promise<any[]> {
        const result = await query(
            `SELECT 
        p.*,
        -- Count active alerts (higher alert count = higher priority)
        (SELECT COUNT(*) FROM alerts a WHERE a.product_id = p.id AND a.is_active = TRUE) as alert_count,
        -- Count tracking users
        (SELECT COUNT(*) FROM user_products up WHERE up.product_id = p.id) as user_count,
        -- Calculate volatility score
        COALESCE(
          (SELECT STDDEV(price) / AVG(price) * 100 
           FROM price_history ph 
           WHERE ph.product_id = p.id 
             AND ph.time > NOW() - INTERVAL '7 days'),
          0
        ) as volatility
       FROM products p
       WHERE 
         -- Never scraped
         (p.last_scraped_at IS NULL)
         -- Or due based on frequency
         OR (p.last_scraped_at < NOW() - (p.scrape_frequency_hours || ' hours')::interval)
       -- Limit to products that aren't erroring too much
       AND p.scrape_error_count < 10
       -- Order by priority factors
       ORDER BY 
         CASE WHEN p.last_scraped_at IS NULL THEN 0 ELSE 1 END,
         p.scrape_priority DESC,
         p.last_scraped_at ASC NULLS FIRST
       LIMIT 500`
        );

        return result.rows;
    }

    /**
     * Calculate priority scores and create job data
     */
    private async calculatePriorities(products: any[]): Promise<ScrapeJobData[]> {
        const jobs: ScrapeJobData[] = [];

        for (const product of products) {
            // Calculate priority based on multiple factors
            let priority = product.scrape_priority || 5;

            // Boost for products with alerts
            if (product.alert_count > 0) {
                priority = Math.min(10, priority + Math.ceil(product.alert_count / 2));
            }

            // Boost for products tracked by many users
            if (product.user_count > 5) {
                priority = Math.min(10, priority + 1);
            }

            // Boost for volatile prices
            if (product.volatility > 10) {
                priority = Math.min(10, priority + 1);
            }

            // Reduce priority for products that keep erroring
            if (product.scrape_error_count > 0) {
                priority = Math.max(1, priority - product.scrape_error_count);
            }

            // Adjust frequency based on volatility
            await this.adjustFrequency(product);

            jobs.push({
                productId: product.id,
                url: product.url,
                marketplace: product.marketplace,
                marketplaceId: product.marketplace_id,
                priority,
                retryCount: 0,
            });
        }

        // Sort by priority (descending)
        jobs.sort((a, b) => b.priority - a.priority);

        return jobs;
    }

    /**
     * Adjust scraping frequency based on price volatility and activity
     */
    private async adjustFrequency(product: any): Promise<void> {
        let newFrequency = 24; // Default: once per day

        // High volatility = scrape more often
        if (product.volatility > 20) {
            newFrequency = 4; // Every 4 hours
        } else if (product.volatility > 10) {
            newFrequency = 8; // Every 8 hours
        } else if (product.volatility > 5) {
            newFrequency = 12; // Every 12 hours
        }

        // Products with active alerts should be scraped more often
        if (product.alert_count > 0) {
            newFrequency = Math.min(newFrequency, 6);
        }

        // Products tracked by many users
        if (product.user_count > 10) {
            newFrequency = Math.min(newFrequency, 8);
        }

        // Don't update if frequency hasn't changed significantly
        if (Math.abs(product.scrape_frequency_hours - newFrequency) < 2) {
            return;
        }

        // Update frequency in database
        await query(
            'UPDATE products SET scrape_frequency_hours = $1 WHERE id = $2',
            [newFrequency, product.id]
        );

        logger.debug(
            `Adjusted frequency for ${product.id}: ${product.scrape_frequency_hours}h -> ${newFrequency}h`
        );
    }

    /**
     * Force immediate scrape for a specific product
     */
    async scrapeNow(productId: string): Promise<void> {
        const result = await query(
            `SELECT id, url, marketplace, marketplace_id, scrape_priority
       FROM products WHERE id = $1`,
            [productId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Product ${productId} not found`);
        }

        const product = result.rows[0];

        await queueManager.addJob({
            productId: product.id,
            url: product.url,
            marketplace: product.marketplace,
            marketplaceId: product.marketplace_id,
            priority: 10, // Highest priority
        });

        logger.info(`Scheduled immediate scrape for product ${productId}`);
    }

    /**
     * Get scheduling statistics
     */
    async getStats(): Promise<{
        totalProducts: number;
        dueProducts: number;
        highPriorityProducts: number;
        averageFrequency: number;
    }> {
        const [total, due, highPriority, avgFreq] = await Promise.all([
            query('SELECT COUNT(*) FROM products'),
            query(
                `SELECT COUNT(*) FROM products 
         WHERE last_scraped_at IS NULL 
           OR last_scraped_at < NOW() - (scrape_frequency_hours || ' hours')::interval`
            ),
            query('SELECT COUNT(*) FROM products WHERE scrape_priority >= 8'),
            query('SELECT AVG(scrape_frequency_hours) FROM products'),
        ]);

        return {
            totalProducts: parseInt(total.rows[0].count),
            dueProducts: parseInt(due.rows[0].count),
            highPriorityProducts: parseInt(highPriority.rows[0].count),
            averageFrequency: parseFloat(avgFreq.rows[0].avg) || 24,
        };
    }
}

// Singleton instance
export const smartScheduler = new SmartScheduler();
export default smartScheduler;
