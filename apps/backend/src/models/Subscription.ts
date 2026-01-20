import { prisma } from '../config/prisma.js';
import { Subscription as PrismaSubscription, SubscriptionTier, SubscriptionStatus } from '@prisma/client';

export type { SubscriptionTier, SubscriptionStatus };

export interface Subscription {
    id: string;
    userId: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface TierLimits {
    maxProducts: number;
    maxAlerts: number;
    apiDailyLimit: number;
    features: string[];
}

/**
 * Tier configurations with limits and features
 */
export const tierConfigs: Record<SubscriptionTier, TierLimits & { priceMonthly: number; priceYearly: number }> = {
    free: {
        maxProducts: 5,
        maxAlerts: 3,
        apiDailyLimit: 0,
        features: [
            'Track 5 products',
            '30-day price history',
            '3 price alerts',
            'Basic notifications',
        ],
        priceMonthly: 0,
        priceYearly: 0,
    },
    pro: {
        maxProducts: 50,
        maxAlerts: 25,
        apiDailyLimit: 100,
        features: [
            'Track 50 products',
            'Full price history',
            '25 price alerts',
            'AI price predictions',
            'Export data',
            'Email notifications',
            'API access (100/day)',
        ],
        priceMonthly: 4.99,
        priceYearly: 49.99,
    },
    power: {
        maxProducts: 200,
        maxAlerts: 100,
        apiDailyLimit: 1000,
        features: [
            'Track 200 products',
            'Full price history',
            '100 price alerts',
            'AI predictions + Price DNA',
            'Deal Radar',
            'Priority scraping',
            'API access (1000/day)',
            'Webhook notifications',
        ],
        priceMonthly: 9.99,
        priceYearly: 99.99,
    },
    business: {
        maxProducts: -1, // Unlimited
        maxAlerts: -1,   // Unlimited
        apiDailyLimit: 10000,
        features: [
            'Unlimited products',
            'Full price history',
            'Unlimited alerts',
            'All Pro + Power features',
            'API access (10,000/day)',
            'White-label embeds',
            'Dedicated support',
            'Custom integrations',
        ],
        priceMonthly: 29.99,
        priceYearly: 299.99,
    },
};

/** Map Prisma subscription to legacy Subscription interface */
function toSubscription(s: PrismaSubscription): Subscription {
    return {
        id: s.id,
        userId: s.userId,
        tier: s.tier,
        status: s.status,
        stripeCustomerId: s.stripeCustomerId,
        stripeSubscriptionId: s.stripeSubscriptionId,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
    };
}

/**
 * Get user's subscription
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
    const subscription = await prisma.subscription.findUnique({
        where: { userId },
    });
    return subscription ? toSubscription(subscription) : null;
}

/**
 * Get or create subscription (defaults to free)
 */
export async function getOrCreateSubscription(userId: string): Promise<Subscription> {
    const existing = await getSubscription(userId);
    if (existing) return existing;

    // Create free subscription
    const subscription = await prisma.subscription.create({
        data: {
            userId,
            tier: 'free',
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
        },
    });

    return toSubscription(subscription);
}

/**
 * Update subscription
 */
export async function updateSubscription(
    userId: string,
    updates: Partial<Pick<Subscription, 'tier' | 'status' | 'stripeCustomerId' | 'stripeSubscriptionId' | 'currentPeriodStart' | 'currentPeriodEnd' | 'cancelAtPeriodEnd'>>
): Promise<Subscription | null> {
    try {
        const subscription = await prisma.subscription.update({
            where: { userId },
            data: updates,
        });
        return toSubscription(subscription);
    } catch {
        return null;
    }
}

/**
 * Check if user can add more products
 */
export async function canAddProduct(userId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    // Check if user is admin - admins have unlimited access
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    if (user?.role === 'admin') {
        return { allowed: true, current: 0, limit: -1 };
    }

    const subscription = await getOrCreateSubscription(userId);
    const limits = tierConfigs[subscription.tier];

    if (limits.maxProducts === -1) {
        return { allowed: true, current: 0, limit: -1 };
    }

    const current = await prisma.userProduct.count({
        where: { userId },
    });

    return {
        allowed: current < limits.maxProducts,
        current,
        limit: limits.maxProducts,
    };
}

/**
 * Check if user can add more alerts
 */
export async function canAddAlert(userId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    // Check if user is admin - admins have unlimited access
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    if (user?.role === 'admin') {
        return { allowed: true, current: 0, limit: -1 };
    }

    const subscription = await getOrCreateSubscription(userId);
    const limits = tierConfigs[subscription.tier];

    if (limits.maxAlerts === -1) {
        return { allowed: true, current: 0, limit: -1 };
    }

    const current = await prisma.alert.count({
        where: { userId, isActive: true },
    });

    return {
        allowed: current < limits.maxAlerts,
        current,
        limit: limits.maxAlerts,
    };
}

/**
 * Check if user has feature access
 */
export async function hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
    // Check if user is admin - admins have full access
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });

    if (user?.role === 'admin') {
        return true;
    }

    const subscription = await getOrCreateSubscription(userId);
    const limits = tierConfigs[subscription.tier];

    // Feature name matching
    const featureMap: Record<string, SubscriptionTier[]> = {
        'ai_predictions': ['pro', 'power', 'business'],
        'price_dna': ['power', 'business'],
        'deal_radar': ['power', 'business'],
        'api_access': ['pro', 'power', 'business'],
        'webhooks': ['power', 'business'],
        'whitelabel': ['business'],
        'export': ['pro', 'power', 'business'],
        'priority_scraping': ['power', 'business'],
    };

    const allowedTiers = featureMap[feature];
    if (!allowedTiers) return true; // Unknown feature = allow by default

    return allowedTiers.includes(subscription.tier);
}

export default {
    getSubscription,
    getOrCreateSubscription,
    updateSubscription,
    canAddProduct,
    canAddAlert,
    hasFeatureAccess,
    tierConfigs,
};
