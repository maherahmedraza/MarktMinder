import { prisma } from '../config/prisma.js';
import { cache } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { Prisma } from '@prisma/client';

const GAMIFICATION_CACHE_TTL = 300; // 5 minutes

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    unlockedAt: Date | null;
    progress?: number;
    target?: number;
}

export interface UserGamification {
    userId: string;
    totalSaved: number;
    dealsFound: number;
    currentStreak: number;
    bestStreak: number;
    badges: Badge[];
    nextBadge: Badge | null;
    rank?: {
        position: number;
        totalUsers: number;
        percentile: number;
    };
}

// Badge definitions
const BADGE_DEFINITIONS: Omit<Badge, 'unlockedAt' | 'progress'>[] = [
    {
        id: 'first_save',
        name: 'First Save',
        description: 'Made your first purchase at a tracked discount',
        icon: '🎯',
        tier: 'bronze',
        target: 1,
    },
    {
        id: 'deal_spotter',
        name: 'Deal Spotter',
        description: 'Found 5 great deals',
        icon: '👁️',
        tier: 'bronze',
        target: 5,
    },
    {
        id: 'hundred_club',
        name: '€100 Club',
        description: 'Saved over €100 in total',
        icon: '💯',
        tier: 'silver',
        target: 100,
    },
    {
        id: 'deal_hunter',
        name: 'Deal Hunter',
        description: 'Found 10 great deals',
        icon: '🏹',
        tier: 'silver',
        target: 10,
    },
    {
        id: 'patient_buyer',
        name: 'Patient Buyer',
        description: 'Waited 30+ days for a price drop and saved',
        icon: '🧘',
        tier: 'gold',
        target: 1,
    },
    {
        id: 'five_hundred_club',
        name: '€500 Club',
        description: 'Saved over €500 in total',
        icon: '💎',
        tier: 'gold',
        target: 500,
    },
    {
        id: 'deal_master',
        name: 'Deal Master',
        description: 'Found 25 great deals',
        icon: '🎖️',
        tier: 'gold',
        target: 25,
    },
    {
        id: 'savings_legend',
        name: 'Savings Legend',
        description: 'Saved over €1000 in total',
        icon: '🏆',
        tier: 'platinum',
        target: 1000,
    },
];

/**
 * Get user's gamification profile
 */
export async function getUserGamification(userId: string): Promise<UserGamification> {
    const cacheKey = `gamification:${userId}`;

    // Check cache
    const cached = await cache.get<UserGamification>(cacheKey);
    if (cached) {
        return cached;
    }

    // Get user's savings stats
    const rawStats = await prisma.userGamification.findUnique({
        where: { userId }
    });

    const stats = {
        total_saved: rawStats ? Number(rawStats.totalSaved) : 0,
        deals_found: rawStats ? rawStats.dealsFound : 0,
        current_streak: rawStats ? rawStats.currentStreak : 0,
        best_streak: rawStats ? rawStats.bestStreak : 0,
    };

    // Get user's unlocked badges
    const userBadges = await prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true, unlockedAt: true }
    });

    const unlockedBadgeMap = new Map<string, Date>(
        userBadges.map((b: any) => [b.badgeId, b.unlockedAt])
    );

    // Build badges with progress
    const badges: Badge[] = BADGE_DEFINITIONS.map((def) => {
        const unlockedAt = unlockedBadgeMap.get(def.id) || null;
        let progress = 0;

        // Calculate progress based on badge type
        if (def.id.includes('club') || def.id === 'savings_legend') {
            progress = Math.min(stats.total_saved, def.target || 0);
        } else if (def.id.includes('deal') || def.id === 'deal_spotter') {
            progress = Math.min(stats.deals_found, def.target || 0);
        } else if (def.id === 'first_save') {
            progress = stats.deals_found > 0 ? 1 : 0;
        }

        return {
            ...def,
            unlockedAt,
            progress,
        };
    });

    // Find next badge to unlock
    const lockedBadges = badges.filter((b) => !b.unlockedAt);
    const nextBadge = lockedBadges.length > 0 ? lockedBadges[0] : null;

    // Get rank (position among users with savings > 0)
    // Prisma doesn't support analytical functions easily, use queryRaw
    const rankResult = await prisma.$queryRaw<any[]>`
        WITH ranked AS (
            SELECT user_id, 
                    RANK() OVER (ORDER BY total_saved DESC) as position,
                    COUNT(*) OVER () as total_users
            FROM user_gamification
            WHERE total_saved > 0
        )
        SELECT position, total_users FROM ranked WHERE user_id = ${userId}::uuid
    `;

    let rank = undefined;
    if (rankResult.length > 0) {
        const { position, total_users } = rankResult[0];
        rank = {
            position: Number(position),
            totalUsers: Number(total_users),
            percentile: Math.round((1 - Number(position) / Number(total_users)) * 100),
        };
    }

    const profile: UserGamification = {
        userId,
        totalSaved: stats.total_saved,
        dealsFound: stats.deals_found,
        currentStreak: stats.current_streak,
        bestStreak: stats.best_streak,
        badges,
        nextBadge,
        rank,
    };

    // Cache result
    await cache.set(cacheKey, profile, GAMIFICATION_CACHE_TTL);

    return profile;
}

/**
 * Record a savings event (when user buys at a tracked discount)
 */
export async function recordSavings(
    userId: string,
    amount: number,
    dealType?: string
): Promise<{ newBadges: Badge[] }> {
    // Transaction to update user stats
    await prisma.$transaction(async (tx: any) => {
        const now = new Date();
        const existing = await tx.userGamification.findUnique({
            where: { userId }
        });

        if (existing) {
            let currentStreak = existing.currentStreak;

            // Check streak logic
            if (existing.lastDealAt) {
                const daysDiff = (now.getTime() - existing.lastDealAt.getTime()) / (1000 * 3600 * 24);
                if (daysDiff <= 7) {
                    currentStreak += 1;
                } else {
                    currentStreak = 1;
                }
            } else {
                currentStreak = 1;
            }

            const bestStreak = Math.max(existing.bestStreak, currentStreak);

            await tx.userGamification.update({
                where: { userId },
                data: {
                    totalSaved: { increment: amount },
                    dealsFound: { increment: 1 },
                    currentStreak,
                    bestStreak,
                    lastDealAt: now
                }
            });
        } else {
            // First time
            await tx.userGamification.create({
                data: {
                    userId,
                    totalSaved: amount,
                    dealsFound: 1,
                    currentStreak: 1,
                    bestStreak: 1,
                    lastDealAt: now
                }
            });
        }
    });

    // Check for new badges
    const newBadges = await checkAndAwardBadges(userId);

    // Invalidate cache
    await cache.del(`gamification:${userId}`);

    return { newBadges };
}

/**
 * Check and award any newly earned badges
 */
async function checkAndAwardBadges(userId: string): Promise<Badge[]> {
    const profile = await getUserGamification(userId);
    const newBadges: Badge[] = [];

    for (const badge of profile.badges) {
        if (badge.unlockedAt) continue; // Already unlocked

        let shouldUnlock = false;

        // Check if badge should be unlocked
        if (badge.target && badge.progress !== undefined) {
            shouldUnlock = badge.progress >= badge.target;
        }

        if (shouldUnlock) {
            // Upsert badge
            try {
                await prisma.userBadge.create({
                    data: {
                        userId,
                        badgeId: badge.id,
                        unlockedAt: new Date()
                    }
                });
                newBadges.push({ ...badge, unlockedAt: new Date() });
                logger.info(`Badge unlocked: ${badge.name} for user ${userId}`);
            } catch (error: any) {
                // Ignore unique constraint violation (P2002) if already exists
                if (error.code !== 'P2002') {
                    logger.error('Error awarding badge:', error);
                }
            }
        }
    }

    return newBadges;
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(
    limit: number = 10
): Promise<{ userId: string; name: string; totalSaved: number; badges: number }[]> {
    const result = await prisma.$queryRaw<any[]>`
        SELECT 
            g.user_id,
            u.name,
            g.total_saved,
            (SELECT COUNT(*) FROM user_badges WHERE user_id = g.user_id) as badge_count
        FROM user_gamification g
        JOIN users u ON g.user_id = u.id
        WHERE g.total_saved > 0
        ORDER BY g.total_saved DESC
        LIMIT ${limit}
    `;

    return result.map((r: any) => ({
        userId: r.user_id,
        name: r.name,
        totalSaved: Number(r.total_saved),
        badges: Number(r.badge_count),
    }));
}

export default {
    getUserGamification,
    recordSavings,
    getLeaderboard,
    BADGE_DEFINITIONS,
};
