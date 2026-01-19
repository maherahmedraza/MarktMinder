import { Router, Request, Response } from 'express';
import { asyncHandler, authenticate } from '../middleware/index.js';
import telegramService from '../services/telegram.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * @route   POST /api/telegram/generate-code
 * @desc    Generate a verification code for Telegram account linking
 * @access  Private
 */
router.post(
    '/generate-code',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const code = await telegramService.generateLinkCode(userId);

        res.json({
            code,
            expiresIn: '10 minutes',
            instructions: 'Open Telegram, find @MarktMinderBot, and send: /link ' + code,
        });
    })
);

/**
 * @route   GET /api/telegram/status
 * @desc    Get Telegram link status for current user
 * @access  Private
 */
router.get(
    '/status',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const telegramUser = await telegramService.getTelegramUser(userId);

        if (!telegramUser) {
            return res.json({
                linked: false,
                notificationsEnabled: false,
            });
        }

        res.json({
            linked: true,
            username: telegramUser.telegram_username,
            notificationsEnabled: telegramUser.notifications_enabled,
            linkedAt: telegramUser.created_at,
        });
    })
);

/**
 * @route   POST /api/telegram/unlink
 * @desc    Unlink Telegram account
 * @access  Private
 */
router.post(
    '/unlink',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const success = await telegramService.unlinkAccount(userId);

        res.json({
            success,
            message: success ? 'Telegram account unlinked' : 'No linked account found',
        });
    })
);

/**
 * @route   POST /api/telegram/toggle-notifications
 * @desc    Toggle Telegram notifications
 * @access  Private
 */
router.post(
    '/toggle-notifications',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled must be a boolean' });
        }

        const success = await telegramService.toggleNotifications(userId, enabled);

        res.json({
            success,
            notificationsEnabled: enabled,
        });
    })
);

/**
 * @route   POST /api/telegram/webhook
 * @desc    Telegram webhook endpoint for receiving updates
 * @access  Public (verified by Telegram)
 */
router.post(
    '/webhook',
    asyncHandler(async (req: Request, res: Response) => {
        const update = req.body;

        // Process update asynchronously
        telegramService.processUpdate(update).catch(err => {
            logger.error('Telegram webhook processing error:', err);
        });

        // Always respond quickly to Telegram
        res.sendStatus(200);
    })
);

/**
 * @route   POST /api/telegram/test-notification
 * @desc    Send a test notification (for debugging)
 * @access  Private
 */
router.post(
    '/test-notification',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        const success = await telegramService.sendPriceAlert(
            userId,
            'Test Product - MarktMinder',
            99.99,
            79.99,
            'https://marktminder.de'
        );

        res.json({
            success,
            message: success ? 'Test notification sent!' : 'Failed to send. Is your account linked?',
        });
    })
);

export default router;
