import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { env } from './env';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry() {
    // Only initialize if DSN is provided
    if (!env.SENTRY_DSN) {
        console.warn('Sentry DSN not configured - error monitoring disabled');
        return;
    }

    Sentry.init({
        dsn: env.SENTRY_DSN,
        environment: env.NODE_ENV,

        // Performance Monitoring
        tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

        integrations: [
            nodeProfilingIntegration(),
        ],

        // Release tracking (optional, for version tracking)
        // release: process.env.npm_package_version,
    });

    console.log(`Sentry initialized for environment: ${env.NODE_ENV}`);
}

/**
 * Capture an exception with Sentry
 */
export function captureException(error: Error, context?: Record<string, any>) {
    Sentry.captureException(error, {
        extra: context,
    });
}

/**
 * Capture a message with Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    Sentry.captureMessage(message, level);
}

export { Sentry };
