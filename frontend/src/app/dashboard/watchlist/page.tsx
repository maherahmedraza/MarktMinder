'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, Package, Loader2, Heart, Search, Sparkles } from 'lucide-react';
import api, { Product } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProductCard } from '@/components/ui/ProductCard';
import { GlowButton } from '@/components/ui/GlowButton';

export default function WatchlistPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadFavorites();
    }, []);

    async function loadFavorites() {
        try {
            setIsLoading(true);
            const { products: allProducts } = await api.getProducts({ limit: 100 });
            const favorites = allProducts.filter((p: any) => p.isFavorite);
            setProducts(favorites);
        } catch (err) {
            console.error('Failed to load favorites', err);
        } finally {
            setIsLoading(false);
        }
    }

    async function toggleFavorite(productId: string) {
        try {
            await api.request(`/products/${productId}`, {
                method: 'PATCH',
                body: { isFavorite: false }
            });
            setProducts(products.filter(p => p.id !== productId));
        } catch (err) {
            console.error('Failed to remove from favorites', err);
        }
    }

    const filteredProducts = products.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Star className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="mt-8 text-xs font-black text-text-tertiary uppercase tracking-[0.4em] animate-pulse">Accessing Vault...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-warning/10 rounded-2xl flex items-center justify-center border border-warning/20 shadow-[0_0_20px_-5px_var(--cl-warning)]">
                            <Star className="w-6 h-6 text-warning fill-warning" />
                        </div>
                        <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">
                            Your <span className="text-gradient-gold">Watchlist</span>
                        </h1>
                    </div>
                    <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                        High-priority assets under continuous surveillance. Total items: <span className="text-text-primary font-bold">{products.length}</span>
                    </p>
                </div>
            </div>

            {/* Search & Actions */}
            {products.length > 0 && (
                <GlassCard variant="default" padding="none" className="relative overflow-hidden">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3 pointer-events-none">
                        <Search className="w-5 h-5 text-text-tertiary" />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search intercepted signals..."
                        className="w-full pl-16 pr-6 py-6 bg-transparent text-text-primary placeholder:text-text-tertiary font-medium focus:outline-none transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-surface-elevated rounded-lg border border-border text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                            {filteredProducts.length} Matches
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
                <GlassCard className="py-24 text-center border-dashed border-2 border-border/50">
                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-8 border border-border shadow-inner">
                        <Heart className="w-10 h-10 text-text-tertiary opacity-20" />
                    </div>
                    <h3 className="text-2xl font-black text-text-primary mb-4 tracking-tight uppercase">
                        {search ? 'Signal Lost' : 'Watchlist Empty'}
                    </h3>
                    <p className="text-text-secondary max-w-md mx-auto font-medium mb-10">
                        {search
                            ? `No records found matching "${search}". Refine your query.`
                            : 'No assets have been flagged for priority monitoring. Start tracking products to see them here.'
                        }
                    </p>
                    {!search && (
                        <GlowButton onClick={() => window.location.href = '/dashboard/products'}>
                            <Package className="w-5 h-5 mr-3" />
                            BROWSE ASSET LEDGER
                        </GlowButton>
                    )}
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredProducts.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            isFavorite={true}
                            onRemove={() => toggleFavorite(product.id)}
                        />
                    ))}
                </div>
            )}

            {/* Protocols / Info */}
            <GlassCard variant="pro" className="relative overflow-hidden group">
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-warning/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <h3 className="text-sm font-black text-warning mb-6 flex items-center gap-3 uppercase tracking-[0.2em]">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    Intelligence Protocol
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Priority Sync</p>
                        <p className="text-sm text-text-secondary leading-relaxed">Watchlist items are synchronized with highest frequency for sub-second price detection.</p>
                    </div>
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Alert Synthesis</p>
                        <p className="text-sm text-text-secondary leading-relaxed">Integrated alerting automatically triggers upon any deviation from established threshold.</p>
                    </div>
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Neural Link</p>
                        <p className="text-sm text-text-secondary leading-relaxed">AI analyzes price DNA of watchlist items to predict impending market fluctuations.</p>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
