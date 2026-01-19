'use client';

import Link from 'next/link';
import { TrendingDown, ArrowLeft, FileText, Scale } from 'lucide-react';
import PriceParticles from '@/components/PriceParticles';
import { GlassCard } from '@/components/ui/GlassCard';

export default function TermsPage() {
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

                <main className="flex-1 container mx-auto px-6 py-16 max-w-4xl">
                    <div className="mb-12 animate-reveal">
                        <div className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4">Legal_Framework</div>
                        <h1 className="text-4xl md:text-5xl font-black text-text-primary mb-4 uppercase italic leading-none">
                            Terms <span className="text-primary">Of_Service</span>
                        </h1>
                        <p className="text-text-tertiary uppercase tracking-widest text-xs opacity-80">System_Deployment: January 1, 2026</p>
                    </div>

                    <GlassCard className="p-8 md:p-12 space-y-12">
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                                    <Scale className="w-5 h-5 text-primary" />
                                </div>
                                <h2 className="text-xl font-black text-text-primary uppercase italic tracking-wider">1. Protocol_Access_Agreement</h2>
                            </div>
                            <p className="text-text-secondary leading-relaxed font-medium">
                                By accessing or using the MarktMinder environment, you agree to be bound by these System Terms.
                                Unauthorized entry into restricted service layers is strictly prohibited.
                            </p>
                        </section>

                        <section className="grid md:grid-cols-2 gap-8">
                            <div className="bg-surface-hover/30 p-6 rounded-2xl border border-white/[0.03]">
                                <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">User_Obligations</h3>
                                <ul className="space-y-3">
                                    {['Credential_Security', 'Data_Accuracy', 'System_Integrity', 'Authorized_Use'].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-text-secondary text-xs font-mono">
                                            <div className="w-1 h-1 bg-primary rounded-full" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-surface-hover/30 p-6 rounded-2xl border border-white/[0.03]">
                                <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Restricted_Actions</h3>
                                <ul className="space-y-3">
                                    {['Reverse_Engineering', 'Automated_Extraction', 'Resource_Flooding', 'Credential_Sharing'].map((item) => (
                                        <li key={item} className="flex items-center gap-3 text-text-secondary text-xs font-mono">
                                            <div className="w-1 h-1 bg-red-500/50 rounded-full" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>

                        <section className="border-t border-white/[0.05] pt-12">
                            <h2 className="text-xl font-black text-text-primary uppercase italic tracking-wider mb-6">2. Data_Reliability_Notice</h2>
                            <p className="text-text-secondary leading-relaxed font-medium">
                                While our scraping modules target 99.9% accuracy, market volatility may result in millisecond discordance between our readings and live retailer endpoints.
                                Verify all metrics before executing external transactions.
                            </p>
                        </section>

                        <section className="border-t border-white/[0.05] pt-12">
                            <h2 className="text-xl font-black text-text-primary uppercase italic tracking-wider mb-6">3. Jurisdiction_Module</h2>
                            <p className="text-text-secondary leading-relaxed font-medium mb-6">
                                These terms are governed by the laws of the Federal Republic of Germany.
                                Disputes shall be subject to the exclusive jurisdiction of the regional courts.
                            </p>
                            <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <FileText className="w-5 h-5 text-primary shrink-0 mt-1" />
                                <p className="text-[10px] text-text-tertiary uppercase tracking-widest leading-relaxed">
                                    Legal_Entity: MarktMinder GmbH // Registry: Berlin-Charlottenburg HRB 123456
                                </p>
                            </div>
                        </section>

                        <section className="border-t border-white/[0.05] pt-12">
                            <h2 className="text-xl font-black text-text-primary uppercase italic tracking-wider mb-6">4. Contact_Relay</h2>
                            <p className="text-text-secondary leading-relaxed font-medium">
                                For inquiries regarding legal protocols, establish contact via the following endpoint:
                            </p>
                            <Link
                                href="mailto:legal@marktminder.de"
                                className="inline-block mt-4 text-primary font-mono text-lg hover:underline underline-offset-8 decoration-primary/30"
                            >
                                legal@marktminder.de
                            </Link>
                        </section>
                    </GlassCard>
                </main>

                {/* Footer */}
                <footer className="border-t border-border/10 dark:border-white/[0.05] py-12 bg-surface/50 dark:bg-black/20 transition-colors duration-500">
                    <div className="container mx-auto px-6 text-center text-text-tertiary text-[10px] font-black uppercase tracking-[0.2em]">
                        © 2026 MarktMinder // System_Terms_v1.2.4
                    </div>
                </footer>
            </div>
        </div>
    );
}
