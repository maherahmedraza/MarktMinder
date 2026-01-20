'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrendingDown, Bell, Globe, Shield, ChevronRight, Sparkles, Zap, Target, BarChart3, Menu, X, Plus, ShieldCheck, ZapOff, Activity, Cpu } from 'lucide-react';
import { PriceParticles } from '@/components/PriceParticles';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GlowButton } from '@/components/ui/GlowButton';
import { GlassCard } from '@/components/ui/GlassCard';

export default function HomePage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background relative transition-colors duration-500 overflow-hidden">
            {/* Interactive Background */}
            <div className="fixed inset-0 z-0">
                {/* Clean Base Layer */}
                <div className="absolute inset-0 bg-background transition-colors duration-500" />

                {/* Atmospheric Glows (Dark Mode) - Subtle and deep */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(91,108,255,0.12),transparent_70%)] dark:opacity-100 opacity-0 transition-opacity duration-700" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,107,107,0.04),transparent_50%)] dark:opacity-100 opacity-0 transition-opacity duration-700" />

                {/* Airy Atmosphere (Light Mode) - Clean and professional */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(91,108,255,0.03),transparent_60%)] dark:opacity-0 opacity-100 transition-opacity duration-700" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_100%,rgba(91,108,255,0.02),transparent_60%)] dark:opacity-0 opacity-100 transition-opacity duration-700" />

                <PriceParticles
                    className="dark:opacity-[0.25] opacity-[0.12] mix-blend-multiply dark:mix-blend-screen"
                    particleCount={35}
                />

                {/* Precision Grid Layer */}
                <div className="absolute inset-0 bg-grid-pattern dark:opacity-[0.03] opacity-[0.04] pointer-events-none transition-opacity duration-500" />
                <div className="absolute inset-0 bg-pulse-scan dark:opacity-[0.04] opacity-[0.01] pointer-events-none transition-opacity duration-500" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Navigation */}
                <nav className="container mx-auto px-6 py-6 border-b border-border/10 dark:border-white/[0.05] backdrop-blur-xl sticky top-0 z-50 transition-colors duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 group cursor-pointer">
                            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 shadow-glow-sm group-hover:shadow-glow transition-all duration-500">
                                <TrendingDown className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-black text-text-primary tracking-tighter uppercase leading-none">
                                    Markt<span className="text-primary">Minder</span>
                                </span>
                                <span className="text-[8px] font-black text-primary/70 tracking-[0.3em] uppercase mt-1">
                                    Neural_Control_v2.0
                                </span>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8">
                            {['pricing', 'features', 'docs'].map((item) => (
                                <Link
                                    key={item}
                                    href={`/${item}`}
                                    className="text-[10px] font-black text-text-tertiary uppercase tracking-widest hover:text-primary transition-colors"
                                >
                                    {item}
                                </Link>
                            ))}
                            <div className="h-4 w-[1px] bg-border/20 dark:bg-white/10 mx-2" />
                            <ThemeToggle />
                            <Link
                                href="/login"
                                className="text-[10px] font-black text-text-primary uppercase tracking-widest hover:text-primary transition-colors"
                            >
                                Access System
                            </Link>
                            <GlowButton onClick={() => window.location.href = '/register'} size="sm">
                                <Plus className="w-3 h-3 mr-2" />
                                INITIALIZE_NODE
                            </GlowButton>
                        </div>

                        {/* Mobile Navigation Toggle */}
                        <div className="flex items-center gap-4 md:hidden">
                            <ThemeToggle />
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="p-2 rounded-lg text-text-primary hover:bg-surface-hover transition-colors"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="container mx-auto px-6 pt-24 pb-32 text-center relative">
                    <div className="max-w-4xl mx-auto stagger-children">
                        {/* System Status Badge */}
                        <div className="animate-reveal inline-flex items-center gap-3 bg-surface/30 dark:bg-white/[0.03] border border-border/10 dark:border-white/10 px-5 py-2 rounded-full mb-10 backdrop-blur-xl group hover:border-primary/40 transition-all duration-500">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-glow" />
                            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">
                                System Status: <span className="text-primary">Operational</span> // Neural_Engine_Active
                            </span>
                        </div>

                        {/* Headline */}
                        <h1 className="animate-reveal text-6xl md:text-8xl font-black text-text-primary mb-8 leading-[0.9] tracking-tighter uppercase italic">
                            Neural <br />
                            <span className="text-gradient">Asset Tracking</span>
                        </h1>

                        {/* Subheadline */}
                        <p className="animate-reveal text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-12 font-medium leading-relaxed uppercase tracking-wide">
                            Deploy high-frequency monitoring across <span className="text-amazon font-black">Amazon</span>,
                            <span className="text-etsy font-black ml-1">Etsy</span>, and
                            <span className="text-otto font-black ml-1">Otto</span>.
                            Zero-latency price alerts. Maximum capital preservation.
                        </p>

                        {/* CTA Buttons */}
                        <div className="animate-reveal flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
                            <GlowButton
                                variant="primary"
                                size="lg"
                                className="w-full sm:w-auto min-w-[240px]"
                                onClick={() => window.location.href = '/register'}
                            >
                                <Zap className="w-5 h-5 mr-3" />
                                DEPLOY_ENGINE
                            </GlowButton>
                            <Link
                                href="#features"
                                className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-surface/20 dark:bg-white/[0.02] border border-border/10 dark:border-white/10 rounded-full text-[12px] font-black text-text-primary uppercase tracking-[0.2em] hover:bg-surface-hover dark:hover:bg-white/5 hover:border-primary/40 transition-all"
                            >
                                SYSTEM_SPECIFICATIONS
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        {/* Active Modules (Marketplaces) */}
                        <div className="animate-reveal flex items-center justify-center gap-12 flex-wrap opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700">
                            {[
                                { name: 'Amazon_Module', color: 'text-amazon' },
                                { name: 'Etsy_Pulse', color: 'text-etsy' },
                                { name: 'Otto_Core', color: 'text-otto' }
                            ].map((mod) => (
                                <div key={mod.name} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${mod.color}`}>
                                        {mod.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="container mx-auto px-6 py-32 border-t border-border/10 dark:border-white/[0.03]">
                    <div className="text-center mb-20 stagger-children">
                        <div className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4">Core_Capabilities</div>
                        <h2 className="animate-reveal text-4xl md:text-5xl font-black text-text-primary mb-6 uppercase italic">
                            System <span className="text-primary">Specifications</span>
                        </h2>
                        <p className="animate-reveal text-lg text-text-tertiary max-w-2xl mx-auto">
                            High-precision monitoring tools engineered for the professional asset manager.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
                        <FeatureCard
                            icon={<Cpu className="w-8 h-8" />}
                            title="Fake_Discount_Detection"
                            description="Real-time logic analysis to identify artificial price inflating before sales."
                            variant="pro"
                        />
                        <FeatureCard
                            icon={<Activity className="w-8 h-8" />}
                            title="Multi_Market_Pulse"
                            description="Synchronized tracking across  core marketplaces with sub-second delta logs."
                            variant="glass"
                        />
                        <FeatureCard
                            icon={<Zap className="w-8 h-8" />}
                            title="Neural_Price_Forecasting"
                            description="ML models predicting future asset values based on historical volatility."
                            variant="pro"
                        />
                        <FeatureCard
                            icon={<TrendingDown className="w-8 h-8" />}
                            title="Delta_Alert_Mesh"
                            description="Universal notification pipeline via Telegram, Push, and Neural_Link."
                            variant="glass"
                        />
                    </div>
                </section>

                {/* Stats Section */}
                <section className="container mx-auto px-6 py-20">
                    <GlassCard variant="pro" className="p-12 border-border/10 dark:border-white/10 bg-surface/10 dark:bg-white/[0.01]">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center relative">
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-around pointer-events-none opacity-5">
                                {[1, 2, 3].map(i => <div key={i} className="w-[1px] h-20 bg-primary" />)}
                            </div>
                            <StatItem value="128K+" label="DATA_NODES" />
                            <StatItem value="€4.2M" label="CAPITAL_PRESERVED" />
                            <StatItem value="3" label="ACTIVE_DOMAINS" />
                            <StatItem value="24/7" label="ENGINE_UPTIME" />
                        </div>
                    </GlassCard>
                </section>

                {/* How It Works */}
                <section className="container mx-auto px-6 py-32 border-t border-border/10 dark:border-white/[0.03]">
                    <div className="text-center mb-20">
                        <div className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4">Onboarding_Sequence</div>
                        <h2 className="text-4xl md:text-5xl font-black text-text-primary mb-6 uppercase italic">
                            Initialize <span className="text-primary">Tracking</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto stagger-children">
                        <StepCard
                            number="01"
                            title="ASSET_INB_QUEUE"
                            description="Inject product URL into the monitoring cluster."
                        />
                        <StepCard
                            number="02"
                            title="THRESHOLD_CONFIG"
                            description="Define target delta or enable Neural_Price_Logic."
                        />
                        <StepCard
                            number="03"
                            title="REALTIME_DISPATCH"
                            description="Instant notification on threshold collision."
                        />
                    </div>
                </section>

                {/* CTA Section */}
                <section className="container mx-auto px-6 py-32 text-center border-t border-border/10 dark:border-white/[0.03]">
                    <GlassCard variant="pro" className="max-w-4xl mx-auto py-20 px-10 border-primary/20 bg-primary/[0.03]">
                        <h2 className="text-4xl md:text-6xl font-black text-text-primary mb-8 uppercase italic leading-none">
                            Ready to <span className="text-gradient">Secure Yield</span>?
                        </h2>
                        <p className="text-lg text-text-secondary mb-12 uppercase tracking-widest opacity-80">
                            Join the high-frequency asset monitoring network.
                        </p>
                        <GlowButton
                            variant="primary"
                            size="lg"
                            className="min-w-[280px]"
                            onClick={() => window.location.href = '/register'}
                        >
                            CREATE_FREE_ACCOUNT
                            <ChevronRight className="w-6 h-6 ml-2" />
                        </GlowButton>
                        <p className="mt-8 text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">
                            System Access: Restricted to <span className="text-primary">5 Assets</span> for Free Tier
                        </p>
                    </GlassCard>
                </section>

                {/* Footer */}
                <footer className="border-t border-border/10 dark:border-white/[0.05] py-16 bg-surface/50 dark:bg-black transition-colors duration-500">
                    <div className="container mx-auto px-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-12 text-text-tertiary">
                            <div className="flex flex-col items-center md:items-start gap-2">
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="w-5 h-5 text-primary" />
                                    <span className="font-black text-text-primary uppercase tracking-tighter">MarktMinder</span>
                                </div>
                                <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                                    Autonomous_Asset_Sentry_Cluster
                                </span>
                            </div>
                            <div className="flex items-center gap-8 text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">
                                {['privacy', 'terms', 'impressum', 'contact'].map(item => (
                                    <Link key={item} href={`/${item}`} className="hover:text-primary transition-colors">{item}</Link>
                                ))}
                            </div>
                            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest opacity-50">
                                © 2026 MARKT_MINDER_CORE. ALL_RIGHTS_RESERVED.
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
    variant = 'default'
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    variant?: 'default' | 'elevated' | 'interactive' | 'pro' | 'glass';
}) {
    return (
        <GlassCard variant={variant} className="animate-reveal group p-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:shadow-glow transition-all duration-500 border border-primary/20">
                {icon}
            </div>
            <h3 className="text-sm font-black text-text-primary mb-3 uppercase tracking-widest group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-xs text-text-secondary leading-relaxed uppercase tracking-tight opacity-70">{description}</p>
        </GlassCard>
    );
}

function StatItem({ value, label }: { value: string; label: string }) {
    return (
        <div className="group">
            <div className="text-4xl md:text-5xl font-black text-text-primary mb-2 tracking-tighter group-hover:text-primary transition-colors">{value}</div>
            <div className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] group-hover:opacity-100 transition-opacity">{label}</div>
        </div>
    );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
    return (
        <div className="animate-reveal text-center group">
            <div className="w-20 h-20 bg-surface/50 border border-border/10 rounded-3xl flex items-center justify-center text-primary text-2xl font-black mx-auto mb-8 shadow-glow-sm group-hover:shadow-glow group-hover:border-primary/30 transition-all duration-500 backdrop-blur-xl">
                {number}
            </div>
            <h3 className="text-sm font-black text-text-primary mb-3 uppercase tracking-widest group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-xs text-text-tertiary uppercase tracking-tight leading-relaxed">{description}</p>
        </div>
    );
}
