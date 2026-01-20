'use client';

import { GlassCard } from '../ui/GlassCard';
import { TrendingDown, TrendingUp, ExternalLink, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';

interface CompetitorCardProps {
    competitor: {
        id: string;
        competitor_url: string;
        competitor_marketplace: string;
        my_product_title: string;
        my_product_price: number;
        my_product_currency: string;
        my_product_image: string | null;
        updated_at: string;
    };
    onRemove: (id: string) => void;
}

export function CompetitorCard({ competitor, onRemove }: CompetitorCardProps) {
    // Mock competitor data for MVP (since we store minimal data in 'competitors' table currently)
    // In a real app, we'd have the scraped competitor price.
    // Let's simulate a random price difference for demonstration if "last_price" is missing
    const myPrice = Number(competitor.my_product_price);
    const competitorPrice = myPrice * (0.8 + Math.random() * 0.4); // Random +/- 20%
    const diffPercent = ((competitorPrice - myPrice) / myPrice) * 100;
    const isCheaper = diffPercent > 0; // If competitor is more expensive, we are cheaper (Good)

    return (
        <GlassCard className="group hover:border-primary/30 transition-all duration-300">
            <div className="flex flex-col md:flex-row gap-6">
                {/* My Product */}
                <div className="flex-1 space-y-3">
                    <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Your Product</p>
                    <div className="flex items-start gap-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border/50 bg-surface-elevated">
                            {competitor.my_product_image ? (
                                <Image
                                    src={competitor.my_product_image}
                                    alt={competitor.my_product_title}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary text-xs font-bold">
                                    IMG
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-text-primary line-clamp-2 mb-1">
                                {competitor.my_product_title}
                            </h4>
                            <p className="text-lg font-black text-text-primary">
                                {formatCurrency(myPrice, competitor.my_product_currency)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* VS Badge */}
                <div className="flex items-center justify-center md:py-0 py-4">
                    <div className="w-8 h-8 rounded-full bg-surface-hover border border-border flex items-center justify-center text-[10px] font-black italic text-text-tertiary">
                        VS
                    </div>
                </div>

                {/* Competitor Product */}
                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Competitor</p>
                        <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {competitor.competitor_marketplace}
                        </span>
                    </div>

                    <div className="flex items-start gap-4">
                        {/* Placeholder Competitor Image using marketplace icon logic ideally, or generic */}
                        <div className="w-16 h-16 rounded-lg border border-border/50 bg-surface-elevated flex items-center justify-center">
                            <ExternalLink className="w-6 h-6 text-text-tertiary opacity-50" />
                        </div>

                        <div className="flex-1">
                            <a
                                href={competitor.competitor_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-text-secondary hover:text-primary truncate block max-w-[200px] mb-1"
                            >
                                {competitor.competitor_url}
                            </a>

                            <div className="flex items-end gap-3">
                                <p className="text-lg font-black text-text-primary">
                                    {formatCurrency(competitorPrice, competitor.my_product_currency)}
                                </p>

                                <div className={`flex items-center gap-1 text-xs font-bold mb-1 ${isCheaper ? 'text-success' : 'text-error'}`}>
                                    {isCheaper ? (
                                        <>
                                            <TrendingUp className="w-3 h-3" />
                                            <span>+{Math.abs(diffPercent).toFixed(1)}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <TrendingDown className="w-3 h-3" />
                                            <span>{diffPercent.toFixed(1)}%</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <p className="text-[10px] text-text-tertiary mt-1">
                                {isCheaper ? 'You are cheaper' : 'Competitor is cheaper'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/10 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onRemove(competitor.id)}
                    className="text-[10px] uppercase font-black tracking-widest text-error hover:text-error/80"
                >
                    Stop Monitoring
                </button>
            </div>
        </GlassCard>
    );
}
