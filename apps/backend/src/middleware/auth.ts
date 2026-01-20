import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';
import { prisma } from '../config/prisma.js';
import crypto from 'crypto';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name?: string;
                subscription_tier?: 'free' | 'pro' | 'power' | 'business' | 'enterprise';
            };
        }
    }
}

interface JWTPayload {
    userId: string;
    email: string;
    name?: string;
    iat: number;
    exp: number;
}

/**
 * Authentication middleware - Verifies JWT token from Authorization header
 */
export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('No authentication token provided');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

        // Attach user to request
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            name: decoded.name,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new UnauthorizedError('Invalid authentication token'));
        } else if (error instanceof jwt.TokenExpiredError) {
            next(new UnauthorizedError('Authentication token has expired'));
        } else {
            next(error);
        }
    }
}

/**
 * Optional authentication - Sets req.user if valid token present, but doesn't require it
 */
export async function optionalAuth(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

            req.user = {
                id: decoded.userId,
                email: decoded.email,
                name: decoded.name,
            };
        }

        next();
    } catch {
        // Ignore token errors for optional auth
        next();
    }
}

/**
 * API Key authentication middleware
 */
export async function authenticateApiKey(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            throw new UnauthorizedError('No API key provided');
        }

        // Get key prefix for lookup (first 8 characters)
        const keyPrefix = apiKey.substring(0, 8);

        // Look up API key in database
        const keyRecord = await prisma.apiKey.findFirst({
            where: {
                keyPrefix: keyPrefix,
                revokedAt: null,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            include: {
                user: true
            }
        });

        if (!keyRecord) {
            throw new UnauthorizedError('Invalid API key');
        }

        // Verify full key hash
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

        if (keyHash !== keyRecord.keyHash) {
            throw new UnauthorizedError('Invalid API key');
        }

        // Update last used timestamp
        await prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { lastUsedAt: new Date() }
        });

        // Attach user to request
        req.user = {
            id: keyRecord.userId,
            email: keyRecord.user.email,
            name: keyRecord.user.name || undefined,
        };

        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(user: { id: string; email: string; name?: string }): string {
    // Convert expiry string (e.g., '15m') to seconds number
    const expiresIn = parseExpiry(config.jwt.expiresIn);
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            name: user.name,
        },
        config.jwt.secret,
        { expiresIn }
    );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(user: { id: string }): string {
    const expiresIn = parseExpiry(config.jwt.refreshExpiresIn);
    return jwt.sign(
        { userId: user.id },
        config.jwt.refreshSecret,
        { expiresIn }
    );
}

/**
 * Parse expiry string like '15m', '7d', '1h' to seconds
 */
function parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 60 * 60;
        case 'd': return value * 60 * 60 * 24;
        default: return 900;
    }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string } {
    return jwt.verify(token, config.jwt.refreshSecret) as { userId: string };
}

export default {
    authenticate,
    optionalAuth,
    authenticateApiKey,
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
};
