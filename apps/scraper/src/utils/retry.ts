/**
 * Retry Utility with Exponential Backoff
 * 
 * Provides robust retry logic for scraping operations:
 * - Exponential backoff with jitter
 * - Configurable max retries and delays
 * - Error type classification for retry decisions
 */

import logger from '../logger.js';

export interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    jitter?: boolean;
    retryableErrors?: string[];
    onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'retryableErrors'>> = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
};

// Error types that should trigger a retry
const RETRYABLE_ERROR_PATTERNS = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ESOCKETTIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'Navigation timeout',
    'net::ERR_',
    'Protocol error',
    'Target closed',
    'Session closed',
    'Connection refused',
    'socket hang up',
    'CAPTCHA',
    '503',
    '429',
    'Too Many Requests',
];

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: Error | string): boolean {
    const errorString = typeof error === 'string' ? error : error.message;

    return RETRYABLE_ERROR_PATTERNS.some(pattern =>
        errorString.toLowerCase().includes(pattern.toLowerCase())
    );
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
export function calculateDelay(
    attempt: number,
    initialDelay: number,
    maxDelay: number,
    multiplier: number,
    useJitter: boolean
): number {
    // Exponential backoff: initialDelay * multiplier^attempt
    let delay = initialDelay * Math.pow(multiplier, attempt);

    // Cap at max delay
    delay = Math.min(delay, maxDelay);

    // Add jitter (±25% random variation)
    if (useJitter) {
        const jitterRange = delay * 0.25;
        delay += Math.random() * jitterRange * 2 - jitterRange;
    }

    return Math.round(delay);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute an async function with retry logic
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Check if we should retry
            const shouldRetry =
                attempt < opts.maxRetries &&
                (opts.retryableErrors
                    ? opts.retryableErrors.some(e => lastError!.message.includes(e))
                    : isRetryableError(lastError));

            if (!shouldRetry) {
                throw lastError;
            }

            // Calculate delay
            const delayMs = calculateDelay(
                attempt,
                opts.initialDelayMs,
                opts.maxDelayMs,
                opts.backoffMultiplier,
                opts.jitter
            );

            // Log retry attempt
            logger.warn(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delayMs}ms`, {
                error: lastError.message,
            });

            // Call optional onRetry callback
            if (opts.onRetry) {
                opts.onRetry(attempt + 1, lastError, delayMs);
            }

            // Wait before retrying
            await sleep(delayMs);
        }
    }

    throw lastError;
}

/**
 * Decorator for class methods to add retry logic
 */
export function Retry(options: RetryOptions = {}) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            return withRetry(() => originalMethod.apply(this, args), options);
        };

        return descriptor;
    };
}

/**
 * Create a retry wrapper with preset options
 */
export function createRetryWrapper(defaultOptions: RetryOptions = {}) {
    return function <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
        return withRetry(fn, { ...defaultOptions, ...options });
    };
}

// Pre-configured retry functions for common use cases
export const retryWithDefaults = createRetryWrapper();

export const retryAggressive = createRetryWrapper({
    maxRetries: 5,
    initialDelayMs: 500,
    maxDelayMs: 60000,
});

export const retryConservative = createRetryWrapper({
    maxRetries: 2,
    initialDelayMs: 2000,
    maxDelayMs: 10000,
});

export default {
    withRetry,
    createRetryWrapper,
    isRetryableError,
    calculateDelay,
    sleep,
    Retry,
    retryWithDefaults,
    retryAggressive,
    retryConservative,
};
