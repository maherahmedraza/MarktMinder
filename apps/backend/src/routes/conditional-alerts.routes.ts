import { Router, Request, Response } from 'express';
import { asyncHandler, authenticate } from '../middleware/index.js';
import conditionalAlerts, {
    AlertCondition,
    ALERT_TEMPLATES
} from '../services/conditional-alerts.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * @route   GET /api/conditional-alerts
 * @desc    Get all conditional alerts for the current user
 * @access  Private
 */
router.get(
    '/',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const alerts = await conditionalAlerts.getUserConditionalAlerts(userId);
        res.json({ alerts });
    })
);

/**
 * @route   POST /api/conditional-alerts
 * @desc    Create a new conditional alert
 * @access  Private
 */
router.post(
    '/',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const {
            productId,
            name,
            conditions,
            logic = 'AND',
            notifyVia = ['email'],
            cooldownHours = 24,
        } = req.body;

        if (!productId || !name || !conditions || !Array.isArray(conditions)) {
            return res.status(400).json({
                error: 'productId, name, and conditions array required'
            });
        }

        const alert = await conditionalAlerts.createConditionalAlert(
            userId,
            productId,
            name,
            conditions,
            logic,
            notifyVia,
            cooldownHours
        );

        res.status(201).json({ alert });
    })
);

/**
 * @route   POST /api/conditional-alerts/from-template
 * @desc    Create a conditional alert from a preset template
 * @access  Private
 */
router.post(
    '/from-template',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const {
            productId,
            template,
            templateValue,
            name,
            notifyVia = ['email'],
        } = req.body;

        if (!productId || !template) {
            return res.status(400).json({
                error: 'productId and template required'
            });
        }

        let conditions: AlertCondition[];
        let alertName = name;

        switch (template) {
            case 'price_drop_10':
                conditions = ALERT_TEMPLATES.priceDropPercent(10);
                alertName = alertName || '10% Price Drop';
                break;
            case 'price_drop_20':
                conditions = ALERT_TEMPLATES.priceDropPercent(20);
                alertName = alertName || '20% Price Drop';
                break;
            case 'price_drop_custom':
                conditions = ALERT_TEMPLATES.priceDropPercent(templateValue || 15);
                alertName = alertName || `${templateValue}% Price Drop`;
                break;
            case 'at_lowest':
                conditions = ALERT_TEMPLATES.atLowestPrice();
                alertName = alertName || 'At Lowest Price Ever';
                break;
            case 'near_lowest':
                conditions = ALERT_TEMPLATES.nearLowest(templateValue || 5);
                alertName = alertName || `Within ${templateValue || 5}% of Lowest`;
                break;
            case 'below_price':
                if (!templateValue) {
                    return res.status(400).json({ error: 'templateValue (price) required' });
                }
                conditions = ALERT_TEMPLATES.belowPrice(templateValue);
                alertName = alertName || `Price Below €${templateValue}`;
                break;
            case 'falling_trend':
                conditions = ALERT_TEMPLATES.fallingTrend(templateValue || 30);
                alertName = alertName || 'Falling Price Trend';
                break;
            case 'buy_opportunity':
                conditions = ALERT_TEMPLATES.buyOpportunity();
                alertName = alertName || 'Buy Opportunity';
                break;
            default:
                return res.status(400).json({ error: `Unknown template: ${template}` });
        }

        const alert = await conditionalAlerts.createConditionalAlert(
            userId,
            productId,
            alertName,
            conditions,
            template === 'buy_opportunity' ? 'AND' : 'AND',
            notifyVia
        );

        res.status(201).json({ alert });
    })
);

/**
 * @route   GET /api/conditional-alerts/:id/evaluate
 * @desc    Evaluate a conditional alert against current product data
 * @access  Private
 */
router.get(
    '/:id/evaluate',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const alertId = req.params.id as string;

        const alerts = await conditionalAlerts.getUserConditionalAlerts(userId);
        const alert = alerts.find(a => a.id === alertId);

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        const context = await conditionalAlerts.getProductContext(alert.productId);
        if (!context) {
            return res.status(404).json({ error: 'Product context unavailable' });
        }

        const result = await conditionalAlerts.evaluateAlert(alert, context);
        res.json({ result, context });
    })
);

/**
 * @route   DELETE /api/conditional-alerts/:id
 * @desc    Delete a conditional alert
 * @access  Private
 */
router.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const alertId = req.params.id as string;

        const success = await conditionalAlerts.deleteConditionalAlert(alertId, userId);

        if (!success) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json({ success: true, message: 'Alert deleted' });
    })
);

/**
 * @route   GET /api/conditional-alerts/templates
 * @desc    Get available alert templates
 * @access  Private
 */
router.get(
    '/templates',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const templates = [
            { id: 'price_drop_10', name: '10% Price Drop', description: 'Alert when price drops 10%', needsValue: false },
            { id: 'price_drop_20', name: '20% Price Drop', description: 'Alert when price drops 20%', needsValue: false },
            { id: 'price_drop_custom', name: 'Custom % Drop', description: 'Set your own percentage threshold', needsValue: true, valueType: 'percent' },
            { id: 'at_lowest', name: 'All-Time Low', description: 'Alert when price reaches its lowest ever', needsValue: false },
            { id: 'near_lowest', name: 'Near Lowest', description: 'Alert when within X% of lowest price', needsValue: true, valueType: 'percent' },
            { id: 'below_price', name: 'Below Target Price', description: 'Alert when price goes below your target', needsValue: true, valueType: 'currency' },
            { id: 'falling_trend', name: 'Falling Trend', description: 'Alert when price is consistently falling', needsValue: false },
            { id: 'buy_opportunity', name: 'Buy Opportunity', description: 'Smart alert: below average + falling trend', needsValue: false },
        ];

        res.json({ templates });
    })
);

export default router;
