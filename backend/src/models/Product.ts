import { query } from '../config/database.js';

export type Marketplace = 'amazon' | 'etsy' | 'otto';
export type Availability = 'in_stock' | 'out_of_stock' | 'limited' | 'unknown';

export interface Product {
    id: string;
    marketplace: Marketplace;
    marketplace_id: string;
    marketplace_region?: string;
    url: string;
    title?: string;
    description?: string;
    image_url?: string;
    brand?: string;
    category?: string;
    current_price?: number;
    currency: string;
    availability?: Availability;
    lowest_price?: number;
    highest_price?: number;
    average_price?: number;
    lowest_price_date?: Date;
    highest_price_date?: Date;
    last_scraped_at?: Date;
    scrape_frequency_hours: number;
    scrape_priority: number;
    scrape_error_count: number;
    last_scrape_error?: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateProductInput {
    marketplace: Marketplace;
    marketplace_id: string;
    marketplace_region?: string;
    url: string;
    title?: string;
    image_url?: string;
}

export interface UpdateProductInput {
    title?: string;
    description?: string;
    image_url?: string;
    brand?: string;
    category?: string;
    current_price?: number;
    currency?: string;
    availability?: Availability;
}

/**
 * Product model with database operations
 */
export const ProductModel = {
    /**
     * Find product by ID
     */
    async findById(id: string): Promise<Product | null> {
        const result = await query<Product>(
            'SELECT * FROM products WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    /**
     * Find product by marketplace ID and region
     */
    async findByMarketplaceId(
        marketplace: Marketplace,
        marketplaceId: string,
        region?: string
    ): Promise<Product | null> {
        const result = await query<Product>(
            `SELECT * FROM products 
       WHERE marketplace = $1 
         AND marketplace_id = $2 
         AND (marketplace_region = $3 OR ($3 IS NULL AND marketplace_region IS NULL))`,
            [marketplace, marketplaceId, region]
        );
        return result.rows[0] || null;
    },

    /**
     * Find product by URL
     */
    async findByUrl(url: string): Promise<Product | null> {
        const result = await query<Product>(
            'SELECT * FROM products WHERE url = $1',
            [url]
        );
        return result.rows[0] || null;
    },

    /**
     * Create or get existing product
     */
    async findOrCreate(input: CreateProductInput): Promise<Product> {
        // Try to find existing product
        const existing = await this.findByMarketplaceId(
            input.marketplace,
            input.marketplace_id,
            input.marketplace_region
        );

        if (existing) {
            return existing;
        }

        // Create new product
        const result = await query<Product>(
            `INSERT INTO products (
        marketplace, marketplace_id, marketplace_region, url, title, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
            [
                input.marketplace,
                input.marketplace_id,
                input.marketplace_region,
                input.url,
                input.title,
                input.image_url,
            ]
        );

        return result.rows[0];
    },

    /**
     * Update product price and details
     */
    async updatePrice(
        id: string,
        price: number,
        currency: string,
        availability?: Availability
    ): Promise<Product | null> {
        const result = await query<Product>(
            `UPDATE products SET 
        current_price = $1,
        currency = $2,
        availability = COALESCE($3, availability),
        last_scraped_at = NOW(),
        scrape_error_count = 0,
        last_scrape_error = NULL,
        -- Update price statistics
        lowest_price = CASE 
          WHEN lowest_price IS NULL OR $1 < lowest_price THEN $1 
          ELSE lowest_price 
        END,
        lowest_price_date = CASE 
          WHEN lowest_price IS NULL OR $1 < lowest_price THEN NOW() 
          ELSE lowest_price_date 
        END,
        highest_price = CASE 
          WHEN highest_price IS NULL OR $1 > highest_price THEN $1 
          ELSE highest_price 
        END,
        highest_price_date = CASE 
          WHEN highest_price IS NULL OR $1 > highest_price THEN NOW() 
          ELSE highest_price_date 
        END,
        updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
            [price, currency, availability, id]
        );

        return result.rows[0] || null;
    },

    /**
     * Update product details
     */
    async update(id: string, input: UpdateProductInput): Promise<Product | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(input)) {
            if (value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        values.push(id);

        const result = await query<Product>(
            `UPDATE products SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
            values
        );

        return result.rows[0] || null;
    },

    /**
     * Record scrape error
     */
    async recordScrapeError(id: string, error: string): Promise<void> {
        await query(
            `UPDATE products SET 
        scrape_error_count = scrape_error_count + 1,
        last_scrape_error = $1,
        last_scraped_at = NOW(),
        updated_at = NOW()
       WHERE id = $2`,
            [error, id]
        );
    },

    /**
     * Get products due for scraping
     */
    async getProductsDueForScraping(limit: number = 100): Promise<Product[]> {
        const result = await query<Product>(
            `SELECT * FROM products 
       WHERE last_scraped_at IS NULL 
          OR last_scraped_at < NOW() - (scrape_frequency_hours || ' hours')::interval
       ORDER BY scrape_priority DESC, last_scraped_at ASC NULLS FIRST
       LIMIT $1`,
            [limit]
        );
        return result.rows;
    },

    /**
     * Get products tracked by a user
     */
    async getByUserId(
        userId: string,
        options: {
            marketplace?: Marketplace;
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<Product[]> {
        const { marketplace, limit = 50, offset = 0 } = options;

        let whereClause = 'WHERE up.user_id = $1';
        const params: any[] = [userId];

        if (marketplace) {
            whereClause += ' AND p.marketplace = $2';
            params.push(marketplace);
        }

        params.push(limit, offset);

        const result = await query<Product>(
            `SELECT p.*, up.custom_name, up.notes, up.is_favorite, up.added_at
       FROM products p
       JOIN user_products up ON p.id = up.product_id
       ${whereClause}
       ORDER BY up.is_favorite DESC, up.added_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        return result.rows;
    },
};

export default ProductModel;
