import { query } from '../config/database.js';
import crypto from 'crypto';

export interface ApiKey {
    id: string;
    userId: string;
    name: string;
    keyPrefix: string;
    permissions: string[];
    rateLimit: number;
    tier: 'free' | 'pro' | 'power' | 'business';
    usageCount: number;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    revokedAt: Date | null;
}

export interface ApiKeyUsage {
    date: string;
    requestCount: number;
    endpoints: Record<string, number>;
}

/**
 * Generate a secure API key
 * Format: mm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
function generateApiKey(): { key: string; hash: string; prefix: string } {
    const randomBytes = crypto.randomBytes(24).toString('hex');
    const key = `mm_live_${randomBytes}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 12);

    return { key, hash, prefix };
}

/**
 * Hash an API key for storage/comparison
 */
function hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Tier configurations
 */
const tierConfigs = {
    free: { rateLimit: 100, dailyLimit: 100 },
    pro: { rateLimit: 1000, dailyLimit: 1000 },
    power: { rateLimit: 5000, dailyLimit: 5000 },
    business: { rateLimit: 50000, dailyLimit: 50000 },
};

/**
 * Create a new API key for a user
 */
export async function createApiKey(
    userId: string,
    name: string,
    tier: 'free' | 'pro' | 'power' | 'business' = 'free',
    permissions: string[] = ['read'],
    expiresInDays?: number
): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const { key, hash, prefix } = generateApiKey();
    const config = tierConfigs[tier];

    const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    const result = await query(`
        INSERT INTO api_keys (
            user_id, name, key_hash, key_prefix, 
            permissions, rate_limit, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, created_at
    `, [
        userId,
        name,
        hash,
        prefix,
        JSON.stringify(permissions),
        config.rateLimit,
        expiresAt,
    ]);

    const row = result.rows[0];

    return {
        apiKey: {
            id: row.id,
            userId,
            name,
            keyPrefix: prefix,
            permissions,
            rateLimit: config.rateLimit,
            tier,
            usageCount: 0,
            lastUsedAt: null,
            expiresAt,
            createdAt: row.created_at,
            revokedAt: null,
        },
        plainKey: key,  // Only returned once!
    };
}

/**
 * Validate an API key and return its details
 */
export async function validateApiKey(key: string): Promise<ApiKey | null> {
    if (!key || !key.startsWith('mm_live_')) {
        return null;
    }

    const hash = hashApiKey(key);

    const result = await query(`
        SELECT 
            ak.id, ak.user_id, ak.name, ak.key_prefix,
            ak.permissions, ak.rate_limit, ak.last_used_at,
            ak.expires_at, ak.created_at, ak.revoked_at,
            u.email as user_email
        FROM api_keys ak
        JOIN users u ON ak.user_id = u.id
        WHERE ak.key_hash = $1
    `, [hash]);

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];

    // Check if revoked
    if (row.revoked_at) {
        return null;
    }

    // Check if expired
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
        return null;
    }

    // Update last used timestamp
    await query(`
        UPDATE api_keys 
        SET last_used_at = NOW()
        WHERE id = $1
    `, [row.id]);

    // Determine tier based on rate limit
    let tier: 'free' | 'pro' | 'power' | 'business' = 'free';
    if (row.rate_limit >= 50000) tier = 'business';
    else if (row.rate_limit >= 5000) tier = 'power';
    else if (row.rate_limit >= 1000) tier = 'pro';

    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        keyPrefix: row.key_prefix,
        permissions: JSON.parse(row.permissions || '["read"]'),
        rateLimit: row.rate_limit,
        tier,
        usageCount: 0,  // Would need separate tracking
        lastUsedAt: row.last_used_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        revokedAt: row.revoked_at,
    };
}

/**
 * Get all API keys for a user
 */
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const result = await query(`
        SELECT 
            id, user_id, name, key_prefix,
            permissions, rate_limit, last_used_at,
            expires_at, created_at, revoked_at
        FROM api_keys
        WHERE user_id = $1
        ORDER BY created_at DESC
    `, [userId]);

    return result.rows.map(row => {
        let tier: 'free' | 'pro' | 'power' | 'business' = 'free';
        if (row.rate_limit >= 50000) tier = 'business';
        else if (row.rate_limit >= 5000) tier = 'power';
        else if (row.rate_limit >= 1000) tier = 'pro';

        return {
            id: row.id,
            userId: row.user_id,
            name: row.name,
            keyPrefix: row.key_prefix,
            permissions: JSON.parse(row.permissions || '["read"]'),
            rateLimit: row.rate_limit,
            tier,
            usageCount: 0,
            lastUsedAt: row.last_used_at,
            expiresAt: row.expires_at,
            createdAt: row.created_at,
            revokedAt: row.revoked_at,
        };
    });
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
    const result = await query(`
        UPDATE api_keys 
        SET revoked_at = NOW()
        WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
        RETURNING id
    `, [keyId, userId]);

    return result.rows.length > 0;
}

/**
 * Track API usage
 */
export async function trackApiUsage(
    keyId: string,
    endpoint: string,
    responseTime: number
): Promise<void> {
    // For now, simple logging. Could expand to Redis for real-time tracking
    await query(`
        INSERT INTO api_usage_logs (api_key_id, endpoint, response_time_ms, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT DO NOTHING
    `, [keyId, endpoint, responseTime]).catch(() => {
        // Table might not exist yet - gracefully ignore
    });
}

/**
 * Get API usage statistics
 */
export async function getApiUsageStats(
    keyId: string,
    days: number = 30
): Promise<ApiKeyUsage[]> {
    const result = await query(`
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as request_count,
            endpoint
        FROM api_usage_logs
        WHERE api_key_id = $1 
          AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at), endpoint
        ORDER BY date DESC
    `, [keyId]).catch(() => ({ rows: [] }));

    // Aggregate by date
    const usageMap = new Map<string, ApiKeyUsage>();

    for (const row of result.rows) {
        const dateStr = row.date.toISOString().split('T')[0];
        if (!usageMap.has(dateStr)) {
            usageMap.set(dateStr, {
                date: dateStr,
                requestCount: 0,
                endpoints: {},
            });
        }
        const usage = usageMap.get(dateStr)!;
        usage.requestCount += parseInt(row.request_count);
        usage.endpoints[row.endpoint] = (usage.endpoints[row.endpoint] || 0) + parseInt(row.request_count);
    }

    return Array.from(usageMap.values());
}

export default {
    createApiKey,
    validateApiKey,
    getUserApiKeys,
    revokeApiKey,
    trackApiUsage,
    getApiUsageStats,
};
