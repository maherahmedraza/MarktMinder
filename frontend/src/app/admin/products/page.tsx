'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Filter, ExternalLink, Loader2 } from 'lucide-react';
import api from '@/lib/api';

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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
                    <p className="text-gray-500 dark:text-gray-400">All products in the database</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search products..."
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </form>
                <select
                    value={marketplace}
                    onChange={(e) => { setMarketplace(e.target.value); setPage(1); }}
                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="">All Marketplaces</option>
                    <option value="amazon">Amazon</option>
                    <option value="etsy">Etsy</option>
                    <option value="otto">Otto</option>
                </select>
            </div>

            {/* Products Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Product</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Marketplace</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Price</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Trackers</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">History</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Added</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.title}
                                                        className="w-12 h-12 rounded object-cover bg-gray-100 dark:bg-gray-600"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-600 rounded flex items-center justify-center">
                                                        <Package className="w-6 h-6 text-gray-400" />
                                                    </div>
                                                )}
                                                <span className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                                                    {product.title || 'Untitled'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${product.marketplace === 'amazon' ? 'bg-amazon/20 text-amazon' :
                                                product.marketplace === 'etsy' ? 'bg-etsy/20 text-etsy' :
                                                    'bg-otto/20 text-otto'
                                                }`}>
                                                {product.marketplace}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                                            €{product.current_price !== undefined && product.current_price !== null
                                                ? Number(product.current_price).toFixed(2)
                                                : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-300">
                                            {product.tracker_count}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-300">
                                            {product.history_count} records
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                            {new Date(product.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <a
                                                href={product.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 text-sm"
                                            >
                                                View <ExternalLink className="w-4 h-4" />
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
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            Previous
                        </button>
                        <span className="text-gray-500 dark:text-gray-400">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
