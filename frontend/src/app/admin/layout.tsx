'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
    TrendingDown,
    LayoutDashboard,
    Package,
    Users,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    Shield
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
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!isAuthenticated || !isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
                        <Link href="/admin" className="flex items-center gap-2">
                            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">Admin</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 block">MarktMinder</span>
                            </div>
                        </Link>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1">
                        <AdminNavLink href="/admin" icon={<LayoutDashboard className="w-5 h-5" />}>
                            Dashboard
                        </AdminNavLink>
                        <AdminNavLink href="/admin/products" icon={<Package className="w-5 h-5" />}>
                            Products
                        </AdminNavLink>
                        <AdminNavLink href="/admin/users" icon={<Users className="w-5 h-5" />}>
                            Users
                        </AdminNavLink>
                        <AdminNavLink href="/admin/analytics" icon={<BarChart3 className="w-5 h-5" />}>
                            Analytics
                        </AdminNavLink>

                        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                            <AdminNavLink href="/dashboard" icon={<TrendingDown className="w-5 h-5" />}>
                                User Dashboard
                            </AdminNavLink>
                        </div>
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 px-3 py-2">
                            <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center font-semibold text-white">
                                {user?.name?.charAt(0).toUpperCase() || 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Admin</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64 transition-all duration-200">
                {/* Top bar */}
                <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between h-16 px-4 lg:px-8">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        <div className="flex-1 lg:ml-0 ml-4">
                            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Panel</h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                Admin Mode
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-8">
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
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
        >
            {icon}
            {children}
        </Link>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
