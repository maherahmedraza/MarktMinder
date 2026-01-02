
'use client';

import { useState, useEffect } from 'react';
import { DealCard } from '@/components/DealCard';
import api from '@/lib/api';
import { Sparkles, Grid, List, Filter, Loader2, ArrowUpRight, Lock, Zap } from 'lucide-react';
import Link from 'next/link';

interface Deal {
    id: string;
    title: string;
    image_url: string;
    marketplace: 'amazon' | 'etsy' | 'otto';
    current_price: number;
    currency: string;
    score: number;
    original_price?: number;
    discount_percentage?: number;
    recommendation?: string;
    reason?: string;
}

interface DealStats {
    totalDeals: number;
    averageSavings: number;
    byMarketplace: { marketplace: string; count: number }[];
}

export default function DealRadarPage() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [stats, setStats] = useState<DealStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'all' | 'amazon' | 'etsy' | 'otto'>('all');
    const [upgradeRequired, setUpgradeRequired] = useState(false);

    useEffect(() => {
        loadDeals();
    }, []);

    async function loadDeals() {
        try {
            setIsLoading(true);
            const [dealsData, statsData] = await Promise.all([
                api.request<{ deals: Deal[] }>('/products/deals?limit=50'),
                api.request<DealStats>('/products/deals/stats')
            ]);

            setDeals(dealsData.deals || []);
            setStats(statsData);
        } catch (error: any) {
            console.error('Failed to load deals:', error);
            // Check if this is a subscription tier error
            if (error.status === 403) {
                setUpgradeRequired(true);
            }
        } finally {
            setIsLoading(false);
        }
    }

    const filteredDeals = activeFilter === 'all'
        ? deals
        : deals.filter(d => d.marketplace === activeFilter);

    // Show upgrade required screen
    if (upgradeRequired) {
        return (
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl text-white shadow-lg shadow-primary-500/20">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Deal Radar</h1>
                            <p className="text-gray-500 dark:text-gray-400">
                                AI-powered price drop discovery across marketplaces
                            </p>
                        </div>
                    </div>
                </div>

                {/* Upgrade Required Card */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-8 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <Lock className="w-10 h-10 text-white" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Upgrade to Power to Access Deal Radar
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-xl">
                                Deal Radar is a premium feature that uses AI to discover the best deals across Amazon, Etsy, and Otto.
                                Upgrade to Power tier to unlock this feature and never miss a great deal again.
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                <Link
                                    href="/pricing"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg shadow-orange-500/25"
                                >
                                    <Zap className="w-5 h-5" />
                                    Upgrade to Power
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                >
                                    Back to Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Feature Preview */}
                    <div className="mt-8 pt-8 border-t border-yellow-200 dark:border-yellow-800">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">What you'll get with Power</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow">
                                    <Sparkles className="w-5 h-5 text-yellow-500" />
                                </div>
                                <span className="text-gray-700 dark:text-gray-300">AI-Scored Deals</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow">
                                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                                </div>
                                <span className="text-gray-700 dark:text-gray-300">Price DNA Analysis</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow">
                                    <Zap className="w-5 h-5 text-orange-500" />
                                </div>
                                <span className="text-gray-700 dark:text-gray-300">Priority Scraping</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl text-white shadow-lg shadow-primary-500/20">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Deal Radar</h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            AI-powered price drop discovery across marketplaces
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Active Deals</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalDeals}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Average Savings</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.averageSavings.toFixed(1)}%</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Top Source</p>
                        <div className="flex items-center gap-2">
                            <p className="text-3xl font-bold text-gray-900 dark:text-white capitalize">
                                {stats.byMarketplace[0]?.marketplace || 'N/A'}
                            </p>
                            {stats.byMarketplace[0] && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    ({stats.byMarketplace[0].count} deals)
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center justify-between overflow-x-auto pb-2">
                <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    {['all', 'amazon', 'etsy', 'otto'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeFilter === filter
                                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <span className="capitalize">{filter}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Deals Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-500" />
                    <p>Scanning marketplaces for deals...</p>
                </div>
            ) : filteredDeals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredDeals.map((deal) => (
                        <DealCard key={deal.id} deal={deal} />
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No deals found</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        We couldn't find any deals matching your criteria right now. Check back later or adjust your filters.
                    </p>
                </div>
            )}
        </div>
    );
}
