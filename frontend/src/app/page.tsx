'use client';

import Link from 'next/link';
import { TrendingDown, Bell, Globe, Shield, ChevronRight, Sparkles, Zap, Target, BarChart3 } from 'lucide-react';
import { PriceParticles } from '@/components/PriceParticles';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)] relative overflow-hidden">
            {/* Interactive Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-midnight-950 via-midnight-900 to-midnight-800 dark:opacity-100 opacity-0 transition-opacity duration-500" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-primary-100/50 dark:opacity-0 opacity-100 transition-opacity duration-500" />
                <PriceParticles className="dark:opacity-100 opacity-30" particleCount={50} />
                <div className="absolute inset-0 bg-[var(--gradient-glow)] pointer-events-none" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Navigation */}
                <nav className="container mx-auto px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                                <TrendingDown className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-[var(--color-text-primary)]">
                                Markt<span className="text-primary-500">Minder</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            <Link
                                href="/pricing"
                                className="hidden sm:block text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors font-medium"
                            >
                                Pricing
                            </Link>
                            <Link
                                href="/login"
                                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors font-medium"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/register"
                                className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-primary-500/25 hover:-translate-y-0.5"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="container mx-auto px-6 pt-16 pb-24 text-center">
                    <div className="max-w-4xl mx-auto stagger-children">
                        {/* Badge */}
                        <div className="animate-reveal inline-flex items-center gap-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] px-4 py-2 rounded-full mb-8 shadow-sm">
                            <Sparkles className="w-4 h-4 text-gold-500" />
                            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                                AI-Powered Price Predictions
                            </span>
                            <span className="text-xs bg-mint-500/10 text-mint-600 dark:text-mint-400 px-2 py-0.5 rounded-full font-semibold">
                                NEW
                            </span>
                        </div>

                        {/* Headline */}
                        <h1 className="animate-reveal text-5xl md:text-7xl font-extrabold text-[var(--color-text-primary)] mb-6 leading-[1.1] tracking-tight">
                            Never Miss a{' '}
                            <span className="relative">
                                <span className="relative z-10 bg-gradient-to-r from-mint-500 to-mint-400 bg-clip-text text-transparent">
                                    Price Drop
                                </span>
                                <span className="absolute -inset-1 bg-mint-500/20 blur-xl rounded-lg" />
                            </span>
                            {' '}Again
                        </h1>

                        {/* Subheadline */}
                        <p className="animate-reveal text-xl md:text-2xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
                            Track prices across <span className="font-semibold text-amazon">Amazon</span>,{' '}
                            <span className="font-semibold text-etsy">Etsy</span>, and{' '}
                            <span className="font-semibold text-otto">Otto</span> — all in one place.
                            Get instant alerts when products hit your target price.
                        </p>

                        {/* CTA Buttons */}
                        <div className="animate-reveal flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                            <Link
                                href="/register"
                                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-1"
                            >
                                Start Tracking Free
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href="#features"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] px-8 py-4 rounded-2xl font-semibold text-lg hover:border-primary-400 hover:shadow-lg transition-all"
                            >
                                See How It Works
                            </Link>
                        </div>

                        {/* Marketplace Pills */}
                        <div className="animate-reveal flex items-center justify-center gap-4 flex-wrap">
                            <span className="text-[var(--color-text-tertiary)] text-sm">Supported:</span>
                            <div className="flex items-center gap-3">
                                <span className="bg-amazon/90 text-gray-900 px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                                    Amazon
                                </span>
                                <span className="bg-etsy/90 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                                    Etsy
                                </span>
                                <span className="bg-otto/90 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                                    Otto
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="container mx-auto px-6 py-20">
                    <div className="text-center mb-16 stagger-children">
                        <h2 className="animate-reveal text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
                            Everything You Need to Shop Smarter
                        </h2>
                        <p className="animate-reveal text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
                            Powerful tools to track, analyze, and predict prices across multiple marketplaces.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
                        <FeatureCard
                            icon={<BarChart3 className="w-7 h-7" />}
                            title="Price History"
                            description="Interactive charts showing price trends over days, weeks, or months."
                            gradient="from-primary-500 to-primary-600"
                        />
                        <FeatureCard
                            icon={<Bell className="w-7 h-7" />}
                            title="Smart Alerts"
                            description="Get notified instantly when prices drop to your target."
                            gradient="from-gold-500 to-gold-600"
                        />
                        <FeatureCard
                            icon={<Sparkles className="w-7 h-7" />}
                            title="AI Predictions"
                            description="ML-powered forecasts to help you buy at the perfect time."
                            gradient="from-coral-500 to-coral-600"
                        />
                        <FeatureCard
                            icon={<Globe className="w-7 h-7" />}
                            title="Browser Extension"
                            description="See price history directly on product pages."
                            gradient="from-mint-500 to-mint-600"
                        />
                    </div>
                </section>

                {/* Stats Section */}
                <section className="container mx-auto px-6 py-16">
                    <div className="animate-reveal bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] rounded-3xl p-10 shadow-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                            <StatItem value="50K+" label="Products Tracked" />
                            <StatItem value="€2.3M" label="Saved by Users" />
                            <StatItem value="3" label="Marketplaces" />
                            <StatItem value="24/7" label="Price Monitoring" />
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="container mx-auto px-6 py-20">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
                            Start Saving in 3 Simple Steps
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto stagger-children">
                        <StepCard
                            number="1"
                            title="Add Products"
                            description="Paste any product URL from Amazon, Etsy, or Otto"
                        />
                        <StepCard
                            number="2"
                            title="Set Your Price"
                            description="Choose your target price or use AI recommendations"
                        />
                        <StepCard
                            number="3"
                            title="Get Notified"
                            description="Receive instant alerts when prices drop"
                        />
                    </div>
                </section>

                {/* CTA Section */}
                <section className="container mx-auto px-6 py-20 text-center">
                    <div className="animate-reveal max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-6">
                            Ready to Save Money?
                        </h2>
                        <p className="text-lg text-[var(--color-text-secondary)] mb-8">
                            Join thousands of smart shoppers who never overpay.
                        </p>
                        <Link
                            href="/register"
                            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-1"
                        >
                            Create Free Account
                            <ChevronRight className="w-6 h-6" />
                        </Link>
                        <p className="mt-4 text-sm text-[var(--color-text-tertiary)]">
                            No credit card required • Free forever for 5 products
                        </p>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-[var(--color-border-primary)] py-10">
                    <div className="container mx-auto px-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <TrendingDown className="w-5 h-5 text-primary-500" />
                                <span className="font-semibold text-[var(--color-text-primary)]">MarktMinder</span>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-[var(--color-text-tertiary)]">
                                <Link href="/privacy" className="hover:text-[var(--color-text-primary)] transition-colors">Privacy</Link>
                                <Link href="/terms" className="hover:text-[var(--color-text-primary)] transition-colors">Terms</Link>
                                <Link href="/impressum" className="hover:text-[var(--color-text-primary)] transition-colors">Impressum</Link>
                                <Link href="/contact" className="hover:text-[var(--color-text-primary)] transition-colors">Contact</Link>
                            </div>
                            <p className="text-sm text-[var(--color-text-tertiary)]">
                                © 2026 MarktMinder. All rights reserved.
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
    gradient
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: string;
}) {
    return (
        <div className="animate-reveal group bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] rounded-2xl p-6 hover:border-primary-400 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                {icon}
            </div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">{title}</h3>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
        </div>
    );
}

function StatItem({ value, label }: { value: string; label: string }) {
    return (
        <div>
            <div className="text-3xl md:text-4xl font-extrabold text-[var(--color-text-primary)] mb-2">{value}</div>
            <div className="text-[var(--color-text-secondary)] text-sm font-medium">{label}</div>
        </div>
    );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
    return (
        <div className="animate-reveal text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg shadow-primary-500/25">
                {number}
            </div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">{title}</h3>
            <p className="text-[var(--color-text-secondary)]">{description}</p>
        </div>
    );
}
