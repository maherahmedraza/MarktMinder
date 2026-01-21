'use client';

import React from 'react';
import Link from 'next/link';
import { Folder, Users, Eye, Package, Calendar, ArrowRight } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { useTranslations } from 'next-intl';

export interface Watchlist {
    id: string;
    slug: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    user_name: string;
    product_count: number;
    view_count: number;
    created_at: string;
}

interface WatchlistCardProps {
    watchlist: Watchlist;
    className?: string;
}

export function WatchlistCard({ watchlist, className = '' }: WatchlistCardProps) {
    const t = useTranslations('community.watchlists.card');
    const formattedDate = new Date(watchlist.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <GlassCard className={`group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${className}`}>
            <div className="flex flex-col h-full">
                {/* Header with Icon and Color */}
                <div className="flex items-start justify-between mb-4">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6"
                        style={{ backgroundColor: `${watchlist.color}20`, color: watchlist.color }}
                    >
                        <Folder className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-tertiary">
                        <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {watchlist.view_count}
                        </div>
                        <div className="flex items-center gap-1 text-primary-light font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                            <Package className="w-3 h-3" />
                            {t('items', { count: watchlist.product_count })}
                        </div>
                    </div>
                </div>

                {/* Title and Description */}
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1 mb-1">
                        {watchlist.name}
                    </h3>
                    <p className="text-sm text-text-secondary line-clamp-2 mb-4 min-h-[40px]">
                        {watchlist.description || t('noDescription')}
                    </p>
                </div>

                {/* Metadata Footer */}
                <div className="pt-4 border-t border-border/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface-hover flex items-center justify-center text-[10px] font-bold text-primary">
                            {watchlist.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-text-secondary">{watchlist.user_name}</span>
                            <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {formattedDate}
                            </span>
                        </div>
                    </div>

                    <Link
                        href={`/community/watchlists/${watchlist.slug}`}
                        className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all group-hover:translate-x-1"
                    >
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </GlassCard>
    );
}

export default WatchlistCard;
