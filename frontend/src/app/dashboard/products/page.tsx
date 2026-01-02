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
    Calendar
} from 'lucide-react';

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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {pagination?.total || 0} products tracked
                    </p>
                </div>

                <div className="flex gap-2">
                    {selectedIds.size > 0 ? (
                        <button
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium animate-in fade-in zoom-in duration-200"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedIds.size})
                        </button>
                    ) : (
                        <Link
                            href="/dashboard/products/add"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                        >
                            + Add Product
                        </Link>
                    )}

                    <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Toolbar / Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search title, brand..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="pl-2 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                        <option value="">All Markets</option>
                        <option value="amazon">Amazon</option>
                        <option value="etsy">Etsy</option>
                        <option value="otto">Otto</option>
                    </select>

                    {/* Show only drops toggle */}
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showOnlyDrops}
                            onChange={(e) => setShowOnlyDrops(e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-700"
                        />
                        <span>Price Drops Only</span>
                    </label>

                    {/* Select All */}
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                        {selectedIds.size === processedProducts.length && processedProducts.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-primary-600" />
                        ) : (
                            <Square className="w-4 h-4" />
                        )}
                        Select All
                    </button>
                </div>
            </div>

            {/* Products Grid */}
            {isLoading ? (
                <ProductsGridSkeleton />
            ) : processedProducts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No products found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {search || marketplace || showOnlyDrops
                            ? 'Try adjusting your filters'
                            : 'Start tracking products to see them here'
                        }
                    </p>
                    <Link
                        href="/dashboard/products/add"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                        Add your first product
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                        Page {page} of {pagination.totalPages}
                    </span>

                    <button
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={page === pagination.totalPages}
                        className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}

function ProductCard({
    product,
    selected,
    onToggle
}: {
    product: Product;
    selected: boolean;
    onToggle: () => void;
}) {
    const priceChange = product.highestPrice && product.currentPrice
        ? ((Number(product.currentPrice) - Number(product.highestPrice)) / Number(product.highestPrice) * 100)
        : 0;

    const marketplaceColors: Record<string, string> = {
        amazon: 'badge-amazon',
        etsy: 'badge-etsy',
        otto: 'badge-otto',
    };

    const isAtLowest = product.lowestPrice && product.currentPrice === product.lowestPrice;

    // Check stock status
    const isOutOfStock = product.availability?.toLowerCase().includes('out of stock')
        || product.availability?.toLowerCase().includes('currently unavailable')
        || product.availability?.toLowerCase().includes('nicht verfügbar');


    return (
        <div className={`relative bg-white dark:bg-gray-800 rounded-xl border transition-all group ${selected ? 'border-primary-500 ring-2 ring-primary-500 shadow-lg' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500 hover:shadow-lg'}`}>

            {/* Selection Checkbox (Visible on hover or selected) */}
            <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={onToggle}
                    className={`w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 dark:bg-gray-700 cursor-pointer shadow-sm ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                />
            </div>

            <Link href={`/dashboard/products/${product.id}`} className="block">
                {/* Image */}
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-t-xl overflow-hidden">
                    {product.imageUrl ? (
                        <img
                            src={product.imageUrl}
                            alt={product.title}
                            className={`w-full h-full object-cover transition-transform ${isOutOfStock ? 'opacity-60 grayscale' : 'group-hover:scale-105'}`}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                        </div>
                    )}

                    {/* Marketplace badge */}
                    <span className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded shadow-sm ${marketplaceColors[product.marketplace] || 'bg-gray-800 text-white'}`}>
                        {product.marketplace}
                    </span>

                    {/* Status Badges */}
                    <div className="absolute bottom-3 left-3 flex gap-1">
                        {isAtLowest && !isOutOfStock && (
                            <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1">
                                <TrendingDown className="w-3 h-3" />
                                Lowest
                            </span>
                        )}
                        {isOutOfStock && (
                            <span className="px-2 py-1 bg-gray-800/80 text-white text-xs font-bold rounded shadow-sm">
                                Out of Stock
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 min-h-[2.5rem] text-sm leading-snug group-hover:text-primary-700 dark:group-hover:text-primary-400">
                        {product.title}
                    </h3>

                    <div className="flex items-center justify-between mt-4">
                        <div>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {Number(product.currentPrice || 0) === 0 ? '---' : `€${Number(product.currentPrice).toFixed(2)}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Added {new Date(product.createdAt).toLocaleDateString()}
                            </p>
                        </div>

                        {priceChange < -1 && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                                <TrendingDown className="w-3 h-3" />
                                {Math.abs(Number(priceChange)).toFixed(0)}%
                            </div>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    );
}

function ProductsGridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-200 dark:bg-gray-700"></div>
                    <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-4"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}
