'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, Package, TrendingDown, TrendingUp, Loader2, Heart, Folder, Search } from 'lucide-react';
import api, { Product } from '@/lib/api';

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
            // Filter favorites
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
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                        <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-500 fill-yellow-600 dark:fill-yellow-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Watchlist</h1>
                        <p className="text-gray-500 dark:text-gray-400">{products.length} favorite products</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            {products.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search your watchlist..."
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white placeholder-gray-500"
                    />
                </div>
            )}

            {/* Products */}
            {filteredProducts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Heart className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {search ? 'No products found' : 'Your watchlist is empty'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        {search
                            ? 'Try a different search term'
                            : 'Add products to your watchlist by clicking the star icon on any product page.'
                        }
                    </p>
                    {!search && (
                        <Link
                            href="/dashboard/products"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            <Package className="w-4 h-4" />
                            Browse Products
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredProducts.map(product => (
                        <WatchlistCard
                            key={product.id}
                            product={product}
                            onRemove={() => toggleFavorite(product.id)}
                        />
                    ))}
                </div>
            )}

            {/* Info */}
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl p-6">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    Watchlist Tips
                </h3>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300/80 space-y-1">
                    <li>• Products in your watchlist appear on your dashboard for quick access</li>
                    <li>• Set price alerts on watchlist items to get notified when prices drop</li>
                    <li>• Click the star icon on any product page to add or remove from watchlist</li>
                </ul>
            </div>
        </div>
    );
}

function WatchlistCard({
    product,
    onRemove
}: {
    product: Product;
    onRemove: () => void;
}) {
    const priceChange = product.highestPrice && product.currentPrice
        ? ((product.currentPrice - product.highestPrice) / product.highestPrice * 100)
        : 0;

    const isAtLowest = product.lowestPrice && product.currentPrice === product.lowestPrice;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-300 dark:hover:border-primary-500 hover:shadow-md transition-all">
            <div className="flex gap-4">
                <Link href={`/dashboard/products/${product.id}`} className="flex-shrink-0">
                    {product.imageUrl ? (
                        <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-20 h-20 object-cover rounded-lg bg-gray-100 dark:bg-gray-700"
                        />
                    ) : (
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Package className="w-10 h-10 text-gray-300 dark:text-gray-500" />
                        </div>
                    )}
                </Link>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <Link href={`/dashboard/products/${product.id}`}>
                                <h3 className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2">
                                    {product.title}
                                </h3>
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${product.marketplace === 'amazon' ? 'badge-amazon' :
                                    product.marketplace === 'etsy' ? 'badge-etsy' : 'badge-otto'
                                    }`}>
                                    {product.marketplace}
                                </span>
                                {isAtLowest && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                        Lowest Price!
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                €{product.currentPrice?.toFixed(2)}
                            </p>
                            {priceChange !== 0 && (
                                <div className={`flex items-center gap-1 justify-end text-sm ${priceChange < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {priceChange < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                    <span>{Math.abs(priceChange).toFixed(1)}%</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {product.lowestPrice && (
                                <span>Lowest: <span className="text-green-600 dark:text-green-400 font-medium">€{product.lowestPrice.toFixed(2)}</span></span>
                            )}
                            {product.highestPrice && (
                                <span className="ml-3">Highest: <span className="text-gray-700 dark:text-gray-300">€{product.highestPrice.toFixed(2)}</span></span>
                            )}
                        </div>

                        <button
                            onClick={onRemove}
                            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
