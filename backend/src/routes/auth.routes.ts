import { Router, Request, Response } from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import { UserModel } from '../models/index.js';
import { asyncHandler, validate, authenticate, generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/index.js';
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors.js';
import { query } from '../config/database.js';
import crypto from 'crypto';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
    '/register',
    validate([
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain uppercase, lowercase, and number'),
        body('name').optional().trim().isLength({ min: 2, max: 100 }),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { email, password, name } = req.body;

        // Check if user already exists
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            throw new ConflictError('User with this email already exists');
        }

        // Create user
        const user = await UserModel.create({ email, password, name });

        // Generate tokens
        const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name });
        const refreshToken = generateRefreshToken({ id: user.id });

        // Store refresh token hash
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
            [user.id, tokenHash]
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                emailVerified: user.email_verified,
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 900, // 15 minutes in seconds
            },
        });
    })
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
    '/login',
    validate([
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = req.body;

        // Find user
        const user = await UserModel.findByEmail(email);
        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // Verify password
        const isValid = await UserModel.verifyPassword(user, password);
        if (!isValid) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // Update last login
        await UserModel.updateLastLogin(user.id);

        // Generate tokens
        const accessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name });
        const refreshToken = generateRefreshToken({ id: user.id });

        // Store refresh token hash
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
            [user.id, tokenHash]
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                emailVerified: user.email_verified,
            },
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 900,
            },
        });
    })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
    '/refresh',
    validate([
        body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { refreshToken } = req.body;

        // Verify refresh token
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch {
            throw new UnauthorizedError('Invalid refresh token');
        }

        // Check if token is in database and not revoked
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const tokenResult = await query(
            `SELECT * FROM refresh_tokens 
       WHERE token_hash = $1 
         AND user_id = $2 
         AND expires_at > NOW() 
         AND revoked_at IS NULL`,
            [tokenHash, decoded.userId]
        );

        if (tokenResult.rows.length === 0) {
            throw new UnauthorizedError('Invalid or expired refresh token');
        }

        // Get user
        const user = await UserModel.findById(decoded.userId);
        if (!user) {
            throw new UnauthorizedError('User not found');
        }

        // Revoke old refresh token
        await query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
            [tokenHash]
        );

        // Generate new tokens
        const newAccessToken = generateAccessToken({ id: user.id, email: user.email, name: user.name });
        const newRefreshToken = generateRefreshToken({ id: user.id });

        // Store new refresh token hash
        const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
        await query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
            [user.id, newTokenHash]
        );

        res.json({
            tokens: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expiresIn: 900,
            },
        });
    })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (revoke refresh token)
 * @access  Public (uses refresh token for identification)
 */
router.post(
    '/logout',
    validate([
        body('refreshToken').optional().isString(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { refreshToken } = req.body;

        if (refreshToken) {
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            await query(
                'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
                [tokenHash]
            );
        }

        res.json({ message: 'Logged out successfully' });
    })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
    '/me',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        const user = await UserModel.findById(req.user!.id);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatar_url,
                emailVerified: user.email_verified,
                notificationEmail: user.notification_email,
                notificationPush: user.notification_push,
                defaultCurrency: user.default_currency,
                timezone: user.timezone,
                createdAt: user.created_at,
            },
        });
    })
);

/**
 * @route   PATCH /api/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.patch(
    '/me',
    authenticate,
    validate([
        body('name').optional().trim().isLength({ min: 2, max: 100 }),
        body('notificationEmail').optional().isBoolean(),
        body('notificationPush').optional().isBoolean(),
        body('defaultCurrency').optional().isLength({ min: 3, max: 3 }),
        body('timezone').optional().isString(),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { name, notificationEmail, notificationPush, defaultCurrency, timezone } = req.body;

        const user = await UserModel.update(req.user!.id, {
            name,
            notification_email: notificationEmail,
            notification_push: notificationPush,
            default_currency: defaultCurrency,
            timezone,
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                notificationEmail: user.notification_email,
                notificationPush: user.notification_push,
                defaultCurrency: user.default_currency,
                timezone: user.timezone,
            },
        });
    })
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
    '/forgot-password',
    validate([
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { email } = req.body;

        // Generate reset token (don't reveal if email exists)
        await UserModel.generatePasswordResetToken(email);

        res.json({
            message: 'If an account with that email exists, a password reset link has been sent.',
        });
    })
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
    '/reset-password',
    validate([
        body('token').notEmpty().withMessage('Reset token is required'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain uppercase, lowercase, and number'),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const { token, password } = req.body;

        // Verify token
        const user = await UserModel.verifyPasswordResetToken(token);
        if (!user) {
            throw new BadRequestError('Invalid or expired reset token');
        }

        // Update password
        await UserModel.updatePassword(user.id, password);

        // Revoke all refresh tokens for this user
        await query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
            [user.id]
        );

        res.json({ message: 'Password reset successfully' });
    })
);

export default router;
