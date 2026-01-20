'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

interface DiscountAnalysis {
    productId: string;
    advertisedDiscount: string;
    actualDiscount: number;
    manipulationDetected: boolean;
    manipulationType: string;
    trustScore: number;
    trustLevel: 'genuine' | 'suspicious' | 'likely_fake';
    evidence: {
        currentPrice: number;
        claimedOriginalPrice?: number;
        price30DaysAgo: number;
        price90DaysAgo: number;
        lowestRecorded: number;
        highestRecorded: number;
        averagePrice: number;
        timesAtCurrentPrice: number;
        totalPriceRecords: number;
        priceWasHigherBefore: boolean;
    };
    insights: string[];
    recommendation: string;
    analyzedAt: string;
}

interface TrustScoreBadgeProps {
    productId: string;
    compact?: boolean;
}

export function TrustScoreBadge({ productId, compact = false }: TrustScoreBadgeProps) {
    const [analysis, setAnalysis] = useState<DiscountAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/products/${productId}/discount-analysis`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch analysis');
                }

                const data = await response.json();
                setAnalysis(data.analysis);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalysis();
    }, [productId]);

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-8 w-32 bg-white/10 rounded-lg" />
            </div>
        );
    }

    if (error || !analysis) {
        return null; // Silently fail - don't show badge if analysis unavailable
    }

    const getTrustColor = (level: string) => {
        switch (level) {
            case 'genuine':
                return 'from-emerald-500 to-green-500';
            case 'suspicious':
                return 'from-amber-500 to-yellow-500';
            case 'likely_fake':
                return 'from-red-500 to-rose-500';
            default:
                return 'from-gray-500 to-slate-500';
        }
    };

    const getTrustIcon = (level: string) => {
        switch (level) {
            case 'genuine':
                return '✅';
            case 'suspicious':
                return '⚠️';
            case 'likely_fake':
                return '❌';
            default:
                return '❓';
        }
    };

    const getTrustLabel = (level: string) => {
        switch (level) {
            case 'genuine':
                return 'Genuine Deal';
            case 'suspicious':
                return 'Suspicious';
            case 'likely_fake':
                return 'Likely Fake';
            default:
                return 'Unknown';
        }
    };

    if (compact) {
        return (
            <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${getTrustColor(analysis.trustLevel)} text-white text-sm font-medium`}
                title={analysis.recommendation}
            >
                <span>{getTrustIcon(analysis.trustLevel)}</span>
                <span>{analysis.trustScore}</span>
            </div>
        );
    }

    return (
        <GlassCard className="p-4">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        🛡️ Deal Trust Analysis
                    </h3>
                    <p className="text-sm text-white/60">Powered by Price History AI</p>
                </div>
                <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${getTrustColor(analysis.trustLevel)} text-white font-bold`}
                >
                    <span className="text-2xl">{getTrustIcon(analysis.trustLevel)}</span>
                    <div className="text-right">
                        <div className="text-2xl">{analysis.trustScore}</div>
                        <div className="text-xs opacity-80">/100</div>
                    </div>
                </div>
            </div>

            {/* Trust Level Label */}
            <div className="mb-4">
                <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${getTrustColor(analysis.trustLevel)} text-white`}
                >
                    {getTrustLabel(analysis.trustLevel)}
                </span>
            </div>

            {/* Actual vs Advertised Discount */}
            {analysis.advertisedDiscount !== 'Unknown' && (
                <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <div className="flex justify-between text-sm">
                        <span className="text-white/60">Advertised Discount:</span>
                        <span className="text-white font-medium">{analysis.advertisedDiscount}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span className="text-white/60">Actual Discount (vs 90d avg):</span>
                        <span className={`font-medium ${analysis.actualDiscount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {analysis.actualDiscount > 0 ? `${analysis.actualDiscount}% OFF` : 'No real discount'}
                        </span>
                    </div>
                </div>
            )}

            {/* Insights */}
            <div className="space-y-2 mb-4">
                {analysis.insights.map((insight, i) => (
                    <div key={i} className="text-sm text-white/80">
                        {insight}
                    </div>
                ))}
            </div>

            {/* Recommendation */}
            <div className="p-3 bg-white/5 rounded-lg border-l-4 border-l-current">
                <p className="text-sm font-medium text-white">{analysis.recommendation}</p>
            </div>

            {/* Evidence Summary */}
            <details className="mt-4">
                <summary className="text-sm text-white/60 cursor-pointer hover:text-white/80">
                    View Price Evidence
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/60">
                    <div>Current: €{analysis.evidence.currentPrice.toFixed(2)}</div>
                    <div>All-time low: €{analysis.evidence.lowestRecorded.toFixed(2)}</div>
                    <div>30d ago: €{analysis.evidence.price30DaysAgo.toFixed(2)}</div>
                    <div>90d average: €{analysis.evidence.averagePrice.toFixed(2)}</div>
                    <div>Price records: {analysis.evidence.totalPriceRecords}</div>
                    <div>At current price: {analysis.evidence.timesAtCurrentPrice}x</div>
                </div>
            </details>
        </GlassCard>
    );
}

export default TrustScoreBadge;
