/**
 * Standardized Error Classes
 * 
 * Follows RFC 7807 (Problem Details for HTTP APIs)
 * All errors have: code, message, status, and optional details
 */

// Base error class
export class AppError extends Error {
    public readonly code: string;
    public readonly status: number;
    public readonly details?: Record<string, unknown>;
    public readonly timestamp: string;

    constructor(
        message: string,
        code: string,
        status: number = 500,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.status = status;
        this.details = details;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: {
                type: `https://marktminder.de/errors/${this.code.toLowerCase()}`,
                title: this.name,
                status: this.status,
                code: this.code,
                message: this.message,
                details: this.details,
                timestamp: this.timestamp,
            }
        };
    }
}

// 400 Bad Request
export class BadRequestError extends AppError {
    constructor(message: string = 'Bad request', details?: Record<string, unknown>) {
        super(message, 'BAD_REQUEST', 400, details);
    }
}

// 401 Unauthorized
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
        super(message, 'UNAUTHORIZED', 401, details);
    }
}

// 403 Forbidden
export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied', details?: Record<string, unknown>) {
        super(message, 'FORBIDDEN', 403, details);
    }
}

// 404 Not Found
export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource', details?: Record<string, unknown>) {
        super(`${resource} not found`, 'NOT_FOUND', 404, details);
    }
}

// 409 Conflict
export class ConflictError extends AppError {
    constructor(message: string = 'Resource conflict', details?: Record<string, unknown>) {
        super(message, 'CONFLICT', 409, details);
    }
}

// 422 Validation Error
export class ValidationError extends AppError {
    public readonly validationErrors: Array<{ field: string; message: string }>;

    constructor(
        message: string = 'Validation failed',
        errors: Array<{ field: string; message: string }> = []
    ) {
        super(message, 'VALIDATION_ERROR', 422, { errors });
        this.validationErrors = errors;
    }
}

// 429 Rate Limit
export class RateLimitError extends AppError {
    constructor(
        message: string = 'Rate limit exceeded',
        retryAfter?: number,
        limit?: number
    ) {
        super(message, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter, limit });
    }
}

// 500 Internal Server Error
export class InternalError extends AppError {
    constructor(message: string = 'Internal server error', details?: Record<string, unknown>) {
        super(message, 'INTERNAL_ERROR', 500, details);
    }
}

// 502 Bad Gateway
export class ExternalServiceError extends AppError {
    constructor(service: string, message: string = 'External service error') {
        super(message, 'EXTERNAL_SERVICE_ERROR', 502, { service });
    }
}

// 503 Service Unavailable
export class ServiceUnavailableError extends AppError {
    constructor(message: string = 'Service temporarily unavailable', retryAfter?: number) {
        super(message, 'SERVICE_UNAVAILABLE', 503, { retryAfter });
    }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

/**
 * Create error from unknown throw
 */
export function normalizeError(error: unknown): AppError {
    if (isAppError(error)) {
        return error;
    }

    if (error instanceof Error) {
        return new InternalError(error.message);
    }

    return new InternalError(String(error));
}

export default {
    AppError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    ValidationError,
    RateLimitError,
    InternalError,
    ExternalServiceError,
    ServiceUnavailableError,
    isAppError,
    normalizeError,
};
