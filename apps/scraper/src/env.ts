import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // Redis
    REDIS_URL: z.string().url().default('redis://localhost:6379'),

    // Scraping Settings
    SCRAPE_CONCURRENCY: z.string().transform(Number).default(3),
    SCRAPE_DELAY_MS: z.string().transform(Number).default(2000),
    SCRAPE_TIMEOUT_MS: z.string().transform(Number).default(30000),
    SCRAPE_RETRY_ATTEMPTS: z.string().transform(Number).default(3),

    // Rate Limits
    RATE_LIMIT_AMAZON: z.string().transform(Number).default(20),
    RATE_LIMIT_ETSY: z.string().transform(Number).default(30),
    RATE_LIMIT_OTTO: z.string().transform(Number).default(25),

    // Proxy (Optional)
    PROXY_ENABLED: z.enum(['true', 'false']).transform((v) => v === 'true').default(false),
    PROXY_HOST: z.string().optional(),
    PROXY_PORT: z.string().optional(),
    PROXY_USERNAME: z.string().optional(),
    PROXY_PASSWORD: z.string().optional(),

    // Etsy API (Optional)
    ETSY_API_KEY: z.string().optional(),
    ETSY_API_SECRET: z.string().optional(),

    // Logging
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
    process.exit(1);
}

export const env = parsedEnv.data;
