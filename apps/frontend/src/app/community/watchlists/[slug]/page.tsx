'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Folder, Users, Eye, Package, Calendar, ArrowLeft,
    Share2, Copy, Heart, ExternalLink, Loader2, AlertCircle
} from 'lucide-react';
import { ProductCard } from '@/components/ui/ProductCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { toast } from 'sonner';

interface WatchlistDetail {
    id: string;
    slug: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    user_id: string;
    user_name: string;
    view_count: number;
    created_at: string;
}

export default function WatchlistDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<{ watchlist: WatchlistDetail & { owner_name: string }; products: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const slug = params.slug as string;

    useEffect(() => {
        if (slug) {
            fetchWatchlist();
        }
    }, [slug]);

    async function fetchWatchlist() {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/community/watchlists/${slug}`, {
                credentials: 'include',
            });
            if (!response.ok) {
                if (response.status === 404) throw new Error('Watchlist not found or is private');
                throw new Error('Failed to fetch watchlist');
            }
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    }

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-text-secondary font-bold font-heading">Loading shared collection...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-error" />
                    </div>
                    <h1 className="text-2xl font-black text-text-primary mb-2">Watchlist Unavailable</h1>
                    <p className="text-text-secondary mb-8">{error || 'This watchlist does not exist or has been made private.'}</p>
                    <GlowButton onClick={() => router.push('/community/watchlists')}>
                        Back to Discovery
                    </GlowButton>
                </div>
            </div>
        );
    }

    const { watchlist, products } = data;
    const formattedDate = new Date(watchlist.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header / Breadcrumbs */}
            <div className="bg-surface-elevated/30 border-b border-border/20 py-4">
                <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
                    <button
                        onClick={() => router.push('/community/watchlists')}
                        className="flex items-center gap-2 text-sm font-bold text-text-tertiary hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Community Discovery
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleShare}
                            className="p-2 hover:bg-surface-hover rounded-xl text-text-secondary transition-colors"
                            title="Share Link"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Watchlist Hero */}
            <div className="max-w-7xl mx-auto px-4 pt-12">
                <div className="flex flex-col lg:flex-row gap-12 items-start">
                    {/* Folder Info Card */}
                    <GlassCard className="lg:w-96 w-full shrink-0">
                        <div
                            className="w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl mb-6"
                            style={{ backgroundColor: `${watchlist.color}20`, color: watchlist.color }}
                        >
                            <Folder className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black text-text-primary mb-3 tracking-tight">
                            {watchlist.name}
                        </h1>
                        <p className="text-text-secondary text-sm leading-relaxed mb-6">
                            {watchlist.description || 'This collection contains price trackers for various items. Follow to stay updated on price changes.'}
                        </p>

                        <div className="space-y-4 pt-6 border-t border-border/10">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-text-tertiary font-bold uppercase tracking-widest">Creator</span>
                                <span className="text-text-primary font-bold">{watchlist.owner_name}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-text-tertiary font-bold uppercase tracking-widest">Total Items</span>
                                <span className="text-primary-light font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                                    {products.length} Products
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-text-tertiary font-bold uppercase tracking-widest">Global Views</span>
                                <span className="text-text-secondary flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {watchlist.view_count}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-text-tertiary font-bold uppercase tracking-widest">Shared On</span>
                                <span className="text-text-secondary">{formattedDate}</span>
                            </div>
                        </div>

                        <div className="mt-8 space-y-3">
                            <GlowButton className="w-full h-12">
                                <Heart className="w-4 h-4 mr-2" />
                                Follow Watchlist
                            </GlowButton>
                            <GlowButton variant="secondary" className="w-full h-12">
                                <Copy className="w-4 h-4 mr-2" />
                                Import to My Dashboard
                            </GlowButton>
                        </div>
                    </GlassCard>

                    {/* Product Grid */}
                    <div className="flex-1 w-full">
                        <div className="mb-8 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-text-primary flex items-center gap-3">
                                <Package className="w-5 h-5 text-primary" />
                                Tracked Products
                            </h2>
                            <div className="text-sm text-text-tertiary">
                                Showing {products.length} results
                            </div>
                        </div>

                        {products.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {products.map((p) => (
                                    <div key={p.id} className="relative">
                                        {/* Since these are public, we treat them as read-only but link to their private dashboard if logged in? */}
                                        {/* For now, we just show the card */}
                                        <ProductCard
                                            product={{
                                                id: p.id,
                                                title: p.title,
                                                imageUrl: p.image_url,
                                                currentPrice: Number(p.current_price),
                                                currency: p.currency,
                                                marketplace: p.marketplace,
                                                highestPrice: Number(p.highest_price || 0),
                                                lowestPrice: Number(p.lowest_price || 0),
                                                availability: p.availability,
                                                url: p.url,
                                                marketplaceId: p.marketplace_id,
                                                createdAt: new Date().toISOString()
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-surface-elevated/10 border border-dashed border-border/30 rounded-3xl">
                                <Package className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-20" />
                                <p className="text-text-secondary font-medium">This collection is currently empty.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
