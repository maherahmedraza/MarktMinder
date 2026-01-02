import { Router, Request, Response } from 'express';
import { asyncHandler, authenticate } from '../middleware/index.js';
import { validate } from '../middleware/validate.js';
import { param, body } from 'express-validator';
import { query } from '../config/database.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';

const router = Router();

// Admin middleware - check if user is admin via role column
const isAdmin = async (req: Request, res: Response, next: Function) => {
    if (!req.user) {
        throw new ForbiddenError('Authentication required');
    }

    // Check database for admin role
    const result = await query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
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
        // Total products
        const totalProducts = await query('SELECT COUNT(*) FROM products');

        // Total users
        const totalUsers = await query('SELECT COUNT(*) FROM users');

        // Total tracked (user_products)
        const totalTracked = await query('SELECT COUNT(*) FROM user_products');

        // Active alerts
        const activeAlerts = await query('SELECT COUNT(*) FROM alerts WHERE is_active = TRUE');

        // Products added today
        const todayProducts = await query(`
            SELECT COUNT(*) FROM products 
            WHERE created_at >= CURRENT_DATE
        `);

        // Products added this week
        const weekProducts = await query(`
            SELECT COUNT(*) FROM products 
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        `);

        // Products added this month
        const monthProducts = await query(`
            SELECT COUNT(*) FROM products 
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        `);

        // Users registered this week
        const weekUsers = await query(`
            SELECT COUNT(*) FROM users 
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        `);

        // Price history records today
        const todayPriceRecords = await query(`
            SELECT COUNT(*) FROM price_history 
            WHERE time >= CURRENT_DATE
        `);

        // Products by marketplace
        const marketplaceStats = await query(`
            SELECT marketplace, COUNT(*) as count 
            FROM products 
            GROUP BY marketplace 
            ORDER BY count DESC
        `);

        const days = parseInt(req.query.days as string) || 30;

        // Daily product additions
        const dailyProducts = await query(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM products
            WHERE created_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [days]);

        // Daily user registrations
        const dailyUsers = await query(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users
            WHERE created_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [days]);

        // Top tracked products
        const topTracked = await query(`
            SELECT p.id, p.title, p.image_url, p.current_price, p.marketplace,
                   COUNT(up.user_id) as tracker_count
            FROM products p
            LEFT JOIN user_products up ON p.id = up.product_id
            GROUP BY p.id
            ORDER BY tracker_count DESC
            LIMIT 10
        `);

        // Recent price drops
        const recentDrops = await query(`
            WITH price_changes AS (
                SELECT 
                    p.id,
                    p.title,
                    p.image_url,
                    p.current_price,
                    p.marketplace,
                    LAG(ph.price) OVER (PARTITION BY p.id ORDER BY ph.time) as prev_price,
                    ph.price as new_price,
                    ph.time
                FROM products p
                JOIN price_history ph ON p.id = ph.product_id
                WHERE ph.time >= NOW() - INTERVAL '7 days'
            )
            SELECT DISTINCT ON (id)
                id, title, image_url, current_price, marketplace,
                prev_price, new_price,
                ROUND(((prev_price - new_price) / prev_price * 100)::numeric, 1) as drop_percentage
            FROM price_changes
            WHERE prev_price > new_price
            ORDER BY id, drop_percentage DESC
            LIMIT 10
        `);

        res.json({
            overview: {
                totalProducts: parseInt(totalProducts.rows[0].count),
                totalUsers: parseInt(totalUsers.rows[0].count),
                totalTracked: parseInt(totalTracked.rows[0].count),
                activeAlerts: parseInt(activeAlerts.rows[0].count),
            },
            growth: {
                productsToday: parseInt(todayProducts.rows[0].count),
                productsWeek: parseInt(weekProducts.rows[0].count),
                productsMonth: parseInt(monthProducts.rows[0].count),
                usersWeek: parseInt(weekUsers.rows[0].count),
                priceRecordsToday: parseInt(todayPriceRecords.rows[0].count),
            },
            marketplaceDistribution: marketplaceStats.rows,
            charts: {
                dailyProducts: dailyProducts.rows,
                dailyUsers: dailyUsers.rows,
            },
            topTracked: topTracked.rows,
            recentDrops: recentDrops.rows,
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
        const offset = (page - 1) * limit;
        const marketplace = req.query.marketplace as string;
        const search = req.query.search as string;

        let whereClause = '';
        const params: any[] = [];
        let paramIndex = 1;

        if (marketplace) {
            whereClause += `WHERE marketplace = $${paramIndex++}`;
            params.push(marketplace);
        }

        if (search) {
            whereClause += whereClause ? ' AND ' : 'WHERE ';
            whereClause += `(title ILIKE $${paramIndex++} OR brand ILIKE $${paramIndex++})`;
            params.push(`%${search}%`, `%${search}%`);
        }

        const countQuery = `SELECT COUNT(*) FROM products ${whereClause}`;
        const countResult = await query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        params.push(limit, offset);
        const productsQuery = `
            SELECT p.*, 
                   (SELECT COUNT(*) FROM user_products WHERE product_id = p.id) as tracker_count,
                   (SELECT COUNT(*) FROM price_history WHERE product_id = p.id) as history_count
            FROM products p
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        const result = await query(productsQuery, params);

        res.json({
            products: result.rows,
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
        const offset = (page - 1) * limit;
        const search = req.query.search as string;

        let whereClause = '';
        const params: any[] = [];
        let paramIndex = 1;

        if (search) {
            whereClause = `WHERE email ILIKE $${paramIndex} OR name ILIKE $${paramIndex}`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
        const countResult = await query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        params.push(limit, offset);
        const result = await query(`
            SELECT u.id, u.email, u.name, u.email_verified, u.created_at, u.last_login_at, u.role,
                   (SELECT COUNT(*) FROM user_products WHERE user_id = u.id) as products_count,
                   (SELECT COUNT(*) FROM alerts WHERE user_id = u.id) as alerts_count
            FROM users u
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `, params);

        res.json({
            users: result.rows,
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

        // Use ANY to delete multiple
        const queryText = 'DELETE FROM users WHERE id = ANY($1::uuid[]) RETURNING id';
        const result = await query(queryText, [userIds]);

        res.json({
            message: `${result.rowCount} users deleted successfully`,
            deletedCount: result.rowCount
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

        const result = await query('SELECT id FROM users WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            throw new NotFoundError('User not found');
        }

        // Note: Dependent records (alerts, user_products, etc.) are automatically deleted via ON DELETE CASCADE constraints

        // Finally delete the user
        await query('DELETE FROM users WHERE id = $1', [id]);

        res.json({ message: 'User deleted successfully' });
    })
);

export default router;
