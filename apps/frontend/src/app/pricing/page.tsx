'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { TrendingDown, ArrowLeft, Check, Sparkles, Shield, Zap, Loader2 } from 'lucide-react';
import PriceParticles from '@/components/PriceParticles';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';

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

    return (
        <div className="min-h-screen bg-background relative transition-colors duration-500 overflow-hidden">
            {/* Interactive Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-background transition-colors duration-500" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(91,108,255,0.12),transparent_70%)] dark:opacity-100 opacity-0 transition-opacity duration-700" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(91,108,255,0.03),transparent_60%)] dark:opacity-0 opacity-100 transition-opacity duration-700" />

                <PriceParticles
                    className="dark:opacity-[0.25] opacity-[0.12] mix-blend-multiply dark:mix-blend-screen"
                    particleCount={30}
                />

                <div className="absolute inset-0 bg-grid-pattern dark:opacity-[0.03] opacity-[0.04] pointer-events-none transition-opacity duration-500" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <header className="border-b border-border/10 dark:border-white/[0.05] backdrop-blur-md sticky top-0 z-50 transition-all duration-500">
                    <div className="container mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <Link href="/" className="group flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-all">
                                    <TrendingDown className="w-6 h-6 text-primary" />
                                </div>
                                <span className="text-xl font-black text-text-primary uppercase italic tracking-tighter">
                                    Markt<span className="text-primary">Minder</span>
                                </span>
                            </Link>
                            <Link href="/" className="flex items-center gap-2 text-text-tertiary hover:text-text-secondary transition-colors uppercase text-[10px] font-black tracking-[0.2em]">
                                <ArrowLeft className="w-4 h-4" />
                                Return_To_Base
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="flex-1 container mx-auto px-6 py-16 max-w-7xl">
                    {/* Hero */}
                    <div className="text-center mb-20 animate-reveal">
                        <div className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4 text-center">Protocol_Access</div>
                        <h1 className="text-4xl md:text-6xl font-black text-text-primary mb-6 uppercase italic leading-none">
                            System <span className="text-primary">Subscription</span>
                        </h1>
                        <p className="text-lg text-text-tertiary max-w-2xl mx-auto uppercase tracking-widest opacity-80 decoration-primary/30">
                            Select your tier for advanced asset monitoring.
                        </p>
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
                        {/* Free Tier */}
                        <GlassCard className="p-8 flex flex-col group border-border/10 dark:border-white/10 hover:border-primary/30 transition-all">
                            <div className="mb-6">
                                <h2 className="text-xl font-black text-text-primary uppercase italic">Free</h2>
                                <p className="text-text-tertiary text-[10px] uppercase tracking-widest font-bold">Standard Access</p>
                            </div>
                            <div className="mb-8">
                                <span className="text-4xl font-black text-text-primary">€0</span>
                                <span className="text-text-tertiary text-sm ml-1 uppercase font-bold">/cycle</span>
                            </div>
                            <ul className="space-y-4 mb-10 flex-1">
                                {[
                                    '5 Tracked Products',
                                    '3 Active Alerts',
                                    '30-Day History',
                                    'Standard Latency'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-text-secondary font-medium">
                                        <Check className="w-4 h-4 text-primary shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/register" className="w-full">
                                <GlowButton className="w-full text-[12px]" variant="outline">
                                    INITIALIZE
                                </GlowButton>
                            </Link>
                        </GlassCard>

                        {/* Pro Tier */}
                        <GlassCard className="p-8 flex flex-col group border-primary/20 bg-primary/[0.02] hover:bg-primary/[0.04] transition-all">
                            <div className="mb-6">
                                <h2 className="text-xl font-black text-text-primary uppercase italic">Pro</h2>
                                <p className="text-text-tertiary text-[10px] uppercase tracking-widest font-bold">Enhanced Intel</p>
                            </div>
                            <div className="mb-8">
                                <span className="text-4xl font-black text-text-primary">€4.99</span>
                                <span className="text-text-tertiary text-sm ml-1 uppercase font-bold">/cycle</span>
                            </div>
                            <ul className="space-y-4 mb-10 flex-1">
                                {[
                                    '50 Tracked Products',
                                    '25 Active Alerts',
                                    'Full Price History',
                                    'AI Predictions',
                                    'Priority Queuing'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-text-secondary font-medium">
                                        <Check className="w-4 h-4 text-primary shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <GlowButton
                                onClick={() => handlePlanClick('pro')}
                                disabled={!!isCheckingOut}
                                className="w-full text-[12px]"
                            >
                                {isCheckingOut === 'pro' ? 'PROCESSING...' : 'INITIALIZE_PRO'}
                            </GlowButton>
                        </GlassCard>

                        {/* Power Tier */}
                        <GlassCard className="p-8 flex flex-col group border-yellow-500/20 bg-yellow-500/[0.02] hover:bg-yellow-500/[0.04] relative transition-all">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-yellow-950 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-yellow-500/20">
                                OptimaL_Ratio
                            </div>
                            <div className="mb-6">
                                <h2 className="text-xl font-black text-text-primary uppercase italic flex items-center gap-2">
                                    Power <Zap className="w-4 h-4 text-yellow-500" />
                                </h2>
                                <p className="text-text-tertiary text-[10px] uppercase tracking-widest font-bold">Elite Monitoring</p>
                            </div>
                            <div className="mb-8">
                                <span className="text-4xl font-black text-text-primary">€9.99</span>
                                <span className="text-text-tertiary text-sm ml-1 uppercase font-bold">/cycle</span>
                            </div>
                            <ul className="space-y-4 mb-10 flex-1">
                                {[
                                    '200 Tracked Products',
                                    '100 Active Alerts',
                                    'Deal Radar & Price DNA',
                                    'Priority Scraping',
                                    'Custom Triggers'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-text-secondary font-medium">
                                        <Check className="w-4 h-4 text-yellow-500 shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <GlowButton
                                onClick={() => handlePlanClick('power')}
                                disabled={!!isCheckingOut}
                                className="w-full text-[12px] bg-yellow-500 hover:bg-yellow-400 text-yellow-950 shadow-yellow-500/20"
                            >
                                {isCheckingOut === 'power' ? 'PROCESSING...' : 'INITIALIZE_POWER'}
                            </GlowButton>
                        </GlassCard>

                        {/* Business Tier */}
                        <GlassCard className="p-8 flex flex-col group border-border/10 dark:border-white/10 hover:border-primary/30 transition-all">
                            <div className="mb-6">
                                <h2 className="text-xl font-black text-text-primary uppercase italic">Enterprise</h2>
                                <p className="text-text-tertiary text-[10px] uppercase tracking-widest font-bold">Full Protocol</p>
                            </div>
                            <div className="mb-8">
                                <span className="text-4xl font-black text-text-primary">€29.99</span>
                                <span className="text-text-tertiary text-sm ml-1 uppercase font-bold">/cycle</span>
                            </div>
                            <ul className="space-y-4 mb-10 flex-1">
                                {[
                                    'Unlimited Products',
                                    'Unlimited Alerts',
                                    'API Access (10k/day)',
                                    'White-label Embeds',
                                    'Dedicated Support'
                                ].map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm text-text-secondary font-medium">
                                        <Check className="w-4 h-4 text-primary shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/contact" className="w-full">
                                <GlowButton className="w-full text-[12px]" variant="outline">
                                    CONTACT_SALES
                                </GlowButton>
                            </Link>
                        </GlassCard>
                    </div>

                    {/* FAQ Section */}
                    <div className="mt-32 max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-black text-text-primary uppercase italic">Common_Inquiries</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            {[
                                { q: 'Can I cancel anytime?', a: 'Yes. Termination of sub-routine is available without penalty at any cycle interval.' },
                                { q: 'Payment Methods?', a: 'All major credit protocols, PayPal, and SEPA direct debit supported.' },
                                { q: 'Data Security?', a: 'AES-256 encryption applied to all asset identifiers and user metrics.' },
                                { q: 'Refund Policy?', a: '30-day performance guarantee for all paid subscription tiers.' }
                            ].map((faq, i) => (
                                <GlassCard key={i} className="p-6 border-border/5 dark:border-white/5 bg-surface/10">
                                    <h3 className="font-black text-text-primary mb-2 uppercase text-sm tracking-widest italic">{faq.q}</h3>
                                    <p className="text-text-tertiary text-sm leading-relaxed">{faq.a}</p>
                                </GlassCard>
                            ))}
                        </div>
                    </div>

                    {/* Security Footer */}
                    <div className="mt-32 text-center">
                        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] bg-primary/5 text-primary border border-primary/20 backdrop-blur-sm">
                            <Shield className="w-4 h-4" />
                            GDPR_VALID • SSL_ENCRYPTED • MADE_IN_GERMANY
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="border-t border-border/10 dark:border-white/[0.05] py-12 bg-surface/50 dark:bg-black/20 transition-colors duration-500">
                    <div className="container mx-auto px-6 text-center text-text-tertiary text-[10px] font-black uppercase tracking-[0.2em]">
                        © 2026 MarktMinder // All rights reserved.
                    </div>
                </footer>
            </div>
        </div>
    );
}
