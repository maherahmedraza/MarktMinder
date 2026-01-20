import { query } from './database.js';
import logger from './logger.js';

/**
 * database-optimizer.ts
 * Adds performance indexes to the database
 */

async function optimizeDatabase() {
    logger.info('Starting database optimization...');

    try {
        const indexes = [
            // Products - for scheduler sorting and filtering
            'CREATE INDEX IF NOT EXISTS idx_products_last_scraped ON products(last_scraped_at)',
            'CREATE INDEX IF NOT EXISTS idx_products_priority ON products(scrape_priority DESC)',
            'CREATE INDEX IF NOT EXISTS idx_products_error_count ON products(scrape_error_count)',

            // Alerts - for scheduler priority calculation
            'CREATE INDEX IF NOT EXISTS idx_alerts_active_product ON alerts(product_id) WHERE is_active = TRUE',

            // Price History - for volatility calculation
            'CREATE INDEX IF NOT EXISTS idx_price_history_product_time ON price_history(product_id, time DESC)',

            // User Products - for popularity calculation
            'CREATE INDEX IF NOT EXISTS idx_user_products_product ON user_products(product_id)'
        ];

        for (const idx of indexes) {
            await query(idx);
            logger.info(`Applied index: ${idx.split('ON')[1]?.split('(')[0] || 'Unknown'}`);
        }

        logger.info('Database optimization complete');
    } catch (error) {
        logger.error('Database optimization failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    optimizeDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

export { optimizeDatabase };
