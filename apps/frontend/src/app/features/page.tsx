'use client';

import Link from 'next/link';
import { TrendingDown, ArrowLeft, BarChart3, Bell, Globe, Zap, Shield, Cpu } from 'lucide-react';
import { PriceParticles } from '@/components/PriceParticles';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { useTranslations } from 'next-intl';

export default function FeaturesPage() {
    const t = useTranslations('features');

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
                                {t('header.returnBase')}
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="flex-1 container mx-auto px-6 py-16 max-w-7xl">
                    {/* Hero */}
                    <div className="text-center mb-20 animate-reveal">
                        <div className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4 text-center">{t('hero.badge')}</div>
                        <h1 className="text-4xl md:text-6xl font-black text-text-primary mb-6 uppercase italic leading-none">
                            {t('hero.title')} <span className="text-primary">{t('hero.titleAccent')}</span>
                        </h1>
                        <p className="text-lg text-text-tertiary max-w-2xl mx-auto uppercase tracking-widest opacity-80 decoration-primary/30">
                            {t('hero.subtitle')}
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
                        {[
                            {
                                icon: <BarChart3 className="w-6 h-6" />,
                                title: t('grid.analytics.title'),
                                desc: t('grid.analytics.desc'),
                                color: "text-blue-500"
                            },
                            {
                                icon: <Bell className="w-6 h-6" />,
                                title: t('grid.signal.title'),
                                desc: t('grid.signal.desc'),
                                color: "text-primary"
                            },
                            {
                                icon: <Globe className="w-6 h-6" />,
                                title: t('grid.radar.title'),
                                desc: t('grid.radar.desc'),
                                color: "text-purple-500"
                            },
                            {
                                icon: <Zap className="w-6 h-6" />,
                                title: t('grid.forecast.title'),
                                desc: t('grid.forecast.desc'),
                                color: "text-yellow-500"
                            },
                            {
                                icon: <Shield className="w-6 h-6" />,
                                title: t('grid.security.title'),
                                desc: t('grid.security.desc'),
                                color: "text-green-500"
                            },
                            {
                                icon: <Cpu className="w-6 h-6" />,
                                title: t('grid.scrapers.title'),
                                desc: t('grid.scrapers.desc'),
                                color: "text-orange-500"
                            }
                        ].map((item, i) => (
                            <GlassCard key={i} className="p-8 group hover:border-primary/40 transition-all">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-surface-hover/50 mb-6 ${item.color} border border-current/10`}>
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-black text-text-primary mb-4 uppercase italic">{item.title}</h3>
                                <p className="text-text-tertiary text-sm leading-relaxed">{item.desc}</p>
                            </GlassCard>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="text-center mt-32">
                        <GlassCard variant="pro" className="max-w-3xl mx-auto p-12 border-primary/20 bg-primary/[0.03]">
                            <h2 className="text-3xl font-black text-text-primary mb-8 uppercase italic">{t('cta.title')}</h2>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href="/register">
                                    <GlowButton className="w-full sm:w-auto px-12">{t('cta.createAccount')}</GlowButton>
                                </Link>
                                <Link href="/pricing">
                                    <GlowButton variant="outline" className="w-full sm:w-auto px-12">{t('cta.viewSubs')}</GlowButton>
                                </Link>
                            </div>
                        </GlassCard>
                    </div>
                </main>

                {/* Footer */}
                <footer className="border-t border-border/10 dark:border-white/[0.05] py-12 bg-surface/50 dark:bg-black/20 transition-colors duration-500">
                    <div className="container mx-auto px-6 text-center text-text-tertiary text-[10px] font-black uppercase tracking-[0.2em]">
                        © 2026 MarktMinder // System Status: Fully Operational
                    </div>
                </footer>
            </div>
        </div>
    );
}
