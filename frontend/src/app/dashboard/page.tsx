'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api, { Product, Alert } from '@/lib/api';
import {
    TrendingDown,
    TrendingUp,
    Package,
    Bell,
    ArrowRight,
    AlertCircle,
    Star,
    Brain,
    Target,
    Zap,
    ArrowDownRight,
    Heart,
    LayoutDashboard,
    Clock,
    Plus
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatCard } from '@/components/ui/StatCard';
import { ProductCard } from '@/components/ui/ProductCard';
import { AchievementBadges } from '@/components/ui/AchievementBadges';

interface PriceDrop {
    id: string;
    title: string;
    image_url: string;
    marketplace: string;
    url: string;
    current_price: number;
    old_price: number;
    drop_percentage: number;
    savings: number;
}

interface Prediction {
    trend: 'rising' | 'falling' | 'stable';
    trendStrength: number;
    confidence: number;
    analysis: {
        recommendation: string;
    };
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [favorites, setFavorites] = useState<Product[]>([]);
    const [priceDrops, setPriceDrops] = useState<PriceDrop[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [predictions, setPredictions] = useState<Map<string, Prediction>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [productsRes, alertsRes] = await Promise.all([
                api.getProducts({ limit: 20 }),
                api.getAlerts(),
            ]);

            setProducts(productsRes.products);
            setFavorites(productsRes.products.filter((p: any) => p.isFavorite));
            setAlerts(alertsRes.alerts.filter(a => a.isTriggered));

            // Load price drops
            try {
                const dropsRes = await api.request<{ priceDrops: PriceDrop[] }>('/products/insights/price-drops?limit=5');
                setPriceDrops(dropsRes.priceDrops);
            } catch (e) {
                // Fallback - calculate from products
                const drops = productsRes.products
                    .filter((p: Product) => p.lowestPrice && p.currentPrice && p.currentPrice <= p.lowestPrice)
                    .slice(0, 5);
                setPriceDrops(drops.map((p: Product) => ({
                    id: p.id,
                    title: p.title,
                    image_url: p.imageUrl || '',
                    marketplace: p.marketplace,
                    url: '',
                    current_price: p.currentPrice || 0,
                    old_price: p.highestPrice || p.currentPrice || 0,
                    drop_percentage: p.highestPrice ? Math.round((1 - (p.currentPrice || 0) / p.highestPrice) * 100) : 0,
                    savings: (p.highestPrice || 0) - (p.currentPrice || 0),
                })));
            }

            // Load predictions for top products
            const predMap = new Map<string, Prediction>();
            for (const product of productsRes.products.slice(0, 3)) {
                try {
                    const pred = await api.request<Prediction>(`/products/${product.id}/predict`);
                    predMap.set(product.id, pred);
                } catch (e) {
                    // Skip if prediction fails
                }
            }
            setPredictions(predMap);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    if (error) {
        return (
            <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
            </div>
        );
    }

    // Calculate stats
    const totalProducts = products.length;
    const totalSavings = products.reduce((sum, p) => {
        if (p.highestPrice && p.currentPrice) {
            return sum + (p.highestPrice - p.currentPrice);
        }
        return sum;
    }, 0);
    const atLowestCount = products.filter(p =>
        p.lowestPrice && p.currentPrice === p.lowestPrice
    ).length;

    return (
        <div className="space-y-12 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm">
                            <LayoutDashboard className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">
                            Operational <span className="text-gradient">Console</span>
                        </h1>
                    </div>
                    <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                        Welcome back, <span className="text-primary font-bold uppercase">{user?.email?.split('@')[0]}</span>. Protocol sequence initialized.
                    </p>
                </div>
                <div className="flex gap-3">
                    {user?.email === 'admin@marktminder.de' && (
                        <Link href="/admin">
                            <GlowButton variant="outline" className="w-full md:w-auto">
                                Admin Panel
                            </GlowButton>
                        </Link>
                    )}
                    <Link href="/dashboard/products/add">
                        <GlowButton className="w-full md:w-auto">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Product
                        </GlowButton>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Products Tracked"
                    value={totalProducts.toString()}
                    icon={<Package className="w-5 h-5" />}
                    trend="+2 this week"
                />
                <StatCard
                    title="Potential Savings"
                    value={`€${totalSavings.toFixed(0)}`}
                    icon={<TrendingDown className="w-5 h-5" />}
                    isHighlight
                />
                <StatCard
                    title="At Lowest Price"
                    value={atLowestCount.toString()}
                    icon={<Target className="w-5 h-5" />}
                />
                <StatCard
                    title="Favorites"
                    value={favorites.length.toString()}
                    icon={<Heart className="w-5 h-5" />}
                />
            </div>

            {/* Triggered Alerts */}
            {alerts.length > 0 && (
                <GlassCard padding="none" className="overflow-hidden border-success/30 bg-success/5 animate-slide-up">
                    <div className="p-6 bg-success/10 border-b border-success/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center animate-pulse-slow">
                                <Bell className="w-5 h-5 text-success" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-success-700 dark:text-success-300">Price Alerts Triggered!</h3>
                                <p className="text-sm text-success-600 dark:text-success-400">{alerts.length} product(s) reached your target price</p>
                            </div>
                        </div>
                    </div>
                    <div className="divide-y divide-border/50">
                        {alerts.slice(0, 3).map(alert => (
                            <Link
                                key={alert.id}
                                href={`/dashboard/products/${alert.productId}`}
                                className="block p-4 hover:bg-surface-hover/50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-text-primary">{alert.product?.title}</span>
                                    <span className="text-success font-semibold px-3 py-1 bg-success/10 rounded-full text-sm">
                                        €{Number(alert.product?.currentPrice || 0).toFixed(2)}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* AI Insights */}
                <GlassCard variant="pro">
                    <div className="flex items-center gap-3 mb-6 relative">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                            <Brain className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">AI Insights</h2>
                            <p className="text-sm text-text-secondary">Predictive price analysis</p>
                        </div>
                    </div>

                    {predictions.size > 0 ? (
                        <div className="space-y-4">
                            {Array.from(predictions.entries()).slice(0, 3).map(([productId, pred]) => {
                                const product = products.find(p => p.id === productId);
                                if (!product) return null;

                                return (
                                    <Link
                                        key={productId}
                                        href={`/dashboard/products/${productId}`}
                                        className="block group"
                                    >
                                        <GlassCard
                                            padding="sm"
                                            variant="interactive"
                                            className="border-border/50 bg-background/50 hover:bg-background/80"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-text-primary text-sm truncate group-hover:text-primary transition-colors">{product.title}</p>
                                                    <p className="text-xs text-text-tertiary mt-1 line-clamp-1">{pred.analysis.recommendation}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    {pred.trend === 'falling' && <TrendingDown className="w-4 h-4 text-success" />}
                                                    {pred.trend === 'rising' && <TrendingUp className="w-4 h-4 text-error" />}
                                                    <span className={`text-xs font-bold ${pred.trend === 'falling' ? 'text-success' :
                                                        pred.trend === 'rising' ? 'text-error' : 'text-text-secondary'
                                                        }`}>
                                                        {pred.trendStrength}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-3">
                                                <div className="flex-1 bg-surface-hover rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="bg-primary h-full rounded-full transition-all duration-1000"
                                                        style={{ width: `${pred.confidence}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-text-tertiary font-mono">{pred.confidence}% CONF</span>
                                            </div>
                                        </GlassCard>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-text-secondary text-sm">Track more products to unlock AI predictions</p>
                        </div>
                    )}
                </GlassCard>

                {/* Top Price Drops */}
                <GlassCard>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/20">
                            <Zap className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">Biggest Drops</h2>
                            <p className="text-sm text-text-secondary">Best deals right now</p>
                        </div>
                    </div>

                    {priceDrops.length > 0 ? (
                        <div className="space-y-4">
                            {priceDrops.map((drop) => (
                                <Link
                                    key={drop.id}
                                    href={`/dashboard/products/${drop.id}`}
                                    className="block group"
                                >
                                    <div className="group-hover:translate-x-1 transition-transform duration-300 flex items-center gap-4 p-2 rounded-xl hover:bg-surface-hover/50">
                                        {drop.image_url ? (
                                            <img src={drop.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-surface border border-border" />
                                        ) : (
                                            <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center border border-border">
                                                <Package className="w-6 h-6 text-text-tertiary" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-text-primary text-sm truncate group-hover:text-accent transition-colors">{drop.title}</p>
                                            <div className="flex items-center gap-2 text-xs mt-1">
                                                <span className="text-text-tertiary line-through">€{parseFloat(String(drop.old_price || 0)).toFixed(2)}</span>
                                                <span className="text-accent font-bold">€{parseFloat(String(drop.current_price || 0)).toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="inline-flex items-center gap-1 text-success font-bold text-sm bg-success/10 px-2 py-0.5 rounded-full">
                                                <ArrowDownRight className="w-3 h-3" />
                                                {parseFloat(String(drop.drop_percentage || 0)).toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-text-secondary text-sm">No significant price drops yet</p>
                        </div>
                    )}
                </GlassCard>
            </div>

            {/* Gamification Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center border border-warning/20">
                        <Star className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary">Your Achievements</h2>
                        <p className="text-sm text-text-secondary">Track your savings journey</p>
                    </div>
                </div>
                <AchievementBadges />
            </div>

            {/* Watchlist */}
            {favorites.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Star className="w-6 h-6 text-warning fill-warning" />
                            <h2 className="text-2xl font-bold text-text-primary">Watchlist</h2>
                        </div>
                        <Link href="/dashboard/products" className="text-primary hover:text-primary-hover text-sm font-medium flex items-center gap-1 group">
                            View all <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {favorites.slice(0, 6).map(product => (
                            <ProductCard key={product.id} product={product} isFavorite />
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Products */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-text-tertiary" />
                        <h2 className="text-2xl font-bold text-text-primary">Recently Added</h2>
                    </div>
                    {products.length > 0 && (
                        <Link href="/dashboard/products" className="text-primary hover:text-primary-hover text-sm font-medium flex items-center gap-1 group">
                            View all <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    )}
                </div>

                {products.length === 0 ? (
                    <GlassCard className="text-center py-12 border-dashed">
                        <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-text-tertiary" />
                        </div>
                        <h3 className="text-lg font-medium text-text-primary mb-2">No products yet</h3>
                        <p className="text-text-secondary mb-6">Start tracking products to see them here</p>
                        <Link href="/dashboard/products/add">
                            <GlowButton>Add your first product</GlowButton>
                        </Link>
                    </GlassCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {products.slice(0, 4).map(product => (
                            <ProductCard key={product.id} product={product} compact />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-pulse max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div className="h-8 w-48 bg-surface-hover rounded-lg"></div>
                <div className="h-10 w-32 bg-surface-hover rounded-lg"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-surface rounded-2xl border border-border p-6 h-24"></div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface rounded-2xl border border-border h-80"></div>
                <div className="bg-surface rounded-2xl border border-border h-80"></div>
            </div>
        </div>
    );
}
