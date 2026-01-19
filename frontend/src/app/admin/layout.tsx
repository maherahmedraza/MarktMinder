'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
    LayoutDashboard,
    Package,
    Users,
    BarChart3,
    LogOut,
    Menu,
    X,
    Shield,
    Terminal,
    Command,
    ArrowLeft
} from 'lucide-react';

function AdminLayoutContent({ children }: { children: ReactNode }) {
    const { user, isLoading, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Admin email check (same as backend)
    const adminEmails = ['admin@marktminder.de'];
    const isAdmin = user && adminEmails.includes(user.email);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        } else if (!isLoading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isLoading, isAuthenticated, isAdmin, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background text-text-primary transition-colors duration-500 selection:bg-primary/30">
            {/* Background Pulse Effect */}
            <div className="fixed inset-0 bg-pulse-scan pointer-events-none opacity-50" />

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-72 bg-surface/80 backdrop-blur-xl border-r border-border transform transition-transform duration-500 ease-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo Section */}
                    <div className="p-8 border-b border-border/50">
                        <Link href="/admin" className="group flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm group-hover:scale-110 transition-transform duration-500">
                                <Shield className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <span className="text-xl font-black tracking-tight text-text-primary uppercase">Admin <span className="text-primary italic">Node</span></span>
                                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em] mt-0.5">MarktMinder v2.0</p>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation Container */}
                    <div className="flex-1 px-4 py-8 overflow-y-auto no-scrollbar">
                        <div className="space-y-8">
                            {/* Operations */}
                            <div>
                                <p className="px-4 text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] mb-4">Operations</p>
                                <nav className="space-y-1.5">
                                    <AdminNavLink href="/admin" icon={<LayoutDashboard className="w-5 h-5" />}>
                                        System Control
                                    </AdminNavLink>
                                    <AdminNavLink href="/admin/products" icon={<Package className="w-5 h-5" />}>
                                        Asset Ledger
                                    </AdminNavLink>
                                    <AdminNavLink href="/admin/users" icon={<Users className="w-5 h-5" />}>
                                        Entity Database
                                    </AdminNavLink>
                                    <AdminNavLink href="/admin/analytics" icon={<BarChart3 className="w-5 h-5" />}>
                                        Neural Metrics
                                    </AdminNavLink>
                                </nav>
                            </div>

                            {/* Protocols */}
                            <div>
                                <p className="px-4 text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] mb-4">Protocols</p>
                                <nav className="space-y-1.5">
                                    <AdminNavLink href="/dashboard" icon={<ArrowLeft className="w-5 h-5" />}>
                                        User Dashboard
                                    </AdminNavLink>
                                </nav>
                            </div>
                        </div>
                    </div>

                    {/* Footer / User Profile */}
                    <div className="p-6 border-t border-border/50 bg-surface-elevated/30">
                        <div className="flex items-center gap-4 px-3 py-3 rounded-2xl bg-surface/50 border border-border/50">
                            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center font-black text-primary border border-primary/30">
                                {user?.name?.charAt(0).toUpperCase() || 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-text-primary uppercase truncate">{user?.name}</p>
                                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-0.5">Overseer</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-tertiary hover:text-error hover:bg-error/5 rounded-xl transition-all duration-300"
                        >
                            <LogOut className="w-4 h-4" />
                            Terminate Session
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main view container */}
            <div className={`lg:pl-72 transition-all duration-500 ease-in-out`}>
                {/* Unified Header */}
                <header className="sticky top-0 z-30 bg-background/60 backdrop-blur-xl border-b border-border/30 px-6 lg:px-10">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 text-text-tertiary hover:text-text-primary transition-colors"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div className="flex lg:hidden items-center gap-3">
                                <Shield className="w-6 h-6 text-primary" />
                                <span className="font-black text-sm uppercase tracking-tighter">Admin <span className="text-primary italic">Node</span></span>
                            </div>
                            {/* System Status Breadcrumb (matches Dashboard aesthetic) */}
                            <div className="hidden sm:flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary">
                                <span>System Status:</span>
                                <span className="text-success animate-pulse whitespace-nowrap">● NOMINAL // LATENCY: 12MS</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            <div className="h-4 w-px bg-border/20 hidden sm:block mx-1"></div>
                            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-error/5 border border-error/20 rounded-lg">
                                <Terminal className="w-3.5 h-3.5 text-error" />
                                <span className="text-[10px] font-black text-error uppercase tracking-widest">Admin Authorization Active</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-6 lg:p-10 max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

function AdminNavLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-4 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 text-text-tertiary hover:bg-surface-hover hover:text-text-primary border border-transparent hover:border-border"
        >
            <div className="group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            {children}
        </Link>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
