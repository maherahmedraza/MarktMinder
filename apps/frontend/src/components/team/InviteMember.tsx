'use client';

import { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';
import { UserPlus, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface InviteMemberProps {
    teamId: string;
    onMemberAdded?: () => void;
}

export function InviteMember({ teamId, onMemberAdded }: InviteMemberProps) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
    const [isInviting, setIsInviting] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error('Please enter an email address');
            return;
        }

        try {
            setIsInviting(true);

            // Note: This would typically create a user invitation
            // For now, we'll require the user to already exist
            // You'd need to implement user lookup by email first

            toast.info('Invitation feature coming soon! For now, add existing users by their user ID.');

            setEmail('');
            setShowForm(false);
            onMemberAdded?.();
        } catch (error) {
            toast.error('Failed to send invitation');
        } finally {
            setIsInviting(false);
        }
    };

    if (!showForm) {
        return (
            <GlowButton onClick={() => setShowForm(true)} className="w-full md:w-auto">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Team Member
            </GlowButton>
        );
    }

    return (
        <GlassCard className="border-primary/30">
            <h3 className="text-lg font-black text-text-primary uppercase tracking-tight mb-4">
                Invite New Member
            </h3>

            <form onSubmit={handleInvite} className="space-y-4">
                <div>
                    <label className="block text-xs font-black text-text-tertiary uppercase tracking-widest mb-2">
                        Email Address
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="colleague@company.com"
                            className="w-full pl-10 pr-4 py-3 bg-surface-elevated border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            autoFocus
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-black text-text-tertiary uppercase tracking-widest mb-2">
                        Role
                    </label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'admin' | 'editor' | 'viewer')}
                        className="w-full px-4 py-3 bg-surface-elevated border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                        <option value="viewer">Viewer - Read-only access</option>
                        <option value="editor">Editor - Can modify products and alerts</option>
                        <option value="admin">Admin - Full management access</option>
                    </select>
                </div>

                <div className="flex gap-3">
                    <GlowButton type="submit" disabled={isInviting} className="flex-1">
                        {isInviting ? 'Sending...' : 'Send Invitation'}
                    </GlowButton>
                    <GlowButton
                        type="button"
                        variant="secondary"
                        onClick={() => {
                            setShowForm(false);
                            setEmail('');
                        }}
                    >
                        Cancel
                    </GlowButton>
                </div>
            </form>
        </GlassCard>
    );
}
