'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import api, { Product, PricePoint, PriceStats } from '@/lib/api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
    ArrowLeft,
    ExternalLink,
    Bell,
    Trash2,
    TrendingDown,
    TrendingUp,
    Calendar,
    AlertCircle,
    Loader2,
    Brain,
    Plus,
    Check,
    Sparkles,
    Package
} from 'lucide-react';

import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatCard } from '@/components/ui/StatCard';
import { TrustScoreBadge } from '@/components/products/TrustScoreBadge';
import { CrossMarketplaceWidget } from '@/components/dashboard/CrossMarketplaceWidget';
import { SmartAlertBuilder } from '@/components/alerts/SmartAlertBuilder';
import { AIRecommendation } from '@/components/dashboard/AIRecommendation';

// Lazy load PriceChart for better performance
const PriceChart = dynamic(
    () => import('@/components/PriceChart').then(mod => mod.PriceChart),
    {
        loading: () => (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Loading chart...</span>
                </div>
            </div>
        ),
        ssr: false // Chart.js doesn't work well with SSR
    }
);

type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

interface PredictionDay {
    date: string;
    predictedPrice: number;
    lowerBound: number;
    upperBound: number;
}

interface Prediction {
    predictions: PredictionDay[];
    trend: 'rising' | 'falling' | 'stable';
    trendStrength: number;
    confidence: number;
    analysis: {
        volatility: number;
        averagePrice: number;
        priceRange: { min: number; max: number };
        recommendation: string;
    };
}

import { useSocket } from '@/providers/SocketProvider';
import { toast } from 'sonner';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;
    const { socket } = useSocket();

    const [product, setProduct] = useState<Product | null>(null);
    const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
    const [stats, setStats] = useState<PriceStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isChartLoading, setIsChartLoading] = useState(false);
    const [error, setError] = useState('');
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // AI Prediction State
    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [loadingPrediction, setLoadingPrediction] = useState(false);
    const [predictionError, setPredictionError] = useState<string | null>(null);

    useEffect(() => {
        loadProduct();
    }, [productId, timeRange]);

    useEffect(() => {
        if (!socket) return;

        const handleUpdate = (data: any) => {
            if (data.productId === productId) {
                toast.success(`Price updated: €${Number(data.price).toFixed(2)}`);
                loadProduct();
            }
        };

        socket.on('product:updated', handleUpdate);

        return () => {
            socket.off('product:updated', handleUpdate);
        };
    }, [socket, productId]);

    async function loadProduct() {
        try {
            if (!product) {
                setIsLoading(true);
            } else {
                setIsChartLoading(true);
            }

            const data = await api.getProduct(productId, timeRange);
            setProduct(data.product);
            setPriceHistory(data.priceHistory);
            setStats(data.stats);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
            setIsChartLoading(false);
        }
    }

    async function handleDelete() {
        try {
            setIsDeleting(true);
            await api.removeProduct(productId);
            setShowDeleteConfirm(false);
            router.push('/dashboard/products');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsDeleting(false);
        }
    }

    async function handleAddToWatchlist() {
        if (!product) return;
        try {
            setIsAdding(true);
            await api.addProduct(product.url);
            loadProduct();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsAdding(false);
        }
    }

    async function handlePredict() {
        if (!product) return;
        try {
            setLoadingPrediction(true);
            setPredictionError(null);
            const data = await api.request<Prediction>(`/products/${productId}/predict?days=7`);
            setPrediction(data);
        } catch (err: any) {
            const msg = err.message || 'Unknown error';
            if (msg.includes('minimum') || msg.includes('Not enough')) {
                setPredictionError('Not enough price history for AI prediction. Need at least 5 data points over 30 days.');
            } else {
                setPredictionError(msg);
            }
        } finally {
            setLoadingPrediction(false);
        }
    }

    if (isLoading) {
        return <ProductDetailSkeleton />;
    }

    if (error || !product) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error || 'Product not found'}</span>
            </div>
        );
    }

    const priceChange = stats?.priceChange30d || 0;
    const marketplaceColors: Record<string, string> = {
        amazon: 'badge-amazon',
        etsy: 'badge-etsy',
        otto: 'badge-otto',
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <Link
                    href="/dashboard/products"
                    className="inline-flex items-center gap-2 text-text-tertiary hover:text-primary font-bold uppercase tracking-widest text-[10px] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to products
                </Link>

                <div className="flex flex-wrap gap-3">
                    {product.isTracked ? (
                        <>
                            <GlowButton
                                onClick={() => setShowAlertModal(true)}
                                variant="outline"
                                className="flex-1 sm:flex-none"
                            >
                                <Bell className="w-4 h-4 mr-2" />
                                Set Alert
                            </GlowButton>
                            <GlowButton
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isDeleting}
                                variant="danger"
                                className="flex-1 sm:flex-none"
                            >
                                {isDeleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                )}
                                Stop Tracking
                            </GlowButton>
                        </>
                    ) : (
                        <GlowButton
                            onClick={handleAddToWatchlist}
                            disabled={isAdding}
                            className="flex-1 sm:flex-none"
                        >
                            {isAdding ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            Add to Watchlist
                        </GlowButton>
                    )}

                    <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none"
                    >
                        <GlowButton variant="secondary" className="w-full">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Official Site
                        </GlowButton>
                    </a>
                </div>
            </div>

            {/* Product Hero Section */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Product Image */}
                <GlassCard padding="none" className="lg:w-80 flex-shrink-0 overflow-hidden group">
                    <div className="relative aspect-square">
                        {product.imageUrl ? (
                            <img
                                src={product.imageUrl}
                                alt={product.title}
                                className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-110"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-surface">
                                <Package className="w-16 h-16 text-text-tertiary/20" />
                            </div>
                        )}
                        <div className="absolute top-4 right-4">
                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border backdrop-blur-md shadow-xl ${marketplaceColors[product.marketplace] || 'bg-surface/80 text-text-primary'}`}>
                                {product.marketplace}
                            </span>
                        </div>
                    </div>
                </GlassCard>

                {/* Right: Info & Primary Stats */}
                <div className="flex-1 space-y-6">
                    <div>
                        <h1 className="heading-1 text-text-primary leading-tight mb-2">{product.title}</h1>
                        {product.brand && (
                            <p className="text-text-tertiary font-bold uppercase tracking-[0.2em] text-xs">BRAND: {product.brand}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            title="Current Price"
                            value={product.currentPrice ? `€${Number(product.currentPrice).toFixed(2)}` : 'FETCHING...'}
                            icon={<TrendingDown className="w-6 h-6" />}
                            isHighlight={true}
                            trend={priceChange !== 0 ? `${priceChange < 0 ? '-' : '+'}${Math.abs(priceChange).toFixed(1)}% (30d)` : undefined}
                        />
                        {stats && (
                            <>
                                <StatCard
                                    title="Lowest Ever"
                                    value={`€${Number(stats.minPrice).toFixed(2)}`}
                                    icon={<Check className="w-6 h-6" />}
                                />
                                <StatCard
                                    title="Highest Ever"
                                    value={`€${Number(stats.maxPrice).toFixed(2)}`}
                                    icon={<TrendingUp className="w-6 h-6" />}
                                />
                                <StatCard
                                    title="Target Price"
                                    value={product.currentPrice ? `€${(Number(product.currentPrice) * 0.95).toFixed(2)}` : 'N/A'}
                                    icon={<Bell className="w-6 h-6" />}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Insight Section */}
            <GlassCard variant="pro" className="relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 text-primary/10 group-hover:text-primary/20 transition-colors pointer-events-none">
                    <Brain className="w-32 h-32 rotate-12" />
                </div>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center shadow-glow">
                        <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="heading-3 text-text-primary">AI Neural Projection</h2>
                        <p className="text-xs font-bold text-text-tertiary tracking-widest uppercase mt-1">Status: Operational // Data Confidence: {prediction?.confidence || 0}%</p>
                    </div>
                </div>

                {!prediction && !predictionError ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <p className="text-text-secondary mb-6 text-center max-w-md">Our neural network hasn't analyzed this price curve yet. Generate a prediction to see localized trends.</p>
                        <GlowButton onClick={handlePredict} disabled={loadingPrediction}>
                            {loadingPrediction ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            Initialize Analysis
                        </GlowButton>
                    </div>
                ) : predictionError ? (
                    <div className="bg-warning/5 border border-warning/20 p-6 rounded-2xl flex gap-4">
                        <AlertCircle className="w-6 h-6 text-warning flex-shrink-0" />
                        <div>
                            <p className="text-warning font-bold uppercase tracking-widest text-xs mb-1">Insufficient Data</p>
                            <p className="text-text-secondary text-sm">{predictionError}</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
                        <div className="space-y-6">
                            <div className="bg-surface-hover/50 p-6 rounded-2xl border border-border/50">
                                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-4 font-mono">NEURAL RECOMMENDATION</p>
                                <p className="text-text-primary text-sm leading-relaxed font-medium italic">
                                    "{prediction!.analysis.recommendation}"
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: 'FORECAST', val: prediction!.trend, highlight: true },
                                { label: 'STRENGTH', val: `${prediction!.trendStrength}%` },
                                { label: 'AVG PRICE', val: `€${prediction!.analysis.averagePrice.toFixed(2)}` },
                                { label: 'CONFIDENCE', val: `${prediction!.confidence}%` }
                            ].map((item, idx) => (
                                <div key={idx} className="bg-surface/30 p-4 rounded-xl border border-border/20">
                                    <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">{item.label}</p>
                                    <p className={`text-lg font-black font-mono uppercase ${item.highlight ? 'text-primary' : 'text-text-primary'}`}>
                                        {item.val}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </GlassCard>

            {/* Price Chart */}
            <GlassCard padding="default">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-1 bg-primary h-6 rounded-full"></div>
                        <h2 className="heading-3 text-text-primary">Market History</h2>
                    </div>

                    <div className="flex gap-1 bg-surface-hover/80 p-1.5 rounded-xl border border-border/50">
                        {(['7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${timeRange === range
                                    ? 'bg-primary text-text-inverse shadow-glow'
                                    : 'text-text-tertiary hover:text-text-secondary hover:bg-surface/50'
                                    }`}
                            >
                                {range}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-96 relative">
                    {isChartLoading && (
                        <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        </div>
                    )}
                    <PriceChart data={priceHistory} />
                </div>
            </GlassCard>

            {/* Bottom Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* AI Shopping Assistant - Buy/Wait Recommendation */}
                <AIRecommendation productId={productId} className="lg:col-span-2" />

                {/* Trust Score / Fake Discount Detector */}
                <TrustScoreBadge productId={productId} />

                {/* Cross-Marketplace Comparison */}
                <CrossMarketplaceWidget productId={productId} />

                {/* Smart Alerts / Conditional Alert Engine */}
                <SmartAlertBuilder
                    productId={productId}
                    productTitle={product?.title}
                />

                {/* Price Records Table */}
                <GlassCard padding="none" className="overflow-hidden">
                    <div className="p-6 border-b border-border/50 flex items-center justify-between bg-surface-hover/30">
                        <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest">Pricing Records</h2>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-border/20 z-10">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Timestamp</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Price</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/10">
                                {priceHistory.map((point, index) => (
                                    <tr key={index} className="hover:bg-surface-hover/30 transition-colors">
                                        <td className="px-6 py-4 text-xs font-mono text-text-secondary">
                                            {new Date(point.time).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-text-primary font-mono antialiased">
                                            €{Number(point.price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-[10px] font-bold">
                                            <span className={`px-2 py-0.5 rounded-md ${point.availability === 'in_stock' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                                                {point.availability?.replace('_', ' ').toUpperCase() || 'IN STOCK'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {/* Tracking Details */}
                <GlassCard className="flex flex-col h-full">
                    <div className="p-0 flex items-center justify-between mb-8">
                        <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest">Asset Details</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                        {[
                            { label: 'Asset Category', value: product.category || 'GENERAL PRODUCTS' },
                            { label: 'Last Scan', value: product.lastScrapedAt ? new Date(product.lastScrapedAt).toLocaleString() : 'PENDING' },
                            { label: 'Tracking Initiated', value: product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A' },
                            { label: 'Tracking Status', value: product.isTracked ? 'OPERATIONAL' : 'INACTIVE', highlight: product.isTracked }
                        ].map((item, i) => (
                            <div key={i} className="space-y-1.5">
                                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-mono">{item.label}</p>
                                <p className={`text-sm font-bold uppercase tracking-wide ${item.highlight ? 'text-success' : 'text-text-primary'}`}>{item.value}</p>
                            </div>
                        ))}
                    </div>

                    {product.notes && (
                        <div className="mt-auto pt-8 border-t border-border/10">
                            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-mono mb-2">Internal Notes</p>
                            <p className="text-sm text-text-secondary italic leading-relaxed">"{product.notes}"</p>
                        </div>
                    )}
                </GlassCard>
            </div>

            {/* Deletion Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Stop Tracking Asset?"
                message={`Are you sure you want to stop tracking "${product.title}"? Neural history will be archived.`}
                confirmText="Terminate Tracking"
                cancelText="Maintain Status"
                isLoading={isDeleting}
                variant="danger"
            />

            {/* Alert System Modal */}
            {showAlertModal && (
                <AlertModal
                    productId={productId}
                    currentPrice={product.currentPrice}
                    onClose={() => setShowAlertModal(false)}
                />
            )}
        </div>
    );
}

function AlertModal({
    productId,
    currentPrice,
    onClose
}: {
    productId: string;
    currentPrice?: number;
    onClose: () => void;
}) {
    const [targetPrice, setTargetPrice] = useState(
        currentPrice ? (Number(currentPrice) * 0.9).toFixed(2) : ''
    );
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPercent, setSelectedPercent] = useState<number | null>(10);

    function handlePercentSelect(percent: number) {
        setSelectedPercent(percent);
        if (currentPrice) {
            const newPrice = Number(currentPrice) * (1 - percent / 100);
            setTargetPrice(newPrice.toFixed(2));
        }
    }

    function handleCustomPrice(value: string) {
        setTargetPrice(value);
        setSelectedPercent(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        try {
            setIsLoading(true);
            await api.createAlert(productId, 'price_below', parseFloat(targetPrice));
            alert('Alert created successfully!');
            onClose();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Set Price Alert</h3>
                <form onSubmit={handleSubmit}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notify me when price drops to:
                    </label>

                    {/* Percentage Quick Select */}
                    <div className="flex gap-2 mb-4">
                        {[5, 10, 15].map((percent) => (
                            <button
                                key={percent}
                                type="button"
                                onClick={() => handlePercentSelect(percent)}
                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${selectedPercent === percent
                                    ? 'bg-primary-800 text-white border-primary-800'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                            >
                                -{percent}%
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-500 dark:text-gray-400">€</span>
                        <input
                            type="number"
                            step="0.01"
                            value={targetPrice}
                            onChange={(e) => handleCustomPrice(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    {currentPrice && selectedPercent && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            {selectedPercent}% below current price of €{Number(currentPrice).toFixed(2)}
                        </p>
                    )}

                    <div className="flex gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Alert
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ProductDetailSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex gap-6">
                    <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    <div className="flex-1 space-y-4">
                        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 h-96"></div>
        </div>
    );
}

// Icons
function SparklesIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
    );
}

function TargetIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    );
}

function ArrowRightIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    );
}
