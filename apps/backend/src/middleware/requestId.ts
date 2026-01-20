import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
    namespace Express {
        interface Request {
            requestId: string;
            correlationId?: string;
        }
    }
}

/**
 * Middleware to generate a unique request ID for each incoming request.
 * Attaches it to req.requestId and sets X-Request-ID response header.
 * Also handles incoming X-Correlation-ID for distributed tracing.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
    // Generate unique request ID
    req.requestId = randomUUID();

    // Get or generate correlation ID for distributed tracing
    req.correlationId = req.headers['x-correlation-id'] as string || req.requestId;

    // Set response headers
    res.setHeader('X-Request-ID', req.requestId);
    res.setHeader('X-Correlation-ID', req.correlationId);

    next();
}

export default requestIdMiddleware;
