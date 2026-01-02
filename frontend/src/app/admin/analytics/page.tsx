'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Calendar, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface AnalyticsData {
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
    charts: {
        dailyProducts: Array<{ date: string; count: string }>;
        dailyUsers: Array<{ date: string; count: string }>;
    };
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    useEffect(() => {
        loadData();
    }, [timeRange]);

    async function loadData() {
        try {
            const days = timeRange.replace('d', '');
            const stats = await api.request<AnalyticsData>(`/admin/stats?days=${days}`);
            setData(stats);
        } catch (err) {
            console.error('Failed to load analytics', err);
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

    if (!data) return null;

    // Calculate max for chart scaling
    const maxProducts = Math.max(...data.charts.dailyProducts.map(d => parseInt(d.count)), 1);
    const maxUsers = Math.max(...data.charts.dailyUsers.map(d => parseInt(d.count)), 1);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                    <p className="text-gray-500 dark:text-gray-400">Detailed platform metrics and trends</p>
                </div>
                <div className="flex gap-2">
                    {(['7d', '30d', '90d'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeRange === range
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Products"
                    value={data.overview.totalProducts}
                    change={data.growth.productsWeek}
                    changeLabel="This week"
                    isPositive={true}
                />
                <MetricCard
                    title="Total Users"
                    value={data.overview.totalUsers}
                    change={data.growth.usersWeek}
                    changeLabel="This week"
                    isPositive={true}
                />
                <MetricCard
                    title="Products Tracked"
                    value={data.overview.totalTracked}
                    changeLabel="Total trackings"
                />
                <MetricCard
                    title="Price Records Today"
                    value={data.growth.priceRecordsToday}
                    changeLabel="Scraped today"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Products Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                        Products Added
                    </h3>
                    <div className="h-48 flex items-end gap-1">
                        {data.charts.dailyProducts.map((day, i) => {
                            const height = (parseInt(day.count) / maxProducts) * 100;
                            return (
                                <div
                                    key={i}
                                    className="flex-1 bg-blue-500 rounded-t hover:bg-blue-400 transition-colors relative group"
                                    style={{ height: `${Math.max(height, 4)}%` }}
                                >
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg border border-gray-200 dark:border-gray-700">
                                        {new Date(day.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}: {day.count}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>{timeRange === '7d' ? '7 days ago' : timeRange === '30d' ? '30 days ago' : '90 days ago'}</span>
                        <span>Today</span>
                    </div>
                </div>

                {/* Users Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-green-500 dark:text-green-400" />
                        User Registrations
                    </h3>
                    <div className="h-48 flex items-end gap-1">
                        {data.charts.dailyUsers.map((day, i) => {
                            const height = (parseInt(day.count) / maxUsers) * 100;
                            return (
                                <div
                                    key={i}
                                    className="flex-1 bg-green-500 rounded-t hover:bg-green-400 transition-colors relative group"
                                    style={{ height: `${Math.max(height, 4)}%` }}
                                >
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg border border-gray-200 dark:border-gray-700">
                                        {new Date(day.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}: {day.count}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>{timeRange === '7d' ? '7 days ago' : timeRange === '30d' ? '30 days ago' : '90 days ago'}</span>
                        <span>Today</span>
                    </div>
                </div>
            </div>

            {/* Growth Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Growth Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Products Added Today</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.growth.productsToday}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Products Added This Week</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.growth.productsWeek}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Products Added This Month</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.growth.productsMonth}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({
    title,
    value,
    change,
    changeLabel,
    isPositive
}: {
    title: string;
    value: number;
    change?: number;
    changeLabel: string;
    isPositive?: boolean;
}) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value.toLocaleString()}</p>
            <div className="flex items-center gap-1 mt-2">
                {change !== undefined && (
                    <>
                        {isPositive ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                        <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
                            +{change}
                        </span>
                    </>
                )}
                <span className="text-gray-500 text-sm">{changeLabel}</span>
            </div>
        </div>
    );
}
