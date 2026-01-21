'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Product, Pagination } from '@/lib/api';
import {
    Search,
    TrendingDown,
    Package,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Download,
    Trash2,
    CheckSquare,
    Square,
    ArrowUpDown,
    Plus,
    FolderPlus,
    FolderCheck,
    Loader2
} from 'lucide-react';

import { useAuth } from '@/lib/auth';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { ProductCard } from '@/components/ui/ProductCard';
import { FolderManager } from '@/components/dashboard/FolderManager';
import { toast } from 'sonner';
import { useProducts, useFolders, useRemoveProduct, useMoveProductToFolder } from '@/lib/hooks';
import { useTranslations } from 'next-intl';

type SortOption = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc' | 'drop-desc';

export default function ProductsPage() {
    const t = useTranslations('dashboard.products');
    const { user } = useAuth();
    const [page, setPage] = useState(1);

    // Filters & Sort
    const [marketplace, setMarketplace] = useState<string>('');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('date-desc');
    const [showOnlyDrops, setShowOnlyDrops] = useState(false);
    const [selectedFolderId, setSelectedFolderId] = useState<string>('');

    // UI State
    const [showFolderManager, setShowFolderManager] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    // Data Fetching
    const {
        data: productsData,
        isLoading: isProductsLoading,
        error: productsError
    } = useProducts({
        page,
        limit: 50,
        marketplace: marketplace || undefined
    });

    const { data: foldersData } = useFolders();
    const folders = foldersData?.folders || [];

    const removeProductMutation = useRemoveProduct();
    const moveProductMutation = useMoveProductToFolder();

    const rawProducts = productsData?.products || [];
    const pagination = productsData?.pagination;

    // --- Computed Data ---
    // Note: Ideally filtering should happen on backend, but mimicking original behavior + folder filtering
    const processedProducts = useMemo(() => {
        let result = [...rawProducts];

        // 0. Filter by folder (client-side for now as API might not support it yet in getProducts)
        if (selectedFolderId) {
            result = result.filter(p => (p as any).folder_id === selectedFolderId || (p as any).folderId === selectedFolderId);
        }

        // 1. Search
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(p =>
                p.title?.toLowerCase().includes(q) ||
                p.brand?.toLowerCase().includes(q)
            );
        }

        // 2. Filter: Price Drops
        if (showOnlyDrops) {
            result = result.filter(p => {
                const current = Number(p.currentPrice || 0);
                const highest = Number(p.highestPrice || 0);
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
                    return dropA - dropB;
                default:
                    return 0;
            }
        });

        return result;
    }, [rawProducts, search, sortBy, showOnlyDrops, selectedFolderId]);


    // --- Actions ---
    function toggleSelection(id: string) {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    }

    function toggleSelectAll() {
        if (selectedIds.size === processedProducts.length && processedProducts.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(processedProducts.map(p => p.id)));
        }
    }

    async function handleBulkDelete() {
        if (!confirm(t('bulkDeleteConfirm', { count: selectedIds.size }))) return;

        setIsBulkDeleting(true);
        try {
            await Promise.all(Array.from(selectedIds).map(id => removeProductMutation.mutateAsync(id)));
            toast.success(t('bulkDeleteSuccess', { count: selectedIds.size }));
            setSelectedIds(new Set());
        } catch (err: any) {
            toast.error(t('bulkUpdateError'));
        } finally {
            setIsBulkDeleting(false);
        }
    }

    async function handleBulkMove(targetFolderId: string) {
        if (!targetFolderId) return;
        setIsBulkUpdating(true);
        try {
            await Promise.all(
                Array.from(selectedIds).map(productId =>
                    moveProductMutation.mutateAsync({ productId, folderId: targetFolderId })
                )
            );
            toast.success(t('bulkMoveSuccess', { count: selectedIds.size }));
            setSelectedIds(new Set());
        } catch (err) {
            toast.error(t('bulkUpdateError'));
        } finally {
            setIsBulkUpdating(false);
        }
    }

    function handleExportCSV() {
        const headers = ['ID', 'Title', 'Marketplace', 'Current Price', 'Highest Price', 'Lowest Price', 'Created At', 'URL'];
        const rows = processedProducts.map(p => [
            p.id,
            `"${(p.title || '').replace(/"/g, '""')}"`,
            p.marketplace,
            p.currentPrice,
            p.highestPrice || '',
            p.lowestPrice || '',
            p.createdAt,
            p.url
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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

    if (productsError) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{t('error', { error: productsError.message })}</span>
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
                            {t('title')} <span className="text-gradient">{t('titleAccent')}</span>
                        </h1>
                    </div>
                    <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                        {t('subtitle', { total: pagination?.total || 0 })}
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
                            {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            {t('actions.delete', { count: selectedIds.size })}
                        </GlowButton>
                    ) : (
                        <GlowButton
                            variant="secondary"
                            onClick={() => setShowFolderManager(!showFolderManager)}
                            className="w-full sm:w-auto"
                        >
                            <FolderCheck className="w-4 h-4 mr-2" />
                            {t('actions.collections')}
                        </GlowButton>
                    )}

                    {selectedIds.size > 0 && (
                        <div className="relative group">
                            <select
                                onChange={(e) => handleBulkMove(e.target.value)}
                                value=""
                                disabled={isBulkUpdating}
                                className="appearance-none bg-surface border border-border/50 rounded-xl pl-4 pr-10 py-3 text-sm font-bold text-text-primary focus:border-primary outline-none transition-all cursor-pointer h-full"
                            >
                                <option value="" disabled>{t('actions.moveTo')}</option>
                                {folders.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                            {isBulkUpdating ? (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary animate-spin" />
                            ) : (
                                <FolderPlus className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
                            )}
                        </div>
                    )}

                    {!selectedIds.size && (
                        <Link href="/dashboard/products/add" className="w-full sm:w-auto">
                            <GlowButton className="w-full">
                                <Plus className="w-4 h-4 mr-2" />
                                {t('actions.addProduct')}
                            </GlowButton>
                        </Link>
                    )}

                    <GlowButton
                        onClick={handleExportCSV}
                        variant="outline"
                        className="w-full sm:w-auto"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {t('actions.export')}
                    </GlowButton>
                </div>
            </div>

            {showFolderManager && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <FolderManager />
                </div>
            )}

            {/* Toolbar / Filters */}
            <GlassCard padding="default" className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Search */}
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder={t('filters.searchPlaceholder')}
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
                            <option value="date-desc">{t('filters.sort.newest')}</option>
                            <option value="date-asc">{t('filters.sort.oldest')}</option>
                            <option value="price-desc">{t('filters.sort.highestPrice')}</option>
                            <option value="price-asc">{t('filters.sort.lowestPrice')}</option>
                            <option value="drop-desc">{t('filters.sort.biggestDrop')}</option>
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
                        <option value="">{t('filters.markets')}</option>
                        <option value="amazon">Amazon</option>
                        <option value="etsy">Etsy</option>
                        <option value="otto">Otto</option>
                    </select>

                    {/* Folder Filter */}
                    <select
                        value={selectedFolderId}
                        onChange={(e) => {
                            setSelectedFolderId(e.target.value);
                            setPage(1);
                        }}
                        className="px-3 py-2 bg-background/50 border border-border/50 rounded-xl text-sm text-text-primary focus:border-primary outline-none transition-all cursor-pointer"
                    >
                        <option value="">{t('filters.allCollections')}</option>
                        {folders.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
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
                        <span className="group-hover:text-text-primary transition-colors">{t('filters.dropsOnly')}</span>
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
                        <span>{selectedIds.size === processedProducts.length ? t('filters.deselectAll') : t('filters.selectAll')}</span>
                    </button>
                </div>
            </GlassCard>

            {/* Products Grid */}
            {isProductsLoading ? (
                <ProductsGridSkeleton />
            ) : processedProducts.length === 0 ? (
                <GlassCard className="text-center py-20 border-dashed">
                    <Package className="w-20 h-20 text-text-tertiary/20 mx-auto mb-6" />
                    <h3 className="heading-3 text-text-primary mb-2">{t('empty.title')}</h3>
                    <p className="text-text-secondary mb-8 max-w-sm mx-auto">
                        {search || marketplace || showOnlyDrops || selectedFolderId
                            ? t('empty.filtered')
                            : t('empty.empty')
                        }
                    </p>
                    <Link href="/dashboard/products/add">
                        <GlowButton>{t('empty.button')}</GlowButton>
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
                        {t('pagination', { current: String(page).padStart(2, '0'), total: String(pagination.totalPages).padStart(2, '0') })}
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
