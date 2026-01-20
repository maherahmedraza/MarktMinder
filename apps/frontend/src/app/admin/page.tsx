'use client';

import {
    Package,
    Users,
    Bell,
    TrendingDown,
    TrendingUp,
    Activity,
    Database,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Shield,
    Globe,
    Zap,
    Target
} from 'lucide-react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatCard } from '@/components/ui/StatCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { useAdminStats } from '@/lib/hooks';

export default function AdminDashboard() {
    const { data: stats, isLoading, error, refetch } = useAdminStats();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="mt-8 text-xs font-black text-text-tertiary uppercase tracking-[0.4em] animate-pulse">Scanning Neural Network...</p>
            </div>
        );
    }

    if (error) {
        return (
            <GlassCard variant="pro" className="bg-error/5 border-error/20 p-8 text-center">
                <Shield className="w-12 h-12 text-error mx-auto mb-4" />
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight mb-2">Access Interrupted</h3>
                <p className="text-text-secondary mb-6 font-medium">{error.message}</p>
                <GlowButton variant="danger" onClick={() => refetch()}>
                    Retry Synchronization
                </GlowButton>
            </GlassCard>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">
                            System <span className="text-gradient">Control</span>
                        </h1>
                    </div>
                    <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                        Platform-wide intelligence dashboard. Monitoring market synthesis and entity activity in real-time.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Assets"
                    value={stats.overview.totalProducts.toLocaleString()}
                    icon={<Package className="w-6 h-6" />}
                    trend={`+${stats.growth.productsWeek} WEEKLY`}
                />
                <StatCard
                    title="Active Entities"
                    value={stats.overview.totalUsers.toLocaleString()}
                    icon={<Users className="w-6 h-6" />}
                    trend={`+${stats.growth.usersWeek} WEEKLY`}
                    isHighlight
                />
                <StatCard
                    title="Network Flux"
                    value={stats.overview.totalTracked.toLocaleString()}
                    icon={<Activity className="w-6 h-6" />}
                />
                <StatCard
                    title="Alert Nodes"
                    value={stats.overview.activeAlerts.toLocaleString()}
                    icon={<Bell className="w-6 h-6" />}
                />
            </div>

            {/* Growth Metrics & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Data Growth */}
                <GlassCard variant="default" className="flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                            <Database className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Data Expansion</h3>
                    </div>
                    <div className="flex-1 space-y-6">
                        {[
                            { label: 'Ingested Today', value: stats.growth.productsToday, icon: <Zap className="w-3.5 h-3.5 text-warning" /> },
                            { label: 'Weekly Delta', value: `+${stats.growth.productsWeek}`, icon: <TrendingUp className="w-3.5 h-3.5 text-success" /> },
                            { label: 'Monthly Volume', value: stats.growth.productsMonth, icon: <Globe className="w-3.5 h-3.5 text-primary" /> },
                            { label: 'Price Records', value: stats.growth.priceRecordsToday, icon: <Activity className="w-3.5 h-3.5 text-secondary" /> },
                        ].map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <span className="text-text-tertiary group-hover:text-primary transition-colors">{item.icon}</span>
                                    <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{item.label}</span>
                                </div>
                                <span className="text-sm font-black font-mono text-text-primary">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* Marketplace Distribution */}
                <GlassCard variant="default" className="flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center border border-secondary/20">
                            <Globe className="w-5 h-5 text-secondary" />
                        </div>
                        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Market Distribution</h3>
                    </div>
                    <div className="flex-1 space-y-6">
                        {stats.marketplaceDistribution.map((mp) => {
                            const total = stats.marketplaceDistribution.reduce((sum, m) => sum + parseInt(m.count), 0);
                            const percentage = total > 0 ? (parseInt(mp.count) / total * 100).toFixed(1) : 0;
                            return (
                                <div key={mp.marketplace} className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-text-primary">{mp.marketplace}</span>
                                        <span className="text-text-tertiary font-mono">{mp.count} ({percentage}%)</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden border border-border/10">
                                        <div
                                            className={`h-full rounded-full shadow-glow-sm transition-all duration-1000 ${mp.marketplace === 'amazon' ? 'bg-amazon' :
                                                mp.marketplace === 'etsy' ? 'bg-etsy' : 'bg-otto'
                                                }`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>

                {/* Quick Actions */}
                <GlassCard variant="pro" className="flex flex-col">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center border border-warning/20">
                            <Zap className="w-5 h-5 text-warning" />
                        </div>
                        <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Fast Override</h3>
                    </div>
                    <div className="flex-1 space-y-3">
                        {[
                            { label: 'Sync Asset Ledger', href: '/admin/products', icon: <Package className="w-4 h-4" /> },
                            { label: 'Entity Management', href: '/admin/users', icon: <Users className="w-4 h-4" /> },
                            { label: 'Infiltrate Dashboard', href: '/dashboard', icon: <ArrowUpRight className="w-4 h-4" /> },
                        ].map((action, idx) => (
                            <Link
                                key={idx}
                                href={action.href}
                                className="group flex items-center justify-between p-4 bg-surface/50 border border-border/50 rounded-2xl hover:bg-surface-hover hover:border-primary/30 transition-all duration-300"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-text-tertiary group-hover:text-primary transition-colors">
                                        {action.icon}
                                    </div>
                                    <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">{action.label}</span>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-text-tertiary group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                            </Link>
                        ))}
                    </div>
                </GlassCard>
            </div>

            {/* Top Tracked Products & Recent Price Drops */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Tracked */}
                <GlassCard variant="default">
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-8 flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-success" />
                        Priority Assets
                    </h3>
                    <div className="space-y-4">
                        {stats.topTracked.slice(0, 5).map((product, index) => (
                            <div key={product.id} className="flex items-center gap-4 p-4 bg-surface/30 border border-border/50 rounded-2xl hover:bg-surface-hover/50 transition-all group">
                                <span className="text-[10px] font-black text-text-tertiary w-4 font-mono">0{index + 1}</span>
                                <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center border border-border/50 shadow-sm relative overflow-hidden">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.title}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <Package className="w-6 h-6 text-text-tertiary/20" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-text-primary truncate uppercase tracking-tight">{product.title}</p>
                                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mt-0.5">
                                        {product.tracker_count} SENTINELS • <span className="text-primary">€{product.current_price}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* Recent Price Drops */}
                <GlassCard variant="default">
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-8 flex items-center gap-3">
                        <TrendingDown className="w-5 h-5 text-error" />
                        Imbalance Detections
                    </h3>
                    <div className="space-y-4">
                        {stats.recentDrops.slice(0, 5).map((product) => (
                            <div key={product.id} className="flex items-center gap-4 p-4 bg-surface/30 border border-border/50 rounded-2xl hover:bg-surface-hover/50 transition-all group">
                                <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center border border-border/50 shadow-sm relative overflow-hidden">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.title}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <Package className="w-6 h-6 text-text-tertiary/20" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-text-primary truncate uppercase tracking-tight">{product.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] font-mono text-text-tertiary line-through uppercase">€{product.old_price}</span>
                                        <span className="text-[10px] font-black text-success uppercase">€{product.new_price}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-black text-success flex items-center justify-end gap-1">
                                        <ArrowDownRight className="w-4 h-4" />
                                        {product.drop_percentage}%
                                    </span>
                                    <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-tighter">DELTA DETECTED</p>
                                </div>
                            </div>
                        ))}
                        {stats.recentDrops.length === 0 && (
                            <div className="py-20 text-center">
                                <Target className="w-10 h-10 text-text-tertiary/20 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest leading-relaxed">No market imbalances detected in current sector.</p>
                            </div>
                        )}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
