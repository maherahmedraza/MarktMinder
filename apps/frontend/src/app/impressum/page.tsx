'use client';

import Link from 'next/link';
import { TrendingDown, ArrowLeft, Info, Landmark, Mail, Phone, ExternalLink } from 'lucide-react';
import PriceParticles from '@/components/PriceParticles';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTranslations } from 'next-intl';

export default function ImpressumPage() {
    const t = useTranslations('impressum');

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

                <main className="flex-1 container mx-auto px-6 py-16 max-w-4xl">
                    <div className="mb-12 animate-reveal">
                        <div className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4">{t('header.badge')}</div>
                        <h1 className="text-4xl md:text-5xl font-black text-text-primary mb-4 uppercase italic leading-none">
                            {t('header.title')} <span className="text-primary">{t('header.titleAccent')}</span>
                        </h1>
                        <p className="text-text-tertiary uppercase tracking-widest text-xs opacity-80">{t('header.subtitle')}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 mb-8">
                        <GlassCard className="p-6">
                            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Landmark className="w-4 h-4" /> {t('sections.provider.title')}
                            </h3>
                            <div className="text-text-secondary text-sm font-medium space-y-1">
                                <p className="text-text-primary font-black">{t('sections.provider.name')}</p>
                                <p>{t('sections.provider.address')}</p>
                                <p>{t('sections.provider.city')}</p>
                                <p>{t('sections.provider.country')}</p>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Mail className="w-4 h-4" /> {t('sections.contact.title')}
                            </h3>
                            <div className="text-text-secondary text-sm font-medium space-y-3">
                                <a href="mailto:kontakt@marktminder.de" className="block text-primary hover:underline">kontakt@marktminder.de</a>
                                <p className="flex items-center gap-2 font-mono"><Phone className="w-3 h-3 op-50" /> +49 (0) 30 12345</p>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Info className="w-4 h-4" /> {t('sections.register.title')}
                            </h3>
                            <div className="text-text-secondary text-sm font-medium space-y-1">
                                <p>{t('sections.register.court')}</p>
                                <p className="font-mono text-xs opacity-70">{t('sections.register.number')}</p>
                                <p className="mt-2">{t('sections.register.vatId')}</p>
                                <p className="font-mono text-xs text-text-primary">{t('sections.register.vatNumber')}</p>
                            </div>
                        </GlassCard>
                    </div>

                    <GlassCard className="p-8 md:p-12 space-y-12 mb-12">
                        <section>
                            <h2 className="text-xl font-black text-text-primary uppercase italic tracking-wider mb-6">{t('sections.dispute.title')}</h2>
                            <p className="text-text-secondary leading-relaxed mb-6 font-medium">
                                {t('sections.dispute.content')}
                            </p>
                            <a
                                href="https://ec.europa.eu/consumers/odr/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-surface-hover/50 px-4 py-3 rounded-xl border border-white/[0.05] text-primary font-mono text-xs transition-colors hover:bg-surface-hover hover:border-primary/30"
                            >
                                https://ec.europa.eu/consumers/odr/ <ExternalLink className="w-3 h-3" />
                            </a>
                            <p className="text-text-tertiary text-xs mt-6 font-medium leading-relaxed italic opacity-70">
                                {t('sections.dispute.note')}
                            </p>
                        </section>

                        <section className="border-t border-white/[0.05] pt-12">
                            <h2 className="text-xl font-black text-text-primary uppercase italic tracking-wider mb-6">{t('sections.liability.title')}</h2>
                            <p className="text-text-secondary leading-relaxed font-medium">
                                {t('sections.liability.content')}
                            </p>
                        </section>

                        <section className="border-t border-white/[0.05] pt-12">
                            <h2 className="text-xl font-black text-text-primary uppercase italic tracking-wider mb-6">{t('sections.copyright.title')}</h2>
                            <p className="text-text-secondary leading-relaxed font-medium">
                                {t('sections.copyright.content')}
                            </p>
                        </section>
                    </GlassCard>
                </main>

                {/* Footer */}
                <footer className="border-t border-border/10 dark:border-white/[0.05] py-12 bg-surface/50 dark:bg-black/20 transition-colors duration-500">
                    <div className="container mx-auto px-6 text-center text-text-tertiary text-[10px] font-black uppercase tracking-[0.2em]">
                        {t('footer')}
                    </div>
                </footer>
            </div>
        </div>
    );
}
