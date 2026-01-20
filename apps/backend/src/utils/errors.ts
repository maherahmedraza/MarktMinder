/**
 * Custom API Error class for consistent error handling
 */
export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: any;

    constructor(
        statusCode: number,
        message: string,
        code: string = 'INTERNAL_ERROR',
        details?: any
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'ApiError';

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: {
                code: this.code,
                message: this.message,
                ...(this.details && { details: this.details }),
            },
        };
    }
}

// Pre-defined error types
export class BadRequestError extends ApiError {
    constructor(message: string = 'Bad request', details?: any) {
        super(400, message, 'BAD_REQUEST', details);
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = 'Unauthorized') {
        super(401, message, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends ApiError {
    constructor(message: string = 'Forbidden') {
        super(403, message, 'FORBIDDEN');
    }
}

export class NotFoundError extends ApiError {
    constructor(message: string = 'Resource not found') {
        super(404, message, 'NOT_FOUND');
    }
}

export class ConflictError extends ApiError {
    constructor(message: string = 'Resource already exists') {
        super(409, message, 'CONFLICT');
    }
}

export class ValidationError extends ApiError {
    constructor(message: string = 'Validation failed', details?: any) {
        super(422, message, 'VALIDATION_ERROR', details);
    }
}

export class TooManyRequestsError extends ApiError {
    constructor(message: string = 'Too many requests') {
        super(429, message, 'TOO_MANY_REQUESTS');
    }
}

export class InternalServerError extends ApiError {
    constructor(message: string = 'Internal server error') {
        super(500, message, 'INTERNAL_ERROR');
    }
}

export default ApiError;
