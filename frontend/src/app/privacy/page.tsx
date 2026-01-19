'use client';

import Link from 'next/link';
import { TrendingDown, ArrowLeft, Shield } from 'lucide-react';
import PriceParticles from '@/components/PriceParticles';
import { GlassCard } from '@/components/ui/GlassCard';

export default function PrivacyPage() {
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
                        <div className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4">Security_Protocol</div>
                        <h1 className="text-4xl md:text-5xl font-black text-text-primary mb-4 uppercase italic leading-none">
                            Privacy <span className="text-primary">Policy</span>
                        </h1>
                        <p className="text-text-tertiary uppercase tracking-widest text-xs opacity-80">Last Revision_Cycle: January 1, 2026</p>
                    </div>

                    <GlassCard className="p-8 md:p-12 space-y-12">
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                                    <Shield className="w-5 h-5 text-primary" />
                                </div>
                                <h2 className="text-xl font-black text-text-primary uppercase italic tracking-wider">1. Data_Encryption_Standards</h2>
                            </div>
                            <p className="text-text-secondary leading-relaxed font-medium">
                                MarktMinder ("we", "our", or "us") respects your privacy and is committed to protecting your personal data.
                                All ingestion cycles use enterprise-grade encryption protocols to ensure the integrity of your monitored assets.
                            </p>
                        </section>

                        <section className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em] mb-4">Collected_Metrics</h3>
                                <ul className="space-y-3">
                                    {['Account_Credentials', 'Asset_Identifiers (URLs)', 'User_Interaction_Logs', 'System_Technical_Data'].map((item) => (
                                        <li key={item} className="flex items-center gap-2 text-text-tertiary text-sm font-mono">
                                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em] mb-4">Utilization_Flow</h3>
                                <ul className="space-y-3">
                                    {['Service_Continuity', 'Signal_Relay_Dispatch', 'System_Optimization', 'Protocol_Security'].map((item) => (
                                        <li key={item} className="flex items-center gap-2 text-text-tertiary text-sm font-mono">
                                            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>

                        <section className="border-t border-white/[0.05] pt-12">
                            <h2 className="text-xl font-black text-text-primary uppercase italic tracking-wider mb-6">2. Rights_And_Compliance (GDPR)</h2>
                            <p className="text-text-secondary leading-relaxed mb-6 font-medium">
                                Under the General Data Protection Regulation (GDPR), users maintain full control over their data indices.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {['Data_Access', 'Index_Correction', 'Asset_Deletion', 'Processing_Restriction', 'Portability', 'Consent_Withdrawal'].map((right) => (
                                    <div key={right} className="px-4 py-3 bg-surface-hover/50 rounded-xl border border-white/[0.03] text-[10px] font-black text-text-tertiary uppercase tracking-widest text-center">
                                        {right}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="border-t border-white/[0.05] pt-12">
                            <h2 className="text-xl font-black text-text-primary uppercase italic tracking-wider mb-6">3. Technical_Contact</h2>
                            <p className="text-text-secondary leading-relaxed font-medium">
                                For inquiries regarding data security protocols, establish contact via the following endpoint:
                            </p>
                            <Link
                                href="mailto:privacy@marktminder.de"
                                className="inline-block mt-4 text-primary font-mono text-lg hover:underline underline-offset-8 decoration-primary/30"
                            >
                                privacy@marktminder.de
                            </Link>
                        </section>
                    </GlassCard>
                </main>

                {/* Footer */}
                <footer className="border-t border-border/10 dark:border-white/[0.05] py-12 bg-surface/50 dark:bg-black/20 transition-colors duration-500">
                    <div className="container mx-auto px-6 text-center text-text-tertiary text-[10px] font-black uppercase tracking-[0.2em]">
                        © 2026 MarktMinder // Privacy_Engine_v1.0
                    </div>
                </footer>
            </div>
        </div>
    );
}
