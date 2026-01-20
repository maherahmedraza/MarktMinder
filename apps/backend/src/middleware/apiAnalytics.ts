import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

/**
 * Middleware to track API usage per request
 * Should be placed AFTER response is sent (using on-headers or similar) 
 * or simpler: tracking at the start/end of request processing.
 * 
 * To capture response time and status code correctly, we verify the response finish.
 */
export function trackApiUsage(req: Request, res: Response, next: NextFunction) {
    // Only track if authenticated via API Key
    if (!req.headers['x-api-key']) {
        return next();
    }

    const startTime = Date.now();
    const apiKey = req.headers['x-api-key'] as string;

    // Hook into response finish to log data
    res.on('finish', async () => {
        const duration = Date.now() - startTime;

        try {
            // Find the key ID first (cached lookup would be better for performance)
            // Ideally req.user or specific req.apiKey attached by auth middleware contains the ID
            // Assuming authenticateApiKey middleware attaches user info, but we need the specific Key ID.
            // Let's modify the authenticateApiKey to attach the Key ID to req object.

            // Fallback lookup if not attached (less efficient)
            // Ideally we rely on req.apiKeyId attached by auth middleware
            const apiKeyId = (req as any).apiKeyId;

            if (apiKeyId) {
                await prisma.$queryRawUnsafe(`
                    INSERT INTO api_usage_logs 
                    (api_key_id, endpoint, method, status_code, response_time_ms, ip_address, user_agent)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `,
                    apiKeyId,
                    req.originalUrl.split('?')[0], // Remove query params for privacy/grouping
                    req.method,
                    res.statusCode,
                    duration,
                    req.ip || req.socket.remoteAddress,
                    req.headers['user-agent']
                );
            }
        } catch (error) {
            // detailed logging in prod, simple log here
            console.error('Failed to log API usage:', error);
        }
    });

    next();
}
