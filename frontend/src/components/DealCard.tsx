import Link from 'next/link';
import { TrendingDown, TrendingUp, AlertCircle, ArrowRight, Sparkles, ImageOff } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';

interface DealCardProps {
    deal: {
        id: string;
        title: string;
        image_url: string;
        marketplace: string;
        current_price: number;
        currency: string;
        score: number;
        original_price?: number;
        discount_percentage?: number;
        recommendation?: string;
        reason?: string;
    };
}

export function DealCard({ deal }: DealCardProps) {
    // Determine score color/variant
    const isPro = deal.score >= 80;

    const getScoreStyles = (score: number) => {
        if (score >= 80) return 'text-success border-success/30 bg-success/10 shadow-[0_0_15px_-5px_var(--cl-success)]';
        if (score >= 60) return 'text-warning border-warning/30 bg-warning/10';
        return 'text-text-tertiary border-border bg-surface';
    };

    const scoreStyles = getScoreStyles(deal.score);

    return (
        <GlassCard
            variant={isPro ? 'pro' : 'interactive'}
            padding="none"
            className="group flex flex-col h-full overflow-hidden"
        >
            {/* Image Section */}
            <div className="relative aspect-[4/3] bg-surface-elevated overflow-hidden border-b border-border/10">
                {/* Studio Lighting Effect */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--bg-surface-hover)_0%,transparent_70%)] opacity-50" />

                {deal.image_url ? (
                    <div className="relative w-full h-full p-8 flex items-center justify-center">
                        <img
                            src={deal.image_url}
                            alt={deal.title}
                            className="max-w-full max-h-full object-contain transition-all duration-700 ease-out drop-shadow-2xl group-hover:scale-110"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-surface/30">
                        <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center border border-border/50">
                            <ImageOff className="w-6 h-6 text-text-tertiary/30" />
                        </div>
                        <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Void Protocol</span>
                    </div>
                )}

                {/* Marketplace Badge */}
                <span className="absolute top-4 left-4 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border backdrop-blur-md bg-surface/80 text-text-primary border-border/50">
                    {deal.marketplace}
                </span>

                {/* Score Badge */}
                <div className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-black border backdrop-blur-md transition-all duration-300 ${scoreStyles}`}>
                    {isPro && <Sparkles className="w-3.5 h-3.5 animate-pulse" />}
                    SCORE {deal.score}
                </div>

                {/* Savings Overlay */}
                {deal.discount_percentage && (
                    <div className="absolute bottom-4 left-4">
                        <span className="px-3 py-1.5 bg-success/20 border border-success/30 text-success text-[10px] font-black rounded-lg backdrop-blur-md shadow-lg flex items-center gap-1.5 animate-pulse">
                            <TrendingDown className="w-4 h-4" />
                            -{deal.discount_percentage}% REDUCTION
                        </span>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-6 flex-1 flex flex-col">
                <Link href={`/dashboard/products/${deal.id}`} className="block mb-4">
                    <h3 className="font-bold text-text-primary text-sm leading-tight h-10 line-clamp-2 transition-colors group-hover:text-primary" title={deal.title}>
                        {deal.title}
                    </h3>
                </Link>

                {/* Price Section */}
                <div className="mt-auto">
                    <div className="flex items-end justify-between border-t border-border/10 pt-5">
                        <div>
                            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-1.5">Market Value</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-gradient font-mono tracking-tight antialiased">
                                    €{deal.current_price.toFixed(2)}
                                </span>
                                {deal.original_price && deal.original_price > deal.current_price && (
                                    <span className="text-xs text-text-tertiary line-through opacity-50">
                                        €{deal.original_price.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <Link
                            href={`/dashboard/products/${deal.id}`}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-hover border border-border text-primary hover:bg-primary hover:text-white transition-all duration-300 shadow-sm"
                            aria-label="Analyze Deal"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>

                    {/* AI Insight */}
                    {deal.recommendation && (
                        <div className="mt-5 p-3.5 bg-primary/5 rounded-2xl border border-primary/10">
                            <div className="flex items-start gap-3 text-[11px] leading-relaxed text-text-secondary font-medium italic">
                                <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <span className="line-clamp-2">" {deal.recommendation} "</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </GlassCard>
    );
}
