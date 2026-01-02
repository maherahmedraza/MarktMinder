'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import {
    ArrowLeft,
    Link as LinkIcon,
    FileText,
    Loader2,
    AlertCircle,
    CheckCircle
} from 'lucide-react';

export default function AddProductPage() {
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Detect marketplace from URL
    const marketplace = detectMarketplace(url);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (!marketplace) {
            setError('Please enter a valid Amazon, Etsy, or Otto.de product URL');
            return;
        }

        setIsLoading(true);

        try {
            const { product } = await api.addProduct(url, notes || undefined);
            setSuccess(true);

            // Redirect to product page after short delay
            setTimeout(() => {
                router.push(`/dashboard/products/${product.id}`);
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to add product');
        } finally {
            setIsLoading(false);
        }
    }

    if (success) {
        return (
            <div className="max-w-lg mx-auto">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8 text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">Product Added!</h2>
                    <p className="text-green-600 dark:text-green-300">Redirecting to product page...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto">
            <Link
                href="/dashboard/products"
                className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to products
            </Link>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Add Product to Track</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Product URL
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <LinkIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="url"
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://www.amazon.de/dp/B0..."
                                required
                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        {url && (
                            <div className="mt-2">
                                {marketplace ? (
                                    <span className={`inline-flex items-center gap-1.5 text-sm ${marketplace === 'amazon' ? 'text-amber-600 dark:text-amber-400' :
                                        marketplace === 'etsy' ? 'text-orange-600 dark:text-orange-400' :
                                            'text-red-600 dark:text-red-400'
                                        }`}>
                                        <CheckCircle className="w-4 h-4" />
                                        {marketplace.charAt(0).toUpperCase() + marketplace.slice(1)} product detected
                                    </span>
                                ) : (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Supported: Amazon, Etsy, Otto.de
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Notes (optional)
                        </label>
                        <div className="relative">
                            <div className="absolute top-3 left-3 pointer-events-none">
                                <FileText className="h-5 w-5 text-gray-400" />
                            </div>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add a note about this product..."
                                rows={3}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !marketplace}
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary-800 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                . Adding product...
                            </>
                        ) : (
                            'Add Product'
                        )}
                    </button>
                </form>

                {/* Tips */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tips</h3>
                    <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                        <li>• Copy the full product URL from your browser</li>
                        <li>• We'll automatically fetch product details and start tracking</li>
                        <li>• Price updates happen every 4-24 hours depending on activity</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function detectMarketplace(url: string): 'amazon' | 'etsy' | 'otto' | null {
    if (!url) return null;

    try {
        const hostname = new URL(url).hostname.toLowerCase();

        if (hostname.includes('amazon')) {
            const hasProduct = /\/(?:dp|gp\/product|gp\/aw\/d)\/[A-Z0-9]{10}/i.test(url);
            return hasProduct ? 'amazon' : null;
        }

        if (hostname.includes('etsy.com')) {
            const hasListing = /\/listing\/\d+/i.test(url);
            return hasListing ? 'etsy' : null;
        }

        if (hostname.includes('otto.de')) {
            const hasProduct = /\/p\//i.test(url);
            return hasProduct ? 'otto' : null;
        }

        return null;
    } catch {
        return null;
    }
}
