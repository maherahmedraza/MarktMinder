/**
 * Seed Historical Price Data
 * 
 * Generates realistic historical price data for testing products.
 * Usage: npx tsx src/scripts/seed-historical-data.ts [productId]
 */

import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

const DAYS_OF_HISTORY = 90;

interface PricePattern {
    dayOfWeek: number;  // 0-6
    modifier: number;   // % change
}

// Weekend drops are common
const weeklyPatterns: PricePattern[] = [
    { dayOfWeek: 5, modifier: -3 },  // Friday
    { dayOfWeek: 6, modifier: -5 },  // Saturday
    { dayOfWeek: 0, modifier: -4 },  // Sunday
];

// Flash sales
interface SaleEvent {
    probability: number;
    dropPercentage: number;
    duration: number; // days
}

const saleEvents: SaleEvent[] = [
    { probability: 0.02, dropPercentage: 30, duration: 2 },  // Big sale (2%)
    { probability: 0.05, dropPercentage: 15, duration: 3 },  // Medium sale (5%)
    { probability: 0.10, dropPercentage: 8, duration: 1 },   // Small sale (10%)
];

function generatePriceHistory(basePrice: number): { price: number; date: Date }[] {
    const history: { price: number; date: Date }[] = [];
    const now = new Date();
    let currentPrice = basePrice * (1 + (Math.random() * 0.3 - 0.15)); // Start ±15%

    for (let i = DAYS_OF_HISTORY; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(8 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);

        // Apply weekly pattern
        const dayOfWeek = date.getDay();
        const weeklyMod = weeklyPatterns.find(p => p.dayOfWeek === dayOfWeek);
        if (weeklyMod) {
            currentPrice *= (1 + weeklyMod.modifier / 100);
        }

        // Random daily fluctuation (±3%)
        currentPrice *= (1 + (Math.random() * 0.06 - 0.03));

        // Sale events
        for (const sale of saleEvents) {
            if (Math.random() < sale.probability) {
                // Apply sale for this day
                const salePrice = currentPrice * (1 - sale.dropPercentage / 100);
                history.push({ price: Math.round(salePrice * 100) / 100, date: new Date(date) });
                continue;
            }
        }

        // Trend towards base price (mean reversion)
        if (currentPrice > basePrice * 1.2) {
            currentPrice *= 0.98; // Reduce if too high
        } else if (currentPrice < basePrice * 0.8) {
            currentPrice *= 1.02; // Increase if too low
        }

        // Keep price reasonable
        currentPrice = Math.max(basePrice * 0.5, Math.min(basePrice * 1.5, currentPrice));

        history.push({
            price: Math.round(currentPrice * 100) / 100,
            date: new Date(date)
        });
    }

    return history;
}

async function seedHistoricalData(productId?: string) {
    logger.info('Starting historical data seeding...');

    try {
        // Get products to seed
        let products;
        if (productId) {
            products = await query(
                'SELECT id, current_price, title FROM products WHERE id = $1',
                [productId]
            );
        } else {
            products = await query(
                'SELECT id, current_price, title FROM products WHERE current_price IS NOT NULL LIMIT 50'
            );
        }

        if (products.rows.length === 0) {
            logger.warn('No products found to seed');
            return;
        }

        logger.info(`Found ${products.rows.length} products to seed with historical data`);

        for (const product of products.rows) {
            const basePrice = parseFloat(product.current_price) || 50;

            // Check existing history
            const existing = await query(
                'SELECT COUNT(*) FROM price_history WHERE product_id = $1',
                [product.id]
            );

            if (parseInt(existing.rows[0].count) > 10) {
                logger.info(`Product ${product.id} already has history, skipping`);
                continue;
            }

            const history = generatePriceHistory(basePrice);

            // Insert price history
            for (const entry of history) {
                await query(
                    `INSERT INTO price_history (product_id, price, currency, time)
                     VALUES ($1, $2, 'EUR', $3)
                     ON CONFLICT DO NOTHING`,
                    [product.id, entry.price, entry.date]
                );
            }

            // Update product with latest stats
            const latestPrice = history[history.length - 1].price;
            const lowestPrice = Math.min(...history.map(h => h.price));
            const highestPrice = Math.max(...history.map(h => h.price));

            await query(
                `UPDATE products SET
                    current_price = $1,
                    lowest_price = $2,
                    highest_price = $3,
                    updated_at = NOW()
                 WHERE id = $4`,
                [latestPrice, lowestPrice, highestPrice, product.id]
            );

            logger.info(`Seeded ${history.length} price points for "${product.title}"`);
        }

        logger.info('Historical data seeding complete!');
    } catch (error) {
        logger.error('Failed to seed historical data:', error);
        throw error;
    }
}

// Run if executed directly
const productIdArg = process.argv[2];
seedHistoricalData(productIdArg)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));

export { seedHistoricalData, generatePriceHistory };
