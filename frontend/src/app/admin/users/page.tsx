'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Mail, Package, Bell, Loader2, Trash2 } from 'lucide-react';
import api from '@/lib/api';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    email_verified: boolean;
    created_at: string;
    last_login_at: string;
    products_count: number;
    alerts_count: number;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        loadUsers();
    }, [page]);

    async function loadUsers() {
        try {
            setIsLoading(true);
            const data = await api.request<{
                users: AdminUser[];
                pagination: { page: number; totalPages: number; total: number };
            }>(`/admin/users?page=${page}&limit=20`);

            setUsers(data.users);
            setTotalPages(data.pagination.totalPages);
            setTotal(data.pagination.total);
        } catch (err) {
            console.error('Failed to load users', err);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleDeleteUser(userId: string) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            await api.request(`/admin/users/${userId}`, { method: 'DELETE' });
            loadUsers();
        } catch (err: any) {
            alert('Failed to delete user: ' + (err.message || 'Unknown error'));
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
                    <p className="text-gray-500 dark:text-gray-400">{total} registered users</p>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">User</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Products</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Alerts</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Joined</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Last Login</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-gray-900 dark:text-white font-medium">{user.name || 'No name'}</p>
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.email_verified ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded text-xs">
                                                    <Mail className="w-3 h-3" />
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded text-xs">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 text-gray-900 dark:text-gray-300">
                                                <Package className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                {user.products_count}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 text-gray-900 dark:text-gray-300">
                                                <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                {user.alerts_count}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                            {user.last_login_at
                                                ? new Date(user.last_login_at).toLocaleDateString()
                                                : 'Never'
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                title="Delete User"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            Previous
                        </button>
                        <span className="text-gray-500 dark:text-gray-400">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
