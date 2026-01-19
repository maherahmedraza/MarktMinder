'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth, AuthProvider } from '@/lib/auth';
import {
    TrendingDown,
    LayoutDashboard,
    Package,
    Bell,
    Settings,
    LogOut,
    Menu,
    X,
    Plus,
    Star,
    Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GlowButton } from '@/components/ui/GlowButton';
import { PriceParticles } from '@/components/PriceParticles';

function DashboardLayoutContent({ children }: { children: ReactNode }) {
    const { user, isLoading, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <TrendingDown className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-primary animate-pulse" />
                </div>
                <p className="mt-8 text-[10px] font-black text-text-tertiary uppercase tracking-[0.4em] animate-pulse">Initializing Neural Interface...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background text-text-primary transition-colors duration-300 relative">
            {/* The Interactive Background for Dashboard */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
                <PriceParticles className="opacity-[0.15] dark:opacity-[0.08]" particleCount={40} interactive={false} />
                <div className="absolute inset-0 bg-pulse-scan" />
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-72 bg-surface/80 backdrop-blur-2xl border-r border-border transform transition-all duration-500 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full uppercase">
                    {/* Logo Section */}
                    <div className="flex items-center justify-between h-24 px-8 border-b border-border/50">
                        <Link href="/dashboard" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-glow-sm group-hover:shadow-glow transition-all duration-500">
                                <TrendingDown className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-black tracking-tighter text-text-primary italic">Markt<span className="text-primary">Minder</span></span>
                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] -mt-1">Neural_Core_v2</span>
                            </div>
                        </Link>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 text-text-tertiary hover:text-text-primary transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto scrollbar-hide">
                        <p className="px-4 text-[9px] font-black text-text-tertiary uppercase tracking-[0.4em] mb-4 opacity-50">Operation_Clusters</p>
                        <NavLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>
                            Command_Center
                        </NavLink>
                        <NavLink href="/dashboard/deals" icon={<Sparkles className="w-4 h-4" />}>
                            Deal_Radar
                        </NavLink>
                        <NavLink href="/dashboard/products" icon={<Package className="w-4 h-4" />}>
                            Asset_Ledger
                        </NavLink>
                        <NavLink href="/dashboard/watchlist" icon={<Star className="w-4 h-4" />}>
                            High_Priority
                        </NavLink>

                        <div className="mt-8 pt-8 border-t border-border/10">
                            <p className="px-4 text-[9px] font-black text-text-tertiary uppercase tracking-[0.4em] mb-4 opacity-50">System_Protocols</p>
                            <NavLink href="/dashboard/alerts" icon={<Bell className="w-4 h-4" />}>
                                Signal_Alerts
                            </NavLink>
                            <NavLink href="/dashboard/settings" icon={<Settings className="w-4 h-4" />}>
                                System_Config
                            </NavLink>
                        </div>
                    </nav>

                    {/* User section */}
                    <div className="p-6 border-t border-border/10">
                        <div className="flex items-center gap-4 px-3 py-3 rounded-2xl bg-surface/50 border border-border/30 group hover:border-primary/30 transition-all cursor-pointer">
                            <div className="w-10 h-10 bg-primary/10 text-primary border border-primary/20 rounded-xl flex items-center justify-center font-black shadow-glow-sm group-hover:shadow-glow transition-all">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-text-primary truncate">{user?.name || 'Operator'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                    <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest">{user?.role || 'Active_Entity'}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary hover:text-error hover:bg-error/5 border border-transparent hover:border-error/20 rounded-xl transition-all"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Terminate_Session
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-72 flex flex-col min-h-screen relative z-10">
                {/* Top bar */}
                <header className="sticky top-0 z-30 bg-background/50 backdrop-blur-2xl border-b border-border/10">
                    <div className="flex items-center justify-between h-20 px-4 lg:px-10">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <div className="flex-1 lg:block hidden">
                            <div className="flex items-center gap-6">
                                <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.4em]">
                                    System Status: <span className="text-success">Nominal</span>
                                </p>
                                <div className="h-4 w-px bg-border/20" />
                                <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.4em]">
                                    Uptime: <span className="text-text-primary">99.99%</span>
                                </p>
                                <div className="h-4 w-px bg-border/20" />
                                <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.4em]">
                                    Nodes: <span className="text-primary italic">Cloud_Cluster_07</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            <div className="hidden sm:block h-8 w-px bg-border/20 mx-2" />
                            <GlowButton
                                onClick={() => router.push('/dashboard/products/add')}
                                size="sm"
                                className="hidden sm:flex"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                ADD_ASSET
                            </GlowButton>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 lg:p-10">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </main>

                {/* Footer Insight */}
                <footer className="py-8 px-10 border-t border-border/10 bg-black/[0.02]">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-30">
                        <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.5em]">
                            MARKT_MINDER_CORE // V2.0.4-STABLE
                        </p>
                        <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.3em]">
                            Quantum_Data_Sequencing_Interface
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function NavLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            className={`flex items-center gap-4 px-5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 group ${isActive
                ? 'bg-primary/10 text-primary shadow-glow-sm border border-primary/20'
                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover hover:translate-x-1'
                }`}
        >
            <div className={`transition-all duration-500 ${isActive ? 'text-primary scale-110' : 'group-hover:text-primary group-hover:scale-110'}`}>
                {icon}
            </div>
            {children}
        </Link>
    );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </AuthProvider>
    );
}
