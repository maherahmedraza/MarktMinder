'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrendingDown, ArrowLeft, Mail, MessageSquare, Send, Loader2, CheckCircle, Smartphone } from 'lucide-react';
import PriceParticles from '@/components/PriceParticles';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { useTranslations } from 'next-intl';

export default function ContactPage() {
    const t = useTranslations('contact');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);

        // Simulate form submission
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSubmitted(true);
        setIsLoading(false);
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
                                {t('header.returnBase')}
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="flex-1 container mx-auto px-6 py-16 max-w-6xl">
                    <div className="text-center mb-16 animate-reveal">
                        <div className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4">{t('header.badge')}</div>
                        <h1 className="text-4xl md:text-6xl font-black text-text-primary mb-6 uppercase italic leading-none">
                            {t('header.title')} <span className="text-primary">{t('header.titleAccent')}</span>
                        </h1>
                        <p className="text-lg text-text-tertiary max-w-2xl mx-auto uppercase tracking-widest opacity-80 font-medium">
                            {t('header.subtitle')}
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-5 gap-12 items-start">
                        {/* Status Panel */}
                        <div className="lg:col-span-2 space-y-6">
                            <GlassCard className="p-8">
                                <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-8">{t('info.title')}</h3>

                                <div className="space-y-10">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                                            <Mail className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-text-primary uppercase italic mb-1">{t('info.support.title')}</h4>
                                            <a href="mailto:support@marktminder.de" className="text-primary font-mono text-sm hover:underline italic">support@marktminder.de</a>
                                            <p className="text-[10px] text-text-tertiary uppercase mt-2 font-black tracking-widest">{t('info.support.latency')}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 bg-surface-hover/50 rounded-xl flex items-center justify-center border border-white/[0.05] shrink-0">
                                            <MessageSquare className="w-6 h-6 text-text-secondary" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-text-primary uppercase italic mb-1">{t('info.bulletins.title')}</h4>
                                            <p className="text-text-tertiary text-sm leading-relaxed">{t('info.bulletins.content')}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 bg-surface-hover/50 rounded-xl flex items-center justify-center border border-white/[0.05] shrink-0">
                                            <Smartphone className="w-6 h-6 text-text-secondary" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-text-primary uppercase italic mb-1">{t('info.mobile.title')}</h4>
                                            <p className="text-text-tertiary text-sm leading-relaxed">{t('info.mobile.content')}</p>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>

                            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-4">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">{t('info.status')}</span>
                            </div>
                        </div>

                        {/* Message Terminal */}
                        <div className="lg:col-span-3">
                            <GlassCard variant="interactive" className="p-8 md:p-12">
                                {isSubmitted ? (
                                    <div className="text-center py-12 animate-reveal">
                                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-glow-green">
                                            <CheckCircle className="w-10 h-10 text-green-500" />
                                        </div>
                                        <h3 className="text-2xl font-black text-text-primary mb-4 uppercase italic">{t('form.success.title')}</h3>
                                        <p className="text-text-tertiary mb-10 max-w-sm mx-auto uppercase tracking-widest text-sm">
                                            {t('form.success.content')}
                                        </p>
                                        <GlowButton
                                            variant="outline"
                                            onClick={() => {
                                                setIsSubmitted(false);
                                                setName('');
                                                setEmail('');
                                                setSubject('');
                                                setMessage('');
                                            }}
                                        >
                                            {t('form.success.button')}
                                        </GlowButton>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label htmlFor="name" className="block text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">{t('form.name')}</label>
                                                <input
                                                    id="name"
                                                    type="text"
                                                    required
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full bg-surface-hover/50 border border-white/[0.08] rounded-xl px-5 py-3 text-text-primary focus:outline-none focus:border-primary/50 focus:bg-surface-hover transition-all font-mono"
                                                    placeholder={t('form.namePlaceholder')}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="email" className="block text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">{t('form.email')}</label>
                                                <input
                                                    id="email"
                                                    type="email"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full bg-surface-hover/50 border border-white/[0.08] rounded-xl px-5 py-3 text-text-primary focus:outline-none focus:border-primary/50 focus:bg-surface-hover transition-all font-mono"
                                                    placeholder={t('form.emailPlaceholder')}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="subject" className="block text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">{t('form.subject')}</label>
                                            <input
                                                id="subject"
                                                type="text"
                                                required
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                className="w-full bg-surface-hover/50 border border-white/[0.08] rounded-xl px-5 py-3 text-text-primary focus:outline-none focus:border-primary/50 focus:bg-surface-hover transition-all font-mono"
                                                placeholder={t('form.subjectPlaceholder')}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="message" className="block text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">{t('form.message')}</label>
                                            <textarea
                                                id="message"
                                                required
                                                rows={6}
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                className="w-full bg-surface-hover/50 border border-white/[0.08] rounded-xl px-5 py-3 text-text-primary focus:outline-none focus:border-primary/50 focus:bg-surface-hover transition-all font-mono resize-none"
                                                placeholder={t('form.messagePlaceholder')}
                                            />
                                        </div>

                                        <div className="pt-4">
                                            <GlowButton
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full"
                                                isLoading={isLoading}
                                            >
                                                {t('form.submit')}
                                            </GlowButton>
                                        </div>
                                    </form>
                                )}
                            </GlassCard>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="border-t border-border/10 dark:border-white/[0.05] py-12 bg-surface/50 dark:bg-black/20 transition-colors duration-500 mt-12">
                    <div className="container mx-auto px-6 text-center text-text-tertiary text-[10px] font-black uppercase tracking-[0.2em]">
                        {t('footer')}
                    </div>
                </footer>
            </div>
        </div>
    );
}
