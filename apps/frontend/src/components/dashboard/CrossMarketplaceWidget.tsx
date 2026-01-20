'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ExternalLink, Loader2, Award, TrendingDown } from 'lucide-react';

interface MarketplacePrice {
    marketplace: 'amazon' | 'etsy' | 'otto';
    productId: string;
    productName: string;
    price: number;
    currency: string;
    totalPrice: number;
    url: string;
    imageUrl?: string;
}

interface Comparison {
    searchTerm: string;
    results: MarketplacePrice[];
    bestDeal: {
        marketplace: string;
        productId: string;
        price: number;
        savingsVsHighest: number;
        savingsPercentage: number;
    } | null;
}

interface CrossMarketplaceWidgetProps {
    productId: string;
    compact?: boolean;
}

const marketplaceColors: Record<string, string> = {
    amazon: 'from-orange-500 to-amber-500',
    etsy: 'from-orange-600 to-red-500',
    otto: 'from-red-500 to-rose-500',
};

const marketplaceIcons: Record<string, string> = {
    amazon: '🛒',
    etsy: '🎨',
    otto: '🏠',
};

export function CrossMarketplaceWidget({ productId, compact = false }: CrossMarketplaceWidgetProps) {
    const [comparison, setComparison] = useState<Comparison | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchComparison = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/products/${productId}/compare`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch comparison');
                }

                const data = await response.json();
                setComparison(data.comparison);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchComparison();
    }, [productId]);

    if (loading) {
        return (
            <GlassCard className="p-4">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            </GlassCard>
        );
    }

    if (error || !comparison || comparison.results.length === 0) {
        return null; // Silently fail if no comparison data
    }

    // Sort by price
    const sortedResults = [...comparison.results].sort((a, b) => a.totalPrice - b.totalPrice);
    const lowestPrice = sortedResults[0]?.totalPrice || 0;
    const highestPrice = sortedResults[sortedResults.length - 1]?.totalPrice || 0;

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                {sortedResults.slice(0, 3).map((result, i) => (
                    <div
                        key={result.productId}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${i === 0
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-white/5 text-white/60'
                            }`}
                    >
                        {marketplaceIcons[result.marketplace]} €{result.totalPrice.toFixed(2)}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        📊 Cross-Marketplace Prices
                    </h3>
                    <p className="text-sm text-white/60">Compare across Amazon, Etsy & Otto</p>
                </div>
                {comparison.bestDeal && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Award className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            Save €{comparison.bestDeal.savingsVsHighest.toFixed(2)} ({comparison.bestDeal.savingsPercentage}%)
                        </span>
                    </div>
                )}
            </div>

            {/* Price Bars */}
            <div className="space-y-3">
                {sortedResults.map((result, index) => {
                    const widthPercent = highestPrice > 0
                        ? (result.totalPrice / highestPrice) * 100
                        : 100;
                    const isBest = index === 0;

                    return (
                        <div key={result.productId} className="relative">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{marketplaceIcons[result.marketplace]}</span>
                                    <span className="text-sm font-medium text-white capitalize">
                                        {result.marketplace}
                                    </span>
                                    {isBest && (
                                        <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500 text-white rounded uppercase">
                                            Best
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold ${isBest ? 'text-emerald-400' : 'text-white'}`}>
                                        €{result.totalPrice.toFixed(2)}
                                    </span>
                                    <a
                                        href={result.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white/40 hover:text-white/80 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full bg-gradient-to-r ${isBest ? 'from-emerald-500 to-green-500' : marketplaceColors[result.marketplace]
                                        } transition-all duration-500`}
                                    style={{ width: `${widthPercent}%` }}
                                />
                            </div>

                            {/* Savings indicator for non-best */}
                            {!isBest && lowestPrice > 0 && (
                                <div className="absolute right-0 -top-1">
                                    <span className="text-xs text-red-400">
                                        +€{(result.totalPrice - lowestPrice).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Best Deal Highlight */}
            {comparison.bestDeal && sortedResults.length > 1 && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            Buy on {comparison.bestDeal.marketplace.charAt(0).toUpperCase() + comparison.bestDeal.marketplace.slice(1)} to save {comparison.bestDeal.savingsPercentage}%
                        </span>
                    </div>
                </div>
            )}
        </GlassCard>
    );
}

export default CrossMarketplaceWidget;
