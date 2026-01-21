import { Router, Request, Response } from 'express';
import { asyncHandler, authenticate } from '../../middleware/index.js';
import { getCacheStats, resetCacheStats } from '../../utils/cache.js';
import { clearAllCaches, invalidatePattern } from '../../utils/cache-invalidation.js';
import { param } from 'express-validator';
import { validate } from '../../middleware/index.js';
import { prisma } from '../../config/prisma.js';
import { ForbiddenError } from '../../utils/errors.js';

const router = Router();

// Admin middleware - check if user is admin
const isAdmin = async (req: Request, res: Response, next: Function) => {
    if (!req.user) {
        throw new ForbiddenError('Authentication required');
    }

    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true }
    });

    if (!user || user.role !== 'admin') {
        throw new ForbiddenError('Admin access required');
    }

    next();
};

/**
 * @route   GET /api/admin/cache/stats
 * @desc    Get cache statistics (hit rate, misses, errors)
 * @access  Admin
 */
router.get(
    '/stats',
    authenticate,
    asyncHandler(isAdmin),
    asyncHandler(async (req: Request, res: Response) => {
        const stats = getCacheStats();
        res.json({ stats });
    })
);

/**
 * @route   POST /api/admin/cache/stats/reset
 * @desc    Reset cache statistics
 * @access  Admin
 */
router.post(
    '/stats/reset',
    authenticate,
    asyncHandler(isAdmin),
    asyncHandler(async (req: Request, res: Response) => {
        resetCacheStats();
        res.json({ message: 'Cache statistics reset successfully' });
    })
);

/**
 * @route   DELETE /api/admin/cache/clear
 * @desc    Clear all caches (emergency use)
 * @access  Admin
 */
router.delete(
    '/clear',
    authenticate,
    asyncHandler(isAdmin),
    asyncHandler(async (req: Request, res: Response) => {
        await clearAllCaches();
        res.json({ message: 'All caches cleared successfully' });
    })
);

/**
 * @route   DELETE /api/admin/cache/pattern/:pattern
 * @desc    Clear caches matching a pattern
 * @access  Admin
 */
router.delete(
    '/pattern/:pattern',
    authenticate,
    asyncHandler(isAdmin),
    validate([
        param('pattern').trim().notEmpty().withMessage('Pattern is required')
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const pattern = req.params.pattern as string;
        await invalidatePattern(pattern);
        res.json({ message: `Caches matching pattern "${pattern}" cleared successfully` });
    })
);

export default router;
