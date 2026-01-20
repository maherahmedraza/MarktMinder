import { prisma } from '../config/prisma.js';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Token Rotation Service
 * 
 * Implements secure refresh token rotation:
 * - Each refresh creates a new token pair
 * - Old tokens are invalidated immediately
 * - Token reuse detection (same token used twice = breach)
 * - Family revocation on breach detection
 */

const TOKEN_FAMILY_CACHE_PREFIX = 'token-family:';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const ACCESS_TOKEN_EXPIRY = '15m';

interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

interface DecodedRefreshToken {
    sub: string; // userId
    jti: string; // token id
    family: string; // token family id
    iat: number;
    exp: number;
}

/**
 * Generate a new token pair for a user
 */
export async function generateTokenPair(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string
): Promise<TokenPair> {
    const tokenId = crypto.randomUUID();
    const familyId = crypto.randomUUID();
    const tokenHash = hashToken(tokenId);

    // Create access token
    const accessToken = jwt.sign(
        { sub: userId, type: 'access' },
        config.jwt.secret,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Create refresh token with family tracking
    const refreshToken = jwt.sign(
        { sub: userId, jti: tokenId, family: familyId, type: 'refresh' },
        config.jwt.refreshSecret || config.jwt.secret,
        { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
    );

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({
        data: {
            id: tokenId,
            userId,
            tokenHash,
            deviceInfo,
            ipAddress,
            expiresAt,
        },
    });

    // Cache the token family for quick revocation checks
    await redis.setex(
        `${TOKEN_FAMILY_CACHE_PREFIX}${familyId}`,
        REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
        JSON.stringify({ userId, latestTokenId: tokenId })
    );

    logger.info('Token pair generated', { userId, tokenId, familyId });

    return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
    };
}

/**
 * Rotate refresh token - creates new pair and invalidates old
 */
export async function rotateRefreshToken(
    refreshToken: string,
    deviceInfo?: string,
    ipAddress?: string
): Promise<TokenPair> {
    // Verify and decode the refresh token
    let decoded: DecodedRefreshToken;
    try {
        decoded = jwt.verify(
            refreshToken,
            config.jwt.refreshSecret || config.jwt.secret
        ) as DecodedRefreshToken;
    } catch (error) {
        throw new UnauthorizedError('Invalid refresh token');
    }

    const { sub: userId, jti: tokenId, family: familyId } = decoded;
    const tokenHash = hashToken(tokenId);

    // Check if token exists and is not revoked
    const storedToken = await prisma.refreshToken.findUnique({
        where: { id: tokenId },
    });

    if (!storedToken) {
        // Token not found - possible reuse attack
        logger.warn('Refresh token not found, possible reuse', { tokenId, userId, familyId });
        await revokeTokenFamily(userId, familyId);
        throw new ForbiddenError('Token reuse detected. All sessions revoked.');
    }

    // Verify token hash matches
    if (storedToken.tokenHash !== tokenHash) {
        logger.warn('Token hash mismatch', { tokenId, userId });
        await revokeTokenFamily(userId, familyId);
        throw new ForbiddenError('Token tampering detected. All sessions revoked.');
    }

    // Check if already revoked
    if (storedToken.revokedAt) {
        // TOKEN REUSE DETECTED - Security breach!
        logger.error('TOKEN REUSE ATTACK DETECTED', {
            tokenId,
            userId,
            familyId,
            revokedAt: storedToken.revokedAt,
            ipAddress
        });
        await revokeTokenFamily(userId, familyId);
        throw new ForbiddenError('Token reuse detected. All sessions revoked for security.');
    }

    // Revoke the old token
    await prisma.refreshToken.update({
        where: { id: tokenId },
        data: { revokedAt: new Date() },
    });

    // Generate new token pair with same family
    const newTokenId = crypto.randomUUID();
    const newTokenHash = hashToken(newTokenId);

    const accessToken = jwt.sign(
        { sub: userId, type: 'access' },
        config.jwt.secret,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const newRefreshToken = jwt.sign(
        { sub: userId, jti: newTokenId, family: familyId, type: 'refresh' },
        config.jwt.refreshSecret || config.jwt.secret,
        { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({
        data: {
            id: newTokenId,
            userId,
            tokenHash: newTokenHash,
            deviceInfo,
            ipAddress,
            expiresAt,
        },
    });

    // Update family cache
    await redis.setex(
        `${TOKEN_FAMILY_CACHE_PREFIX}${familyId}`,
        REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
        JSON.stringify({ userId, latestTokenId: newTokenId })
    );

    logger.info('Token rotated successfully', {
        userId,
        oldTokenId: tokenId,
        newTokenId,
        familyId
    });

    return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 15 * 60,
    };
}

/**
 * Revoke all tokens in a family (called on security breach)
 */
export async function revokeTokenFamily(userId: string, familyId: string): Promise<void> {
    // Get family info from cache
    const familyData = await redis.get(`${TOKEN_FAMILY_CACHE_PREFIX}${familyId}`);

    // Revoke all tokens for this user (conservative approach)
    await prisma.refreshToken.updateMany({
        where: {
            userId,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
        },
    });

    // Clear family cache
    await redis.del(`${TOKEN_FAMILY_CACHE_PREFIX}${familyId}`);

    logger.warn('Token family revoked', { userId, familyId });
}

/**
 * Revoke a specific token (logout)
 */
export async function revokeToken(tokenId: string): Promise<void> {
    await prisma.refreshToken.update({
        where: { id: tokenId },
        data: { revokedAt: new Date() },
    });
}

/**
 * Revoke all tokens for a user (logout all devices)
 */
export async function revokeAllUserTokens(userId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
        where: {
            userId,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
        },
    });

    // Clear all family caches for this user
    const keys = await redis.keys(`${TOKEN_FAMILY_CACHE_PREFIX}*`);
    for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (parsed.userId === userId) {
                    await redis.del(key);
                }
            } catch {
                // Skip invalid cache entries
            }
        }
    }

    logger.info('All user tokens revoked', { userId, count: result.count });
    return result.count;
}

/**
 * Clean up expired tokens (run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
        where: {
            expiresAt: { lt: new Date() },
        },
    });

    if (result.count > 0) {
        logger.info('Cleaned up expired tokens', { count: result.count });
    }

    return result.count;
}

/**
 * Hash token ID for secure storage
 */
function hashToken(tokenId: string): string {
    return crypto.createHash('sha256').update(tokenId).digest('hex');
}

export default {
    generateTokenPair,
    rotateRefreshToken,
    revokeToken,
    revokeAllUserTokens,
    revokeTokenFamily,
    cleanupExpiredTokens,
};
