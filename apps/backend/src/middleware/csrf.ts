import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * CSRF Token Configuration
 */
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_EXPIRY = 3600000; // 1 hour in milliseconds

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCsrfToken(): string {
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Middleware to generate and set CSRF token in cookie
 * This should be applied early in the middleware chain
 */
export function csrfTokenGenerator(req: Request, res: Response, next: NextFunction): void {
    // Check if token already exists in cookie
    let token = req.cookies[CSRF_COOKIE_NAME];

    if (!token) {
        // Generate new token
        token = generateCsrfToken();

        // Set token in cookie (accessible to JavaScript for reading)
        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: false, // Allow JavaScript to read for sending in headers
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            sameSite: 'strict',
            maxAge: CSRF_TOKEN_EXPIRY,
            path: '/',
        });

        logger.debug('Generated new CSRF token', { requestId: (req as any).id });
    }

    // Store token in request for later validation
    (req as any).csrfToken = token;
    next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Apply to POST, PUT, PATCH, DELETE routes
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
    // Only check state-changing methods
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return next();
    }

    // Skip CSRF for webhook endpoints
    const webhookPaths = ['/api/v1/billing/webhook', '/api/v1/telegram/webhook'];
    if (webhookPaths.some(path => req.path.startsWith(path))) {
        logger.debug('Skipping CSRF check for webhook', { path: req.path });
        return next();
    }

    // Get token from cookie
    const cookieToken = req.cookies[CSRF_COOKIE_NAME];

    // Get token from header
    const headerToken = req.get(CSRF_HEADER_NAME) || req.body?._csrf;

    // Validate tokens exist
    if (!cookieToken || !headerToken) {
        logger.warn('CSRF token missing', {
            method: req.method,
            path: req.path,
            hasCookie: !!cookieToken,
            hasHeader: !!headerToken,
            requestId: (req as any).id,
        });
        throw new ForbiddenError('CSRF token missing or invalid');
    }

    // Compare tokens using timing-safe comparison
    const cookieBuffer = Buffer.from(cookieToken, 'utf8');
    const headerBuffer = Buffer.from(headerToken, 'utf8');

    if (cookieBuffer.length !== headerBuffer.length ||
        !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
        logger.warn('CSRF token mismatch', {
            method: req.method,
            path: req.path,
            requestId: (req as any).id,
        });
        throw new ForbiddenError('CSRF token mismatch');
    }

    logger.debug('CSRF validation passed', {
        method: req.method,
        path: req.path,
        requestId: (req as any).id,
    });

    next();
}

/**
 * Helper to get CSRF token for use in responses
 * Useful for rendering token in HTML forms
 */
export function getCsrfToken(req: Request): string {
    return (req as any).csrfToken || req.cookies[CSRF_COOKIE_NAME] || '';
}

export default { csrfTokenGenerator, csrfProtection, getCsrfToken };
