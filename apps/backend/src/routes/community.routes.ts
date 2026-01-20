import { Router, Request, Response } from 'express';
import { query as queryValidator, param } from 'express-validator';
import { FolderModel } from '../models/index.js';
import { asyncHandler, validate, optionalAuth } from '../middleware/index.js';
import { NotFoundError } from '../utils/errors.js';
import { prisma } from '../config/prisma.js';

const router = Router();

/**
 * @route   GET /api/community/watchlists
 * @desc    Get public watchlists for discovery
 * @access  Public (optional auth)
 */
router.get(
    '/watchlists',
    optionalAuth,
    validate([
        queryValidator('sort').optional().isIn(['popular', 'newest']),
        queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
        queryValidator('offset').optional().isInt({ min: 0 }),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const sort = (req.query.sort as 'popular' | 'newest') || 'popular';
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const watchlists = await FolderModel.getPublicWatchlists({ sort, limit, offset });

        // Get total count of public watchlists
        const total = await prisma.watchlistFolder.count({ where: { isPublic: true } });

        res.json({
            watchlists,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + watchlists.length < total
            }
        });
    })
);

/**
 * @route   GET /api/community/watchlists/:slug
 * @desc    Get a public watchlist by slug
 * @access  Public (optional auth)
 */
router.get(
    '/watchlists/:slug',
    optionalAuth,
    validate([param('slug').isString().trim()]),
    asyncHandler(async (req: Request, res: Response) => {
        const { slug } = req.params;

        const folder = await prisma.watchlistFolder.findUnique({
            where: { slug },
            include: {
                user: {
                    select: {
                        name: true
                    }
                },
                products: {
                    include: {
                        product: true
                    },
                    orderBy: {
                        addedAt: 'desc'
                    }
                }
            }
        });

        if (!folder || !folder.isPublic) {
            throw new NotFoundError('Watchlist not found or is private');
        }

        // Increment view count
        await FolderModel.incrementViewCount(folder.id);

        const products = folder.products.map((up: any) => ({
            ...up.product,
            custom_name: up.customName,
            notes: up.notes,
            owner_name: folder.user.name || 'Anonymous'
        }));

        res.json({
            watchlist: {
                ...folder,
                owner_name: folder.user.name || 'Anonymous'
            },
            products
        });
    })
);

export default router;
