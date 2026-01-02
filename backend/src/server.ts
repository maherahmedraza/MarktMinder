import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import { checkHealth as checkDbHealth, closePool } from './config/database.js';
import { checkHealth as checkRedisHealth, closeRedis } from './config/redis.js';
import { authRoutes, productsRoutes, alertsRoutes, adminRoutes, billingRoutes } from './routes/index.js';
import apiV1Routes from './routes/api-v1.routes.js';

// Create Express application
const app: Application = express();

// ======================
// Security Middleware
// ======================
app.use(helmet());
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Rate limiting (skip in development for easier testing)
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests, please try again later',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !config.isProduction, // Skip rate limiting in development
});
app.use('/api/', limiter);

// ======================
// Body Parsing
// ======================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// Request Logging
// ======================
app.use((req: Request, res: Response, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// ======================
// Health Check Endpoints
// ======================
app.get('/health', async (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'MarktMinder API',
        version: '1.0.0',
    });
});

app.get('/health/ready', async (req: Request, res: Response) => {
    const dbHealthy = await checkDbHealth();
    const redisHealthy = await checkRedisHealth();

    const isHealthy = dbHealthy && redisHealthy;

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ready' : 'not ready',
        checks: {
            database: dbHealthy ? 'ok' : 'failed',
            redis: redisHealthy ? 'ok' : 'failed',
        },
    });
});

// ======================
// API Routes
// ======================
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/billing', billingRoutes);  // Subscription & Payments
app.use('/api/v1', apiV1Routes);  // Public API

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
    res.json({
        name: 'MarktMinder API',
        version: '1.0.0',
        description: 'Price tracking API for Amazon, Etsy & Otto',
        endpoints: {
            auth: '/api/auth',
            products: '/api/products',
            alerts: '/api/alerts',
        },
        documentation: '/api/docs',
    });
});

// ======================
// Error Handling
// ======================
app.use(notFoundHandler);
app.use(errorHandler);

// ======================
// Graceful Shutdown
// ======================
async function shutdown(signal: string) {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    try {
        await closePool();
        await closeRedis();
        logger.info('All connections closed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ======================
// Start Server
// ======================
import { createServer } from 'http';
import { initSocket } from './config/socket.js';

// ... (other imports remain, but we handle them via merging or just focusing on the block)

async function startServer() {
    try {
        // Verify database connection
        const dbHealthy = await checkDbHealth();
        if (!dbHealthy) {
            throw new Error('Database connection failed');
        }
        logger.info('Database connection established');

        // Verify Redis connection
        const redisHealthy = await checkRedisHealth();
        if (!redisHealthy) {
            logger.warn('Redis connection failed - caching will be disabled');
        } else {
            logger.info('Redis connection established');
        }

        // Initialize Redis Subscriber for WebSockets
        try {
            const { initRedisSubscriber } = await import('./services/redis-subscriber.js');
            initRedisSubscriber();
        } catch (err) {
            logger.warn('Failed to initialize Redis subscriber', err);
        }

        // Create HTTP server
        const server = createServer(app);

        // Initialize Socket.io
        initSocket(server);

        // Start listening
        server.listen(config.port, () => {
            logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 MarktMinder API Server                                ║
║   ⚡ Socket.io Enabled                                    ║
║                                                            ║
║   Environment: ${config.nodeEnv.padEnd(40)}║
║   Port:        ${config.port.toString().padEnd(40)}║
║   URL:         http://localhost:${config.port.toString().padEnd(27)}║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app;

// Force backend restart for rate limit config update
