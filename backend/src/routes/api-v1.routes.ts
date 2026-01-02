/**
 * MarktMinder Public API v1
 * 
 * RESTful API for external integrations
 * Authentication: API Key (X-API-Key header)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/database.js';
import { cache } from '../config/redis.js';
import { validateApiKey, trackApiUsage, ApiKey } from '../models/ApiKey.js';
import { getPricePrediction, getTopPriceDrops, getTrendingProducts } from '../services/prediction.service.js';
import { getUpcomingEvents } from '../services/events-calendar.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Extend Request type to include apiKey
declare global {
    namespace Express {
        interface Request {
            apiKey?: ApiKey;
        }
    }
}

/**
 * API Key Authentication Middleware
 */
async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const apiKeyHeader = req.header('X-API-Key') || req.query.api_key as string;

    if (!apiKeyHeader) {
        return res.status(401).json({
            error: {
                code: 'MISSING_API_KEY',
                message: 'API key is required. Include it in the X-API-Key header.',
            },
        });
    }

    const apiKey = await validateApiKey(apiKeyHeader);

    if (!apiKey) {
        return res.status(401).json({
            error: {
                code: 'INVALID_API_KEY',
                message: 'Invalid or expired API key.',
            },
        });
    }

    req.apiKey = apiKey;

    // Track usage after response
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        trackApiUsage(apiKey.id, req.path, responseTime).catch(() => { });
    });

    next();
}

/**
 * Dynamic rate limiter based on API tier
 */
const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: (req: Request) => {
        const tier = req.apiKey?.tier || 'free';
        const limits = {
            free: 10,
            pro: 60,
            power: 200,
            business: 1000,
        };
        return limits[tier];
    },
    message: {
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please slow down or upgrade your plan.',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply middleware
router.use(authenticateApiKey);
router.use(apiRateLimiter);

/**
 * @api {get} /v1/products List Products
 * @apiName ListProducts
 * @apiGroup Products
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} X-API-Key Your API key
 * 
 * @apiQuery {String} [marketplace] Filter by marketplace (amazon, etsy, otto)
 * @apiQuery {Number} [limit=20] Number of results (max 100)
 * @apiQuery {Number} [offset=0] Pagination offset
 */
router.get('/products', async (req: Request, res: Response) => {
    try {
        const marketplace = req.query.marketplace as string | undefined;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        let whereClause = '';
        const params: any[] = [];
        let paramIndex = 1;

        if (marketplace) {
            whereClause = `WHERE p.marketplace = $${paramIndex}`;
            params.push(marketplace);
            paramIndex++;
        }

        const result = await query(`
            SELECT 
                p.id, p.marketplace, p.marketplace_id, p.url,
                p.title, p.image_url, p.brand, p.category,
                p.current_price, p.currency, p.availability,
                p.lowest_price, p.highest_price, p.average_price,
                p.last_scraped_at
            FROM products p
            ${whereClause}
            ORDER BY p.last_scraped_at DESC NULLS LAST
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...params, limit, offset]);

        // Get total count
        const countResult = await query(`
            SELECT COUNT(*) FROM products p ${whereClause}
        `, params);

        res.json({
            data: result.rows.map(row => ({
                id: row.id,
                marketplace: row.marketplace,
                marketplaceId: row.marketplace_id,
                url: row.url,
                title: row.title,
                imageUrl: row.image_url,
                brand: row.brand,
                category: row.category,
                currentPrice: parseFloat(row.current_price) || null,
                currency: row.currency,
                availability: row.availability,
                lowestPrice: parseFloat(row.lowest_price) || null,
                highestPrice: parseFloat(row.highest_price) || null,
                averagePrice: parseFloat(row.average_price) || null,
                lastScrapedAt: row.last_scraped_at,
            })),
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit,
                offset,
                hasMore: offset + result.rows.length < parseInt(countResult.rows[0].count),
            },
            meta: {
                requestId: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch products',
            },
        });
    }
});

/**
 * @api {get} /v1/products/:id Get Product Details
 * @apiName GetProduct
 * @apiGroup Products
 * @apiVersion 1.0.0
 */
router.get('/products/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT 
                p.*,
                (SELECT json_agg(json_build_object(
                    'time', ph.time,
                    'price', ph.price
                ) ORDER BY ph.time DESC)
                FROM price_history ph 
                WHERE ph.product_id = p.id 
                  AND ph.time >= NOW() - INTERVAL '30 days'
                LIMIT 100) as price_history
            FROM products p
            WHERE p.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Product not found',
                },
            });
        }

        const row = result.rows[0];

        res.json({
            data: {
                id: row.id,
                marketplace: row.marketplace,
                marketplaceId: row.marketplace_id,
                url: row.url,
                title: row.title,
                description: row.description,
                imageUrl: row.image_url,
                brand: row.brand,
                category: row.category,
                currentPrice: parseFloat(row.current_price) || null,
                currency: row.currency,
                availability: row.availability,
                lowestPrice: parseFloat(row.lowest_price) || null,
                highestPrice: parseFloat(row.highest_price) || null,
                averagePrice: parseFloat(row.average_price) || null,
                lastScrapedAt: row.last_scraped_at,
                priceHistory: row.price_history || [],
            },
            meta: {
                requestId: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch product',
            },
        });
    }
});

/**
 * @api {get} /v1/products/:id/prediction Get Price Prediction
 * @apiName GetPrediction
 * @apiGroup Products
 * @apiVersion 1.0.0
 * 
 * @apiQuery {Number} [days=7] Days ahead to predict (max 14)
 */
router.get('/products/:id/prediction', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const days = Math.min(parseInt(req.query.days as string) || 7, 14);

        // Check permissions
        if (!req.apiKey?.permissions.includes('read') && !req.apiKey?.permissions.includes('predictions')) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Your API key does not have permission for predictions',
                },
            });
        }

        // Get product marketplace
        const productResult = await query(`SELECT marketplace FROM products WHERE id = $1`, [id]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Product not found',
                },
            });
        }

        const prediction = await getPricePrediction(id, days, productResult.rows[0].marketplace);

        res.json({
            data: prediction,
            meta: {
                requestId: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                cacheHit: false,
            },
        });
    } catch (error: any) {
        if (error.message.includes('Not enough price history')) {
            return res.status(400).json({
                error: {
                    code: 'INSUFFICIENT_DATA',
                    message: error.message,
                },
            });
        }
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to generate prediction',
            },
        });
    }
});

/**
 * @api {get} /v1/insights/price-drops Top Price Drops
 * @apiName GetPriceDrops
 * @apiGroup Insights
 * @apiVersion 1.0.0
 */
router.get('/insights/price-drops', async (req: Request, res: Response) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
        const drops = await getTopPriceDrops(limit);

        res.json({
            data: drops.map(d => ({
                productId: d.id,
                title: d.title,
                imageUrl: d.image_url,
                marketplace: d.marketplace,
                url: d.url,
                currentPrice: parseFloat(d.current_price),
                previousPrice: parseFloat(d.old_price),
                dropPercentage: parseFloat(d.drop_percentage),
                savings: parseFloat(d.savings),
            })),
            meta: {
                requestId: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch price drops',
            },
        });
    }
});

/**
 * @api {get} /v1/insights/trending Trending Products
 * @apiName GetTrending
 * @apiGroup Insights
 * @apiVersion 1.0.0
 */
router.get('/insights/trending', async (req: Request, res: Response) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
        const trending = await getTrendingProducts(limit);

        res.json({
            data: trending.map(t => ({
                productId: t.id,
                title: t.title,
                imageUrl: t.image_url,
                marketplace: t.marketplace,
                currentPrice: parseFloat(t.current_price),
                url: t.url,
                trackerCount: parseInt(t.tracker_count),
            })),
            meta: {
                requestId: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch trending products',
            },
        });
    }
});

/**
 * @api {get} /v1/events Upcoming Shopping Events
 * @apiName GetEvents
 * @apiGroup Events
 * @apiVersion 1.0.0
 */
router.get('/events', async (req: Request, res: Response) => {
    try {
        const days = Math.min(parseInt(req.query.days as string) || 30, 90);
        const marketplace = req.query.marketplace as 'amazon' | 'otto' | 'etsy' | undefined;

        const events = getUpcomingEvents(new Date(), days, marketplace);

        res.json({
            data: events.map(e => ({
                name: e.event.name,
                nameDE: e.event.nameDE,
                startDate: e.start.toISOString().split('T')[0],
                endDate: e.end.toISOString().split('T')[0],
                daysUntil: e.daysUntil,
                expectedDiscount: e.event.impactScore,
                marketplaces: e.event.marketplaces,
                categories: e.event.categories,
            })),
            meta: {
                requestId: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch events',
            },
        });
    }
});

/**
 * @api {get} /v1/status API Status
 * @apiName GetStatus
 * @apiGroup System
 * @apiVersion 1.0.0
 */
router.get('/status', async (req: Request, res: Response) => {
    res.json({
        status: 'operational',
        version: '1.0.0',
        tier: req.apiKey?.tier,
        rateLimit: {
            limit: req.apiKey?.rateLimit,
            remaining: null,  // Would need Redis to track
            reset: null,
        },
        meta: {
            timestamp: new Date().toISOString(),
        },
    });
});

export default router;
