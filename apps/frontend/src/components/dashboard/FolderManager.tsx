'use client';

import React, { useState } from 'react';
import {
    Folder as FolderIcon, Plus, Trash2, Globe, Lock,
    Loader2
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';
import { toast } from 'sonner';
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder } from '@/lib/hooks';
import { Folder } from '@/lib/api';

export function FolderManager() {
    const [newFolderName, setNewFolderName] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Hooks
    const { data, isLoading } = useFolders();
    const folders = data?.folders || [];

    const createMutation = useCreateFolder();
    const updateMutation = useUpdateFolder();
    const deleteMutation = useDeleteFolder();

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            await createMutation.mutateAsync(newFolderName.trim());
            toast.success('Collection created');
            setNewFolderName('');
            setShowCreateForm(false);
        } catch (error) {
            toast.error('Could not create collection');
        }
    };

    const togglePrivacy = async (folder: Folder) => {
        try {
            // Check if is_public (from backend snake_case) or isPublic (camelCase) is used.
            // API returns what? Backend toFolder uses is_public (snake_case). 
            // API interface has both. 
            // We assume is_public is what is populated.
            const currentPrivacy = folder.is_public ?? folder.isPublic ?? false;

            await updateMutation.mutateAsync({
                id: folder.id,
                data: { isPublic: !currentPrivacy }
            });
            toast.success(currentPrivacy ? 'Set to Private' : 'Set to Public');
        } catch (error) {
            toast.error('Failed to update privacy');
        }
    };

    const handleDeleteFolder = async (id: string) => {
        if (!confirm('Are you sure? Products will be unassigned but not deleted.')) return;

        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Collection removed');
        } catch (error) {
            toast.error('Failed to delete collection');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-text-primary flex items-center gap-3">
                    <FolderIcon className="w-5 h-5 text-primary" />
                    COLLECTIONS
                </h2>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {showCreateForm && (
                <GlassCard className="border-primary/30">
                    <form onSubmit={handleCreateFolder} className="space-y-4">
                        <input
                            type="text"
                            autoFocus
                            placeholder="Collection Name..."
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="w-full bg-surface-elevated border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <div className="flex items-center gap-3">
                            <GlowButton type="submit" disabled={createMutation.isPending} className="flex-1">
                                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CREATE'}
                            </GlowButton>
                            <GlowButton
                                type="button"
                                variant="secondary"
                                onClick={() => setShowCreateForm(false)}
                            >
                                CANCEL
                            </GlowButton>
                        </div>
                    </form>
                </GlassCard>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map(folder => (
                    <GlassCard key={folder.id} className="group overflow-hidden">
                        <div className="flex items-start justify-between mb-4">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                                style={{ backgroundColor: `${folder.color || '#6366f1'}20`, color: folder.color || '#6366f1' }}
                            >
                                <FolderIcon className="w-5 h-5" />
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => togglePrivacy(folder)}
                                    className={`p-1.5 rounded-lg transition-all ${folder.is_public
                                        ? 'text-primary bg-primary/10 hover:bg-primary/20'
                                        : 'text-text-tertiary bg-surface-hover hover:text-text-secondary'
                                        }`}
                                    title={folder.is_public ? 'Make Private' : 'Make Public'}
                                >
                                    {folder.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => handleDeleteFolder(folder.id)}
                                    className="p-1.5 text-text-tertiary hover:text-error hover:bg-error/10 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight line-clamp-1 mb-1">
                            {folder.name}
                        </h3>
                        <p className="text-[10px] text-text-tertiary font-black uppercase tracking-widest flex items-center gap-2">
                            <span>{folder.product_count || 0} Assets</span>
                            {folder.is_public && (
                                <span className="text-primary-light flex items-center gap-1">
                                    <Globe className="w-2.5 h-2.5" />
                                    Public
                                </span>
                            )}
                        </p>
                    </GlassCard>
                ))}

                {folders.length === 0 && !showCreateForm && (
                    <div className="col-span-full py-12 text-center border border-dashed border-border/30 rounded-3xl">
                        <FolderIcon className="w-10 h-10 text-text-tertiary mx-auto mb-4 opacity-20" />
                        <p className="text-sm text-text-secondary font-medium">No collections created yet.</p>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="text-primary text-xs font-black uppercase tracking-widest mt-4 hover:underline"
                        >
                            + Start Organizing
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
