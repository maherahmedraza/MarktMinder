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
    Sparkles,
    Brain,
    Target,
    Zap,
    ArrowDownRight,
    Heart,
    Clock
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
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
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Track your products and savings</p>
                </div>
                {user?.email === 'admin@marktminder.de' && (
                    <Link
                        href="/admin"
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                    >
                        Admin Panel →
                    </Link>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title="Products Tracked"
                    value={totalProducts.toString()}
                    icon={<Package className="w-5 h-5" />}
                    color="blue"
                />
                <StatCard
                    title="Potential Savings"
                    value={`€${totalSavings.toFixed(0)}`}
                    icon={<TrendingDown className="w-5 h-5" />}
                    color="green"
                />
                <StatCard
                    title="At Lowest Price"
                    value={atLowestCount.toString()}
                    icon={<Target className="w-5 h-5" />}
                    color="purple"
                />
                <StatCard
                    title="Favorites"
                    value={favorites.length.toString()}
                    icon={<Heart className="w-5 h-5" />}
                    color="pink"
                />
            </div>

            {/* Triggered Alerts */}
            {alerts.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center animate-pulse">
                            <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-green-800 dark:text-green-200">🎉 Price Alerts Triggered!</h3>
                            <p className="text-sm text-green-600 dark:text-green-400">{alerts.length} product(s) reached your target price</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {alerts.slice(0, 3).map(alert => (
                            <Link
                                key={alert.id}
                                href={`/dashboard/products/${alert.productId}`}
                                className="block bg-white dark:bg-gray-800 rounded-lg p-3 hover:bg-green-25 dark:hover:bg-green-900/10 transition-colors border border-green-100 dark:border-green-900/30"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 dark:text-white">{alert.product?.title}</span>
                                    <span className="text-green-600 dark:text-green-400 font-semibold">
                                        €{Number(alert.product?.currentPrice || 0).toFixed(2)}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Insights & Price Drops */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Price Predictions */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center">
                            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Price Insights</h2>
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full ml-auto">BETA</span>
                    </div>

                    {predictions.size > 0 ? (
                        <div className="space-y-3">
                            {Array.from(predictions.entries()).slice(0, 3).map(([productId, pred]) => {
                                const product = products.find(p => p.id === productId);
                                if (!product) return null;

                                return (
                                    <Link
                                        key={productId}
                                        href={`/dashboard/products/${productId}`}
                                        className="block bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-lg p-3 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{product.title}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{pred.analysis.recommendation}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {pred.trend === 'falling' && <TrendingDown className="w-4 h-4 text-green-500" />}
                                                {pred.trend === 'rising' && <TrendingUp className="w-4 h-4 text-red-500" />}
                                                {pred.trend === 'stable' && <span className="text-gray-400">→</span>}
                                                <span className={`text-xs font-medium ${pred.trend === 'falling' ? 'text-green-600 dark:text-green-400' :
                                                    pred.trend === 'rising' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                    {pred.trendStrength}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-indigo-500 h-1.5 rounded-full"
                                                    style={{ width: `${pred.confidence}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{pred.confidence}% confidence</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Add more products to see AI predictions</p>
                    )}
                </div>

                {/* Top Price Drops */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                            <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Biggest Price Drops</h2>
                    </div>

                    {priceDrops.length > 0 ? (
                        <div className="space-y-3">
                            {priceDrops.map((drop) => (
                                <Link
                                    key={drop.id}
                                    href={`/dashboard/products/${drop.id}`}
                                    className="block bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-lg p-3 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {drop.image_url ? (
                                            <img src={drop.image_url} alt="" className="w-10 h-10 rounded object-cover bg-gray-100 dark:bg-gray-700" />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                                                <Package className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{drop.title}</p>
                                            <div className="flex items-center gap-2 text-xs mt-1">
                                                <span className="text-gray-400 dark:text-gray-500 line-through">€{parseFloat(String(drop.old_price || 0)).toFixed(2)}</span>
                                                <span className="text-green-600 dark:text-green-400 font-semibold">€{parseFloat(String(drop.current_price || 0)).toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-sm">
                                                <ArrowDownRight className="w-4 h-4" />
                                                {parseFloat(String(drop.drop_percentage || 0)).toFixed(1)}%
                                            </span>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Save €{parseFloat(String(drop.savings || 0)).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No significant price drops yet</p>
                    )}
                </div>
            </div>

            {/* Watchlist (Favorites) */}
            {favorites.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-500" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Watchlist</h2>
                        </div>
                        <Link
                            href="/dashboard/products"
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium flex items-center gap-1"
                        >
                            View all
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {favorites.slice(0, 6).map(product => (
                            <ProductCard key={product.id} product={product} isFavorite />
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Products */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recently Added</h2>
                    </div>
                    <Link
                        href="/dashboard/products"
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium flex items-center gap-1"
                    >
                        View all
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {products.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                        <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">No products yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Start tracking products to see them here</p>
                        <Link
                            href="/dashboard/products/add"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                        >
                            Add your first product
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {products.slice(0, 4).map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
    color
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'pink';
}) {
    const colors = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
        pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
            </div>
        </div>
    );
}

function ProductCard({ product, isFavorite }: { product: Product; isFavorite?: boolean }) {
    const priceChange = product.highestPrice && product.currentPrice
        ? ((product.currentPrice - product.highestPrice) / product.highestPrice * 100)
        : 0;

    const marketplaceColors: Record<string, string> = {
        amazon: 'badge-amazon',
        etsy: 'badge-etsy',
        otto: 'badge-otto',
    };

    return (
        <Link
            href={`/dashboard/products/${product.id}`}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-300 dark:hover:border-primary-500 hover:shadow-md transition-all flex gap-4"
        >
            {product.imageUrl ? (
                <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-16 h-16 object-cover rounded-lg bg-gray-100 dark:bg-gray-700"
                />
            ) : (
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-300 dark:text-gray-500" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">{product.title}</h3>
                            {isFavorite && <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 fill-yellow-500" />}
                        </div>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${marketplaceColors[product.marketplace]}`}>
                            {product.marketplace}
                        </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            €{Number(product.currentPrice || 0).toFixed(2)}
                        </p>
                        {priceChange !== 0 && (
                            <div className={`flex items-center gap-1 justify-end text-xs ${priceChange < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {priceChange < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                <span>{Math.abs(priceChange).toFixed(0)}%</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            <div>
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
                <div className="h-4 w-64 bg-gray-200 rounded mt-2"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-20"></div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-100 rounded-xl h-60"></div>
                <div className="bg-gray-100 rounded-xl h-60"></div>
            </div>
        </div>
    );
}
