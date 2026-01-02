import { Router, Request, Response } from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import { AlertModel, AlertType } from '../models/index.js';
import { asyncHandler, validate, authenticate } from '../middleware/index.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { query } from '../config/database.js';

const router = Router();

const VALID_ALERT_TYPES: AlertType[] = [
    'price_below',
    'price_above',
    'price_drop_pct',
    'price_rise_pct',
    'any_change',
    'back_in_stock',
    'all_time_low',
];

/**
 * @route   POST /api/alerts
 * @desc    Create a new price alert
 * @access  Private
 */
router.post(
    '/',
    authenticate,
    validate([
        body('productId').isString().withMessage('Valid product ID is required'),
        body('alertType').isIn(VALID_ALERT_TYPES).withMessage('Invalid alert type'),
        body('targetPrice').optional().isFloat({ min: 0.01 }),
        body('targetPercentage').optional().isFloat({ min: 0.1, max: 100 }),
        body('notifyEmail').optional().isBoolean(),
        body('notifyPush').optional().isBoolean(),
        body('notifyOnce').optional().isBoolean(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const {
            productId,
            alertType,
            targetPrice,
            targetPercentage,
            notifyEmail,
            notifyPush,
            notifyOnce,
        } = req.body;
        const userId = req.user!.id;

        // Validate target based on alert type
        if (['price_below', 'price_above'].includes(alertType) && !targetPrice) {
            throw new BadRequestError('Target price is required for this alert type');
        }
        if (['price_drop_pct', 'price_rise_pct'].includes(alertType) && !targetPercentage) {
            throw new BadRequestError('Target percentage is required for this alert type');
        }

        // Check if user is tracking this product
        const userProduct = await query(
            'SELECT 1 FROM user_products WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );

        if (userProduct.rows.length === 0) {
            throw new BadRequestError('You must be tracking this product to create an alert');
        }

        // Create alert
        const alert = await AlertModel.create({
            user_id: userId,
            product_id: productId,
            alert_type: alertType,
            target_price: targetPrice,
            target_percentage: targetPercentage,
            notify_email: notifyEmail,
            notify_push: notifyPush,
            notify_once: notifyOnce,
        });

        res.status(201).json({
            message: 'Alert created successfully',
            alert: {
                id: alert.id,
                productId: alert.product_id,
                alertType: alert.alert_type,
                targetPrice: alert.target_price,
                targetPercentage: alert.target_percentage,
                isActive: alert.is_active,
                notifyEmail: alert.notify_email,
                notifyPush: alert.notify_push,
                notifyOnce: alert.notify_once,
                createdAt: alert.created_at,
            },
        });
    })
);

/**
 * @route   GET /api/alerts
 * @desc    Get user's alerts
 * @access  Private
 */
router.get(
    '/',
    authenticate,
    validate([
        queryValidator('activeOnly').optional().isBoolean(),
        queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
        queryValidator('offset').optional().isInt({ min: 0 }),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const activeOnly = req.query.activeOnly === 'true';
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const alerts = await AlertModel.getByUserId(userId, { activeOnly, limit, offset });

        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM alerts WHERE user_id = $1';
        if (activeOnly) {
            countQuery += ' AND is_active = TRUE';
        }
        const countResult = await query(countQuery, [userId]);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            alerts: alerts.map(a => ({
                id: a.id,
                productId: a.product_id,
                alertType: a.alert_type,
                targetPrice: a.target_price,
                targetPercentage: a.target_percentage,
                isActive: a.is_active,
                isTriggered: a.is_triggered,
                triggerCount: a.trigger_count,
                lastTriggeredAt: a.last_triggered_at,
                lastTriggeredPrice: a.last_triggered_price,
                notifyEmail: a.notify_email,
                notifyPush: a.notify_push,
                notifyOnce: a.notify_once,
                createdAt: a.created_at,
                product: {
                    title: a.product_title,
                    url: a.product_url,
                    imageUrl: a.product_image_url,
                    currentPrice: a.product_current_price,
                    marketplace: a.product_marketplace,
                },
            })),
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + alerts.length < total,
            },
        });
    })
);

/**
 * @route   GET /api/alerts/:id
 * @desc    Get a specific alert
 * @access  Private
 */
router.get(
    '/:id',
    authenticate,
    validate([param('id').isString()]),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = req.user!.id;

        const alert = await AlertModel.findByIdAndUser(id, userId);
        if (!alert) {
            throw new NotFoundError('Alert not found');
        }

        res.json({ alert });
    })
);

/**
 * @route   PATCH /api/alerts/:id
 * @desc    Update an alert
 * @access  Private
 */
router.patch(
    '/:id',
    authenticate,
    validate([
        param('id').isString(),
        body('alertType').optional().isIn(VALID_ALERT_TYPES),
        body('targetPrice').optional().isFloat({ min: 0.01 }),
        body('targetPercentage').optional().isFloat({ min: 0.1, max: 100 }),
        body('isActive').optional().isBoolean(),
        body('notifyEmail').optional().isBoolean(),
        body('notifyPush').optional().isBoolean(),
        body('notifyOnce').optional().isBoolean(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = req.user!.id;
        const updates = req.body;

        const alert = await AlertModel.update(id, userId, {
            alert_type: updates.alertType,
            target_price: updates.targetPrice,
            target_percentage: updates.targetPercentage,
            is_active: updates.isActive,
            notify_email: updates.notifyEmail,
            notify_push: updates.notifyPush,
            notify_once: updates.notifyOnce,
        });

        if (!alert) {
            throw new NotFoundError('Alert not found');
        }

        res.json({
            message: 'Alert updated successfully',
            alert: {
                id: alert.id,
                productId: alert.product_id,
                alertType: alert.alert_type,
                targetPrice: alert.target_price,
                targetPercentage: alert.target_percentage,
                isActive: alert.is_active,
                notifyEmail: alert.notify_email,
                notifyPush: alert.notify_push,
                notifyOnce: alert.notify_once,
            },
        });
    })
);

/**
 * @route   DELETE /api/alerts/:id
 * @desc    Delete an alert
 * @access  Private
 */
router.delete(
    '/:id',
    authenticate,
    validate([param('id').isString()]),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = req.user!.id;

        const deleted = await AlertModel.delete(id, userId);
        if (!deleted) {
            throw new NotFoundError('Alert not found');
        }

        res.json({ message: 'Alert deleted successfully' });
    })
);

/**
 * @route   POST /api/alerts/:id/toggle
 * @desc    Toggle alert active status
 * @access  Private
 */
router.post(
    '/:id/toggle',
    authenticate,
    validate([param('id').isString()]),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const userId = req.user!.id;

        // Get current alert
        const alert = await AlertModel.findByIdAndUser(id, userId);
        if (!alert) {
            throw new NotFoundError('Alert not found');
        }

        // Toggle status
        const updated = await AlertModel.update(id, userId, {
            is_active: !alert.is_active,
        });

        res.json({
            message: `Alert ${updated!.is_active ? 'activated' : 'deactivated'}`,
            isActive: updated!.is_active,
        });
    })
);

/**
 * @route   GET /api/alerts/history
 * @desc    Get alert history (triggered alerts)
 * @access  Private
 */
router.get(
    '/history',
    authenticate,
    validate([
        queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
        queryValidator('offset').optional().isInt({ min: 0 }),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await query(
            `SELECT ah.*, 
              p.title as product_title, 
              p.url as product_url, 
              p.image_url as product_image_url,
              a.alert_type
       FROM alert_history ah
       JOIN products p ON ah.product_id = p.id
       JOIN alerts a ON ah.alert_id = a.id
       WHERE ah.user_id = $1
       ORDER BY ah.triggered_at DESC
       LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const countResult = await query(
            'SELECT COUNT(*) FROM alert_history WHERE user_id = $1',
            [userId]
        );
        const total = parseInt(countResult.rows[0].count);

        res.json({
            history: result.rows.map(h => ({
                id: h.id,
                alertId: h.alert_id,
                productId: h.product_id,
                triggeredAt: h.triggered_at,
                oldPrice: h.old_price,
                newPrice: h.new_price,
                alertType: h.alert_type,
                emailSent: h.email_sent,
                pushSent: h.push_sent,
                clicked: h.clicked,
                product: {
                    title: h.product_title,
                    url: h.product_url,
                    imageUrl: h.product_image_url,
                },
            })),
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + result.rows.length < total,
            },
        });
    })
);

export default router;
