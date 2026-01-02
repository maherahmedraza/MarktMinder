/**
 * Billing Routes - Stripe Integration
 * 
 * Handles subscription management, payments, and webhooks
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { body } from 'express-validator';
import config from '../config/index.js';
import { authenticate, validate, asyncHandler } from '../middleware/index.js';
import {
    getOrCreateSubscription,
    updateSubscription,
    tierConfigs,
    SubscriptionTier
} from '../models/Subscription.js';
import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Initialize Stripe (with fallback for development)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Stripe Price IDs (would be set in environment)
const STRIPE_PRICE_IDS: Record<SubscriptionTier, { monthly: string; yearly: string }> = {
    free: { monthly: '', yearly: '' },
    pro: {
        monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
        yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly',
    },
    power: {
        monthly: process.env.STRIPE_PRICE_POWER_MONTHLY || 'price_power_monthly',
        yearly: process.env.STRIPE_PRICE_POWER_YEARLY || 'price_power_yearly',
    },
    business: {
        monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || 'price_business_monthly',
        yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || 'price_business_yearly',
    },
};

/**
 * @route   GET /api/billing/subscription
 * @desc    Get current subscription with usage info
 * @access  Private
 */
router.get('/subscription', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const subscription = await getOrCreateSubscription(userId);
    const limits = tierConfigs[subscription.tier];

    // Get current usage counts
    const productCountResult = await query('SELECT COUNT(*) FROM user_products WHERE user_id = $1', [userId]);
    const alertCountResult = await query('SELECT COUNT(*) FROM alerts WHERE user_id = $1 AND is_active = true', [userId]);

    const currentProducts = parseInt(productCountResult.rows[0].count);
    const currentAlerts = parseInt(alertCountResult.rows[0].count);

    res.json({
        subscription: {
            tier: subscription.tier,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        },
        limits: {
            maxProducts: limits.maxProducts,
            maxAlerts: limits.maxAlerts,
            apiDailyLimit: limits.apiDailyLimit,
        },
        usage: {
            currentProducts,
            currentAlerts,
        },
        features: limits.features,
        prices: {
            monthly: limits.priceMonthly,
            yearly: limits.priceYearly,
        }
    });
}));

/**
 * @route   GET /api/billing/plans
 * @desc    Get available plans
 * @access  Public
 */
router.get('/plans', (req: Request, res: Response) => {
    const plans = Object.entries(tierConfigs).map(([tier, config]) => ({
        tier,
        name: tier.charAt(0).toUpperCase() + tier.slice(1),
        priceMonthly: config.priceMonthly,
        priceYearly: config.priceYearly,
        savings: config.priceMonthly > 0
            ? Math.round((1 - config.priceYearly / (config.priceMonthly * 12)) * 100)
            : 0,
        limits: {
            maxProducts: config.maxProducts === -1 ? 'Unlimited' : config.maxProducts,
            maxAlerts: config.maxAlerts === -1 ? 'Unlimited' : config.maxAlerts,
            apiDailyLimit: config.apiDailyLimit,
        },
        features: config.features,
    }));

    res.json({ plans });
});

/**
 * @route   POST /api/billing/create-checkout
 * @desc    Create Stripe checkout session
 * @access  Private
 */
router.post(
    '/create-checkout',
    authenticate,
    validate([
        body('tier').isIn(['pro', 'power', 'business']).withMessage('Invalid tier'),
        body('interval').isIn(['monthly', 'yearly']).withMessage('Invalid interval'),
    ]),
    asyncHandler(async (req: Request, res: Response) => {
        const userId = req.user!.id;
        const { tier, interval } = req.body as { tier: SubscriptionTier; interval: 'monthly' | 'yearly' };

        // Get or create Stripe customer
        let stripeCustomerId: string;
        const subscription = await getOrCreateSubscription(userId);

        if (subscription.stripeCustomerId) {
            stripeCustomerId = subscription.stripeCustomerId;
        } else {
            // Get user email
            const userResult = await query(`SELECT email FROM users WHERE id = $1`, [userId]);
            const email = userResult.rows[0]?.email;

            const customer = await stripe.customers.create({
                email,
                metadata: { userId },
            });

            stripeCustomerId = customer.id;
            await updateSubscription(userId, { stripeCustomerId });
        }

        // Get price ID
        const priceId = STRIPE_PRICE_IDS[tier][interval];
        if (!priceId) {
            return res.status(400).json({ error: 'Invalid plan configuration' });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${config.frontendUrl}/dashboard/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.frontendUrl}/pricing?canceled=true`,
            metadata: { userId, tier },
            subscription_data: {
                metadata: { userId, tier },
            },
        });

        res.json({ sessionId: session.id, url: session.url });
    })
);

/**
 * @route   POST /api/billing/create-portal
 * @desc    Create Stripe customer portal session
 * @access  Private
 */
router.post('/create-portal', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const subscription = await getOrCreateSubscription(userId);

    if (!subscription.stripeCustomerId) {
        return res.status(400).json({ error: 'No billing information found' });
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${config.frontendUrl}/dashboard/settings`,
    });

    res.json({ url: session.url });
}));

/**
 * @route   POST /api/billing/cancel
 * @desc    Cancel subscription at period end
 * @access  Private
 */
router.post('/cancel', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const subscription = await getOrCreateSubscription(userId);

    if (!subscription.stripeSubscriptionId) {
        return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
    });

    await updateSubscription(userId, { cancelAtPeriodEnd: true });

    res.json({ message: 'Subscription will be canceled at the end of the billing period' });
}));

/**
 * @route   POST /api/billing/resume
 * @desc    Resume a canceled subscription
 * @access  Private
 */
router.post('/resume', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const subscription = await getOrCreateSubscription(userId);

    if (!subscription.stripeSubscriptionId) {
        return res.status(400).json({ error: 'No subscription to resume' });
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
    });

    await updateSubscription(userId, { cancelAtPeriodEnd: false });

    res.json({ message: 'Subscription resumed' });
}));

/**
 * @route   POST /api/billing/webhook
 * @desc    Stripe webhook handler
 * @access  Public (verified by Stripe signature)
 */
router.post(
    '/webhook',
    // Raw body parser for webhook signature verification
    (req: Request, res: Response, next) => {
        // Body should be raw for webhook signature verification
        // Express already parsed it, so we reconstruct
        next();
    },
    asyncHandler(async (req: Request, res: Response) => {
        const sig = req.headers['stripe-signature'] as string;
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            logger.warn('Stripe webhook secret not configured');
            return res.status(400).send('Webhook secret not configured');
        }

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                JSON.stringify(req.body), // In production, use raw body
                sig,
                webhookSecret
            );
        } catch (err: any) {
            logger.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle events
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.userId;
                const tier = session.metadata?.tier as SubscriptionTier;

                if (userId && tier) {
                    await updateSubscription(userId, {
                        tier,
                        status: 'active',
                        stripeSubscriptionId: session.subscription as string,
                    });
                    logger.info(`Subscription activated for user ${userId}: ${tier}`);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const userId = subscription.metadata?.userId;
                // Cast to any to access period fields (exist at runtime)
                const subData = subscription as any;

                if (userId) {
                    const periodStart = subData.current_period_start
                        ? new Date(subData.current_period_start * 1000)
                        : new Date();
                    const periodEnd = subData.current_period_end
                        ? new Date(subData.current_period_end * 1000)
                        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    await updateSubscription(userId, {
                        status: subscription.status as any,
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                        currentPeriodStart: periodStart,
                        currentPeriodEnd: periodEnd,
                    });
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const userId = subscription.metadata?.userId;

                if (userId) {
                    await updateSubscription(userId, {
                        tier: 'free',
                        status: 'canceled',
                        stripeSubscriptionId: null,
                        cancelAtPeriodEnd: false,
                    });
                    logger.info(`Subscription canceled for user ${userId}`);
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                // Find user by customer ID
                const result = await query(`
                    SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1
                `, [customerId]);

                if (result.rows.length > 0) {
                    await updateSubscription(result.rows[0].user_id, {
                        status: 'past_due',
                    });
                }
                break;
            }

            default:
                logger.debug(`Unhandled webhook event: ${event.type}`);
        }

        res.json({ received: true });
    })
);

export default router;
