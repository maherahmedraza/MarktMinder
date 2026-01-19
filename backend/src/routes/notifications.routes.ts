import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler, authenticate, validate } from '../middleware/index.js';
import { pushService } from '../services/push.service.js';

const router = Router();

/**
 * @route   GET /api/notifications/vapid-key
 * @desc    Get VAPID public key
 * @access  Public
 */
router.get('/vapid-key', (req: Request, res: Response) => {
    res.json({
        publicKey: process.env.VAPID_PUBLIC_KEY
    });
});

/**
 * @route   POST /api/notifications/subscribe
 * @desc    Subscribe to push notifications
 * @access  Private
 */
router.post(
    '/subscribe',
    authenticate,
    validate([
        body('endpoint').isURL().withMessage('Valid endpoint URL required'),
        body('keys.p256dh').notEmpty().withMessage('Auth key p256dh required'),
        body('keys.auth').notEmpty().withMessage('Auth key auth required'),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const subscription = req.body;
        const userId = req.user!.id;
        const userAgent = req.headers['user-agent'];

        await pushService.saveSubscription(userId, subscription, userAgent);

        res.status(201).json({ message: 'Push subscription saved' });
    })
);

/**
 * @route   POST /api/notifications/test
 * @desc    Send a test notification to self
 * @access  Private
 */
router.post(
    '/test',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;

        await pushService.sendNotification(userId, {
            title: 'Test Notification',
            body: 'This is a test notification from MarktMinder!',
            url: '/dashboard/settings',
            icon: '/icon-192x192.png'
        });

        res.json({ message: 'Test notification sent' });
    })
);

export default router;
