'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlowButton } from '../ui/GlowButton';
import { Shield, Eye, Edit, Trash2, Crown, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
    id: string;
    user_id: string;
    role: 'admin' | 'editor' | 'viewer';
    email: string;
    username: string;
    joined_at: string;
}

interface MemberListProps {
    teamId: string;
    ownerId: string;
}

const roleIcons = {
    admin: <Shield className="w-4 h-4 text-error" />,
    editor: <Edit className="w-4 h-4 text-warning" />,
    viewer: <Eye className="w-4 h-4 text-text-tertiary" />,
};

const roleColors = {
    admin: 'bg-error/10 text-error border-error/20',
    editor: 'bg-warning/10 text-warning border-warning/20',
    viewer: 'bg-surface-hover text-text-tertiary border-border/20',
};

export function MemberList({ teamId, ownerId }: MemberListProps) {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadMembers();
    }, [teamId]);

    const loadMembers = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/v1/teams/${teamId}/members`, {
                credentials: 'include',
            });

            if (!response.ok) throw new Error('Failed to fetch members');

            const data = await response.json();
            setMembers(data.members || []);
        } catch (error) {
            console.error('Error loading members:', error);
            toast.error('Failed to load team members');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeRole = async (userId: string, newRole: 'admin' | 'editor' | 'viewer') => {
        try {
            const response = await fetch(`/api/v1/teams/${teamId}/members/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role: newRole }),
            });

            if (!response.ok) throw new Error('Failed to update role');

            toast.success('Member role updated');
            loadMembers();
        } catch (error) {
            toast.error('Failed to update member role');
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!confirm('Remove this member from the team?')) return;

        try {
            const response = await fetch(`/api/v1/teams/${teamId}/members/${userId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) throw new Error('Failed to remove member');

            toast.success('Member removed from team');
            loadMembers();
        } catch (error) {
            toast.error('Failed to remove member');
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
        <GlassCard>
            <h3 className="text-lg font-black text-text-primary uppercase tracking-tight mb-6">
                Team Members ({members.length})
            </h3>

            <div className="space-y-3">
                {members.map((member) => {
                    const isOwner = member.user_id === ownerId;

                    return (
                        <div
                            key={member.id}
                            className="flex items-center justify-between p-4 bg-surface-hover/30 rounded-xl border border-border/20 hover:border-primary/20 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                                    <span className="text-sm font-black text-primary">
                                        {member.username?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-text-primary">
                                            {member.username || member.email}
                                        </p>
                                        {isOwner && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning text-[10px] font-black uppercase rounded-md border border-warning/20">
                                                <Crown className="w-3 h-3" />
                                                Owner
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-text-tertiary">{member.email}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Role Badge with Dropdown */}
                                <select
                                    value={member.role}
                                    onChange={(e) =>
                                        handleChangeRole(
                                            member.user_id,
                                            e.target.value as 'admin' | 'editor' | 'viewer'
                                        )
                                    }
                                    disabled={isOwner}
                                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg border transition-all ${roleColors[member.role]
                                        } ${isOwner ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                                >
                                    <option value="admin">Admin</option>
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                </select>

                                {/* Remove Button */}
                                {!isOwner && (
                                    <button
                                        onClick={() => handleRemoveMember(member.user_id)}
                                        className="p-2 text-text-tertiary hover:text-error hover:bg-error/10 rounded-lg transition-all"
                                        title="Remove member"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {members.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-text-tertiary">No team members yet</p>
                </div>
            )}
        </GlassCard>
    );
}
