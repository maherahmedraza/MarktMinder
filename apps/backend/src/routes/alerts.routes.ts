import { Router, Request, Response } from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import { AlertModel, AlertType } from '../models/index.js';
import { asyncHandler, validate, authenticate } from '../middleware/index.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { prisma } from '../config/prisma.js';

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

        // Check subscription limit for alerts
        const { canAddAlert } = await import('../models/Subscription.js');
        const alertLimit = await canAddAlert(userId);
        if (!alertLimit.allowed) {
            return res.status(403).json({
                error: `Alert limit reached (${alertLimit.current}/${alertLimit.limit}). Upgrade your plan to create more alerts.`,
                upgradeRequired: true,
                current: alertLimit.current,
                limit: alertLimit.limit
            });
        }

        // Check if user is tracking this product
        const userProduct = await prisma.userProduct.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId
                }
            }
        });

        if (!userProduct) {
            throw new BadRequestError('You must be tracking this product to create an alert');
        }

        // Check for existing identical alert
        const existingAlert = await prisma.alert.findFirst({
            where: {
                userId,
                productId,
                alertType,
                targetPrice: targetPrice ?? null,
                targetPercentage: targetPercentage ?? null
            }
        });

        let alert;
        let isReactivated = false;

        if (existingAlert) {
            if (existingAlert.isActive) {
                return res.status(409).json({
                    message: 'An identical alert already exists for this product.'
                });
            }

            // Reactivate existing alert
            alert = await AlertModel.update(existingAlert.id, userId, { is_active: true });
            if (!alert) {
                throw new Error('Failed to reactivate alert');
            }
            isReactivated = true;
        } else {
            // Create new alert
            alert = await AlertModel.create({
                user_id: userId,
                product_id: productId,
                alert_type: alertType,
                target_price: targetPrice,
                target_percentage: targetPercentage,
                notify_email: notifyEmail,
                notify_push: notifyPush,
                notify_once: notifyOnce,
            });
        }

        res.status(isReactivated ? 200 : 201).json({
            message: isReactivated ? 'Reactivated existing alert' : 'Alert created successfully',
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
        const where: any = { userId };
        if (activeOnly) {
            where.isActive = true;
        }
        const total = await prisma.alert.count({ where });

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
        const id = req.params.id as string;
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
        const id = req.params.id as string;
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
        const id = req.params.id as string;
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
        const id = req.params.id as string;
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

        const history = await prisma.alertHistory.findMany({
            where: { userId },
            orderBy: { triggeredAt: 'desc' },
            skip: offset,
            take: limit,
            include: {
                product: true,
                alert: true
            }
        });

        const total = await prisma.alertHistory.count({ where: { userId } });

        res.json({
            history: history.map((h: any) => ({
                id: h.id,
                alertId: h.alertId,
                productId: h.productId,
                triggeredAt: h.triggeredAt,
                oldPrice: h.oldPrice,
                newPrice: h.newPrice,
                // Access alert details from relation
                alertType: h.alert?.alertType,
                emailSent: h.emailSent,
                pushSent: h.pushSent,
                clicked: h.clicked,
                product: {
                    title: h.product.title,
                    url: h.product.url,
                    imageUrl: h.product.imageUrl,
                },
            })),
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + history.length < total,
            },
        });
    })
);

// ==========================================
// NATURAL LANGUAGE ALERT ENDPOINTS
// ==========================================

/**
 * @route   POST /api/alerts/nlp/parse
 * @desc    Parse natural language into alert conditions (preview)
 * @access  Private
 */
router.post(
    '/nlp/parse',
    authenticate,
    validate([
        body('text').isString().isLength({ min: 5, max: 500 }).withMessage('Text must be 5-500 characters'),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { text } = req.body;

        const { parseNaturalLanguageAlert, validateParsedAlert } = await import('../services/nlp-alert-parser.service.js');

        const parsed = parseNaturalLanguageAlert(text);
        const validation = validateParsedAlert(parsed);

        res.json({
            ...parsed,
            validation,
        });
    })
);

/**
 * @route   POST /api/alerts/nlp/create
 * @desc    Create alert from natural language
 * @access  Private
 */
router.post(
    '/nlp/create',
    authenticate,
    validate([
        body('text').isString().isLength({ min: 5, max: 500 }),
        body('productId').isUUID().withMessage('Valid product ID is required'),
        body('notifyVia').optional().isArray(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { text, productId, notifyVia = ['email'] } = req.body;
        const userId = req.user!.id;

        // Check subscription limit
        const { canAddAlert } = await import('../models/Subscription.js');
        const alertLimit = await canAddAlert(userId);
        if (!alertLimit.allowed) {
            return res.status(403).json({
                error: `Alert limit reached (${alertLimit.current}/${alertLimit.limit}). Upgrade your plan.`,
                upgradeRequired: true,
            });
        }

        // Parse the natural language
        const { parseNaturalLanguageAlert, validateParsedAlert } = await import('../services/nlp-alert-parser.service.js');
        const parsed = parseNaturalLanguageAlert(text);
        const validation = validateParsedAlert(parsed);

        if (!parsed.success || !validation.valid) {
            return res.status(400).json({
                error: 'Could not understand the alert request',
                parsed,
                validation,
            });
        }

        // Create the conditional alert
        const { createConditionalAlert } = await import('../services/conditional-alerts.service.js');
        const alert = await createConditionalAlert(
            userId,
            productId,
            parsed.summary,
            parsed.conditions,
            parsed.logic,
            notifyVia,
            24 // cooldown hours
        );

        res.status(201).json({
            message: 'Alert created from natural language',
            alert: {
                id: alert.id,
                name: alert.name,
                conditions: alert.conditions,
                logic: alert.logic,
                summary: parsed.summary,
            },
            parsed,
        });
    })
);

/**
 * @route   GET /api/alerts/nlp/suggestions
 * @desc    Get auto-complete suggestions for natural language input
 * @access  Private
 */
router.get(
    '/nlp/suggestions',
    authenticate,
    validate([
        queryValidator('text').optional().isString(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const text = (req.query.text as string) || '';

        const { getSuggestions } = await import('../services/nlp-alert-parser.service.js');
        const suggestions = getSuggestions(text);

        res.json({ suggestions });
    })
);

export default router;
