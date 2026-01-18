import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MarktMinder API',
            version: '1.1.0',
            description: `
# MarktMinder API Documentation

AI-powered price tracking API for Amazon, Etsy, and Otto.de marketplaces.

## Features
- 🔐 JWT Authentication with refresh tokens
- 📦 Multi-marketplace product tracking
- 🔔 Smart price alerts
- 🤖 AI price predictions
- 💰 Stripe subscription management

## Authentication
Most endpoints require authentication via Bearer token:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

## Rate Limiting
- Development: Unlimited
- Production: 100 requests per 15 minutes

## Subscription Tiers
| Tier | Products | Alerts | Features |
|------|----------|--------|----------|
| Free | 5 | 3 | Basic |
| Pro | 50 | 25 | + AI Predictions |
| Power | 200 | 100 | + Deal Radar |
| Business | Unlimited | Unlimited | + API Access |
            `,
            contact: {
                name: 'MarktMinder Support',
                email: 'support@marktminder.de',
                url: 'https://marktminder.de/contact'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3001/api',
                description: 'Development server'
            },
            {
                url: 'https://api.marktminder.de/api',
                description: 'Production server'
            }
        ],
        tags: [
            { name: 'Auth', description: 'Authentication & Authorization' },
            { name: 'Products', description: 'Product tracking operations' },
            { name: 'Alerts', description: 'Price alert management' },
            { name: 'Billing', description: 'Subscription & payment management' },
            { name: 'Admin', description: 'Administrative operations' },
            { name: 'Deals', description: 'Deal Radar & personalized deals' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your access token'
                },
                apiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key',
                    description: 'API key for programmatic access (Pro+ tiers)'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', example: 'VALIDATION_ERROR' },
                                message: { type: 'string', example: 'Invalid input data' }
                            }
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string' },
                        role: { type: 'string', enum: ['user', 'admin'] },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        url: { type: 'string', format: 'uri' },
                        marketplace: { type: 'string', enum: ['amazon', 'etsy', 'otto'] },
                        marketplaceId: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        imageUrl: { type: 'string', format: 'uri' },
                        currentPrice: { type: 'number' },
                        currency: { type: 'string', default: 'EUR' },
                        lowestPrice: { type: 'number' },
                        highestPrice: { type: 'number' },
                        availability: { type: 'string' },
                        lastScrapedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Alert: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        productId: { type: 'string', format: 'uuid' },
                        alertType: {
                            type: 'string',
                            enum: ['price_below', 'price_above', 'price_drop_pct', 'back_in_stock', 'all_time_low', 'any_change']
                        },
                        targetPrice: { type: 'number' },
                        targetPercentage: { type: 'number' },
                        isActive: { type: 'boolean' },
                        isTriggered: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                PriceHistory: {
                    type: 'object',
                    properties: {
                        time: { type: 'string', format: 'date-time' },
                        price: { type: 'number' },
                        availability: { type: 'string' }
                    }
                },
                Subscription: {
                    type: 'object',
                    properties: {
                        tier: { type: 'string', enum: ['free', 'pro', 'power', 'business'] },
                        status: { type: 'string', enum: ['active', 'canceled', 'past_due'] },
                        currentPeriodStart: { type: 'string', format: 'date-time' },
                        currentPeriodEnd: { type: 'string', format: 'date-time' }
                    }
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Access token is missing or invalid',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                ForbiddenError: {
                    description: 'Insufficient permissions or subscription tier',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                NotFoundError: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }]
    },
    apis: ['./src/routes/*.ts', './src/routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
