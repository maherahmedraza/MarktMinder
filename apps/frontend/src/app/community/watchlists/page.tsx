'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, Users, Search, Filter, TrendingUp, Clock, Loader2, ArrowRight } from 'lucide-react';
import { WatchlistCard, Watchlist } from '@/components/community/WatchlistCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { useTranslations } from 'next-intl';

export default function WatchlistDiscoveryPage() {
    const t = useTranslations('community.watchlists');
    const tNav = useTranslations('nav');
    const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sort, setSort] = useState<'popular' | 'newest'>('popular');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchWatchlists();
    }, [sort]);

    async function fetchWatchlists() {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/v1/community/watchlists?sort=${sort}`, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch watchlists');
            const data = await response.json();
            setWatchlists(data.watchlists || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    }

    const filteredWatchlists = watchlists.filter(w =>
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.user_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-surface-elevated/30 border-b border-border/20 pt-20 pb-16">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,var(--color-primary-light)_0%,transparent_50%)] opacity-10" />
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                        <div className="bg-primary/10 text-primary-light px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {tNav('community')}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-text-primary mb-6 tracking-tight leading-tight">
                            {t('discover')} <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-light to-violet-400">{t('title')}</span>
                        </h1>
                        <p className="text-lg text-text-secondary mb-10">
                            {t('subtitle')}
                        </p>

                        {/* Search & Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
                            <div className="bg-surface/50 border border-border/10 p-4 rounded-2xl flex flex-col items-center">
                                <span className="text-2xl font-black text-text-primary">1.2k+</span>
                                <span className="text-xs text-text-tertiary uppercase font-bold tracking-wider">{t('stats.activeTrackers')}</span>
                            </div>
                            <div className="bg-surface/50 border border-border/10 p-4 rounded-2xl flex flex-col items-center">
                                <span className="text-2xl font-black text-text-primary">€45k</span>
                                <span className="text-xs text-text-tertiary uppercase font-bold tracking-wider">{t('stats.totalSavings')}</span>
                            </div>
                            <div className="bg-surface/50 border border-border/10 p-4 rounded-2xl flex flex-col items-center">
                                <span className="text-2xl font-black text-text-primary">850</span>
                                <span className="text-xs text-text-tertiary uppercase font-bold tracking-wider">{t('stats.sharedLists')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Discovery Feed */}
            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-10">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-surface-elevated/50 border border-border/30 rounded-2xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-2 p-1.5 bg-surface-elevated/50 border border-border/30 rounded-2xl">
                        <button
                            onClick={() => setSort('popular')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${sort === 'popular'
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-text-secondary hover:bg-surface-hover'
                                }`}
                        >
                            <TrendingUp className="w-4 h-4" />
                            {t('sort.popular')}
                        </button>
                        <button
                            onClick={() => setSort('newest')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${sort === 'newest'
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-text-secondary hover:bg-surface-hover'
                                }`}
                        >
                            <Clock className="w-4 h-4" />
                            {t('sort.newest')}
                        </button>
                    </div>
                </div>

                {/* Results */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <p className="text-text-secondary font-bold font-heading">{t('loading')}</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 bg-error/5 border border-error/10 rounded-3xl">
                        <p className="text-error font-bold mb-4">{error}</p>
                        <GlowButton onClick={fetchWatchlists}>Try Again</GlowButton>
                    </div>
                ) : filteredWatchlists.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredWatchlists.map(watchlist => (
                            <WatchlistCard key={watchlist.id} watchlist={watchlist} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-surface-elevated/20 border border-border/10 rounded-3xl">
                        <Users className="w-16 h-16 text-text-tertiary mx-auto mb-6 opacity-30" />
                        <h3 className="text-2xl font-bold text-text-secondary mb-2">{t('empty.title')}</h3>
                        <p className="text-text-tertiary">{t('empty.subtitle')}</p>
                    </div>
                )}
            </div>

            {/* CTA Section */}
            {!isLoading && filteredWatchlists.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 mt-12 pb-20">
                    <div className="bg-gradient-to-br from-violet-600 to-indigo-800 rounded-3xl p-10 relative overflow-hidden shadow-2xl shadow-indigo-500/10">
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div>
                                <h2 className="text-3xl font-black text-white mb-4 leading-tight">{t('cta.title')}</h2>
                                <p className="text-indigo-100 max-w-lg">
                                    {t('cta.subtitle')}
                                </p>
                            </div>
                            <GlowButton className="bg-white text-indigo-900 border-none hover:bg-indigo-50 min-w-[200px] h-14 text-lg">
                                {t('cta.button')}
                            </GlowButton>
                        </div>
                        {/* Abstract background shapes */}
                        <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary-light/20 rounded-full blur-2xl" />
                    </div>
                </div>
            )}
        </div>
    );
}
