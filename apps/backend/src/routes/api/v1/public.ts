import { Router, Request, Response } from 'express';
import { prisma } from '../../../config/prisma';
import { authenticateApiKey } from '../../../middleware/auth';
import { trackApiUsage } from '../../../middleware/apiAnalytics';
import { tierRateLimit } from '../../../middleware/tierRateLimit';
import { query, param, validationResult } from 'express-validator';

const router = Router();

// Middleware Chain:
// 1. Authenticate with API Key
// 2. Enforce Tier-based Rate Limits
// 3. Log Analytics
router.use(authenticateApiKey, tierRateLimit, trackApiUsage);

/**
 * Helper to validate requests
 */
const validate = (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation Error',
            details: errors.array()
        });
    }
    next();
};

/**
 * GET /api/v1/products/:id
 * Retrieve a single product by ID
 */
router.get(
    '/products/:id',
    [
        param('id').isUUID().withMessage('Invalid Product ID'),
    ],
    validate,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const product = await prisma.product.findUnique({
                where: { id },
                include: {
                    priceHistory: {
                        orderBy: { recordedAt: 'desc' },
                        take: 1 // Only latest price history point
                    }
                }
            });

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            // Transform response to hide internal fields
            res.json({
                id: product.id,
                url: product.url,
                title: product.title,
                image_url: product.imageUrl,
                currency: product.currency,
                current_price: product.currentPrice,
                marketplace: product.marketplace,
                last_checked: product.lastChecked,
                status: 'active'
            });
        } catch (error) {
            console.error('API Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
);

/**
 * GET /api/v1/products/:id/history
 * Retrieve price history for a product
 */
router.get(
    '/products/:id/history',
    [
        param('id').isUUID().withMessage('Invalid Product ID'),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
    ],
    validate,
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const limit = (req.query.limit as number | undefined) || 30;

            const history = await prisma.priceHistory.findMany({
                where: { productId: id },
                orderBy: { recordedAt: 'desc' },
                take: limit,
                select: {
                    price: true,
                    recordedAt: true,
                    currency: true
                }
            });

            res.json({
                product_id: id,
                history: history.map((h: { price: number; recordedAt: Date; currency: string }) => ({
                    price: h.price,
                    date: h.recordedAt,
                    currency: h.currency
                }))
            });
        } catch (error) {
            console.error('API Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
);

/**
 * GET /api/v1/alerts
 * List active alerts for the authenticated user/team
 */
router.get(
    '/alerts',
    async (req: Request, res: Response) => {
        try {
            const userId = req.user!.id;

            const alerts = await prisma.alert.findMany({
                where: { userId },
                include: {
                    product: {
                        select: {
                            title: true,
                            marketplace: true
                        }
                    }
                },
                take: 50
            });

            res.json({
                alerts: alerts.map((a: any) => ({
                    id: a.id,
                    product_id: a.productId,
                    product_title: a.product.title,
                    target_price: a.targetPrice,
                    condition: a.condition, // 'above' | 'below'
                    is_active: a.isActive,
                    created_at: a.createdAt
                }))
            });
        } catch (error) {
            console.error('API Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
);

/**
 * POST /api/v1/alerts
 * Create a new price alert
 */
router.post(
    '/alerts',
    [
        query('product_id').isUUID().withMessage('Valid Product ID required'),
        query('target_price').isFloat({ gt: 0 }).withMessage('Valid target price required'),
        query('condition').isIn(['gt', 'lt']).withMessage('Condition must be gt (greater than) or lt (less than)')
    ],
    validate,
    async (req: Request, res: Response) => {
        try {
            const userId = req.user!.id;
            const { product_id, target_price, condition } = req.body;

            // Verify product exists
            const product = await prisma.product.findUnique({
                where: { id: product_id }
            });

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            const alert = await prisma.alert.create({
                data: {
                    userId,
                    productId: product_id,
                    targetPrice: parseFloat(target_price),
                    condition: condition === 'gt' ? 'ABOVE' : 'BELOW',
                    isActive: true
                }
            });

            res.status(201).json({
                message: 'Alert created successfully',
                alert_id: alert.id
            });
        } catch (error) {
            console.error('API Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
);

export default router;
