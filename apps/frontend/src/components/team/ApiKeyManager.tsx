'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';
import { Key, Copy, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
    id: string;
    name: string;
    key_prefix: string;
    last_used_at: string | null;
    rate_limit_per_hour: number;
    is_active: boolean;
    created_at: string;
}

interface ApiKeyManagerProps {
    teamId: string;
}

export function ApiKeyManager({ teamId }: ApiKeyManagerProps) {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [keyName, setKeyName] = useState('');
    const [newKey, setNewKey] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadApiKeys();
    }, [teamId]);

    const loadApiKeys = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/v1/teams/${teamId}/api-keys`, {
                credentials: 'include',
            });

            if (!response.ok) throw new Error('Failed to fetch API keys');

            const data = await response.json();
            setApiKeys(data.apiKeys || []);
        } catch (error) {
            console.error('Error loading API keys:', error);
            toast.error('Failed to load API keys');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!keyName.trim()) {
            toast.error('Please enter a key name');
            return;
        }

        try {
            setIsCreating(true);
            const response = await fetch(`/api/v1/teams/${teamId}/api-keys`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: keyName }),
            });

            if (!response.ok) throw new Error('Failed to create API key');

            const data = await response.json();
            setNewKey(data.plainKey);
            setKeyName('');
            setShowCreateForm(false);

            toast.success('API key created! Copy it now - it won\'t be shown again');
            loadApiKeys();
        } catch (error) {
            toast.error('Failed to create API key');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast.success('API key copied to clipboard');
    };

    const handleRevokeKey = async (keyId: string) => {
        if (!confirm('Revoke this API key? This action cannot be undone.')) return;

        try {
            const response = await fetch(`/api/v1/teams/${teamId}/api-keys/${keyId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) throw new Error('Failed to revoke API key');

            toast.success('API key revoked');
            loadApiKeys();
        } catch (error) {
            toast.error('Failed to revoke API key');
        }
    };

    if (isLoading) {
        return (
            <GlassCard>
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-6">
            {/* New Key Display */}
            {newKey && (
                <GlassCard className="border-success/30 bg-success/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                            <Key className="w-5 h-5 text-success" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-success uppercase">
                                API Key Created!
                            </h3>
                            <p className="text-xs text-text-secondary">
                                Copy this key now - it won't be shown again
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-surface/50 rounded-xl border border-success/20">
                        <code className="flex-1 text-sm font-mono text-text-primary break-all">
                            {newKey}
                        </code>
                        <GlowButton
                            onClick={() => handleCopyKey(newKey)}
                            variant="secondary"
                            className="flex-shrink-0"
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                        </GlowButton>
                    </div>

                    <button
                        onClick={() => setNewKey(null)}
                        className="mt-4 text-xs text-text-tertiary hover:text-text-secondary uppercase tracking-widest font-black"
                    >
                        Dismiss
                    </button>
                </GlassCard>
            )}

            {/* Create Key Form */}
            {!showCreateForm ? (
                <GlowButton onClick={() => setShowCreateForm(true)} className="w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Generate New API Key
                </GlowButton>
            ) : (
                <GlassCard className="border-primary/30">
                    <h3 className="text-lg font-black text-text-primary uppercase tracking-tight mb-4">
                        Generate API Key
                    </h3>

                    <form onSubmit={handleCreateKey} className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-text-tertiary uppercase tracking-widest mb-2">
                                Key Name / Description
                            </label>
                            <input
                                type="text"
                                value={keyName}
                                onChange={(e) => setKeyName(e.target.value)}
                                placeholder="Production Server, Mobile App, etc."
                                className="w-full px-4 py-3 bg-surface-elevated border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <GlowButton type="submit" disabled={isCreating} className="flex-1">
                                {isCreating ? 'Generating...' : 'Generate Key'}
                            </GlowButton>
                            <GlowButton
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setKeyName('');
                                }}
                            >
                                Cancel
                            </GlowButton>
                        </div>
                    </form>
                </GlassCard>
            )}

            {/* API Keys List */}
            <GlassCard>
                <h3 className="text-lg font-black text-text-primary uppercase tracking-tight mb-6">
                    Active API Keys ({apiKeys.filter(k => k.is_active).length})
                </h3>

                <div className="space-y-3">
                    {apiKeys.map((key) => (
                        <div
                            key={key.id}
                            className={`p-4 rounded-xl border transition-all ${key.is_active
                                    ? 'bg-surface-hover/30 border-border/20 hover:border-primary/20'
                                    : 'bg-surface/20 border-border/10 opacity-50'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="text-sm font-bold text-text-primary">
                                            {key.name}
                                        </p>
                                        {!key.is_active && (
                                            <span className="px-2 py-0.5 bg-error/10 text-error text-[10px] font-black uppercase rounded border border-error/20">
                                                Revoked
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-text-secondary font-mono">
                                            {key.key_prefix}••••••••••••••••••
                                        </p>
                                        <div className="flex items-center gap-4 text-[10px] text-text-tertiary uppercase font-black tracking-widest">
                                            <span>
                                                Created: {new Date(key.created_at).toLocaleDateString()}
                                            </span>
                                            {key.last_used_at && (
                                                <span>
                                                    Last used: {new Date(key.last_used_at).toLocaleDateString()}
                                                </span>
                                            )}
                                            <span>Limit: {key.rate_limit_per_hour}/hr</span>
                                        </div>
                                    </div>
                                </div>

                                {key.is_active && (
                                    <button
                                        onClick={() => handleRevokeKey(key.id)}
                                        className="p-2 text-text-tertiary hover:text-error hover:bg-error/10 rounded-lg transition-all"
                                        title="Revoke key"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {apiKeys.length === 0 && (
                    <div className="text-center py-12">
                        <Key className="w-12 h-12 text-text-tertiary mx-auto mb-4 opacity-20" />
                        <p className="text-text-tertiary">No API keys generated yet</p>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
