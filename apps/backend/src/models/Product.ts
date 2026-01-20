import { prisma } from '../config/prisma.js';
import { Product as PrismaProduct, Marketplace as PrismaMarketplace, Availability as PrismaAvailability } from '@prisma/client';

export type Marketplace = 'amazon' | 'etsy' | 'otto';
export type Availability = 'in_stock' | 'out_of_stock' | 'limited' | 'unknown';

export interface Product {
    id: string;
    marketplace: Marketplace;
    marketplace_id: string;
    marketplace_region?: string | null;
    url: string;
    title?: string | null;
    description?: string | null;
    image_url?: string | null;
    brand?: string | null;
    category?: string | null;
    current_price?: number | null;
    currency: string;
    availability?: Availability | null;
    lowest_price?: number | null;
    highest_price?: number | null;
    average_price?: number | null;
    lowest_price_date?: Date | null;
    highest_price_date?: Date | null;
    last_scraped_at?: Date | null;
    scrape_frequency_hours: number;
    scrape_priority: number;
    scrape_error_count: number;
    last_scrape_error?: string | null;
    created_at: Date;
    updated_at: Date;
    // User-specific fields from join
    custom_name?: string | null;
    notes?: string | null;
    is_favorite?: boolean;
    added_at?: Date;
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

/** Convert Decimal to number */
function toNumber(val: { toNumber(): number } | number | null | undefined): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return val;
    return val.toNumber();
}

/** Map Prisma product to legacy Product interface */
function toProduct(p: PrismaProduct, extra?: { custom_name?: string | null; notes?: string | null; is_favorite?: boolean; added_at?: Date }): Product {
    return {
        id: p.id,
        marketplace: p.marketplace as Marketplace,
        marketplace_id: p.marketplaceId,
        marketplace_region: p.marketplaceRegion,
        url: p.url,
        title: p.title,
        description: p.description,
        image_url: p.imageUrl,
        brand: p.brand,
        category: p.category,
        current_price: toNumber(p.currentPrice),
        currency: p.currency,
        availability: p.availability as Availability | null,
        lowest_price: toNumber(p.lowestPrice),
        highest_price: toNumber(p.highestPrice),
        average_price: toNumber(p.averagePrice),
        lowest_price_date: p.lowestPriceDate,
        highest_price_date: p.highestPriceDate,
        last_scraped_at: p.lastScrapedAt,
        scrape_frequency_hours: p.scrapeFrequencyHours,
        scrape_priority: p.scrapePriority,
        scrape_error_count: p.scrapeErrorCount,
        last_scrape_error: p.lastScrapeError,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
        ...extra,
    };
}

/**
 * Product model with Prisma operations
 */
export const ProductModel = {
    /**
     * Find product by ID
     */
    async findById(id: string): Promise<Product | null> {
        const product = await prisma.product.findUnique({
            where: { id },
        });
        return product ? toProduct(product) : null;
    },

    /**
     * Find product by marketplace ID and region
     */
    async findByMarketplaceId(
        marketplace: Marketplace,
        marketplaceId: string,
        region?: string
    ): Promise<Product | null> {
        const product = await prisma.product.findFirst({
            where: {
                marketplace: marketplace as PrismaMarketplace,
                marketplaceId,
                marketplaceRegion: region ?? null,
            },
        });
        return product ? toProduct(product) : null;
    },

    /**
     * Find product by URL
     */
    async findByUrl(url: string): Promise<Product | null> {
        const product = await prisma.product.findFirst({
            where: { url },
        });
        return product ? toProduct(product) : null;
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
        const product = await prisma.product.create({
            data: {
                marketplace: input.marketplace as PrismaMarketplace,
                marketplaceId: input.marketplace_id,
                marketplaceRegion: input.marketplace_region,
                url: input.url,
                title: input.title,
                imageUrl: input.image_url,
            },
        });

        return toProduct(product);
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
        // Get current product first for comparison
        const current = await prisma.product.findUnique({ where: { id } });
        if (!current) return null;

        const now = new Date();
        const currentLowest = current.lowestPrice?.toNumber();
        const currentHighest = current.highestPrice?.toNumber();

        const product = await prisma.product.update({
            where: { id },
            data: {
                currentPrice: price,
                currency,
                availability: availability as PrismaAvailability | undefined,
                lastScrapedAt: now,
                scrapeErrorCount: 0,
                lastScrapeError: null,
                // Update price statistics
                lowestPrice: !currentLowest || price < currentLowest ? price : undefined,
                lowestPriceDate: !currentLowest || price < currentLowest ? now : undefined,
                highestPrice: !currentHighest || price > currentHighest ? price : undefined,
                highestPriceDate: !currentHighest || price > currentHighest ? now : undefined,
            },
        });

        return toProduct(product);
    },

    /**
     * Update product details
     */
    async update(id: string, input: UpdateProductInput): Promise<Product | null> {
        const data: any = {};
        if (input.title !== undefined) data.title = input.title;
        if (input.description !== undefined) data.description = input.description;
        if (input.image_url !== undefined) data.imageUrl = input.image_url;
        if (input.brand !== undefined) data.brand = input.brand;
        if (input.category !== undefined) data.category = input.category;
        if (input.current_price !== undefined) data.currentPrice = input.current_price;
        if (input.currency !== undefined) data.currency = input.currency;
        if (input.availability !== undefined) data.availability = input.availability as PrismaAvailability;

        if (Object.keys(data).length === 0) {
            return this.findById(id);
        }

        const product = await prisma.product.update({
            where: { id },
            data,
        });

        return toProduct(product);
    },

    /**
     * Record scrape error
     */
    async recordScrapeError(id: string, error: string): Promise<void> {
        await prisma.product.update({
            where: { id },
            data: {
                scrapeErrorCount: { increment: 1 },
                lastScrapeError: error,
                lastScrapedAt: new Date(),
            },
        });
    },

    /**
     * Get products due for scraping
     */
    async getProductsDueForScraping(limit: number = 100): Promise<Product[]> {
        // Use raw query for complex interval logic
        const products = await prisma.$queryRaw<PrismaProduct[]>`
            SELECT * FROM products 
            WHERE last_scraped_at IS NULL 
               OR last_scraped_at < NOW() - (scrape_frequency_hours || ' hours')::interval
            ORDER BY scrape_priority DESC, last_scraped_at ASC NULLS FIRST
            LIMIT ${limit}
        `;
        return products.map(p => toProduct(p));
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

        const userProducts = await prisma.userProduct.findMany({
            where: {
                userId,
                ...(marketplace && {
                    product: {
                        marketplace: marketplace as PrismaMarketplace,
                    },
                }),
            },
            include: {
                product: true,
            },
            orderBy: [
                { isFavorite: 'desc' },
                { addedAt: 'desc' },
            ],
            take: limit,
            skip: offset,
        });

        return userProducts.map(up => toProduct(up.product, {
            custom_name: up.customName,
            notes: up.notes,
            is_favorite: up.isFavorite,
            added_at: up.addedAt,
        }));
    },
};

export default ProductModel;
