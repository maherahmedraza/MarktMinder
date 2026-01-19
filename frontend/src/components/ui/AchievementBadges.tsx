'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Loader2, Trophy, Flame, Star } from 'lucide-react';

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    unlockedAt: string | null;
    progress?: number;
    target?: number;
}

interface GamificationData {
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

interface AchievementBadgesProps {
    compact?: boolean;
}

const tierColors: Record<string, string> = {
    bronze: 'from-amber-700 to-amber-500',
    silver: 'from-gray-400 to-gray-200',
    gold: 'from-yellow-500 to-amber-300',
    platinum: 'from-cyan-400 to-purple-500',
};

const tierBorders: Record<string, string> = {
    bronze: 'border-amber-600/50',
    silver: 'border-gray-400/50',
    gold: 'border-yellow-500/50',
    platinum: 'border-cyan-400/50',
};

export function AchievementBadges({ compact = false }: AchievementBadgesProps) {
    const [data, setData] = useState<GamificationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGamification = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await fetch('/api/gamification/profile', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch gamification data');
                }

                const result = await response.json();
                setData(result.profile);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchGamification();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !data) {
        return null;
    }

    const unlockedBadges = data.badges.filter((b) => b.unlockedAt);
    const lockedBadges = data.badges.filter((b) => !b.unlockedAt);

    if (compact) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm font-bold">€{data.totalSaved.toFixed(0)} saved</span>
                </div>
                <div className="flex -space-x-2">
                    {unlockedBadges.slice(0, 5).map((badge) => (
                        <div
                            key={badge.id}
                            className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${tierColors[badge.tier]} border-2 ${tierBorders[badge.tier]} text-lg shadow-lg`}
                            title={badge.name}
                        >
                            {badge.icon}
                        </div>
                    ))}
                    {unlockedBadges.length > 5 && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 border-2 border-white/20 text-xs font-bold text-white">
                            +{unlockedBadges.length - 5}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <GlassCard className="p-6">
            {/* Header Stats */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        🏆 Your Achievements
                    </h3>
                    <p className="text-sm text-white/60">
                        {unlockedBadges.length} of {data.badges.length} badges unlocked
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black text-primary">
                        €{data.totalSaved.toFixed(2)}
                    </div>
                    <div className="text-xs text-white/60 uppercase tracking-wider">Total Saved</div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="text-xl font-bold text-white">{data.dealsFound}</div>
                    <div className="text-xs text-white/60">Deals Found</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-xl font-bold text-white">{data.currentStreak}</div>
                    <div className="text-xs text-white/60">Day Streak</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-center mb-1">
                        <Trophy className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-xl font-bold text-white">
                        {data.rank ? `#${data.rank.position}` : '-'}
                    </div>
                    <div className="text-xs text-white/60">Rank</div>
                </div>
            </div>

            {/* Unlocked Badges */}
            {unlockedBadges.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-3">
                        Unlocked
                    </h4>
                    <div className="grid grid-cols-4 gap-3">
                        {unlockedBadges.map((badge) => (
                            <div
                                key={badge.id}
                                className={`group relative p-3 rounded-xl bg-gradient-to-br ${tierColors[badge.tier]} border ${tierBorders[badge.tier]} cursor-pointer transition-transform hover:scale-105`}
                                title={badge.description}
                            >
                                <div className="text-2xl text-center mb-1">{badge.icon}</div>
                                <div className="text-xs font-bold text-center text-white truncate">
                                    {badge.name}
                                </div>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                    {badge.description}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Next Badge Progress */}
            {data.nextBadge && (
                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xl opacity-50">{data.nextBadge.icon}</span>
                            <span className="text-sm font-medium text-white/80">{data.nextBadge.name}</span>
                        </div>
                        <span className="text-xs text-white/60">
                            {data.nextBadge.progress || 0}/{data.nextBadge.target || 0}
                        </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${tierColors[data.nextBadge.tier]} transition-all`}
                            style={{
                                width: `${((data.nextBadge.progress || 0) / (data.nextBadge.target || 1)) * 100}%`,
                            }}
                        />
                    </div>
                    <p className="text-xs text-white/50 mt-2">{data.nextBadge.description}</p>
                </div>
            )}

            {/* Locked Badges Preview */}
            {lockedBadges.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-3">
                        Locked ({lockedBadges.length})
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                        {lockedBadges.slice(0, 8).map((badge) => (
                            <div
                                key={badge.id}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-xl opacity-30"
                                title={`${badge.name} - ${badge.description}`}
                            >
                                {badge.icon}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </GlassCard>
    );
}

export default AchievementBadges;
