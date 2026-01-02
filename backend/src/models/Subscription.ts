import { query } from '../config/database.js';

export type SubscriptionTier = 'free' | 'pro' | 'power' | 'business';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

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

/**
 * Get user's subscription
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
    const result = await query(`
        SELECT * FROM subscriptions WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        userId: row.user_id,
        tier: row.tier,
        status: row.status,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * Get or create subscription (defaults to free)
 */
export async function getOrCreateSubscription(userId: string): Promise<Subscription> {
    const existing = await getSubscription(userId);
    if (existing) return existing;

    // Create free subscription
    const result = await query(`
        INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end)
        VALUES ($1, 'free', 'active', NOW(), NOW() + INTERVAL '100 years')
        RETURNING *
    `, [userId]);

    const row = result.rows[0];
    return {
        id: row.id,
        userId: row.user_id,
        tier: 'free',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * Update subscription
 */
export async function updateSubscription(
    userId: string,
    updates: Partial<Pick<Subscription, 'tier' | 'status' | 'stripeCustomerId' | 'stripeSubscriptionId' | 'currentPeriodStart' | 'currentPeriodEnd' | 'cancelAtPeriodEnd'>>
): Promise<Subscription | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.tier !== undefined) {
        fields.push(`tier = $${paramIndex++}`);
        values.push(updates.tier);
    }
    if (updates.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
    }
    if (updates.stripeCustomerId !== undefined) {
        fields.push(`stripe_customer_id = $${paramIndex++}`);
        values.push(updates.stripeCustomerId);
    }
    if (updates.stripeSubscriptionId !== undefined) {
        fields.push(`stripe_subscription_id = $${paramIndex++}`);
        values.push(updates.stripeSubscriptionId);
    }
    if (updates.currentPeriodStart !== undefined) {
        fields.push(`current_period_start = $${paramIndex++}`);
        values.push(updates.currentPeriodStart);
    }
    if (updates.currentPeriodEnd !== undefined) {
        fields.push(`current_period_end = $${paramIndex++}`);
        values.push(updates.currentPeriodEnd);
    }
    if (updates.cancelAtPeriodEnd !== undefined) {
        fields.push(`cancel_at_period_end = $${paramIndex++}`);
        values.push(updates.cancelAtPeriodEnd);
    }

    if (fields.length === 0) return getSubscription(userId);

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query(`
        UPDATE subscriptions
        SET ${fields.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING *
    `, values);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
        id: row.id,
        userId: row.user_id,
        tier: row.tier,
        status: row.status,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * Check if user can add more products
 */
export async function canAddProduct(userId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    // Check if user is admin - admins have unlimited access
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length > 0 && userResult.rows[0].role === 'admin') {
        return { allowed: true, current: 0, limit: -1 };
    }

    const subscription = await getOrCreateSubscription(userId);
    const limits = tierConfigs[subscription.tier];

    if (limits.maxProducts === -1) {
        return { allowed: true, current: 0, limit: -1 };
    }

    const countResult = await query(`
        SELECT COUNT(*) as count FROM user_products WHERE user_id = $1
    `, [userId]);

    const current = parseInt(countResult.rows[0].count);
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
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length > 0 && userResult.rows[0].role === 'admin') {
        return { allowed: true, current: 0, limit: -1 };
    }

    const subscription = await getOrCreateSubscription(userId);
    const limits = tierConfigs[subscription.tier];

    if (limits.maxAlerts === -1) {
        return { allowed: true, current: 0, limit: -1 };
    }

    const countResult = await query(`
        SELECT COUNT(*) as count FROM alerts WHERE user_id = $1 AND is_active = true
    `, [userId]);

    const current = parseInt(countResult.rows[0].count);
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
    const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length > 0 && userResult.rows[0].role === 'admin') {
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
