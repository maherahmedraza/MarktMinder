import React from 'react';
import Link from 'next/link';
import { Package, Star, TrendingDown, TrendingUp, X, ImageOff } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Product } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface ProductCardProps {
    product: Product;
    isFavorite?: boolean;
    compact?: boolean;
    selected?: boolean;
    onToggle?: () => void;
    onRemove?: () => void;
}

export function ProductCard({
    product,
    isFavorite,
    compact = false,
    selected,
    onToggle,
    onRemove
}: ProductCardProps) {
    const t = useTranslations('common.productCard');
    const priceChange = product.highestPrice && product.currentPrice
        ? ((Number(product.currentPrice) - Number(product.highestPrice)) / Number(product.highestPrice) * 100)
        : 0;

    const marketplaceColors: Record<string, string> = {
        amazon: 'bg-[#FF9900]/10 text-[#FF9900] dark:text-[#FF9900]/80 border-[#FF9900]/20',
        etsy: 'bg-[#F56400]/10 text-[#F56400] dark:text-[#F56400]/80 border-[#F56400]/20',
        otto: 'bg-[#E30613]/10 text-[#E30613] dark:text-[#E30613]/80 border-[#E30613]/20',
    };

    const isAtLowest = product.lowestPrice && product.currentPrice === product.lowestPrice;

    // Check stock status
    const isOutOfStock = product.availability?.toLowerCase().includes('out of stock')
        || product.availability?.toLowerCase().includes('currently unavailable')
        || product.availability?.toLowerCase().includes('nicht verfügbar');

    return (
        <div className="relative h-full group">
            {/* Selection Checkbox (Visible on hover or selected) */}
            {onToggle && (
                <div className="absolute top-3 left-3 z-20" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={onToggle}
                        aria-label={t('select')}
                        className={`w-5 h-5 rounded-lg border-border text-primary focus:ring-primary/20 bg-surface cursor-pointer shadow-sm transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    />
                </div>
            )}

            {/* Remove Button (for Watchlist) */}
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="absolute top-3 left-3 z-30 p-1.5 rounded-lg bg-surface/80 backdrop-blur-md border border-border text-text-tertiary hover:text-error hover:border-error/30 transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                    aria-label={t('remove')}
                >
                    <X className="w-4 h-4" />
                </button>
            )}

            <Link href={`/dashboard/products/${product.id}`} className="block h-full">
                <GlassCard
                    variant={selected ? 'pro' : 'interactive'}
                    padding="none"
                    className={selected ? 'ring-2 ring-primary border-primary' : ''}
                >
                    {/* Image Header */}
                    <div className="relative aspect-square bg-surface-elevated overflow-hidden rounded-t-2xl border-b border-border/50 group/img">
                        {/* Studio Lighting Effect */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--bg-surface-hover)_0%,transparent_70%)] opacity-50" />

                        {product.imageUrl ? (
                            <div className="relative w-full h-full p-6 flex items-center justify-center">
                                <img
                                    src={product.imageUrl}
                                    alt={product.title}
                                    className={`max-w-full max-h-full object-contain transition-all duration-700 ease-out drop-shadow-xl ${isOutOfStock ? 'opacity-40 grayscale' : 'group-hover:scale-110'}`}
                                />
                                {/* Inner Vignette */}
                                <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.05)] pointer-events-none" />
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-surface/30">
                                <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center border border-border/50 shadow-inner">
                                    <ImageOff className="w-8 h-8 text-text-tertiary/30" />
                                </div>
                                <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{t('void')}</span>
                            </div>
                        )}

                        {/* Badges Overlay */}
                        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border backdrop-blur-md shadow-lg animate-pulse-slow ${marketplaceColors[product.marketplace] || 'bg-surface/80 text-text-primary'}`}>
                                {product.marketplace}
                            </span>
                            {isFavorite && (
                                <div className="bg-warning/20 border border-warning/30 p-1.5 rounded-lg backdrop-blur-md shadow-lg">
                                    <Star className="w-4 h-4 text-warning fill-warning" />
                                </div>
                            )}
                        </div>

                        {/* Bottom Badges */}
                        <div className="absolute bottom-3 left-3 flex gap-2">
                            {isAtLowest && !isOutOfStock && (
                                <span className="px-2.5 py-1 bg-success/20 border border-success/30 text-success text-[10px] font-black rounded-lg backdrop-blur-md shadow-lg flex items-center gap-1.5 animate-pulse">
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    {t('lowest')}
                                </span>
                            )}
                            {isOutOfStock && (
                                <span className="px-2.5 py-1 bg-error/20 border border-error/30 text-error text-[10px] font-black rounded-lg backdrop-blur-md shadow-lg flex items-center gap-1.5">
                                    <X className="w-3.5 h-3.5" />
                                    {t('depleted')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-5">
                        <h3 className="font-bold text-text-primary text-sm leading-tight h-10 line-clamp-2 transition-colors group-hover:text-primary" title={product.title}>
                            {product.title}
                        </h3>

                        <div className="mt-5 flex items-end justify-between border-t border-border/10 pt-4">
                            <div>
                                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-1">{t('currentValue')}</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-gradient font-mono antialiased">
                                        €{Number(product.currentPrice || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {priceChange !== 0 && (
                                <div className={`flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl border transition-all duration-300 ${priceChange < 0
                                    ? 'bg-success/5 text-success border-success/20 shadow-[0_0_15px_-5px_var(--cl-success)]'
                                    : 'bg-error/5 text-error border-error/20 shadow-[0_0_15px_-5px_var(--cl-error)]'
                                    }`}>
                                    {priceChange < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                                    <span>{Math.abs(priceChange).toFixed(0)}%</span>
                                </div>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </Link>
        </div>
    );
}
