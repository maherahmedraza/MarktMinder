import { query } from '../config/database.js';

export interface PriceHistoryEntry {
    time: Date;
    product_id: string;
    price: number;
    currency: string;
    availability?: string;
    seller_type?: string;
    seller_name?: string;
    shipping_cost?: number;
}

export interface PriceStats {
    min_price: number;
    max_price: number;
    avg_price: number;
    current_price: number;
    price_change_24h?: number;
    price_change_7d?: number;
    price_change_30d?: number;
}

export type TimeRange = '1d' | '7d' | '30d' | '90d' | '1y' | 'all';

/**
 * Price History model with database operations
 */
export const PriceHistoryModel = {
    /**
     * Record a new price point
     */
    async record(entry: Omit<PriceHistoryEntry, 'time'>): Promise<PriceHistoryEntry> {
        const result = await query<PriceHistoryEntry>(
            `INSERT INTO price_history (
        time, product_id, price, currency, availability, seller_type, seller_name, shipping_cost
      ) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
            [
                entry.product_id,
                entry.price,
                entry.currency,
                entry.availability,
                entry.seller_type,
                entry.seller_name,
                entry.shipping_cost,
            ]
        );
        return result.rows[0];
    },

    /**
     * Get price history for a product within a time range
     */
    async getHistory(
        productId: string,
        range: TimeRange = '30d',
        limit: number = 1000,
        offset: number = 0
    ): Promise<PriceHistoryEntry[]> {
        let interval: string;

        switch (range) {
            case '1d': interval = '1 day'; break;
            case '7d': interval = '7 days'; break;
            case '30d': interval = '30 days'; break;
            case '90d': interval = '90 days'; break;
            case '1y': interval = '1 year'; break;
            case 'all': interval = '100 years'; break;
            default: interval = '30 days';
        }

        const result = await query<PriceHistoryEntry>(
            `SELECT * FROM price_history 
       WHERE product_id = $1 
         AND time > NOW() - $2::interval
       ORDER BY time ASC
       LIMIT $3 OFFSET $4`,
            [productId, interval, limit, offset]
        );

        return result.rows;
    },

    /**
     * Get aggregated price history (for charts - downsample for long ranges)
     */
    async getAggregatedHistory(
        productId: string,
        range: TimeRange = '30d',
        points: number = 100
    ): Promise<{ time: Date; price: number; min_price: number; max_price: number }[]> {
        let interval: string;
        let bucket: string;

        switch (range) {
            case '1d':
                interval = '1 day';
                bucket = '15 minutes';
                break;
            case '7d':
                interval = '7 days';
                bucket = '1 hour';
                break;
            case '30d':
                interval = '30 days';
                bucket = '6 hours';
                break;
            case '90d':
                interval = '90 days';
                bucket = '1 day';
                break;
            case '1y':
                interval = '1 year';
                bucket = '1 week';
                break;
            case 'all':
                interval = '100 years';
                bucket = '1 week';
                break;
            default:
                interval = '30 days';
                bucket = '6 hours';
        }

        // Use time bucket for aggregation (works with or without TimescaleDB)
        const result = await query<{ time: Date; price: number; min_price: number; max_price: number }>(
            `SELECT 
        date_trunc('hour', time) as time,
        AVG(price)::decimal(12,2) as price,
        MIN(price)::decimal(12,2) as min_price,
        MAX(price)::decimal(12,2) as max_price
       FROM price_history 
       WHERE product_id = $1 
         AND time > NOW() - $2::interval
       GROUP BY date_trunc('hour', time)
       ORDER BY time ASC
       LIMIT $3`,
            [productId, interval, points]
        );

        return result.rows;
    },

    /**
     * Get price statistics for a product
     */
    async getStats(productId: string): Promise<PriceStats | null> {
        const result = await query<PriceStats>(
            `WITH current AS (
        SELECT price as current_price 
        FROM price_history 
        WHERE product_id = $1 
        ORDER BY time DESC 
        LIMIT 1
      ),
      stats AS (
        SELECT 
          MIN(price) as min_price,
          MAX(price) as max_price,
          AVG(price)::decimal(12,2) as avg_price
        FROM price_history 
        WHERE product_id = $1
      ),
      change_24h AS (
        SELECT price as old_price
        FROM price_history 
        WHERE product_id = $1 
          AND time <= NOW() - INTERVAL '24 hours'
        ORDER BY time DESC 
        LIMIT 1
      ),
      change_7d AS (
        SELECT price as old_price
        FROM price_history 
        WHERE product_id = $1 
          AND time <= NOW() - INTERVAL '7 days'
        ORDER BY time DESC 
        LIMIT 1
      ),
      change_30d AS (
        SELECT price as old_price
        FROM price_history 
        WHERE product_id = $1 
          AND time <= NOW() - INTERVAL '30 days'
        ORDER BY time DESC 
        LIMIT 1
      )
      SELECT 
        s.min_price,
        s.max_price,
        s.avg_price,
        c.current_price,
        CASE WHEN c24.old_price > 0 THEN 
          ((c.current_price - c24.old_price) / c24.old_price * 100)::decimal(5,2)
        END as price_change_24h,
        CASE WHEN c7.old_price > 0 THEN 
          ((c.current_price - c7.old_price) / c7.old_price * 100)::decimal(5,2)
        END as price_change_7d,
        CASE WHEN c30.old_price > 0 THEN 
          ((c.current_price - c30.old_price) / c30.old_price * 100)::decimal(5,2)
        END as price_change_30d
      FROM stats s
      CROSS JOIN current c
      LEFT JOIN change_24h c24 ON true
      LEFT JOIN change_7d c7 ON true
      LEFT JOIN change_30d c30 ON true`,
            [productId]
        );

        return result.rows[0] || null;
    },

    /**
     * Get the latest price for a product
     */
    async getLatestPrice(productId: string): Promise<PriceHistoryEntry | null> {
        const result = await query<PriceHistoryEntry>(
            `SELECT * FROM price_history 
       WHERE product_id = $1 
       ORDER BY time DESC 
       LIMIT 1`,
            [productId]
        );
        return result.rows[0] || null;
    },

    /**
     * Delete old price history (for cleanup)
     */
    async deleteOldHistory(olderThanDays: number = 365): Promise<number> {
        const result = await query(
            `DELETE FROM price_history 
       WHERE time < NOW() - ($1 || ' days')::interval`,
            [olderThanDays]
        );
        return result.rowCount || 0;
    },
};

export default PriceHistoryModel;
