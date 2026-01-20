import { env } from './env.js';

// Re-export validated env for use in other files if needed
export { env };

export default {
    // Server
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',

    // Database
    database: {
        url: env.DATABASE_URL,
        host: 'localhost', // Legacy support if needed, but url should be primary
    },

    // Redis
    redis: {
        url: env.REDIS_URL,
    },

    // JWT
    jwt: {
        secret: env.JWT_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        expiresIn: env.JWT_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },

    // Email
    email: {
        from: env.SMTP_FROM || 'noreply@marktminder.com',
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
    },

    // Frontend
    frontendUrl: env.FRONTEND_URL,

    // Rate Limiting
    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },

    // Logging
    logLevel: env.LOG_LEVEL,

    // Stripe
    stripe: {
        secretKey: env.STRIPE_SECRET_KEY,
        publishableKey: env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    }
};
