import { prisma } from '../config/prisma.js';
import { ApiKey as PrismaApiKey, SubscriptionTier } from '@prisma/client';
import crypto from 'crypto';

export interface ApiKey {
    id: string;
    userId: string;
    name: string;
    keyPrefix: string;
    permissions: string[];
    rateLimit: number;
    tier: SubscriptionTier;
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

/** Map Prisma API key to legacy interface */
function toApiKey(a: PrismaApiKey, tier: SubscriptionTier = 'free'): ApiKey {
    return {
        id: a.id,
        userId: a.userId,
        name: a.name,
        keyPrefix: a.keyPrefix,
        permissions: a.permissions as string[],
        rateLimit: a.rateLimit,
        tier,
        usageCount: 0,
        lastUsedAt: a.lastUsedAt,
        expiresAt: a.expiresAt,
        createdAt: a.createdAt,
        revokedAt: a.revokedAt,
    };
}

/** Determine tier from rate limit (heuristic) */
function getTierFromRateLimit(rateLimit: number): SubscriptionTier {
    if (rateLimit >= 50000) return 'business';
    if (rateLimit >= 5000) return 'power';
    if (rateLimit >= 1000) return 'pro';
    return 'free';
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(
    userId: string,
    name: string,
    tier: SubscriptionTier = 'free',
    permissions: string[] = ['read'],
    expiresInDays?: number
): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const { key, hash, prefix } = generateApiKey();
    const config = tierConfigs[tier];

    const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    const apiKey = await prisma.apiKey.create({
        data: {
            userId,
            name,
            keyHash: hash,
            keyPrefix: prefix,
            permissions: permissions,
            rateLimit: config.rateLimit,
            expiresAt,
        },
    });

    return {
        apiKey: toApiKey(apiKey, tier),
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

    const apiKey = await prisma.apiKey.findFirst({
        where: { keyHash: hash },
        include: { user: true },
    });

    if (!apiKey) return null;

    // Check if revoked
    if (apiKey.revokedAt) {
        return null;
    }

    // Check if expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return null;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
    });

    const tier = getTierFromRateLimit(apiKey.rateLimit);

    return toApiKey(apiKey, tier);
}

/**
 * Get all API keys for a user
 */
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const apiKeys = await prisma.apiKey.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map(key => toApiKey(key, getTierFromRateLimit(key.rateLimit)));
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
    const result = await prisma.apiKey.updateMany({
        where: {
            id: keyId,
            userId,
            revokedAt: null,
        },
        data: {
            revokedAt: new Date(),
        },
    });

    return result.count > 0;
}

/**
 * Track API usage
 */
export async function trackApiUsage(
    keyId: string,
    endpoint: string,
    responseTime: number
): Promise<void> {
    try {
        await prisma.apiUsageLog.create({
            data: {
                apiKeyId: keyId,
                endpoint,
                responseTimeMs: responseTime,
            },
        });
    } catch {
        // Gracefully ignore errors
    }
}

/**
 * Get API usage statistics
 */
export async function getApiUsageStats(
    keyId: string,
    days: number = 30
): Promise<ApiKeyUsage[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Use raw query for aggregation
    const result = await prisma.$queryRaw<{ date: Date; request_count: bigint; endpoint: string }[]>`
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as request_count,
            endpoint
        FROM api_usage_logs
        WHERE api_key_id = ${keyId}::uuid
          AND created_at >= ${cutoff}
        GROUP BY DATE(created_at), endpoint
        ORDER BY date DESC
    `;

    // Aggregate by date
    const usageMap = new Map<string, ApiKeyUsage>();

    for (const row of result) {
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        if (!usageMap.has(dateStr)) {
            usageMap.set(dateStr, {
                date: dateStr,
                requestCount: 0,
                endpoints: {},
            });
        }
        const usage = usageMap.get(dateStr)!;
        const count = Number(row.request_count);
        usage.requestCount += count;
        usage.endpoints[row.endpoint] = (usage.endpoints[row.endpoint] || 0) + count;
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
