import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import config from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { requestLoggerMiddleware } from './middleware/requestLogger.js';
import { prisma } from './config/prisma.js';
import { checkHealth as checkRedisHealth, closeRedis } from './config/redis.js';
import { authRoutes, productsRoutes, alertsRoutes, adminRoutes, billingRoutes, notificationRoutes, foldersRoutes, communityRoutes, gamificationRoutes, telegramRoutes, conditionalAlertsRoutes } from './routes/index.js';
import teamsRoutes from './routes/teams.routes.js';
import competitorRoutes from './routes/competitors.routes.js';
import apiV1Routes from './routes/api-v1.routes.js';
import { swaggerSpec } from './config/swagger.js';
import passport, { initializePassport } from './config/passport.js';
import { initSentry, Sentry } from './config/sentry.js';

// Initialize Sentry FIRST (before any other code)
initSentry();

// Create Express application
const app: Application = express();

// Initialize Passport Strategies
initializePassport();

// ======================
// Security Middleware
// ======================
app.use(passport.initialize());
app.use(helmet());
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'x-csrf-token'],
}));

// ======================
// Rate Limiting
// ======================
// Global rate limiting for unauthenticated requests
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
    skip: (req) => {
        // Skip if in development OR user is authenticated (will use tier-based limits)
        return !config.isProduction || !!req.user;
    },
});
app.use('/api/', limiter);

// Tier-based rate limiting for authenticated users (applied after authentication)
import tierRateLimit from './middleware/tierRateLimit.js';

// ======================
// Body Parsing
// ======================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
import cookieParser from 'cookie-parser';
app.use(cookieParser());

// ======================
// Security - XSS Prevention
// ======================
import { sanitize } from './middleware/sanitize.js';
app.use(sanitize); // Sanitize all user inputs to prevent XSS attacks

// ======================
// Security - CSRF Protection
// ======================
import { csrfTokenGenerator, csrfProtection } from './middleware/csrf.js';
app.use(csrfTokenGenerator); // Generate CSRF tokens for all requests
app.use(csrfProtection); // Validate CSRF tokens on state-changing requests

// ======================
// Request Logging & Tracing
// ======================
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

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
    let dbHealthy = false;
    try {
        await prisma.$queryRaw`SELECT 1`;
        dbHealthy = true;
    } catch (e) {
        dbHealthy = false;
    }
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
// API Routes - Version 1
// ======================
// All routes are now under /api/v1/ for proper versioning

// Apply tier-based rate limiting to authenticated routes
app.use('/api/v1/products', tierRateLimit, productsRoutes);
app.use('/api/v1/alerts', tierRateLimit, alertsRoutes);
app.use('/api/v1/folders', tierRateLimit, foldersRoutes);

// Team & Competitor Routes
app.use('/api/v1/teams/:teamId/competitors', tierRateLimit, competitorRoutes);
app.use('/api/v1/teams', tierRateLimit, teamsRoutes);
app.use('/api/v1/community', tierRateLimit, communityRoutes);
app.use('/api/v1/gamification', tierRateLimit, gamificationRoutes);
app.use('/api/v1/conditional-alerts', tierRateLimit, conditionalAlertsRoutes);

// B2B Public White-Label API (Rate Limits + Analytics Enforced internal to router)
import publicRoutes from './routes/api/v1/public.js';
app.use('/api/v1', publicRoutes);

// Routes without tier limits (auth, billing, admin)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/billing', billingRoutes);  // Subscription & Payments
app.use('/api/v1/telegram', telegramRoutes);

// ======================
// API Documentation (Swagger)
// ======================
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'MarktMinder API Docs',
}));
app.get('/api/docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

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
// Sentry error handler - must be before other error handlers
Sentry.setupExpressErrorHandler(app);

app.use(notFoundHandler);
app.use(errorHandler);

// ======================
// Graceful Shutdown
// ======================
async function shutdown(signal: string) {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    try {
        await prisma.$disconnect();
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
        try {
            await prisma.$queryRaw`SELECT 1`;
            logger.info('Database connection established');
        } catch (dbError) {
            throw new Error('Database connection failed');
        }

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

if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export default app;

// Force backend restart for rate limit config update
