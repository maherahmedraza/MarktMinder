'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import api, { Product, Pagination } from '@/lib/api';
import {
    Search,
    Filter,
    TrendingDown,
    TrendingUp,
    Package,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Download,
    Trash2,
    CheckSquare,
    Square,
    ArrowUpDown,
    Calendar,
    Plus,
    Sparkles
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { ProductCard } from '@/components/ui/ProductCard';

type SortOption = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc' | 'drop-desc';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);

    // Filters & Sort
    const [marketplace, setMarketplace] = useState<string>('');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('date-desc');
    const [showOnlyDrops, setShowOnlyDrops] = useState(false);

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    useEffect(() => {
        loadProducts();
    }, [page, marketplace]); // Note: We filter locally for now, but marketplace triggers re-fetch

    async function loadProducts() {
        try {
            setIsLoading(true);
            const data = await api.getProducts({
                page,
                limit: 50, // Increased limit for client-side sorting
                marketplace: marketplace || undefined,
            });
            setProducts(data.products);
            setPagination(data.pagination);
            // Clear selection on page change/reload
            setSelectedIds(new Set());
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    // --- Computed Data ---
    const processedProducts = useMemo(() => {
        let result = [...products];

        // 1. Search (Client-side refinement if needed)
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(p =>
                p.title.toLowerCase().includes(q) ||
                p.brand?.toLowerCase().includes(q)
            );
        }

        // 2. Filter: Price Drops
        if (showOnlyDrops) {
            result = result.filter(p => {
                const current = Number(p.currentPrice || 0);
                const highest = Number(p.highestPrice || 0);
                // Avoid division by zero
                if (highest === 0) return false;

                const priceChange = ((current - highest) / highest) * 100;
                return priceChange < 0;
            });
        }

        // 3. Sort
        result.sort((a, b) => {
            const priceA = Number(a.currentPrice || 0);
            const priceB = Number(b.currentPrice || 0);
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();

            switch (sortBy) {
                case 'date-desc':
                    return dateB - dateA;
                case 'date-asc':
                    return dateA - dateB;
                case 'price-desc':
                    return priceB - priceA;
                case 'price-asc':
                    return priceA - priceB;
                case 'drop-desc':
                    const highA = Number(a.highestPrice || 0);
                    const highB = Number(b.highestPrice || 0);

                    const dropA = highA ? (priceA - highA) / highA : 0;
                    const dropB = highB ? (priceB - highB) / highB : 0;

                    return dropA - dropB; // Most negative (biggest drop) first
                default:
                    return 0;
            }
        });

        return result;
    }, [products, search, sortBy, showOnlyDrops]);


    // --- Actions ---
    function toggleSelection(id: string) {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    }

    function toggleSelectAll() {
        if (selectedIds.size === processedProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(processedProducts.map(p => p.id)));
        }
    }

    async function handleBulkDelete() {
        if (!confirm(`Are you sure you want to stop tracking ${selectedIds.size} products?`)) return;

        setIsBulkDeleting(true);
        try {
            // Execute in parallel
            await Promise.all(Array.from(selectedIds).map(id => api.removeProduct(id)));

            // Reload
            setSelectedIds(new Set());
            await loadProducts();
        } catch (err: any) {
            setError('Failed to delete some products: ' + err.message);
        } finally {
            setIsBulkDeleting(false);
        }
    }

    function handleExportCSV() {
        // Headers
        const headers = ['ID', 'Title', 'Marketplace', 'Current Price', 'Highest Price', 'Lowest Price', 'Created At', 'URL'];

        // Rows
        const rows = processedProducts.map(p => [
            p.id,
            `"${p.title.replace(/"/g, '""')}"`, // Escape quotes
            p.marketplace,
            p.currentPrice,
            p.highestPrice || '',
            p.lowestPrice || '',
            p.createdAt,
            p.url
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `marktminder_products_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
                <button onClick={() => setError('')} className="ml-auto text-sm underline">Dismiss</button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm">
                            <Package className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">
                            Asset <span className="text-gradient">Ledger</span>
                        </h1>
                    </div>
                    <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                        {pagination?.total || 0} relative assets currently synchronized across multiple marketplace clusters.
                    </p>
                </div>

                <div className="flex gap-3">
                    {selectedIds.size > 0 ? (
                        <GlowButton
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            variant="danger"
                            className="w-full sm:w-auto animate-in fade-in zoom-in duration-200"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete ({selectedIds.size})
                        </GlowButton>
                    ) : (
                        <Link href="/dashboard/products/add" className="w-full sm:w-auto">
                            <GlowButton className="w-full">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Product
                            </GlowButton>
                        </Link>
                    )}

                    <GlowButton
                        onClick={handleExportCSV}
                        variant="outline"
                        className="w-full sm:w-auto"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </GlowButton>
                </div>
            </div>

            {/* Toolbar / Filters */}
            <GlassCard padding="default" className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Search */}
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search title, brand..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background/50 border border-border/50 rounded-xl text-sm text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-text-tertiary" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="pl-2 pr-8 py-2 bg-background/50 border border-border/50 rounded-xl text-sm text-text-primary focus:border-primary outline-none transition-all cursor-pointer"
                        >
                            <option value="date-desc">Newest First</option>
                            <option value="date-asc">Oldest First</option>
                            <option value="price-desc">Highest Price</option>
                            <option value="price-asc">Lowest Price</option>
                            <option value="drop-desc">Biggest Drop %</option>
                        </select>
                    </div>

                    {/* Marketplace */}
                    <select
                        value={marketplace}
                        onChange={(e) => {
                            setMarketplace(e.target.value);
                            setPage(1);
                        }}
                        className="px-3 py-2 bg-background/50 border border-border/50 rounded-xl text-sm text-text-primary focus:border-primary outline-none transition-all cursor-pointer"
                    >
                        <option value="">All Markets</option>
                        <option value="amazon">Amazon</option>
                        <option value="etsy">Etsy</option>
                        <option value="otto">Otto</option>
                    </select>

                    <div className="h-6 w-px bg-border/20 hidden sm:block"></div>

                    {/* Price Drops Toggle */}
                    <label className="flex items-center gap-3 text-sm text-text-secondary cursor-pointer select-none group">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={showOnlyDrops}
                                onChange={(e) => setShowOnlyDrops(e.target.checked)}
                                className="peer sr-only"
                            />
                            <div className="w-10 h-5 bg-border/20 rounded-full peer peer-checked:bg-primary/20 transition-colors"></div>
                            <div className="absolute left-0.5 w-4 h-4 bg-text-tertiary rounded-full shadow-sm transition-all peer-checked:left-5 peer-checked:bg-primary"></div>
                        </div>
                        <span className="group-hover:text-text-primary transition-colors">Drops Only</span>
                    </label>

                    {/* Select All */}
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors ml-2"
                    >
                        {selectedIds.size === processedProducts.length && processedProducts.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                            <Square className="w-4 h-4" />
                        )}
                        <span>{selectedIds.size === processedProducts.length ? 'Deselect All' : 'Select All'}</span>
                    </button>
                </div>
            </GlassCard>

            {/* Products Grid */}
            {isLoading ? (
                <ProductsGridSkeleton />
            ) : processedProducts.length === 0 ? (
                <GlassCard className="text-center py-20 border-dashed">
                    <Package className="w-20 h-20 text-text-tertiary/20 mx-auto mb-6" />
                    <h3 className="heading-3 text-text-primary mb-2">No products found</h3>
                    <p className="text-text-secondary mb-8 max-w-sm mx-auto">
                        {search || marketplace || showOnlyDrops
                            ? 'We couldn\'t find anything matching your filters. Try something else?'
                            : 'Your watchlist is empty. Start tracking products to see them here!'
                        }
                    </p>
                    <Link href="/dashboard/products/add">
                        <GlowButton>Add your first product</GlowButton>
                    </Link>
                </GlassCard>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {processedProducts.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            selected={selectedIds.has(product.id)}
                            onToggle={() => toggleSelection(product.id)}
                        />
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-6 pt-12">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-3 rounded-xl border border-border/50 text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-hover hover:text-primary transition-all"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="font-mono text-sm font-bold text-text-secondary tracking-widest bg-surface px-6 py-2 rounded-xl border border-border/50">
                        PAGE {String(page).padStart(2, '0')} / {String(pagination.totalPages).padStart(2, '0')}
                    </div>

                    <button
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={page === pagination.totalPages}
                        className="p-3 rounded-xl border border-border/50 text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-hover hover:text-primary transition-all"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
}

function ProductsGridSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-surface rounded-2xl border border-border/50 h-[400px] animate-pulse"></div>
            ))}
        </div>
    );
}
