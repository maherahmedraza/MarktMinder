import { Router, Request, Response } from 'express';
import { asyncHandler, authenticate } from '../middleware/index.js';
import { validate } from '../middleware/validate.js';
import { param, body } from 'express-validator';
import { prisma } from '../config/prisma.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { Prisma } from '@prisma/client';

const router = Router();

// Admin middleware - check if user is admin via role column
const isAdmin = async (req: Request, res: Response, next: Function) => {
    if (!req.user) {
        throw new ForbiddenError('Authentication required');
    }

    // Check database for admin role
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
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get(
    '/stats',
    authenticate,
    asyncHandler(isAdmin),
    asyncHandler(async (req: Request, res: Response) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);

        // Parallel stats fetching
        const [
            totalProducts,
            totalUsers,
            totalTracked,
            activeAlerts,
            productsToday,
            productsWeek,
            productsMonth,
            usersWeek,
            priceRecordsToday,
            marketplaceStats
        ] = await Promise.all([
            prisma.product.count(),
            prisma.user.count(),
            prisma.userProduct.count(),
            prisma.alert.count({ where: { isActive: true } }),
            prisma.product.count({ where: { createdAt: { gte: today } } }),
            prisma.product.count({ where: { createdAt: { gte: weekAgo } } }),
            prisma.product.count({ where: { createdAt: { gte: monthAgo } } }),
            prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
            prisma.priceHistory.count({ where: { time: { gte: today } } }),
            prisma.product.groupBy({
                by: ['marketplace'],
                _count: true,
                orderBy: { _count: { marketplace: 'desc' } }
            })
        ]);

        const days = parseInt(req.query.days as string) || 30;

        // Daily product additions
        const dailyProducts = await prisma.$queryRaw<Array<{ date: string, count: number }>>`
            SELECT DATE(created_at)::text as date, COUNT(*)::int as count
            FROM products
            WHERE created_at >= CURRENT_DATE - (${days} || ' days')::INTERVAL
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `;

        // Daily user registrations
        const dailyUsers = await prisma.$queryRaw<Array<{ date: string, count: number }>>`
            SELECT DATE(created_at)::text as date, COUNT(*)::int as count
            FROM users
            WHERE created_at >= CURRENT_DATE - (${days} || ' days')::INTERVAL
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `;

        // Top tracked products
        const topTracked = await prisma.product.findMany({
            take: 10,
            include: {
                _count: {
                    select: { userProducts: true }
                }
            },
            orderBy: {
                userProducts: {
                    _count: 'desc'
                }
            }
        });

        // Recent price drops (complex window function requires raw query)
        const recentDrops = await prisma.$queryRaw<any[]>`
            WITH price_changes AS (
                SELECT 
                    p.id,
                    p.title,
                    p.image_url as "imageUrl",
                    p.current_price as "currentPrice",
                    p.marketplace,
                    LAG(ph.price) OVER (PARTITION BY p.id ORDER BY ph.time) as prev_price,
                    ph.price as new_price,
                    ph.time
                FROM products p
                JOIN price_history ph ON p.id = ph.product_id
                WHERE ph.time >= NOW() - INTERVAL '7 days'
            )
            SELECT DISTINCT ON (id)
                id, title, "imageUrl", "currentPrice", marketplace,
                prev_price, new_price,
                ROUND(((prev_price - new_price) / prev_price * 100)::numeric, 1) as drop_percentage
            FROM price_changes
            WHERE prev_price > new_price
            ORDER BY id, drop_percentage DESC
            LIMIT 10
        `;

        res.json({
            overview: {
                totalProducts,
                totalUsers,
                totalTracked,
                activeAlerts,
            },
            growth: {
                productsToday,
                productsWeek,
                productsMonth,
                usersWeek,
                priceRecordsToday,
            },
            marketplaceDistribution: marketplaceStats.map((stat: any) => ({
                marketplace: stat.marketplace,
                count: stat._count
            })),
            charts: {
                dailyProducts,
                dailyUsers,
            },
            topTracked: topTracked.map((p: any) => ({
                ...p,
                tracker_count: p._count.userProducts
            })),
            recentDrops,
        });
    })
);

/**
 * @route   GET /api/admin/products
 * @desc    Get all products with filters
 * @access  Admin
 */
router.get(
    '/products',
    authenticate,
    asyncHandler(isAdmin),
    asyncHandler(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;
        const marketplace = req.query.marketplace as string;
        const search = req.query.search as string;

        const where: any = {};

        if (marketplace) {
            where.marketplace = marketplace;
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [total, products] = await Promise.all([
            prisma.product.count({ where }),
            prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            userProducts: true,
                            priceHistory: true
                        }
                    }
                }
            })
        ]);

        res.json({
            products: products.map((p: any) => ({
                ...p,
                tracker_count: p._count.userProducts,
                history_count: p._count.priceHistory
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    })
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Admin
 */
router.get(
    '/users',
    authenticate,
    asyncHandler(isAdmin),
    asyncHandler(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;
        const search = req.query.search as string;

        const where: any = {};

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [total, users] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    emailVerified: true,
                    createdAt: true,
                    lastLoginAt: true,
                    role: true,
                    _count: {
                        select: {
                            userProducts: true,
                            alerts: true
                        }
                    }
                }
            })
        ]);

        res.json({
            users: users.map((u: any) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                email_verified: u.emailVerified,
                created_at: u.createdAt,
                last_login_at: u.lastLoginAt,
                role: u.role,
                products_count: u._count.userProducts,
                alerts_count: u._count.alerts
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    })
);

/**
 * @route   POST /api/admin/users/bulk-delete
 * @desc    Delete multiple users
 * @access  Admin
 */
router.post(
    '/users/bulk-delete',
    authenticate,
    asyncHandler(isAdmin),
    validate([body('userIds').isArray().withMessage('userIds must be an array')]),
    asyncHandler(async (req: Request, res: Response) => {
        const { userIds } = req.body;
        const currentUserId = req.user!.id;

        if (userIds.includes(currentUserId)) {
            throw new ForbiddenError('Cannot delete yourself in bulk operation');
        }

        const result = await prisma.user.deleteMany({
            where: {
                id: {
                    in: userIds
                }
            }
        });

        res.json({
            message: `${result.count} users deleted successfully`,
            deletedCount: result.count
        });
    })
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user
 * @access  Admin
 */
router.delete(
    '/users/:id',
    authenticate,
    asyncHandler(isAdmin),
    validate([param('id').isString()]),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        // Prevent deleting self
        if (req.user!.id === id) {
            throw new ForbiddenError('Cannot delete your own account');
        }

        // Check if user exists first or just attempt delete (Prisma throws if not found usually on delete, but deleteMany handles 0 fine, delete requires ID)
        try {
            await prisma.user.delete({
                where: { id }
            });
        } catch (error: any) {
            if (error.code === 'P2025') {
                throw new NotFoundError('User not found');
            }
            throw error;
        }

        // Dependent records (alerts, user_products, etc.) are handled by ON DELETE CASCADE in DB schema
        // and Prisma also respects foreign key constraints if set up in schema.

        res.json({ message: 'User deleted successfully' });
    })
);

export default router;
