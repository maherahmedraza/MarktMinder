import { Router, Request, Response } from 'express';
import { asyncHandler, authenticate } from '../middleware/index.js';
import {
    getUserGamification,
    recordSavings,
    getLeaderboard,
} from '../services/gamification.service.js';

const router = Router();

/**
 * @route   GET /api/gamification/profile
 * @desc    Get current user's gamification profile
 * @access  Private
 */
router.get(
    '/profile',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const profile = await getUserGamification(userId);
        res.json({ profile });
    })
);

/**
 * @route   POST /api/gamification/record-saving
 * @desc    Record a savings event (when user reports a purchase)
 * @access  Private
 */
router.post(
    '/record-saving',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { amount, dealType } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid savings amount required' });
        }

        const result = await recordSavings(userId, amount, dealType);
        res.json({
            message: 'Savings recorded!',
            newBadges: result.newBadges,
        });
    })
);

/**
 * @route   GET /api/gamification/leaderboard
 * @desc    Get savings leaderboard
 * @access  Private
 */
router.get(
    '/leaderboard',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const limit = parseInt(req.query.limit as string) || 10;
        const leaderboard = await getLeaderboard(limit);
        res.json({ leaderboard });
    })
);

export default router;
