'use client';

import { useState } from 'react';
import { DealCard } from '@/components/DealCard';
import { Sparkles, ArrowUpRight, Lock, Zap, Target, Globe, TrendingDown } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/StatCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { useDeals, useDealStats } from '@/lib/hooks';

export default function DealRadarPage() {
    const [activeFilter, setActiveFilter] = useState<'all' | 'amazon' | 'etsy' | 'otto'>('all');

    // Data Fetching
    const {
        data: dealsData,
        isLoading: isDealsLoading,
        error: dealsError
    } = useDeals({
        limit: 50,
        marketplace: activeFilter === 'all' ? undefined : activeFilter
    });

    const { data: stats } = useDealStats();

    const deals = dealsData?.deals || [];
    const upgradeRequired = (dealsError as any)?.status === 403;

    if (upgradeRequired) {
        return (
            <div className="space-y-10 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm">
                                <Sparkles className="w-6 h-6 text-primary" />
                            </div>
                            <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">
                                Deal <span className="text-gradient">Radar</span>
                            </h1>
                        </div>
                        <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                            Autonomous price discovery protocol. Locked for standard clearance.
                        </p>
                    </div>
                </div>

                {/* Upgrade Required Component */}
                <GlassCard variant="pro" className="overflow-hidden relative bg-gradient-to-br from-warning/5 to-transparent border-warning/20">
                    <div className="flex flex-col lg:flex-row items-center gap-10">
                        <div className="relative">
                            <div className="w-32 h-32 bg-warning/20 rounded-3xl flex items-center justify-center border border-warning/30 shadow-[0_0_30px_-10px_var(--cl-warning)]">
                                <Lock className="w-16 h-16 text-warning" />
                            </div>
                            <div className="absolute -top-4 -right-4 w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-border animate-bounce">
                                <Zap className="w-6 h-6 text-warning" />
                            </div>
                        </div>

                        <div className="flex-1 text-center lg:text-left">
                            <h2 className="text-3xl font-black text-text-primary mb-4 tracking-tight">
                                ELEVATE CLEARANCE TO <span className="text-gradient-gold">POWER TIER</span>
                            </h2>
                            <p className="text-text-secondary mb-8 max-w-xl text-lg font-medium leading-relaxed">
                                Deal Radar is an advanced predictive protocol that uses neural synthesis to intercept market imbalances. Update your authorization to unlock full spectrum discovery.
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                                <GlowButton onClick={() => window.location.href = '/pricing'}>
                                    <Zap className="w-5 h-5 mr-2" />
                                    ESTABLISH POWER LINK
                                </GlowButton>
                                <button
                                    onClick={() => window.location.href = '/dashboard'}
                                    className="px-8 py-3 rounded-2xl border border-border text-text-secondary font-black text-xs uppercase tracking-widest hover:bg-surface-hover transition-all"
                                >
                                    ABORT MISSION
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="mt-12 pt-10 border-t border-border/10">
                        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] mb-8">Protocol Enhanced Capabilities</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { icon: <Sparkles className="w-5 h-5" />, label: "NEURAL SCORING", color: "text-warning" },
                                { icon: <ArrowUpRight className="w-5 h-5" />, label: "MARKET SYNTHESIS", color: "text-success" },
                                { icon: <Zap className="w-5 h-5" />, label: "PRIORITY OVERRIDE", color: "text-primary" }
                            ].map((feat, i) => (
                                <div key={i} className="flex items-center gap-4 group p-4 rounded-2xl bg-surface/50 border border-border/50 hover:border-primary/30 transition-all">
                                    <div className={`w-12 h-12 rounded-xl bg-surface flex items-center justify-center shadow-sm border border-border group-hover:scale-110 transition-transform ${feat.color}`}>
                                        {feat.icon}
                                    </div>
                                    <span className="text-xs font-black text-text-primary tracking-widest">{feat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm">
                            <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">
                            Deal <span className="text-gradient">Radar</span>
                        </h1>
                    </div>
                    <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                        AI-powered price drop discovery across marketplaces. Identifying high-value opportunities in real-time.
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    <StatCard
                        title="Active Flux"
                        value={stats.totalDeals.toString()}
                        icon={<Target className="w-6 h-6" />}
                    />
                    <StatCard
                        title="Aggregated Delta"
                        value={`${stats.averageSavings.toFixed(1)}%`}
                        icon={<TrendingDown className="w-6 h-6" />}
                        trend={`-${stats.averageSavings.toFixed(0)}% AVG`}
                    />
                    <StatCard
                        title="Primary Vector"
                        value={stats.byMarketplace[0]?.marketplace || 'NULL'}
                        icon={<Globe className="w-6 h-6" />}
                        isHighlight
                    />
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center justify-between gap-4 border-b border-border/10 pb-6 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-3 p-1.5 bg-surface rounded-2xl border border-border shadow-inner">
                    {['all', 'amazon', 'etsy', 'otto'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter as any)}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeFilter === filter
                                ? 'bg-primary text-white shadow-glow'
                                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover'
                                }`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Deals Grid */}
            {isDealsLoading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <p className="mt-8 text-xs font-black text-text-tertiary uppercase tracking-[0.4em] animate-pulse">Syncing Market Data...</p>
                </div>
            ) : deals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {deals.map((deal) => (
                        <DealCard key={deal.id} deal={deal} />
                    ))}
                </div>
            ) : (
                <GlassCard className="py-24 text-center border-dashed border-2 border-border/50">
                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-8 border border-border shadow-inner">
                        <Target className="w-10 h-10 text-text-tertiary opacity-20" />
                    </div>
                    <h3 className="text-2xl font-black text-text-primary mb-4 tracking-tight uppercase">No Signals Detected</h3>
                    <p className="text-text-secondary max-w-sm mx-auto font-medium">
                        The radar is clean. No significant price imbalances were detected in the current sector.
                    </p>
                </GlassCard>
            )}
        </div>
    );
}
