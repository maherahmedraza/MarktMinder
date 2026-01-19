'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Calendar, Loader2, Activity, Zap, Shield, Target, Globe, ArrowUpRight, Package } from 'lucide-react';
import api from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/StatCard';
import { GlowButton } from '@/components/ui/GlowButton';

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
            <div className="flex flex-col items-center justify-center py-32">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Target className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="mt-8 text-[10px] font-black text-text-tertiary uppercase tracking-[0.4em] animate-pulse">Synthesizing Neural Metrics...</p>
            </div>
        );
    }

    if (!data) return null;

    // Calculate max for chart scaling
    const maxProducts = Math.max(...data.charts.dailyProducts.map(d => parseInt(d.count)), 1);
    const maxUsers = Math.max(...data.charts.dailyUsers.map(d => parseInt(d.count)), 1);

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm">
                            <Activity className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">
                            Neural <span className="text-gradient">Metrics</span>
                        </h1>
                    </div>
                    <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                        Full-spectrum platform intelligence. Synchronizing registry logs and marketplace ingestion rates in real-time.
                    </p>
                </div>
                <div className="flex items-center p-1.5 bg-surface/50 border border-border/50 rounded-2xl backdrop-blur-md">
                    {(['7d', '30d', '90d'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${timeRange === range
                                ? 'bg-primary text-white shadow-glow-sm'
                                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover'
                                }`}
                        >
                            {range === '7d' ? '7D' : range === '30d' ? '30D' : '90D'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Asset Volume"
                    value={data.overview.totalProducts.toLocaleString()}
                    icon={<Package className="w-6 h-6" />}
                    trend={`+${data.growth.productsWeek} WEEKLY`}
                />
                <StatCard
                    title="Active Entities"
                    value={data.overview.totalUsers.toLocaleString()}
                    icon={<Globe className="w-6 h-6" />}
                    trend={`+${data.growth.usersWeek} WEEKLY`}
                    isHighlight
                />
                <StatCard
                    title="Trigger Nodes"
                    value={data.overview.totalTracked.toLocaleString()}
                    icon={<Zap className="w-6 h-6" />}
                />
                <StatCard
                    title="Daily Flux"
                    value={data.growth.priceRecordsToday.toLocaleString()}
                    icon={<Activity className="w-6 h-6" />}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ingestion Chart */}
                <GlassCard variant="pro" className="flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                                <BarChart3 className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Asset Ingestion</h3>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-mono text-text-tertiary uppercase">Max_Peak: {maxProducts}</span>
                        </div>
                    </div>

                    <div className="relative h-48 flex items-end gap-1.5 mt-4">
                        {data.charts.dailyProducts.map((day, i) => {
                            const height = (parseInt(day.count) / maxProducts) * 100;
                            return (
                                <div
                                    key={i}
                                    className="flex-1 bg-primary/20 hover:bg-primary/50 border-t border-primary/30 rounded-t-sm transition-all duration-500 relative group cursor-crosshair"
                                    style={{ height: `${Math.max(height, 5)}%` }}
                                >
                                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-surface border border-border/50 text-text-primary text-[9px] font-black font-mono px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-xl z-10">
                                        [{new Date(day.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}] // {day.count} ASSETS
                                    </div>
                                    {height > 80 && (
                                        <div className="absolute top-0 left-0 w-full h-full bg-primary/10 animate-pulse" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-6 pt-4 border-t border-border/10">
                        <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{timeRange === '7d' ? 'T-7 DAYS' : timeRange === '30d' ? 'T-30 DAYS' : 'T-90 DAYS'}</span>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">CURRENT_SEQUENCE</span>
                    </div>
                </GlassCard>

                {/* Registration Chart */}
                <GlassCard variant="default" className="flex flex-col border-secondary/20 border">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                                <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Entity Arrival</h3>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-mono text-text-tertiary uppercase">Max_Peak: {maxUsers}</span>
                        </div>
                    </div>

                    <div className="relative h-48 flex items-end gap-1.5 mt-4">
                        {data.charts.dailyUsers.map((day, i) => {
                            const height = (parseInt(day.count) / maxUsers) * 100;
                            return (
                                <div
                                    key={i}
                                    className="flex-1 bg-primary/20 hover:bg-primary/50 border-t border-primary/30 rounded-t-sm transition-all duration-500 relative group cursor-crosshair"
                                    style={{ height: `${Math.max(height, 5)}%` }}
                                >
                                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-surface border border-border/50 text-text-primary text-[9px] font-black font-mono px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-xl z-10">
                                        [{new Date(day.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}] // {day.count} ENTITIES
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-6 pt-4 border-t border-border/10">
                        <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{timeRange === '7d' ? 'T-7 DAYS' : timeRange === '30d' ? 'T-30 DAYS' : 'T-90 DAYS'}</span>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">ARRIVAL_LOGS</span>
                    </div>
                </GlassCard>
            </div>

            {/* Comprehensive Growth Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {[
                    { label: 'Ingested Today', value: data.growth.productsToday, icon: <Zap className="w-4 h-4 text-warning" /> },
                    { label: 'Weekly Delta', value: data.growth.productsWeek, icon: <TrendingUp className="w-4 h-4 text-success" /> },
                    { label: 'Monthly Delta', value: data.growth.productsMonth, icon: <Shield className="w-4 h-4 text-primary" /> }
                ].map((stat, i) => (
                    <GlassCard key={i} variant="interactive" className="group">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mb-3">{stat.label}</p>
                                <p className="text-4xl font-black text-text-primary tracking-tight group-hover:text-primary transition-colors">{stat.value}</p>
                            </div>
                            <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center border border-border group-hover:border-primary/30 transition-all shadow-sm">
                                {stat.icon}
                            </div>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                            <span>Sector_Audit_Success</span>
                            <ArrowUpRight className="w-3 h-3 text-primary" />
                        </div>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
}
