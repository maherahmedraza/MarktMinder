import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from scraper directory first, then fallback to project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    // Database
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/marktminder',

    // Redis
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    // Scraping - Optimized for API efficiency
    scraping: {
        concurrency: parseInt(process.env.SCRAPE_CONCURRENCY || '2', 10), // Lower for API efficiency
        delayMs: parseInt(process.env.SCRAPE_DELAY_MS || '5000', 10), // 5s delay between calls
        timeoutMs: parseInt(process.env.SCRAPE_TIMEOUT_MS || '45000', 10), // Longer for API calls
        retryAttempts: parseInt(process.env.SCRAPE_RETRY_ATTEMPTS || '2', 10), // Fewer retries to save calls
        defaultFrequencyHours: 24, // Default: scrape once per day to save API calls
    },

    // Proxy Configuration
    proxy: {
        enabled: process.env.PROXY_ENABLED === 'true',
        host: process.env.PROXY_HOST,
        port: process.env.PROXY_PORT,
        username: process.env.PROXY_USERNAME,
        password: process.env.PROXY_PASSWORD,
        // Use free public proxies if no proxy configured
        useFreeProxies: process.env.USE_FREE_PROXIES === 'true',
    },

    // ScraperAPI (Free tier: 5,000 calls/month)
    // Get your API key at: https://www.scraperapi.com/
    scraperApi: {
        enabled: process.env.SCRAPER_API_ENABLED === 'true',
        apiKey: process.env.SCRAPER_API_KEY || '',
        // Use ScraperAPI for specific marketplaces only
        useForAmazon: process.env.SCRAPER_API_AMAZON !== 'false',
    },

    // Rate Limits (per minute) - reduced for stealth
    rateLimits: {
        amazon: parseInt(process.env.RATE_LIMIT_AMAZON || '10', 10),
        etsy: parseInt(process.env.RATE_LIMIT_ETSY || '20', 10),
        otto: parseInt(process.env.RATE_LIMIT_OTTO || '15', 10),
    },

    // Etsy API
    etsy: {
        apiKey: process.env.ETSY_API_KEY,
        apiSecret: process.env.ETSY_API_SECRET,
    },

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;

