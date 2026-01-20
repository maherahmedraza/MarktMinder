'use client';

import Link from 'next/link';
import { TrendingDown, ArrowLeft, BookOpen, Code, Terminal, FileText, Search, Play } from 'lucide-react';
import PriceParticles from '@/components/PriceParticles';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';

export default function DocsPage() {
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
                        <div className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4 text-center">Documentation_Hub</div>
                        <h1 className="text-4xl md:text-6xl font-black text-text-primary mb-6 uppercase italic leading-none">
                            System <span className="text-primary">Knowledge</span>
                        </h1>
                        <p className="text-lg text-text-tertiary max-w-2xl mx-auto uppercase tracking-widest opacity-80 decoration-primary/30">
                            Technical specifications and integration guides for the MarktMinder platform.
                        </p>
                    </div>

                    {/* Search Bar Placeholder */}
                    <div className="max-w-2xl mx-auto mb-20">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search className="w-5 h-5 text-text-tertiary group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="SEARCH_SYSTEM_DOCS..."
                                className="w-full bg-surface/50 border border-border/20 rounded-2xl py-4 pl-12 pr-4 text-text-primary placeholder:text-text-tertiary/50 focus:outline-none focus:border-primary/50 focus:bg-surface transition-all font-mono text-sm tracking-widest"
                            />
                        </div>
                    </div>

                    {/* Docs Sections */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <GlassCard className="p-8 group hover:border-primary/40 transition-all">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary mb-6 border border-primary/20">
                                <Play className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-text-primary mb-4 uppercase italic">Quick_Start</h3>
                            <p className="text-text-tertiary text-sm leading-relaxed mb-6">Learn how to initialize your first tracking session in under 3 minutes.</p>
                            <Link href="#" className="text-primary text-xs font-black uppercase tracking-widest hover:underline">RUN_STUP_WIZARD &gt;</Link>
                        </GlassCard>

                        <GlassCard className="p-8 group hover:border-blue-500/40 transition-all">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500 mb-6 border border-blue-500/20">
                                <Terminal className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-text-primary mb-4 uppercase italic">API_Reference</h3>
                            <p className="text-text-tertiary text-sm leading-relaxed mb-6">Comprehensive documentation for REST and GraphQL endpoints.</p>
                            <Link href="#" className="text-blue-500 text-xs font-black uppercase tracking-widest hover:underline">ACCESS_ENDPOINTS &gt;</Link>
                        </GlassCard>

                        <GlassCard className="p-8 group hover:border-purple-500/40 transition-all">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500 mb-6 border border-purple-500/20">
                                <Code className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-text-primary mb-4 uppercase italic">Integrations</h3>
                            <p className="text-text-tertiary text-sm leading-relaxed mb-6">Native SDKs and webhook documentation for third-party systems.</p>
                            <Link href="#" className="text-purple-500 text-xs font-black uppercase tracking-widest hover:underline">VIEW_LIBRARIES &gt;</Link>
                        </GlassCard>
                    </div>

                    {/* Footer Warning Section */}
                    <div className="mt-32">
                        <GlassCard className="p-8 border-yellow-500/20 bg-yellow-500/5 flex items-start gap-4">
                            <FileText className="w-6 h-6 text-yellow-500 shrink-0 mt-1" />
                            <div>
                                <h4 className="font-black text-text-primary uppercase tracking-widest italic mb-2">Technical_Bulletin</h4>
                                <p className="text-text-tertiary text-sm">All documentation is currently being updated for System v2.1. Some API parameters may reflect the legacy protocol during this transition period.</p>
                            </div>
                        </GlassCard>
                    </div>
                </main>

                {/* Footer */}
                <footer className="border-t border-border/10 dark:border-white/[0.05] py-12 bg-surface/50 dark:bg-black/20 transition-colors duration-500">
                    <div className="container mx-auto px-6 text-center text-text-tertiary text-[10px] font-black uppercase tracking-[0.2em]">
                        © 2026 MarktMinder // Documentation Repository v1.0.4
                    </div>
                </footer>
            </div>
        </div>
    );
}
