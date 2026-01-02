import { Router, Request, Response } from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import { ProductModel, PriceHistoryModel, TimeRange } from '../models/index.js';
import { asyncHandler, validate, authenticate, optionalAuth } from '../middleware/index.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { query } from '../config/database.js';
import { cache } from '../config/redis.js';
import { getPricePrediction, getTopPriceDrops, getTrendingProducts } from '../services/prediction.service.js';
import { discoverDeals, getUserDeals, getDealStats } from '../services/deal-radar.service.js';
import { analyzePriceDNA } from '../services/price-dna.service.js';
import { hasFeatureAccess } from '../models/Subscription.js';
import { ForbiddenError } from '../utils/errors.js';

const router = Router();

/**
 * Parse product URL to extract marketplace info
 */
function parseProductUrl(url: string): { marketplace: 'amazon' | 'etsy' | 'otto'; marketplaceId: string; region?: string } | null {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // Amazon
        if (hostname.includes('amazon')) {
            const asinMatch = url.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
            if (asinMatch) {
                let region = 'us';
                if (hostname.includes('amazon.de')) region = 'de';
                else if (hostname.includes('amazon.co.uk')) region = 'uk';
                else if (hostname.includes('amazon.fr')) region = 'fr';
                else if (hostname.includes('amazon.it')) region = 'it';
                else if (hostname.includes('amazon.es')) region = 'es';

                return {
                    marketplace: 'amazon',
                    marketplaceId: asinMatch[1].toUpperCase(),
                    region,
                };
            }
        }

        // Etsy
        if (hostname.includes('etsy.com')) {
            const listingMatch = url.match(/\/listing\/(\d+)/);
            if (listingMatch) {
                return {
                    marketplace: 'etsy',
                    marketplaceId: listingMatch[1],
                };
            }
        }

        // Otto
        if (hostname.includes('otto.de')) {
            // Handle share URLs: https://www.otto.de/p/share/w/ID
            const shareMatch = url.match(/\/p\/share\/w\/([A-Z0-9]+)/);
            if (shareMatch) {
                return {
                    marketplace: 'otto',
                    marketplaceId: shareMatch[1],
                    region: 'de',
                };
            }

            const productMatch = url.match(/\/p\/([^\/\?#]+)/);
            if (productMatch) {
                return {
                    marketplace: 'otto',
                    marketplaceId: productMatch[1],
                    region: 'de',

                };
            }
        }

        return null;
    } catch {
        return null;
    }
}

// ==========================================
// DEAL RADAR ENDPOINTS
// ==========================================

/**
 * @route   GET /api/products/deals
 * @desc    Get top deals across all products (Deal Radar)
 * @access  Private
 */
router.get(
    '/deals',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        // Check feature access - Deal Radar requires Power tier or higher
        const hasAccess = await hasFeatureAccess(req.user!.id, 'deal_radar');
        if (!hasAccess) {
            return res.status(403).json({
                error: 'Upgrade to Power to access Deal Radar',
                upgradeRequired: true,
                requiredTier: 'power'
            });
        }

        const marketplace = req.query.marketplace as 'amazon' | 'etsy' | 'otto' | undefined;
        const minDropPercentage = parseInt(req.query.minDrop as string) || 5;
        const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
        const minDealScore = parseInt(req.query.minScore as string) || 30;
        const limit = parseInt(req.query.limit as string) || 20;

        const deals = await discoverDeals({
            marketplace,
            minDropPercentage,
            maxPrice,
            minDealScore,
            limit,
        });

        res.json({ deals, count: deals.length });
    })
);

/**
 * @route   GET /api/products/deals/personal
 * @desc    Get personalized deals for the current user
 * @access  Private
 */
router.get(
    '/deals/personal',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = (req as any).userId;
        const limit = parseInt(req.query.limit as string) || 10;

        const deals = await getUserDeals(userId, limit);

        res.json({ deals, count: deals.length });
    })
);

/**
 * @route   GET /api/products/deals/stats
 * @desc    Get deal statistics
 * @access  Private
 */
router.get(
    '/deals/stats',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const stats = await getDealStats();
        res.json(stats);
    })
);

// ==========================================
// PRICE DNA ENDPOINTS
// ==========================================

/**
 * @route   GET /api/products/:id/dna
 * @desc    Get Price DNA analysis for a product
 * @access  Private
 */
router.get(
    '/:id/dna',
    authenticate,
    [param('id').isUUID()],
    validate,
    asyncHandler(async (req: Request, res: Response) => {
        // Check feature access - Price DNA requires Power tier or higher
        const hasAccess = await hasFeatureAccess(req.user!.id, 'price_dna');
        if (!hasAccess) {
            return res.status(403).json({
                error: 'Upgrade to Power to access Price DNA',
                upgradeRequired: true,
                requiredTier: 'power'
            });
        }

        const { id } = req.params;

        try {
            const dna = await analyzePriceDNA(id);
            res.json({ dna });
        } catch (error: any) {
            if (error.message === 'Product not found') {
                throw new NotFoundError('Product not found');
            }
            throw error;
        }
    })
);

/**
 * @route   POST /api/products
 * @desc    Add a product to track
 * @access  Private
 */
router.post(
    '/',
    authenticate,
    validate([
        body('url').isURL().withMessage('Valid product URL is required'),
        body('customName').optional().trim().isLength({ max: 255 }),
        body('notes').optional().trim(),
        body('folderId').optional().isString(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { url, customName, notes, folderId } = req.body;
        const userId = req.user!.id;

        // Parse URL to get marketplace info
        const parsed = parseProductUrl(url);
        if (!parsed) {
            throw new BadRequestError('Unsupported product URL. Please use Amazon, Etsy, or Otto.de links.');
        }

        // Find or create product
        const product = await ProductModel.findOrCreate({
            marketplace: parsed.marketplace,
            marketplace_id: parsed.marketplaceId,
            marketplace_region: parsed.region,
            url,
        });

        // Check if user already tracks this product
        const existingTrack = await query(
            'SELECT id FROM user_products WHERE user_id = $1 AND product_id = $2',
            [userId, product.id]
        );

        if (existingTrack.rows.length > 0) {
            throw new BadRequestError('You are already tracking this product');
        }

        // Add to user's tracked products
        await query(
            `INSERT INTO user_products (user_id, product_id, custom_name, notes, folder_id)
       VALUES ($1, $2, $3, $4, $5)`,
            [userId, product.id, customName, notes, folderId]
        );

        // Trigger immediate scrape
        try {
            const { addScrapeJob } = await import('../services/scrape-queue.js');
            await addScrapeJob({
                productId: product.id,
                url: product.url,
                marketplace: product.marketplace,
                marketplaceId: product.marketplace_id,
                priority: 10, // Max priority
            });
        } catch (err) {
            console.error('Failed to trigger scrape job:', err);
        }

        res.status(201).json({
            message: 'Product added to tracking',
            product: {
                id: product.id,
                marketplace: product.marketplace,
                marketplaceId: product.marketplace_id,
                region: product.marketplace_region,
                url: product.url,
                title: product.title,
                imageUrl: product.image_url,
                currentPrice: product.current_price,
                currency: product.currency,
                customName,
                notes,
            },
        });
    })
);

/**
 * @route   GET /api/products
 * @desc    Get user's tracked products
 * @access  Private
 */
router.get(
    '/',
    authenticate,
    validate([
        queryValidator('marketplace').optional().isIn(['amazon', 'etsy', 'otto']),
        queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
        queryValidator('offset').optional().isInt({ min: 0 }),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const marketplace = req.query.marketplace as string | undefined;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const products = await ProductModel.getByUserId(userId, {
            marketplace: marketplace as any,
            limit,
            offset,
        });

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM user_products WHERE user_id = $1';
        const countParams: any[] = [userId];
        if (marketplace) {
            countQuery = `SELECT COUNT(*) FROM user_products up 
                    JOIN products p ON up.product_id = p.id 
                    WHERE up.user_id = $1 AND p.marketplace = $2`;
            countParams.push(marketplace);
        }
        const countResult = await query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            products: products.map(p => ({
                id: p.id,
                marketplace: p.marketplace,
                marketplaceId: p.marketplace_id,
                region: p.marketplace_region,
                url: p.url,
                title: p.title,
                imageUrl: p.image_url,
                currentPrice: p.current_price,
                currency: p.currency,
                lowestPrice: p.lowest_price,
                highestPrice: p.highest_price,
                averagePrice: p.average_price,
                lastScrapedAt: p.last_scraped_at,
                customName: (p as any).custom_name,
                notes: (p as any).notes,
                isFavorite: (p as any).is_favorite,
                addedAt: (p as any).added_at,
            })),
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + products.length < total,
            },
        });
    })
);

/**
 * @route   GET /api/products/:id
 * @desc    Get a single product with price history
 * @access  Private
 */
router.get(
    '/:id',
    authenticate,
    validate([
        param('id').isString(), // Allow custom test UUIDs
        queryValidator('range').optional().isIn(['1d', '7d', '30d', '90d', '1y', 'all']),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const range = (req.query.range as TimeRange) || '30d';
        const userId = req.user!.id;

        // Get product details + user tracking info
        const result = await query(
            `SELECT p.*, 
                    up.id as tracker_id,
                    up.custom_name, 
                    up.notes, 
                    up.is_favorite, 
                    up.folder_id,
                    up.added_at as added_at
             FROM products p
             LEFT JOIN user_products up ON p.id = up.product_id AND up.user_id = $1
             WHERE p.id = $2`,
            [userId, id]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Product not found');
        }

        const product = result.rows[0];
        const isTracked = !!product.tracker_id;

        // Get price history
        const history = await PriceHistoryModel.getAggregatedHistory(id, range);
        const stats = await PriceHistoryModel.getStats(id);

        res.json({
            product: {
                id: product.id,
                marketplace: product.marketplace,
                marketplaceId: product.marketplace_id,
                region: product.marketplace_region,
                url: product.url,
                title: product.title,
                description: product.description,
                imageUrl: product.image_url,
                brand: product.brand,
                category: product.category,
                currentPrice: product.current_price,
                currency: product.currency,
                availability: product.availability,
                lastScrapedAt: product.last_scraped_at,
                // User specific fields
                isTracked,
                customName: product.custom_name,
                notes: product.notes,
                isFavorite: product.is_favorite,
                addedAt: product.added_at,
                createdAt: product.created_at,
            },
            priceHistory: history.map(h => ({
                time: h.time,
                price: h.price,
                minPrice: h.min_price,
                maxPrice: h.max_price,
            })),
            stats: stats ? {
                minPrice: stats.min_price,
                maxPrice: stats.max_price,
                avgPrice: stats.avg_price,
                currentPrice: stats.current_price,
                priceChange24h: stats.price_change_24h,
                priceChange7d: stats.price_change_7d,
                priceChange30d: stats.price_change_30d,
            } : null,
        });
    })
);

/**
 * @route   PATCH /api/products/:id
 * @desc    Update user's product tracking preferences
 * @access  Private
 */
router.patch(
    '/:id',
    authenticate,
    validate([
        param('id').isString(),
        body('customName').optional().trim().isLength({ max: 255 }),
        body('notes').optional().trim(),
        body('isFavorite').optional().isBoolean(),
        body('folderId').optional().isString(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { customName, notes, isFavorite, folderId } = req.body;
        const userId = req.user!.id;

        const result = await query(
            `UPDATE user_products 
       SET custom_name = COALESCE($1, custom_name),
           notes = COALESCE($2, notes),
           is_favorite = COALESCE($3, is_favorite),
           folder_id = COALESCE($4, folder_id)
       WHERE user_id = $5 AND product_id = $6
       RETURNING *`,
            [customName, notes, isFavorite, folderId, userId, id]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Product not found in your tracked products');
        }

        res.json({
            message: 'Product updated successfully',
            product: result.rows[0],
        });
    })
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Stop tracking a product
 * @access  Private
 */
router.delete(
    '/:id',
    authenticate,
    validate([param('id').isString()]),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = req.user!.id;

        const result = await query(
            'DELETE FROM user_products WHERE user_id = $1 AND product_id = $2',
            [userId, id]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Product not found in your tracked products');
        }

        res.json({ message: 'Product removed from tracking' });
    })
);

/**
 * @route   GET /api/products/lookup
 * @desc    Look up product by URL (public, for extension)
 * @access  Public (with optional auth)
 */
router.get(
    '/lookup',
    optionalAuth,
    validate([
        queryValidator('url').isURL().withMessage('Valid product URL is required'),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const url = req.query.url as string;

        // Parse URL
        const parsed = parseProductUrl(url);
        if (!parsed) {
            throw new BadRequestError('Unsupported product URL');
        }

        // Find product
        const product = await ProductModel.findByMarketplaceId(
            parsed.marketplace,
            parsed.marketplaceId,
            parsed.region
        );

        if (!product) {
            res.json({
                found: false,
                marketplace: parsed.marketplace,
                marketplaceId: parsed.marketplaceId,
                region: parsed.region,
            });
            return;
        }

        // Get abbreviated history for chart
        const history = await PriceHistoryModel.getAggregatedHistory(product.id, '30d', 30);
        const stats = await PriceHistoryModel.getStats(product.id);

        // Check if user is tracking (if authenticated)
        let isTracking = false;
        if (req.user) {
            const track = await query(
                'SELECT 1 FROM user_products WHERE user_id = $1 AND product_id = $2',
                [req.user.id, product.id]
            );
            isTracking = track.rows.length > 0;
        }

        res.json({
            found: true,
            product: {
                id: product.id,
                marketplace: product.marketplace,
                marketplaceId: product.marketplace_id,
                region: product.marketplace_region,
                url: product.url,
                title: product.title,
                imageUrl: product.image_url,
                currentPrice: product.current_price,
                currency: product.currency,
                lowestPrice: product.lowest_price,
                highestPrice: product.highest_price,
                averagePrice: product.average_price,
                lastScrapedAt: product.last_scraped_at,
            },
            priceHistory: history,
            stats,
            isTracking,
        });
    })
);

/**
 * @route   GET /api/products/:id/predict
 * @desc    Get AI price prediction for a product
 * @access  Private
 */
router.get(
    '/:id/predict',
    authenticate,
    validate([
        param('id').isString().withMessage('Product ID is required'),
        queryValidator('days').optional().isInt({ min: 1, max: 30 }),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        // Check feature access - AI Predictions requires Pro tier or higher
        const hasAccess = await hasFeatureAccess(req.user!.id, 'ai_predictions');
        if (!hasAccess) {
            return res.status(403).json({
                error: 'Upgrade to Pro to access AI price predictions',
                upgradeRequired: true,
                requiredTier: 'pro'
            });
        }

        const { id } = req.params;
        const days = parseInt(req.query.days as string) || 7;

        const prediction = await getPricePrediction(id, days);
        res.json(prediction);
    })
);



/**
 * @route   GET /api/products/insights/price-drops
 * @desc    Get products with biggest price drops
 * @access  Private
 */
router.get(
    '/insights/price-drops',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const limit = parseInt(req.query.limit as string) || 5;
        const cacheKey = `insights:price_drops:${limit}`;

        // Try cache first
        const cached = await cache.get(cacheKey);
        if (cached) {
            res.json(cached);
            return;
        }

        const drops = await getTopPriceDrops(limit);
        const responseData = { priceDrops: drops };

        // Cache for 5 minutes
        await cache.set(cacheKey, responseData, 300);

        res.json(responseData);
    })
);

/**
 * @route   GET /api/products/insights/trending
 * @desc    Get trending products
 * @access  Private
 */
router.get(
    '/insights/trending',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const limit = parseInt(req.query.limit as string) || 5;
        const cacheKey = `insights:trending:${limit}`;

        // Try cache first
        const cached = await cache.get(cacheKey);
        if (cached) {
            res.json(cached);
            return;
        }

        const trending = await getTrendingProducts(limit);
        const responseData = { trending };

        // Cache for 5 minutes
        await cache.set(cacheKey, responseData, 300);

        res.json(responseData);
    })
);



export default router;

