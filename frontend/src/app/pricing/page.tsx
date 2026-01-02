'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { TrendingDown, ArrowLeft, Check, Sparkles, Shield, Zap, Loader2 } from 'lucide-react';

export default function PricingPage() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);

    async function handlePlanClick(plan: string) {
        if (!isAuthenticated) {
            router.push(`/register?plan=${plan}`);
            return;
        }

        try {
            setIsCheckingOut(plan);
            const { url } = await api.request<{ url: string }>('/billing/create-checkout', {
                method: 'POST',
                body: {
                    tier: plan,
                    interval: 'monthly'
                }
            });

            if (url) window.location.href = url;
        } catch (error) {
            console.error('Checkout failed:', error);
            alert('Failed to start checkout. Please try again.');
            setIsCheckingOut(null);
        }
    }

    const features = {
        free: [
            'Track up to 10 products',
            'Price history for 30 days',
            'Email notifications',
            'Basic price alerts',
            'Amazon, Etsy & Otto support',
        ],
        premium: [
            'Unlimited product tracking',
            'Full price history',
            'Priority notifications',
            'Advanced AI insights',
            'Browser extension',
            'API access',
            'Priority support',
        ],
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-primary-800 text-white py-6">
                <div className="container mx-auto px-6">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                                <TrendingDown className="w-6 h-6 text-primary-800" />
                            </div>
                            <span className="text-xl font-bold">MarktMinder</span>
                        </Link>
                        <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="bg-gradient-to-b from-primary-800 to-primary-900 text-white py-16">
                <div className="container mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-xl text-white/80 max-w-2xl mx-auto">
                        Start tracking prices for free. Upgrade when you need more power.
                    </p>
                </div>
            </section>

            {/* Pricing Cards */}
            <main className="container mx-auto px-6 py-16 max-w-5xl">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Free Tier */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col">
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Free</h2>
                            <p className="text-gray-500 text-sm">For casual tracking</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-3xl font-bold text-gray-900">€0</span>
                            <span className="text-gray-500">/mo</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                5 Tracked Products
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                3 Active Alerts
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                30-Day History
                            </li>
                        </ul>
                        <Link href="/register" className="block w-full py-2.5 text-center border-2 border-primary-800 text-primary-800 rounded-lg font-semibold hover:bg-primary-50 transition-colors">
                            Get Started
                        </Link>
                    </div>

                    {/* Pro Tier */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col relative overflow-hidden">
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Pro</h2>
                            <p className="text-gray-500 text-sm">For smart shoppers</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-3xl font-bold text-gray-900">€4.99</span>
                            <span className="text-gray-500">/mo</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                50 Tracked Products
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                25 Active Alerts
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                Full Price History
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                AI Predictions
                            </li>
                        </ul>
                        <button
                            onClick={() => handlePlanClick('pro')}
                            disabled={!!isCheckingOut}
                            className="block w-full py-2.5 text-center bg-primary-800 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                            {isCheckingOut === 'pro' ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                                </span>
                            ) : (
                                'Start Free Trial'
                            )}
                        </button>
                    </div>

                    {/* Power Tier */}
                    <div className="bg-gradient-to-br from-primary-900 to-gray-900 rounded-2xl p-6 shadow-xl flex flex-col text-white relative transform md:-translate-y-4">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
                        <div className="absolute top-4 right-4 bg-yellow-500 text-yellow-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Best Value
                        </div>
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                Power <Zap className="w-4 h-4 text-yellow-400" />
                            </h2>
                            <p className="text-gray-400 text-sm">For serious trackers</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-3xl font-bold text-white">€9.99</span>
                            <span className="text-gray-400">/mo</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-gray-300">
                                <Check className="w-4 h-4 text-yellow-400 shrink-0" />
                                200 Tracked Products
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-300">
                                <Check className="w-4 h-4 text-yellow-400 shrink-0" />
                                100 Active Alerts
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-300">
                                <Check className="w-4 h-4 text-yellow-400 shrink-0" />
                                Deal Radar & Price DNA
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-300">
                                <Check className="w-4 h-4 text-yellow-400 shrink-0" />
                                Priority Scraping
                            </li>
                        </ul>
                        <button
                            onClick={() => handlePlanClick('power')}
                            disabled={!!isCheckingOut}
                            className="block w-full py-2.5 text-center bg-yellow-500 text-yellow-950 rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50"
                        >
                            {isCheckingOut === 'power' ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                                </span>
                            ) : (
                                'Get Power'
                            )}
                        </button>
                    </div>

                    {/* Business Tier */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col">
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Business</h2>
                            <p className="text-gray-500 text-sm">For resellers & teams</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-3xl font-bold text-gray-900">€29.99</span>
                            <span className="text-gray-500">/mo</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                Unlimited Products
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                Unlimited Alerts
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                API Access (10k/day)
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                White-label Embeds
                            </li>
                        </ul>
                        <Link href="/contact" className="block w-full py-2.5 text-center border-2 border-gray-200 text-gray-700 rounded-lg font-semibold hover:border-gray-300 hover:bg-gray-50 transition-colors">
                            Contact Sales
                        </Link>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-16">
                    <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h2>
                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
                            <p className="text-gray-600">Yes! You can cancel your subscription at any time. No questions asked.</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
                            <p className="text-gray-600">We accept all major credit cards, PayPal, and SEPA direct debit.</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-2">Is my data secure?</h3>
                            <p className="text-gray-600">Absolutely. We use industry-standard encryption and never sell your data.</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-2">Do you offer refunds?</h3>
                            <p className="text-gray-600">Yes, we offer a 30-day money-back guarantee for all paid plans.</p>
                        </div>
                    </div>
                </div>

                {/* Trust Section */}
                <div className="mt-16 text-center">
                    <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                        <Shield className="w-4 h-4" />
                        GDPR Compliant • SSL Encrypted • Made in Germany
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-100 border-t border-gray-200 py-8 mt-12">
                <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
                    © 2026 MarktMinder. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
