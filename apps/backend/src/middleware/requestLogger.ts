import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Middleware to log HTTP request/response with timing metrics.
 * Must be used AFTER requestIdMiddleware.
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Log request start
    logger.info('Request started', {
        requestId: req.requestId,
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
    });

    // Capture response finish
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

        logger[logLevel]('Request completed', {
            requestId: req.requestId,
            correlationId: req.correlationId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
        });
    });

    next();
}

export default requestLoggerMiddleware;
