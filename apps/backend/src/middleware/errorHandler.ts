import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Global error handling middleware
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Log the error
    logger.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Handle known API errors
    if (err instanceof ApiError) {
        res.status(err.statusCode).json(err.toJSON());
        return;
    }

    // Handle validation errors from express-validator
    if (err.name === 'ValidationError') {
        res.status(422).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: err.message,
            },
        });
        return;
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid authentication token',
            },
        });
        return;
    }

    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            error: {
                code: 'TOKEN_EXPIRED',
                message: 'Authentication token has expired',
            },
        });
        return;
    }

    // Handle unknown errors
    const statusCode = 500;
    const message = config.isProduction
        ? 'Internal server error'
        : err.message || 'Internal server error';

    res.status(statusCode).json({
        error: {
            code: 'INTERNAL_ERROR',
            message,
            ...(config.isProduction ? {} : { stack: err.stack }),
        },
    });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

export default { errorHandler, notFoundHandler, asyncHandler };
