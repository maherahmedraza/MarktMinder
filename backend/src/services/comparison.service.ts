/**
 * Cross-Marketplace Comparison Service
 * 
 * Enables comparison of similar products across Amazon, Etsy, and Otto.
 * Uses fuzzy matching on product names/brands to find similar items.
 */

import { query } from '../config/database.js';
import { cache } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const COMPARISON_CACHE_TTL = 3600; // 1 hour

export interface MarketplacePrice {
    marketplace: 'amazon' | 'etsy' | 'otto';
    productId: string;
    productName: string;
    price: number;
    currency: string;
    shipping?: number;
    totalPrice: number;
    url: string;
    imageUrl?: string;
    lastUpdated: Date;
}

export interface CrossMarketplaceComparison {
    searchTerm: string;
    results: MarketplacePrice[];
    bestDeal: {
        marketplace: string;
        productId: string;
        price: number;
        savingsVsHighest: number;
        savingsPercentage: number;
    } | null;
    analyzedAt: Date;
}

/**
 * Compare prices across marketplaces for a given search term or product
 */
export async function compareAcrossMarketplaces(
    searchTerm: string,
    options?: {
        includeShipping?: boolean;
        limit?: number;
    }
): Promise<CrossMarketplaceComparison> {
    const cacheKey = `comparison:${searchTerm.toLowerCase().replace(/\s+/g, '_')}`;
    const { includeShipping = true, limit = 10 } = options || {};

    // Check cache
    const cached = await cache.get<CrossMarketplaceComparison>(cacheKey);
    if (cached) {
        return cached;
    }

    // Search across all marketplaces
    const results = await searchProductsAcrossMarketplaces(searchTerm, limit);

    // Calculate total prices (including shipping if option enabled)
    const pricesWithTotal = results.map(r => ({
        ...r,
        totalPrice: includeShipping ? r.price + (r.shipping || 0) : r.price,
    }));

    // Find best deal
    let bestDeal: CrossMarketplaceComparison['bestDeal'] = null;
    if (pricesWithTotal.length > 0) {
        const sorted = [...pricesWithTotal].sort((a, b) => a.totalPrice - b.totalPrice);
        const lowest = sorted[0];
        const highest = sorted[sorted.length - 1];

        if (lowest && highest && lowest.totalPrice < highest.totalPrice) {
            bestDeal = {
                marketplace: lowest.marketplace,
                productId: lowest.productId,
                price: lowest.totalPrice,
                savingsVsHighest: highest.totalPrice - lowest.totalPrice,
                savingsPercentage: Math.round(
                    ((highest.totalPrice - lowest.totalPrice) / highest.totalPrice) * 100
                ),
            };
        }
    }

    const comparison: CrossMarketplaceComparison = {
        searchTerm,
        results: pricesWithTotal,
        bestDeal,
        analyzedAt: new Date(),
    };

    // Cache result
    await cache.set(cacheKey, comparison, COMPARISON_CACHE_TTL);

    return comparison;
}

/**
 * Search products across all marketplaces using fuzzy matching
 */
async function searchProductsAcrossMarketplaces(
    searchTerm: string,
    limit: number
): Promise<MarketplacePrice[]> {
    // Use PostgreSQL full-text search with similarity matching
    const result = await query<{
        id: string;
        marketplace: 'amazon' | 'etsy' | 'otto';
        title: string;
        current_price: number;
        currency: string;
        url: string;
        image_url: string;
        last_scraped_at: Date;
        similarity: number;
    }>(
        `SELECT 
      p.id,
      p.marketplace,
      p.title,
      p.current_price,
      p.currency,
      p.url,
      p.image_url,
      p.last_scraped_at,
      similarity(LOWER(p.title), LOWER($1)) as similarity
    FROM products p
    WHERE 
      p.current_price IS NOT NULL
      AND p.current_price > 0
      AND (
        LOWER(p.title) ILIKE '%' || LOWER($1) || '%'
        OR similarity(LOWER(p.title), LOWER($1)) > 0.3
      )
    ORDER BY similarity DESC, p.current_price ASC
    LIMIT $2`,
        [searchTerm, limit * 3] // Get more results for marketplace diversity
    );

    // Group by marketplace and take top results from each
    const byMarketplace: Record<string, MarketplacePrice[]> = {
        amazon: [],
        etsy: [],
        otto: [],
    };

    for (const row of result.rows) {
        const price: MarketplacePrice = {
            marketplace: row.marketplace,
            productId: row.id,
            productName: row.title,
            price: Number(row.current_price),
            currency: row.currency || 'EUR',
            totalPrice: Number(row.current_price),
            url: row.url,
            imageUrl: row.image_url,
            lastUpdated: new Date(row.last_scraped_at),
        };

        if (byMarketplace[row.marketplace].length < limit) {
            byMarketplace[row.marketplace].push(price);
        }
    }

    // Combine results, prioritizing diversity
    const combined: MarketplacePrice[] = [];
    const maxPerMarketplace = Math.ceil(limit / 3);

    for (const marketplace of ['amazon', 'etsy', 'otto']) {
        combined.push(...byMarketplace[marketplace].slice(0, maxPerMarketplace));
    }

    return combined.slice(0, limit);
}

/**
 * Get comparison for a specific product across marketplaces
 * Uses the product's title to find similar items on other marketplaces
 */
export async function getProductComparison(
    productId: string
): Promise<CrossMarketplaceComparison | null> {
    // Get the product details
    const productResult = await query<{
        id: string;
        title: string;
        marketplace: string;
        brand: string;
    }>(
        `SELECT id, title, marketplace, brand FROM products WHERE id = $1`,
        [productId]
    );

    if (productResult.rows.length === 0) {
        return null;
    }

    const product = productResult.rows[0];

    // Create search term from title (simplified - remove common words)
    const searchTerm = createSearchTerm(product.title, product.brand);

    return compareAcrossMarketplaces(searchTerm);
}

/**
 * Create a search term from product title
 */
function createSearchTerm(title: string, brand?: string): string {
    // Remove common filler words
    const stopWords = [
        'the', 'a', 'an', 'for', 'with', 'and', 'or', 'in', 'on', 'at',
        'to', 'of', 'by', 'as', 'is', 'it', 'this', 'that', 'from',
        'new', 'original', 'genuine', 'official', 'authentic'
    ];

    let words = title.toLowerCase().split(/\s+/);
    words = words.filter(w => !stopWords.includes(w) && w.length > 2);

    // Prioritize brand if available
    if (brand) {
        return `${brand} ${words.slice(0, 3).join(' ')}`;
    }

    return words.slice(0, 5).join(' ');
}

/**
 * Get user's tracked products with marketplace comparison data
 */
export async function getUserProductsWithComparisons(
    userId: string,
    limit: number = 10
): Promise<{
    product: { id: string; title: string; marketplace: string; currentPrice: number };
    comparison: CrossMarketplaceComparison | null;
}[]> {
    const productsResult = await query<{
        id: string;
        title: string;
        marketplace: string;
        current_price: number;
    }>(
        `SELECT p.id, p.title, p.marketplace, p.current_price
    FROM products p
    JOIN user_products up ON p.id = up.product_id
    WHERE up.user_id = $1
    AND p.current_price IS NOT NULL
    ORDER BY up.added_at DESC
    LIMIT $2`,
        [userId, limit]
    );

    const results = await Promise.all(
        productsResult.rows.map(async (p) => ({
            product: {
                id: p.id,
                title: p.title,
                marketplace: p.marketplace,
                currentPrice: Number(p.current_price),
            },
            comparison: await getProductComparison(p.id),
        }))
    );

    return results;
}

export default {
    compareAcrossMarketplaces,
    getProductComparison,
    getUserProductsWithComparisons,
};
