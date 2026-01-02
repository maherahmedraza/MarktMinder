'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Package,
    Users,
    Bell,
    TrendingDown,
    TrendingUp,
    Activity,
    Database,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from 'lucide-react';
import api from '@/lib/api';

interface AdminStats {
    overview: {
        totalProducts: number;
        totalUsers: number;
        totalTracked: number;
        activeAlerts: number;
    };
    growth: {
        productsToday: number;
        productsWeek: number;
        productsMonth: number;
        usersWeek: number;
        priceRecordsToday: number;
    };
    marketplaceDistribution: Array<{ marketplace: string; count: string }>;
    charts: {
        dailyProducts: Array<{ date: string; count: string }>;
        dailyUsers: Array<{ date: string; count: string }>;
    };
    topTracked: Array<{
        id: string;
        title: string;
        image_url: string;
        current_price: number;
        marketplace: string;
        tracker_count: string;
    }>;
    recentDrops: Array<{
        id: string;
        title: string;
        image_url: string;
        current_price: number;
        marketplace: string;
        old_price: number;
        new_price: number;
        drop_percentage: number;
        savings: number;
    }>;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        try {
            const data = await api.request<AdminStats>('/admin/stats');
            setStats(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load admin stats');
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-6 py-4 rounded-xl">
                {error}
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor your platform metrics and activity</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Products"
                    value={stats.overview.totalProducts}
                    icon={<Package className="w-6 h-6" />}
                    color="blue"
                    subtitle={`+${stats.growth.productsWeek} this week`}
                />
                <StatCard
                    title="Total Users"
                    value={stats.overview.totalUsers}
                    icon={<Users className="w-6 h-6" />}
                    color="green"
                    subtitle={`+${stats.growth.usersWeek} this week`}
                />
                <StatCard
                    title="Products Tracked"
                    value={stats.overview.totalTracked}
                    icon={<Activity className="w-6 h-6" />}
                    color="purple"
                    subtitle="Total user trackings"
                />
                <StatCard
                    title="Active Alerts"
                    value={stats.overview.activeAlerts}
                    icon={<Bell className="w-6 h-6" />}
                    color="orange"
                    subtitle="Monitoring prices"
                />
            </div>

            {/* Growth Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                        Data Growth
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">Products Today</span>
                            <span className="text-gray-900 dark:text-white font-semibold">{stats.growth.productsToday}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">Products This Week</span>
                            <span className="text-gray-900 dark:text-white font-semibold">{stats.growth.productsWeek}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">Products This Month</span>
                            <span className="text-gray-900 dark:text-white font-semibold">{stats.growth.productsMonth}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">Price Records Today</span>
                            <span className="text-gray-900 dark:text-white font-semibold">{stats.growth.priceRecordsToday}</span>
                        </div>
                    </div>
                </div>

                {/* Marketplace Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Marketplace Distribution</h3>
                    <div className="space-y-4">
                        {stats.marketplaceDistribution.map((mp) => {
                            const total = stats.marketplaceDistribution.reduce((sum, m) => sum + parseInt(m.count), 0);
                            const percentage = total > 0 ? (parseInt(mp.count) / total * 100).toFixed(1) : 0;
                            return (
                                <div key={mp.marketplace}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-gray-600 dark:text-gray-300 capitalize">{mp.marketplace}</span>
                                        <span className="text-gray-900 dark:text-white font-semibold">{mp.count}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${mp.marketplace === 'amazon' ? 'bg-amazon' :
                                                mp.marketplace === 'etsy' ? 'bg-etsy' : 'bg-otto'
                                                }`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <Link
                            href="/admin/products"
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <span className="text-gray-700 dark:text-gray-300">View All Products</span>
                            <ArrowUpRight className="w-4 h-4 text-gray-400" />
                        </Link>
                        <Link
                            href="/admin/users"
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <span className="text-gray-700 dark:text-gray-300">Manage Users</span>
                            <ArrowUpRight className="w-4 h-4 text-gray-400" />
                        </Link>
                        <Link
                            href="/dashboard"
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <span className="text-gray-700 dark:text-gray-300">Go to User Dashboard</span>
                            <ArrowUpRight className="w-4 h-4 text-gray-400" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Top Tracked Products & Recent Price Drops */}
            {/* Top Tracked Products & Recent Price Drops */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Tracked */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400" />
                        Most Tracked Products
                    </h3>
                    <div className="space-y-3">
                        {stats.topTracked.slice(0, 5).map((product, index) => (
                            <div key={product.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                <span className="text-gray-500 text-sm w-5">{index + 1}.</span>
                                {product.image_url ? (
                                    <img
                                        src={product.image_url}
                                        alt={product.title}
                                        className="w-10 h-10 rounded object-cover bg-gray-100 dark:bg-gray-600"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded flex items-center justify-center">
                                        <Package className="w-5 h-5 text-gray-400" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 dark:text-white truncate">{product.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {product.tracker_count} trackers • €{product.current_price}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Price Drops */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-red-500 dark:text-red-400" />
                        Recent Price Drops
                    </h3>
                    <div className="space-y-3">
                        {stats.recentDrops.slice(0, 5).map((product) => (
                            <div key={product.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                {product.image_url ? (
                                    <img
                                        src={product.image_url}
                                        alt={product.title}
                                        className="w-10 h-10 rounded object-cover bg-gray-100 dark:bg-gray-600"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded flex items-center justify-center">
                                        <Package className="w-5 h-5 text-gray-400" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 dark:text-white truncate">{product.title}</p>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-gray-500 dark:text-gray-400 line-through">€{product.old_price}</span>
                                        <span className="text-green-600 dark:text-green-400">€{product.new_price}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-green-600 dark:text-green-400 text-sm font-semibold flex items-center gap-1">
                                        <ArrowDownRight className="w-4 h-4" />
                                        {product.drop_percentage}%
                                    </span>
                                </div>
                            </div>
                        ))}
                        {stats.recentDrops.length === 0 && (
                            <p className="text-gray-500 text-sm text-center py-4">No recent price drops</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
    color,
    subtitle
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'orange';
    subtitle: string;
}) {
    const colorClasses = {
        blue: 'bg-blue-500/20 text-blue-400',
        green: 'bg-green-500/20 text-green-400',
        purple: 'bg-purple-500/20 text-purple-400',
        orange: 'bg-orange-500/20 text-orange-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
