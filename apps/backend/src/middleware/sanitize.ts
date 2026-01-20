import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Fields that allow limited HTML (will be sanitized)
 */
const HTML_FIELDS = new Set(['description']);

/**
 * Fields that should be plain text only (HTML stripped completely)
 */
const TEXT_FIELDS = new Set([
    'customName',
    'custom_name',
    'notes',
    'name',
    'title',
    'reason',
    'message',
]);

/**
 * Sanitize user input to prevent XSS attacks
 * 
 * @param value The value to sanitize
 * @param fieldName The field name to determine sanitization strategy
 */
function sanitizeValue(value: any, fieldName: string): any {
    if (typeof value !== 'string') {
        return value;
    }

    // For HTML-allowed fields, sanitize but keep safe HTML
    if (HTML_FIELDS.has(fieldName)) {
        return DOMPurify.sanitize(value, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
            ALLOWED_ATTR: ['href', 'target'],
        });
    }

    // For text fields, strip all HTML
    if (TEXT_FIELDS.has(fieldName)) {
        return DOMPurify.sanitize(value, {
            ALLOWED_TAGS: [],
            ALLOWED_ATTR: [],
        });
    }

    // Default: allow value as-is (for IDs, enums, etc.)
    return value;
}

/**
 * Recursively sanitize an object's string values
 */
function sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeValue(sanitizeObject(value), key);
        }
        return sanitized;
    }

    return obj;
}

/**
 * Express middleware to sanitize request body, query, and params
 * 
 * Usage:
 * ```typescript
 * router.post('/products', sanitize, asyncHandler(async (req, res) => {
 *   // req.body is now sanitized
 * }));
 * ```
 */
export function sanitize(req: Request, res: Response, next: NextFunction): void {
    // Sanitize request body
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }

    // Sanitize route parameters
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }

    next();
}

/**
 * Sanitize a single string value (for manual use)
 * 
 * @example
 * const cleanName = sanitizeString(userInput, 'customName');
 */
export function sanitizeString(value: string, fieldName: string = 'default'): string {
    return sanitizeValue(value, fieldName);
}

export default sanitize;
