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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-800"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background text-text-primary transition-colors duration-300">
            {/* The Grid Background for Depth */}
            <div className="fixed inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
            <div className="fixed inset-0 bg-pulse-scan pointer-events-none" />

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-72 bg-surface border-r border-border transform transition-all duration-300 ease-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo Section */}
                    <div className="flex items-center justify-between h-24 px-8 border-b border-border/50">
                        <Link href="/dashboard" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
                                <TrendingDown className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-black tracking-tight text-text-primary">MarktMinder</span>
                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] -mt-1">Neural Core</span>
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
                    <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto scrollbar-hide">
                        <p className="px-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-4">Operations</p>
                        <NavLink href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />}>
                            Command Center
                        </NavLink>
                        <NavLink href="/dashboard/deals" icon={<Sparkles className="w-5 h-5" />}>
                            Deal Radar
                        </NavLink>
                        <NavLink href="/dashboard/products" icon={<Package className="w-5 h-5" />}>
                            Asset Ledger
                        </NavLink>
                        <NavLink href="/dashboard/watchlist" icon={<Star className="w-5 h-5" />}>
                            High Priority
                        </NavLink>

                        <div className="mt-8 pt-6 border-t border-border/10">
                            <p className="px-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-4">Protocols</p>
                            <NavLink href="/dashboard/alerts" icon={<Bell className="w-5 h-5" />}>
                                Signal Alerts
                            </NavLink>
                            <NavLink href="/dashboard/settings" icon={<Settings className="w-5 h-5" />}>
                                System Config
                            </NavLink>
                        </div>
                    </nav>

                    {/* User section */}
                    <div className="p-6 border-t border-border/50 bg-surface-elevated/50 backdrop-blur-md">
                        <div className="flex items-center gap-4 px-3 py-3 rounded-2xl bg-surface/50 border border-border/30">
                            <div className="w-10 h-10 bg-primary/20 text-primary border border-primary/30 rounded-full flex items-center justify-center font-black shadow-glow-sm">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-text-primary truncate">{user?.name}</p>
                                <p className="text-[10px] text-text-tertiary font-bold truncate uppercase tracking-wider">{user?.role || 'Operator'}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-tertiary hover:text-error hover:bg-error/5 border border-transparent hover:border-error/20 rounded-xl transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            Terminate Session
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-72 flex flex-col min-h-screen">
                {/* Top bar */}
                <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
                    <div className="flex items-center justify-between h-20 px-4 lg:px-10">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <div className="flex-1 lg:block hidden">
                            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">
                                System Status: <span className="text-success">Nominal</span> // Latency: 24ms
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            <div className="hidden sm:block h-8 w-px bg-border/50 mx-2" />
                            <GlowButton
                                onClick={() => router.push('/dashboard/products/add')}
                                size="sm"
                                className="hidden sm:flex"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Asset
                            </GlowButton>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6 lg:p-10 relative z-10">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </main>

                {/* Footer Insight */}
                <footer className="py-6 px-10 border-t border-border/10 text-center">
                    <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-[0.5em] opacity-30">
                        MarktMinder v2.0 // Quantum Data Sequencing Interface
                    </p>
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
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 group ${isActive
                ? 'bg-primary/10 text-primary shadow-glow-sm border border-primary/20'
                : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover hover:translate-x-1'
                }`}
        >
            <div className={`transition-colors ${isActive ? 'text-primary' : 'group-hover:text-primary'} overflow-visible`}>
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
