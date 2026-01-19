/**
 * Gamification Service
 * 
 * Tracks user savings achievements and awards badges:
 * - First Save: First purchase at a tracked discount
 * - €100 Club: Total savings exceeds €100
 * - Deal Hunter: Found 10+ deals
 * - Patient Buyer: Waited 30+ days for a price drop
 * - Savings Legend: Total savings exceeds €1000
 */

import { query } from '../config/database.js';
import { cache } from '../config/redis.js';
import { logger } from '../utils/logger.js';

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
    const statsResult = await query<{
        total_saved: number;
        deals_found: number;
        current_streak: number;
        best_streak: number;
    }>(
        `SELECT 
      COALESCE(total_saved, 0) as total_saved,
      COALESCE(deals_found, 0) as deals_found,
      COALESCE(current_streak, 0) as current_streak,
      COALESCE(best_streak, 0) as best_streak
    FROM user_gamification
    WHERE user_id = $1`,
        [userId]
    );

    const stats = statsResult.rows[0] || {
        total_saved: 0,
        deals_found: 0,
        current_streak: 0,
        best_streak: 0,
    };

    // Get user's unlocked badges
    const badgesResult = await query<{ badge_id: string; unlocked_at: Date }>(
        `SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = $1`,
        [userId]
    );

    const unlockedBadgeMap = new Map(
        badgesResult.rows.map((b) => [b.badge_id, b.unlocked_at])
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

    // Get rank
    const rankResult = await query<{ position: number; total_users: number }>(
        `WITH ranked AS (
      SELECT user_id, 
             RANK() OVER (ORDER BY total_saved DESC) as position,
             COUNT(*) OVER () as total_users
      FROM user_gamification
      WHERE total_saved > 0
    )
    SELECT position, total_users FROM ranked WHERE user_id = $1`,
        [userId]
    );

    let rank = undefined;
    if (rankResult.rows[0]) {
        const { position, total_users } = rankResult.rows[0];
        rank = {
            position,
            totalUsers: total_users,
            percentile: Math.round((1 - position / total_users) * 100),
        };
    }

    const profile: UserGamification = {
        userId,
        totalSaved: Number(stats.total_saved),
        dealsFound: Number(stats.deals_found),
        currentStreak: Number(stats.current_streak),
        bestStreak: Number(stats.best_streak),
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
    // Update user stats
    await query(
        `INSERT INTO user_gamification (user_id, total_saved, deals_found, current_streak, best_streak, last_deal_at)
    VALUES ($1, $2, 1, 1, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      total_saved = user_gamification.total_saved + $2,
      deals_found = user_gamification.deals_found + 1,
      current_streak = CASE 
        WHEN user_gamification.last_deal_at > NOW() - INTERVAL '7 days' 
        THEN user_gamification.current_streak + 1 
        ELSE 1 
      END,
      best_streak = GREATEST(user_gamification.best_streak, 
        CASE 
          WHEN user_gamification.last_deal_at > NOW() - INTERVAL '7 days' 
          THEN user_gamification.current_streak + 1 
          ELSE 1 
        END
      ),
      last_deal_at = NOW()`,
        [userId, amount]
    );

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
            await query(
                `INSERT INTO user_badges (user_id, badge_id, unlocked_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, badge_id) DO NOTHING`,
                [userId, badge.id]
            );
            newBadges.push({ ...badge, unlockedAt: new Date() });
            logger.info(`Badge unlocked: ${badge.name} for user ${userId}`);
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
    const result = await query<{
        user_id: string;
        name: string;
        total_saved: number;
        badge_count: number;
    }>(
        `SELECT 
      g.user_id,
      u.name,
      g.total_saved,
      (SELECT COUNT(*) FROM user_badges WHERE user_id = g.user_id) as badge_count
    FROM user_gamification g
    JOIN users u ON g.user_id = u.id
    WHERE g.total_saved > 0
    ORDER BY g.total_saved DESC
    LIMIT $1`,
        [limit]
    );

    return result.rows.map((r) => ({
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
