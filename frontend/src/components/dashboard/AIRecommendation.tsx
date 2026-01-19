'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronUp, Calendar, Shield, Zap } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

interface BuyWaitRecommendation {
    productId: string;
    productName: string;
    currentPrice: number;
    marketplace: string;
    recommendation: 'BUY_NOW' | 'WAIT' | 'CONSIDER_WAITING' | 'STRONG_BUY';
    confidenceScore: number;
    primaryReason: string;
    factors: {
        type: string;
        signal: 'buy' | 'wait' | 'neutral';
        weight: number;
        description: string;
    }[];
    optimalBuyWindow: {
        startDate: string;
        endDate: string;
        eventName?: string;
        expectedDiscount: number;
    } | null;
    priceContext: {
        isAtHistoricalLow: boolean;
        percentFromLow: number;
        percentFromHigh: number;
        trend: 'rising' | 'falling' | 'stable';
        volatility: 'low' | 'medium' | 'high';
    };
    discountTrust: {
        trustLevel: 'genuine' | 'suspicious' | 'likely_fake';
        trustScore: number;
        warnings: string[];
    };
    upcomingEvents: {
        name: string;
        daysUntil: number;
        expectedDiscount: number;
    }[];
    analyzedAt: string;
}

interface AIRecommendationProps {
    productId: string;
    className?: string;
}

export function AIRecommendation({ productId, className = '' }: AIRecommendationProps) {
    const [recommendation, setRecommendation] = useState<BuyWaitRecommendation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        async function fetchRecommendation() {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/products/${productId}/recommendation`, {
                    credentials: 'include',
                });

                if (!response.ok) {
                    const data = await response.json();
                    if (data.upgradeRequired) {
                        setError('Upgrade to Pro to access AI Shopping Assistant');
                    } else {
                        throw new Error(data.error || 'Failed to fetch recommendation');
                    }
                    return;
                }

                const data = await response.json();
                setRecommendation(data.recommendation);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong');
            } finally {
                setLoading(false);
            }
        }

        fetchRecommendation();
    }, [productId]);

    if (loading) {
        return (
            <GlassCard className={`p-6 ${className}`}>
                <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-text-secondary text-sm uppercase tracking-wider">Analyzing market signals...</span>
                </div>
            </GlassCard>
        );
    }

    if (error) {
        return (
            <GlassCard className={`p-6 ${className}`}>
                <div className="flex items-center gap-3 text-text-tertiary">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm">{error}</span>
                </div>
            </GlassCard>
        );
    }

    if (!recommendation) return null;

    const { recommendation: signal, confidenceScore, primaryReason, factors, optimalBuyWindow, priceContext, discountTrust, upcomingEvents } = recommendation;

    // Determine visual styling based on recommendation
    const getRecommendationStyle = () => {
        switch (signal) {
            case 'STRONG_BUY':
                return {
                    bg: 'bg-green-500/10',
                    border: 'border-green-500/30',
                    text: 'text-green-400',
                    icon: <Zap className="w-6 h-6" />,
                    label: 'STRONG BUY',
                };
            case 'BUY_NOW':
                return {
                    bg: 'bg-emerald-500/10',
                    border: 'border-emerald-500/30',
                    text: 'text-emerald-400',
                    icon: <CheckCircle className="w-6 h-6" />,
                    label: 'BUY NOW',
                };
            case 'WAIT':
                return {
                    bg: 'bg-amber-500/10',
                    border: 'border-amber-500/30',
                    text: 'text-amber-400',
                    icon: <Clock className="w-6 h-6" />,
                    label: 'WAIT',
                };
            case 'CONSIDER_WAITING':
                return {
                    bg: 'bg-yellow-500/10',
                    border: 'border-yellow-500/30',
                    text: 'text-yellow-400',
                    icon: <Clock className="w-6 h-6" />,
                    label: 'CONSIDER WAITING',
                };
            default:
                return {
                    bg: 'bg-gray-500/10',
                    border: 'border-gray-500/30',
                    text: 'text-gray-400',
                    icon: <AlertTriangle className="w-6 h-6" />,
                    label: 'UNKNOWN',
                };
        }
    };

    const style = getRecommendationStyle();

    const getTrustBadge = () => {
        switch (discountTrust.trustLevel) {
            case 'genuine':
                return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded uppercase">Verified</span>;
            case 'suspicious':
                return <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded uppercase">Suspicious</span>;
            case 'likely_fake':
                return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded uppercase">Fake Discount</span>;
        }
    };

    return (
        <GlassCard className={`overflow-hidden ${className}`}>
            {/* Header */}
            <div className={`p-6 ${style.bg} border-b ${style.border}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${style.bg} ${style.text}`}>
                            {style.icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-black uppercase tracking-tight ${style.text}`}>
                                    {style.label}
                                </span>
                                <span className="text-text-tertiary text-xs uppercase tracking-wider">
                                    ({confidenceScore}% confidence)
                                </span>
                            </div>
                            <p className="text-text-secondary text-sm mt-1">{primaryReason}</p>
                        </div>
                    </div>

                    {/* Trust Badge */}
                    <div className="flex flex-col items-end gap-2">
                        {getTrustBadge()}
                        <div className="text-[10px] text-text-tertiary uppercase tracking-wider">
                            Trust Score: {discountTrust.trustScore}/100
                        </div>
                    </div>
                </div>
            </div>

            {/* Price Context Bar */}
            <div className="px-6 py-4 bg-surface/50 border-b border-white/[0.03] grid grid-cols-3 gap-4">
                <div className="text-center">
                    <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">From Low</div>
                    <div className={`text-lg font-bold ${priceContext.isAtHistoricalLow ? 'text-green-400' : 'text-text-primary'}`}>
                        {priceContext.isAtHistoricalLow ? '🎯 AT LOW' : `+${priceContext.percentFromLow}%`}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Trend</div>
                    <div className={`text-lg font-bold flex items-center justify-center gap-1 ${priceContext.trend === 'falling' ? 'text-green-400' :
                            priceContext.trend === 'rising' ? 'text-red-400' : 'text-text-secondary'
                        }`}>
                        {priceContext.trend === 'falling' && <TrendingDown className="w-4 h-4" />}
                        {priceContext.trend === 'rising' && <TrendingUp className="w-4 h-4" />}
                        {priceContext.trend.toUpperCase()}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Volatility</div>
                    <div className={`text-lg font-bold ${priceContext.volatility === 'high' ? 'text-amber-400' :
                            priceContext.volatility === 'low' ? 'text-green-400' : 'text-text-secondary'
                        }`}>
                        {priceContext.volatility.toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Optimal Buy Window */}
            {optimalBuyWindow && (
                <div className="px-6 py-4 bg-primary/5 border-b border-primary/10">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <div>
                            <div className="text-sm font-semibold text-text-primary">
                                {optimalBuyWindow.eventName || 'Best Buy Window'}
                            </div>
                            <div className="text-xs text-text-tertiary">
                                Expected ~{optimalBuyWindow.expectedDiscount}% off • {new Date(optimalBuyWindow.startDate).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Expand/Collapse Button */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-6 py-3 flex items-center justify-between text-text-tertiary hover:text-text-secondary transition-colors bg-surface-hover/30"
            >
                <span className="text-xs uppercase tracking-wider font-bold">Analysis Details</span>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Expanded Details */}
            {expanded && (
                <div className="p-6 space-y-6">
                    {/* Factors */}
                    <div>
                        <h4 className="text-xs uppercase tracking-widest text-text-tertiary mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Decision Factors
                        </h4>
                        <div className="space-y-2">
                            {factors.map((factor, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-surface-hover/30 rounded-lg">
                                    <div className={`w-2 h-2 rounded-full ${factor.signal === 'buy' ? 'bg-green-400' :
                                            factor.signal === 'wait' ? 'bg-amber-400' : 'bg-gray-400'
                                        }`} />
                                    <span className="text-sm text-text-secondary flex-1">{factor.description}</span>
                                    <span className="text-xs text-text-tertiary">{(factor.weight * 100).toFixed(0)}% weight</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upcoming Events */}
                    {upcomingEvents.length > 0 && (
                        <div>
                            <h4 className="text-xs uppercase tracking-widest text-text-tertiary mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Upcoming Sales Events
                            </h4>
                            <div className="grid gap-2">
                                {upcomingEvents.map((event, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-surface-hover/30 rounded-lg">
                                        <span className="text-sm text-text-primary font-medium">{event.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-text-tertiary">{event.daysUntil} days</span>
                                            <span className="text-xs text-primary font-bold">~{event.expectedDiscount}% off</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Warnings */}
                    {discountTrust.warnings.length > 0 && (
                        <div>
                            <h4 className="text-xs uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Warnings
                            </h4>
                            <ul className="space-y-1">
                                {discountTrust.warnings.map((warning, idx) => (
                                    <li key={idx} className="text-sm text-amber-400/80 flex items-start gap-2">
                                        <span>•</span>
                                        <span>{warning}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="px-6 py-3 bg-surface/30 border-t border-white/[0.03]">
                <div className="text-[10px] text-text-tertiary uppercase tracking-wider text-center">
                    AI Analysis • Updated {new Date(recommendation.analyzedAt).toLocaleString()}
                </div>
            </div>
        </GlassCard>
    );
}

export default AIRecommendation;
