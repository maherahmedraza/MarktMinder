'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api, { Product, PricePoint, PriceStats } from '@/lib/api';
import { PriceChart } from '@/components/PriceChart';
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
    Check
} from 'lucide-react';

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
        <div className="space-y-6">
            {/* Back button */}
            <Link
                href="/dashboard/products"
                className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to products
            </Link>

            {/* Product header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Image */}
                    {product.imageUrl && (
                        <div className="w-full lg:w-48 flex-shrink-0">
                            <img
                                src={product.imageUrl}
                                alt={product.title}
                                className="w-full h-48 object-cover rounded-xl bg-gray-100 dark:bg-gray-700"
                            />
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${marketplaceColors[product.marketplace]}`}>
                                    {product.marketplace}
                                </span>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-2">{product.title}</h1>
                                {product.brand && (
                                    <p className="text-gray-500 dark:text-gray-400 mt-1">by {product.brand}</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 flex-shrink-0">
                                {product.isTracked ? (
                                    <>
                                        <button
                                            onClick={() => setShowAlertModal(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors text-sm font-medium"
                                        >
                                            <Bell className="w-4 h-4" />
                                            Set Alert
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            disabled={isDeleting}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm font-medium disabled:opacity-50"
                                        >
                                            {isDeleting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                            Stop Tracking
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleAddToWatchlist}
                                        disabled={isAdding}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
                                    >
                                        {isAdding ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Plus className="w-4 h-4" />
                                        )}
                                        Add to Watchlist
                                    </button>
                                )}

                                <a
                                    href={product.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View
                                </a>
                            </div>
                        </div>

                        {/* Price stats */}
                        <div className="mt-6 flex flex-wrap gap-6">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Current Price</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {product.currentPrice ? (
                                        `€${Number(product.currentPrice).toFixed(2)}`
                                    ) : (
                                        <span className="text-lg text-gray-400 animate-pulse font-normal">Fetching price...</span>
                                    )}
                                </p>
                                {priceChange !== 0 && (
                                    <div className={`flex items-center gap-1 mt-1 text-sm ${priceChange < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {priceChange < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                        <span>{Math.abs(Number(priceChange)).toFixed(1)}% vs 30 days ago</span>
                                    </div>
                                )}
                            </div>

                            {stats && (
                                <>
                                    <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Lowest</p>
                                        <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                                            €{Number(stats.minPrice).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Highest</p>
                                        <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                                            €{Number(stats.maxPrice).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Average</p>
                                        <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                                            €{Number(stats.avgPrice).toFixed(2)}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Prediction Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center">
                            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Price Projection</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Powered by historical data analysis</p>
                        </div>
                    </div>
                    {!prediction && !predictionError && (
                        <button
                            onClick={handlePredict}
                            disabled={loadingPrediction}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {loadingPrediction ? <Loader2 className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                            {loadingPrediction ? 'Analyzing...' : 'Generate Prediction'}
                        </button>
                    )}
                </div>

                {predictionError && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-amber-800 dark:text-amber-200 font-medium">Prediction Unavailable</p>
                            <p className="text-amber-600 dark:text-amber-300 text-sm mt-1">{predictionError}</p>
                        </div>
                    </div>
                )}

                {prediction && (
                    <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur rounded-xl p-6 border border-indigo-100 dark:border-indigo-900/50 transition-all animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Forecast Trend</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {prediction.trend === 'falling' ? (
                                            <TrendingDown className="w-6 h-6 text-green-500" />
                                        ) : prediction.trend === 'rising' ? (
                                            <TrendingUp className="w-6 h-6 text-red-500" />
                                        ) : (
                                            <ArrowRightIcon className="w-6 h-6 text-gray-400" />
                                        )}
                                        <span className={`text-2xl font-bold ${prediction.trend === 'falling' ? 'text-green-600 dark:text-green-400' :
                                            prediction.trend === 'rising' ? 'text-red-600 dark:text-red-400' :
                                                'text-gray-600 dark:text-gray-300'
                                            }`}>
                                            {prediction.trend.charAt(0).toUpperCase() + prediction.trend.slice(1)}
                                        </span>
                                    </div>
                                    {prediction.predictions[0] && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            7-Day Forecast: <strong>€{prediction.predictions[prediction.predictions.length - 1]?.predictedPrice.toFixed(2)}</strong>
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Confidence Score</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                            <div
                                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000"
                                                style={{ width: `${prediction.confidence}%` }}
                                            ></div>
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">{prediction.confidence}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-4">
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-indigo-100 dark:border-indigo-900/30">
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <TargetIcon className="w-4 h-4 text-indigo-500" />
                                        recommendation
                                    </h4>
                                    <p className="text-gray-700 dark:text-gray-300">{prediction.analysis.recommendation}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Volatility</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{prediction.analysis.volatility}%</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Average Price</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">€{prediction.analysis.averagePrice.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Price Range</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                            €{prediction.analysis.priceRange.min.toFixed(2)} - €{prediction.analysis.priceRange.max.toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Trend Strength</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{prediction.trendStrength}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Price Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 relative">
                {isChartLoading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl transition-all duration-200">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                    </div>
                )}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Price History</h2>
                    <div className="flex gap-1">
                        {(['7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${timeRange === range
                                    ? 'bg-primary-800 text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-80">
                    <PriceChart data={priceHistory} />
                </div>
            </div>

            {/* Price History Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Price Records</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Price</th>
                                <th className="px-6 py-3 font-medium">Availability</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {priceHistory.map((point, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100">
                                    <td className="px-6 py-4">
                                        {new Date(point.time).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        €{Number(point.price).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 capitalize">
                                        {point.availability?.replace('_', ' ') || 'In Stock'}
                                    </td>
                                </tr>
                            ))}
                            {priceHistory.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No price history available for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Product Details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h2>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Category</dt>
                        <dd className="text-gray-900 dark:text-white">{product.category || '-'}</dd>
                    </div>
                    <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Availability</dt>
                        <dd className="text-gray-900 dark:text-white capitalize">{product.availability?.replace('_', ' ') || '-'}</dd>
                    </div>
                    <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Last Updated</dt>
                        <dd className="text-gray-900 dark:text-white flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {product.lastScrapedAt
                                ? new Date(product.lastScrapedAt).toLocaleString()
                                : '-'
                            }
                        </dd>
                    </div>
                    <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Tracking Since</dt>
                        <dd className="text-gray-900 dark:text-white">
                            {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '-'}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Status</dt>
                        <dd className="text-gray-900 dark:text-white flex items-center gap-2">
                            {product.isTracked ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                    Tracked
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                    Not Tracked
                                </span>
                            )}
                        </dd>
                    </div>
                </dl>

                {product.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Notes</dt>
                        <dd className="text-gray-900 dark:text-white mt-1">{product.notes}</dd>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Stop Tracking Product?"
                message={`Are you sure you want to stop tracking "${product.title}"? You can always add it back later.`}
                confirmText="Stop Tracking"
                cancelText="Keep Tracking"
                isLoading={isDeleting}
                variant="danger"
            />

            {/* Alert Modal */}
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
