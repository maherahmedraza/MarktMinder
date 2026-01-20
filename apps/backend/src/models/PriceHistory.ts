import { prisma } from '../config/prisma.js';
import { PriceHistory as PrismaPriceHistory } from '@prisma/client';

export interface PriceHistoryEntry {
  time: Date;
  product_id: string;
  price: number;
  currency: string;
  availability?: string | null;
  seller_type?: string | null;
  seller_name?: string | null;
  shipping_cost?: number | null;
}

export interface PriceStats {
  min_price: number;
  max_price: number;
  avg_price: number;
  current_price: number;
  price_change_24h?: number | null;
  price_change_7d?: number | null;
  price_change_30d?: number | null;
}

export type TimeRange = '1d' | '7d' | '30d' | '90d' | '1y' | 'all';

/** Convert Decimal to number */
function toNumber(val: { toNumber(): number } | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  return val.toNumber();
}

/** Map Prisma price history to legacy interface */
function toPriceHistoryEntry(p: PrismaPriceHistory): PriceHistoryEntry {
  return {
    time: p.time,
    product_id: p.productId,
    price: p.price.toNumber(),
    currency: p.currency,
    availability: p.availability,
    seller_type: p.sellerType,
    seller_name: p.sellerName,
    shipping_cost: toNumber(p.shippingCost),
  };
}

/** Get interval in days for time range */
function getIntervalDays(range: TimeRange): number {
  switch (range) {
    case '1d': return 1;
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    case 'all': return 36500; // ~100 years
    default: return 30;
  }
}

/**
 * Price History model with Prisma operations
 */
export const PriceHistoryModel = {
  /**
   * Record a new price point
   */
  async record(entry: Omit<PriceHistoryEntry, 'time'>): Promise<PriceHistoryEntry> {
    const priceHistory = await prisma.priceHistory.create({
      data: {
        time: new Date(),
        productId: entry.product_id,
        price: entry.price,
        currency: entry.currency,
        availability: entry.availability,
        sellerType: entry.seller_type,
        sellerName: entry.seller_name,
        shippingCost: entry.shipping_cost,
      },
    });
    return toPriceHistoryEntry(priceHistory);
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
    const days = getIntervalDays(range);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await prisma.priceHistory.findMany({
      where: {
        productId,
        time: { gt: since },
      },
      orderBy: { time: 'asc' },
      take: limit,
      skip: offset,
    });

    return history.map(toPriceHistoryEntry);
  },

  /**
   * Get aggregated price history (for charts - uses raw query for complex aggregation)
   */
  async getAggregatedHistory(
    productId: string,
    range: TimeRange = '30d',
    points: number = 100
  ): Promise<{ time: Date; price: number; min_price: number; max_price: number }[]> {
    const days = getIntervalDays(range);

    // Use raw query for complex aggregation
    const result = await prisma.$queryRaw<{ time: Date; price: number; min_price: number; max_price: number }[]>`
            SELECT 
                date_trunc('hour', time) as time,
                AVG(price)::decimal(12,2) as price,
                MIN(price)::decimal(12,2) as min_price,
                MAX(price)::decimal(12,2) as max_price
            FROM price_history 
            WHERE product_id = ${productId}::uuid
              AND time > NOW() - (${days} || ' days')::interval
            GROUP BY date_trunc('hour', time)
            ORDER BY time ASC
            LIMIT ${points}
        `;

    return result.map(r => ({
      time: r.time,
      price: Number(r.price),
      min_price: Number(r.min_price),
      max_price: Number(r.max_price),
    }));
  },

  /**
   * Get price statistics for a product (uses raw query for complex CTEs)
   */
  async getStats(productId: string): Promise<PriceStats | null> {
    const result = await prisma.$queryRaw<PriceStats[]>`
            WITH current AS (
                SELECT price as current_price 
                FROM price_history 
                WHERE product_id = ${productId}::uuid 
                ORDER BY time DESC 
                LIMIT 1
            ),
            stats AS (
                SELECT 
                    MIN(price) as min_price,
                    MAX(price) as max_price,
                    AVG(price)::decimal(12,2) as avg_price
                FROM price_history 
                WHERE product_id = ${productId}::uuid
            ),
            change_24h AS (
                SELECT price as old_price
                FROM price_history 
                WHERE product_id = ${productId}::uuid 
                  AND time <= NOW() - INTERVAL '24 hours'
                ORDER BY time DESC 
                LIMIT 1
            ),
            change_7d AS (
                SELECT price as old_price
                FROM price_history 
                WHERE product_id = ${productId}::uuid 
                  AND time <= NOW() - INTERVAL '7 days'
                ORDER BY time DESC 
                LIMIT 1
            ),
            change_30d AS (
                SELECT price as old_price
                FROM price_history 
                WHERE product_id = ${productId}::uuid 
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
            LEFT JOIN change_30d c30 ON true
        `;

    return result[0] || null;
  },

  /**
   * Get the latest price for a product
   */
  async getLatestPrice(productId: string): Promise<PriceHistoryEntry | null> {
    const priceHistory = await prisma.priceHistory.findFirst({
      where: { productId },
      orderBy: { time: 'desc' },
    });
    return priceHistory ? toPriceHistoryEntry(priceHistory) : null;
  },

  /**
   * Delete old price history (for cleanup)
   */
  async deleteOldHistory(olderThanDays: number = 365): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const result = await prisma.priceHistory.deleteMany({
      where: { time: { lt: cutoff } },
    });
    return result.count;
  },
};

export default PriceHistoryModel;
