import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',

    // Database
    database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/marktminder',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        name: process.env.DB_NAME || 'marktminder',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: process.env.NODE_ENV === 'production',
        poolSize: parseInt(process.env.DB_POOL_SIZE || '20', 10),
    },

    // Redis
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    // Email
    email: {
        sendgridApiKey: process.env.SENDGRID_API_KEY,
        from: process.env.EMAIL_FROM || 'noreply@marktminder.com',
    },

    // Frontend
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

    // Rate Limiting (higher for development)
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5000', 10), // 5000 requests per window
    },

    // Logging
    logLevel: process.env.LOG_LEVEL || 'debug',
};

export default config;
