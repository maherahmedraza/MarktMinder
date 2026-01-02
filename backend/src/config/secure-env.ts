/**
 * Secure Environment Configuration
 * 
 * Industry-standard secrets management:
 * 1. All secrets from environment variables
 * 2. Validation at startup (fail fast)
 * 3. No secrets in code or logs
 * 4. Typed configuration
 */

import { z } from 'zod';

// Environment schema with validation
const envSchema = z.object({
    // Node environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('5000').transform(Number),

    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_SSL: z.string().default('false').transform(v => v === 'true'),

    // Redis  
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

    // JWT Secrets - must be at least 32 characters
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

    // Encryption key for sensitive data
    ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)').optional(),

    // Stripe
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
    STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
    STRIPE_PRICE_POWER_MONTHLY: z.string().optional(),
    STRIPE_PRICE_POWER_YEARLY: z.string().optional(),
    STRIPE_PRICE_BUSINESS_MONTHLY: z.string().optional(),
    STRIPE_PRICE_BUSINESS_YEARLY: z.string().optional(),

    // Scraper API
    SCRAPER_API_KEY: z.string().optional(),
    USE_FREE_PROXIES: z.string().default('false').transform(v => v === 'true'),

    // Frontend
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),

    // Rate limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('5000').transform(Number),

    // CORS
    CORS_ORIGINS: z.string().optional(),

    // Email (optional)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().transform(Number).optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().optional(),
});

// Parse and validate environment
function validateEnv() {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        console.error('❌ Environment validation failed:');
        console.error(parsed.error.format());
        process.exit(1);
    }

    return parsed.data;
}

// Validated environment
const env = validateEnv();

/**
 * Application configuration
 * All secrets accessed through this typed config
 */
export const secureConfig = {
    // Environment
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    port: env.PORT,

    // Database
    database: {
        url: env.DATABASE_URL,
        ssl: env.DATABASE_SSL,
    },

    // Redis
    redis: {
        url: env.REDIS_URL,
    },

    // JWT (never log these!)
    jwt: {
        secret: env.JWT_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        accessExpiresIn: '15m',
        refreshExpiresIn: '7d',
    },

    // Encryption
    encryption: {
        key: env.ENCRYPTION_KEY,
    },

    // Stripe
    stripe: {
        secretKey: env.STRIPE_SECRET_KEY,
        publishableKey: env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
        prices: {
            pro: {
                monthly: env.STRIPE_PRICE_PRO_MONTHLY,
                yearly: env.STRIPE_PRICE_PRO_YEARLY,
            },
            power: {
                monthly: env.STRIPE_PRICE_POWER_MONTHLY,
                yearly: env.STRIPE_PRICE_POWER_YEARLY,
            },
            business: {
                monthly: env.STRIPE_PRICE_BUSINESS_MONTHLY,
                yearly: env.STRIPE_PRICE_BUSINESS_YEARLY,
            },
        },
    },

    // Scraper
    scraper: {
        apiKey: env.SCRAPER_API_KEY,
        useFreeProxies: env.USE_FREE_PROXIES,
    },

    // Frontend
    frontendUrl: env.FRONTEND_URL,

    // Rate limiting
    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },

    // CORS
    cors: {
        origins: env.CORS_ORIGINS?.split(',').map(s => s.trim()) || [env.FRONTEND_URL],
    },

    // Email
    email: env.SMTP_HOST ? {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        from: env.SMTP_FROM,
    } : null,
};

/**
 * Security utilities
 */
export const security = {
    /**
     * Mask a secret for logging (show only first/last 4 chars)
     */
    maskSecret(secret: string | undefined): string {
        if (!secret || secret.length < 12) return '***';
        return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
    },

    /**
     * Check if all payment secrets are configured
     */
    isPaymentConfigured(): boolean {
        return !!(
            secureConfig.stripe.secretKey &&
            secureConfig.stripe.webhookSecret
        );
    },

    /**
     * Get safe config for logging (no secrets)
     */
    getSafeConfig() {
        return {
            nodeEnv: secureConfig.nodeEnv,
            port: secureConfig.port,
            frontendUrl: secureConfig.frontendUrl,
            databaseConfigured: !!secureConfig.database.url,
            redisConfigured: !!secureConfig.redis.url,
            stripeConfigured: security.isPaymentConfigured(),
            emailConfigured: !!secureConfig.email,
        };
    },
};

export default secureConfig;
