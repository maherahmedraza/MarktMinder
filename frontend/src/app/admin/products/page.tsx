'use client';

import { useState, useEffect } from 'react';
import { Package, Search, ExternalLink, Loader2, Database, Shield, Zap, Filter, ArrowUpRight } from 'lucide-react';
import api from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';

interface AdminProduct {
    id: string;
    title: string;
    image_url: string;
    marketplace: string;
    current_price: number;
    currency: string;
    url: string;
    tracker_count: number;
    history_count: number;
    created_at: string;
    last_scraped_at: string;
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [marketplace, setMarketplace] = useState('');

    useEffect(() => {
        loadProducts();
    }, [page, marketplace]);

    async function loadProducts() {
        try {
            setIsLoading(true);
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('limit', '20');
            if (marketplace) params.set('marketplace', marketplace);
            if (search) params.set('search', search);

            const data = await api.request<{
                products: AdminProduct[];
                pagination: { page: number; totalPages: number; total: number };
            }>(`/admin/products?${params.toString()}`);

            setProducts(data.products);
            setTotalPages(data.pagination.totalPages);
        } catch (err) {
            console.error('Failed to load products', err);
        } finally {
            setIsLoading(false);
        }
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        setPage(1);
        loadProducts();
    }

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm">
                            <Package className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">
                            Asset <span className="text-gradient">Control</span>
                        </h1>
                    </div>
                    <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                        Full spectrum asset monitoring. Directly interface with marketplace metadata and tracker synchronization.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-6">
                <GlassCard variant="default" padding="none" className="flex-1 relative overflow-hidden group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-primary transition-colors">
                        <Search className="w-5 h-5 text-text-tertiary" />
                    </div>
                    <form onSubmit={handleSearch}>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search asset identifiers..."
                            className="w-full pl-12 pr-6 py-4 bg-transparent text-text-primary placeholder:text-text-tertiary font-medium focus:outline-none transition-all"
                        />
                    </form>
                </GlassCard>

                <GlassCard variant="default" padding="none" className="md:w-64 relative overflow-hidden">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Filter className="w-5 h-5 text-text-tertiary" />
                    </div>
                    <select
                        value={marketplace}
                        onChange={(e) => { setMarketplace(e.target.value); setPage(1); }}
                        className="w-full pl-12 pr-10 py-4 bg-transparent text-text-primary font-medium focus:outline-none appearance-none cursor-pointer"
                    >
                        <option value="" className="bg-surface text-text-primary">All Markets</option>
                        <option value="amazon" className="bg-surface text-text-primary">Amazon Sector</option>
                        <option value="etsy" className="bg-surface text-text-primary">Etsy Sector</option>
                        <option value="otto" className="bg-surface text-text-primary">Otto Sector</option>
                    </select>
                </GlassCard>
            </div>

            {/* Products Table */}
            <GlassCard variant="default" padding="none" className="overflow-hidden border-border/50">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
                        </div>
                        <p className="mt-8 text-[10px] font-black text-text-tertiary uppercase tracking-[0.4em] animate-pulse">Syncing Asset Ledger...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface/50 border-b border-border/50">
                                    <th className="text-left px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Asset</th>
                                    <th className="text-left px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Sector</th>
                                    <th className="text-left px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest text-right">Yield</th>
                                    <th className="text-left px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest text-center">Sentinels</th>
                                    <th className="text-left px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Log Delta</th>
                                    <th className="text-left px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Initialization</th>
                                    <th className="text-right px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Override</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {products.map((product) => (
                                    <tr key={product.id} className="hover:bg-primary/5 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-white p-1 flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors relative overflow-hidden flex-shrink-0">
                                                    {product.image_url ? (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.title}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    ) : (
                                                        <Package className="w-7 h-7 text-text-tertiary/20" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-black text-text-primary uppercase tracking-tight truncate max-w-[200px] group-hover:text-primary transition-colors">
                                                        {product.title || 'Untitled_Entry'}
                                                    </span>
                                                    <span className="text-[9px] font-mono text-text-tertiary uppercase mt-1">
                                                        ID: {product.id.split('-')[0]}...
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${product.marketplace === 'amazon' ? 'bg-amazon/10 text-amazon border-amazon/20' :
                                                product.marketplace === 'etsy' ? 'bg-etsy/10 text-etsy border-etsy/20' :
                                                    'bg-otto/10 text-otto border-otto/20'
                                                }`}>
                                                {product.marketplace}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-sm font-black font-mono text-text-primary">
                                                €{product.current_price !== undefined && product.current_price !== null
                                                    ? Number(product.current_price).toFixed(2)
                                                    : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="text-xs font-black text-text-secondary">
                                                {product.tracker_count}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-bold text-text-tertiary uppercase">
                                                {product.history_count} RECORDS
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-[11px] font-mono text-text-tertiary">
                                            {new Date(product.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <a
                                                href={product.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-[10px] font-black text-primary hover:text-primary-hover uppercase tracking-widest transition-all group/link"
                                            >
                                                Interface <ArrowUpRight className="w-4 h-4 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-8 py-6 bg-surface/30 border-t border-border/50">
                        <GlowButton
                            variant="outline"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            PREVIOUS PHASE
                        </GlowButton>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">
                                SECTOR {page} // {totalPages}
                            </span>
                        </div>
                        <GlowButton
                            variant="outline"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            NEXT PHASE
                        </GlowButton>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
