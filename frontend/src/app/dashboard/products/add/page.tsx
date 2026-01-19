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
    CheckCircle,
    Plus,
    Target,
    Zap
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';

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
            <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
                <GlassCard variant="pro" className="p-12 text-center animate-scale-in">
                    <div className="w-20 h-20 bg-success/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow-sm">
                        <CheckCircle className="w-10 h-10 text-success" />
                    </div>
                    <h2 className="heading-2 text-text-primary mb-3">Asset Calibrated!</h2>
                    <p className="text-text-tertiary font-bold uppercase tracking-widest text-[11px] animate-pulse">
                        Redirecting to Neural Projection...
                    </p>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto animate-fade-in">
            <Link
                href="/dashboard/products"
                className="inline-flex items-center gap-2 text-text-tertiary hover:text-primary font-bold uppercase tracking-widest text-[10px] transition-colors mb-8 group"
            >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Back to products
            </Link>

            <GlassCard variant="pro" className="p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center shadow-glow-sm">
                        <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="heading-3 text-text-primary">Asset Integration</h1>
                        <p className="text-[10px] font-black text-text-tertiary tracking-[0.2em] uppercase">Phase 1: Source Acquisition</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {error && (
                        <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl flex items-center gap-3 animate-shake">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="text-xs font-bold uppercase tracking-wide">{error}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="url" className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">
                            Product Target URL
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <LinkIcon className="h-5 w-5 text-text-tertiary group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                id="url"
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://www.amazon.de/dp/B0..."
                                required
                                className="input-themed h-14"
                            />
                        </div>
                        {url && (
                            <div className="mt-3 px-1">
                                {marketplace ? (
                                    <div className="flex items-center gap-2 bg-success/10 border border-success/20 px-3 py-2 rounded-lg">
                                        <Target className="w-3.5 h-3.5 text-success" />
                                        <span className="text-[10px] font-black text-success uppercase tracking-widest">
                                            {marketplace} Protocol Detected
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 bg-surface-hover/30 px-3 py-2 rounded-lg border border-border/10">
                                        <Zap className="w-3.5 h-3.5 text-text-tertiary" />
                                        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest leading-none">
                                            Scanning for Marketplace Signature...
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="notes" className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">
                            Operational Notes (optional)
                        </label>
                        <div className="relative group">
                            <div className="absolute top-4 left-4 pointer-events-none">
                                <FileText className="h-5 w-5 text-text-tertiary group-focus-within:text-primary transition-colors" />
                            </div>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add technical metadata or tracking notes..."
                                rows={4}
                                className="input-themed pt-4 resize-none"
                            />
                        </div>
                    </div>

                    <GlowButton
                        type="submit"
                        disabled={isLoading || !marketplace}
                        className="w-full h-14"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                INITIALIZING SCRAPER...
                            </>
                        ) : (
                            <>
                                <Target className="w-5 h-5 mr-2" />
                                INITIATE TRACKING
                            </>
                        )}
                    </GlowButton>
                </form>

                {/* Protocol Guidelines */}
                <div className="mt-10 pt-8 border-t border-border/10">
                    <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] mb-4">Protocol Guidelines</h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                            <div className="w-1 h-1 rounded-full bg-primary mt-1.5"></div>
                            <p className="text-[11px] text-text-tertiary font-medium">Capture the absolute target URL from the browser's identity bar.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-1 h-1 rounded-full bg-primary mt-1.5"></div>
                            <p className="text-[11px] text-text-tertiary font-medium">MarktMinder Neural engine will auto-verify product metadata.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-1 h-1 rounded-full bg-primary mt-1.5"></div>
                            <p className="text-[11px] text-text-tertiary font-medium">Standard scan frequency calibrated to 4-24 hour intervals.</p>
                        </li>
                    </ul>
                </div>
            </GlassCard>
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
