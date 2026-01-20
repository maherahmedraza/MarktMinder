'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Mail, Package, Bell, Loader2, Trash2, X, AlertTriangle, CheckSquare, Square, Shield, Activity, Users2, Database } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useAdminUsers, useDeleteAdminUser, useBulkDeleteAdminUsers } from '@/lib/hooks';

export default function AdminUsersPage() {
    // UI State
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

    // Modal state
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId?: string; isBulk?: boolean }>({
        isOpen: false
    });

    // Mutations
    const deleteUser = useDeleteAdminUser();
    const bulkDeleteUsers = useBulkDeleteAdminUsers();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Data fetching
    const { data, isLoading } = useAdminUsers({
        page,
        limit: 20,
        search: debouncedSearch || undefined
    });

    const users = data?.users || [];
    const totalPages = data?.pagination.totalPages || 1;
    const total = data?.pagination.total || 0;

    // Reset selection on page change
    useEffect(() => {
        setSelectedUsers(new Set());
    }, [page, debouncedSearch]);

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
        try {
            if (deleteModal.isBulk) {
                await bulkDeleteUsers.mutateAsync(Array.from(selectedUsers));
                setSelectedUsers(new Set());
            } else if (deleteModal.userId) {
                await deleteUser.mutateAsync(deleteModal.userId);
            }
            setDeleteModal({ isOpen: false });
        } catch (err: any) {
            alert('Failed to delete: ' + (err.message || 'Unknown error'));
        }
    };

    const isDeleting = deleteUser.isPending || bulkDeleteUsers.isPending;

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm">
                            <Users2 className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">
                            Entity <span className="text-gradient">Database</span>
                        </h1>
                    </div>
                    <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                        Authorized personnel records. Access control and entity lifecycle management: <span className="text-primary font-bold">{total} registered nodes</span>.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {selectedUsers.size > 0 && (
                        <GlowButton
                            variant="danger"
                            onClick={confirmBulkDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Purge Records ({selectedUsers.size})
                        </GlowButton>
                    )}
                    <GlassCard variant="default" padding="none" className="h-12 relative overflow-hidden group min-w-[280px]">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-primary transition-colors">
                            <Search className="w-4 h-4 text-text-tertiary" />
                        </div>
                        <input
                            type="text"
                            placeholder="Identify entity by email/name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-full pl-11 pr-4 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary font-medium focus:outline-none"
                        />
                    </GlassCard>
                </div>
            </div>

            {/* Users List */}
            <GlassCard variant="default" padding="none" className="overflow-hidden border-border/50">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
                        </div>
                        <p className="mt-8 text-[10px] font-black text-text-tertiary uppercase tracking-[0.4em] animate-pulse">Scanning Neural Network...</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card Layout */}
                        <div className="md:hidden divide-y divide-border/30">
                            {users.length === 0 ? (
                                <div className="px-6 py-20 text-center">
                                    <Database className="w-10 h-10 text-text-tertiary/20 mx-auto mb-4" />
                                    <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest leading-relaxed">No entity records matched the query parameters.</p>
                                </div>
                            ) : (
                                users.map((user) => (
                                    <div key={user.id} className="p-6 hover:bg-primary/5 transition-colors group">
                                        <div className="flex items-start gap-4">
                                            <button
                                                onClick={() => toggleSelectUser(user.id)}
                                                className="mt-1 transition-colors"
                                            >
                                                {selectedUsers.has(user.id) ? (
                                                    <CheckSquare className="w-5 h-5 text-primary" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-text-tertiary" />
                                                )}
                                            </button>
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black border border-primary/20 shadow-glow-sm flex-shrink-0">
                                                {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-black text-text-primary uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                                                        {user.name || 'Anonymous_Node'}
                                                    </p>
                                                    <button
                                                        onClick={() => confirmDelete(user.id)}
                                                        className="text-error/60 hover:text-error p-1.5 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <p className="text-xs font-mono text-text-tertiary truncate">{user.email}</p>

                                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                                    {user.email_verified ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-success/10 text-success border border-success/20 rounded text-[9px] font-black uppercase tracking-widest shadow-glow-sm">
                                                            <Mail className="w-2.5 h-2.5" />
                                                            Verified
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded text-[9px] font-black uppercase tracking-widest shadow-glow-sm">
                                                            Pending
                                                        </span>
                                                    )}
                                                    {user.role === 'admin' && (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[9px] font-black uppercase tracking-widest shadow-glow-sm">
                                                            Root_Admin
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4 mt-4 text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                                                    <span className="inline-flex items-center gap-1.5 group/stat hover:text-text-primary transition-colors">
                                                        <Package className="w-3.5 h-3.5" />
                                                        {user.products_count}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 group/stat hover:text-text-primary transition-colors">
                                                        <Bell className="w-3.5 h-3.5" />
                                                        {user.alerts_count}
                                                    </span>
                                                    <span>
                                                        Init: {new Date(user.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop Table Layout */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-surface/50 border-b border-border/50">
                                        <th className="px-8 py-5 w-12">
                                            <button
                                                onClick={toggleSelectAll}
                                                className="transition-colors"
                                            >
                                                {selectedUsers.size === users.length && users.length > 0 ? (
                                                    <CheckSquare className="w-5 h-5 text-primary" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-text-tertiary" />
                                                )}
                                            </button>
                                        </th>
                                        <th className="text-left px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Entity</th>
                                        <th className="text-left px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Auth_Status</th>
                                        <th className="text-center px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Assets</th>
                                        <th className="text-center px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Triggers</th>
                                        <th className="text-left px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Initialized</th>
                                        <th className="text-left px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest">Sync_State</th>
                                        <th className="text-right px-8 py-5 text-[10px] font-black text-text-tertiary uppercase tracking-widest text-error/80">Override</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-8 py-20 text-center">
                                                <Database className="w-10 h-10 text-text-tertiary/20 mx-auto mb-4" />
                                                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest leading-relaxed">No entity records matched the query parameters.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-primary/5 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <button
                                                        onClick={() => toggleSelectUser(user.id)}
                                                        className="transition-colors"
                                                    >
                                                        {selectedUsers.has(user.id) ? (
                                                            <CheckSquare className="w-5 h-5 text-primary" />
                                                        ) : (
                                                            <Square className="w-5 h-5 text-text-tertiary" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black border border-primary/20 shadow-glow-sm group-hover:scale-105 transition-transform">
                                                            {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-black text-text-primary uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                                                                {user.name || 'Anonymous_Node'}
                                                            </p>
                                                            <p className="text-[10px] font-mono text-text-tertiary mt-1 truncate">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col gap-1.5">
                                                        {user.email_verified ? (
                                                            <span className="inline-flex w-fit items-center gap-1.5 px-2 py-0.5 bg-success/10 text-success border border-success/20 rounded text-[9px] font-black uppercase tracking-widest">
                                                                <Mail className="w-2.5 h-2.5" />
                                                                Verified
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex w-fit items-center gap-1.5 px-2 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded text-[9px] font-black uppercase tracking-widest">
                                                                Pending
                                                            </span>
                                                        )}
                                                        {user.role === 'admin' && (
                                                            <span className="inline-flex w-fit items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[9px] font-black uppercase tracking-widest">
                                                                Root_Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-text-primary">
                                                        <Package className="w-3.5 h-3.5 text-text-tertiary" />
                                                        {user.products_count}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-text-primary">
                                                        <Bell className="w-3.5 h-3.5 text-text-tertiary" />
                                                        {user.alerts_count}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-[11px] font-mono text-text-tertiary">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-8 py-5 text-[11px] font-mono text-text-tertiary">
                                                    {user.last_login_at
                                                        ? new Date(user.last_login_at).toLocaleDateString()
                                                        : 'Never_Logged'
                                                    }
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button
                                                        onClick={() => confirmDelete(user.id)}
                                                        className="text-error/60 hover:text-error transition-all p-2 hover:bg-error/5 rounded-xl border border-transparent hover:border-error/20"
                                                        title="Immediate Purge"
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
                    </>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-8 py-6 bg-surface/30 border-t border-border/50">
                        <GlowButton
                            variant="outline"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            PREVIOUS PHASE
                        </GlowButton>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">
                                SECTOR {page} // {totalPages}
                            </span>
                        </div>
                        <GlowButton
                            variant="outline"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            NEXT PHASE
                        </GlowButton>
                    </div>
                )}
            </GlassCard>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false })}
                onConfirm={handleConfirmDelete}
                title={deleteModal.isBulk ? `PURGE ${selectedUsers.size} ENTITY RECORDS?` : 'PURGE ENTITY RECORD?'}
                message={deleteModal.isBulk
                    ? `Initiating mass record deletion. Are you sure you want to permanently purge ${selectedUsers.size} entity nodes from the database? This action is irreversible.`
                    : "Are you sure you want to permanently purge this entity record from the secure database? All associated trackers and alerts will be terminated."
                }
                isDestructive={true}
                isLoading={isDeleting}
            />
        </div>
    );
}
