'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Mail, Package, Bell, Loader2, Trash2, X, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import api from '@/lib/api';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    email_verified: boolean;
    created_at: string;
    last_login_at: string;
    role?: string;
    products_count: number;
    alerts_count: number;
}

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isDestructive?: boolean;
    isLoading?: boolean;
}

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, isDestructive = false, isLoading = false }: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${isDestructive ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'}`}>
                        {isDestructive ? <AlertTriangle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">{message}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 text-white rounded-lg transition-colors font-medium flex items-center gap-2 ${isDestructive
                                ? 'bg-red-600 hover:bg-red-700 disabled:hover:bg-red-600'
                                : 'bg-primary-600 hover:bg-primary-700 disabled:hover:bg-primary-600'
                            } disabled:opacity-50`}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isDestructive ? 'Delete' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Selection state
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

    // Modal state
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId?: string; isBulk?: boolean }>({
        isOpen: false
    });
    const [isDeleting, setIsDeleting] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        loadUsers();
    }, [page, debouncedSearch]);

    async function loadUsers() {
        try {
            setIsLoading(true);
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                ...(debouncedSearch && { search: debouncedSearch })
            });

            const data = await api.request<{
                users: AdminUser[];
                pagination: { page: number; totalPages: number; total: number };
            }>(`/admin/users?${queryParams}`);

            setUsers(data.users);
            setTotalPages(data.pagination.totalPages);
            setTotal(data.pagination.total);
            // Clear selections when page/data changes to avoid issues
            setSelectedUsers(new Set());
        } catch (err) {
            console.error('Failed to load users', err);
        } finally {
            setIsLoading(false);
        }
    }

    const toggleSelectAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map(u => u.id)));
        }
    };

    const toggleSelectUser = (id: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedUsers(newSelected);
    };

    const confirmDelete = (userId: string) => {
        setDeleteModal({ isOpen: true, userId, isBulk: false });
    };

    const confirmBulkDelete = () => {
        if (selectedUsers.size === 0) return;
        setDeleteModal({ isOpen: true, isBulk: true });
    };

    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            if (deleteModal.isBulk) {
                await api.request('/admin/users/bulk-delete', {
                    method: 'POST',
                    body: { userIds: Array.from(selectedUsers) }
                });
                setSelectedUsers(new Set());
            } else if (deleteModal.userId) {
                await api.request(`/admin/users/${deleteModal.userId}`, { method: 'DELETE' });
            }
            setDeleteModal({ isOpen: false });
            loadUsers();
        } catch (err: any) {
            alert('Failed to delete: ' + (err.message || 'Unknown error'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
                    <p className="text-gray-500 dark:text-gray-400">{total} registered users</p>
                </div>

                <div className="flex items-center gap-3">
                    {selectedUsers.size > 0 && (
                        <button
                            onClick={confirmBulkDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete ({selectedUsers.size})
                        </button>
                    )}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
                        />
                    </div>
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
                                    <th className="px-6 py-4 w-12">
                                        <button
                                            onClick={toggleSelectAll}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            {selectedUsers.size === users.length && users.length > 0 ? (
                                                <CheckSquare className="w-5 h-5 text-primary-600" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                    </th>
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
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleSelectUser(user.id)}
                                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                >
                                                    {selectedUsers.has(user.id) ? (
                                                        <CheckSquare className="w-5 h-5 text-primary-600" />
                                                    ) : (
                                                        <Square className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </td>
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
                                                <div className="flex flex-col gap-1">
                                                    {user.email_verified ? (
                                                        <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded text-xs border border-green-200 dark:border-green-900">
                                                            <Mail className="w-3 h-3" />
                                                            Verified
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded text-xs border border-yellow-200 dark:border-yellow-900">
                                                            Pending
                                                        </span>
                                                    )}
                                                    {user.role === 'admin' && (
                                                        <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded text-xs border border-purple-200 dark:border-purple-900">
                                                            Admin
                                                        </span>
                                                    )}
                                                </div>
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
                                                    onClick={() => confirmDelete(user.id)}
                                                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
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

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false })}
                onConfirm={handleConfirmDelete}
                title={deleteModal.isBulk ? `Delete ${selectedUsers.size} Users?` : 'Delete User?'}
                message={deleteModal.isBulk
                    ? `Are you sure you want to delete ${selectedUsers.size} users? This action cannot be undone.`
                    : "Are you sure you want to delete this user? This action cannot be undone."
                }
                isDestructive={true}
                isLoading={isDeleting}
            />
        </div>
    );
}
