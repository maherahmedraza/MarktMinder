'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { Users, Settings, Key, UserPlus, Crown, Shield, Eye } from 'lucide-react';
import { MemberList } from '@/components/team/MemberList';
import { ApiKeyManager } from '@/components/team/ApiKeyManager';
import { InviteMember } from '@/components/team/InviteMember';
import { toast } from 'sonner';

interface Team {
    id: string;
    name: string;
    owner_id: string;
    plan: 'business' | 'enterprise';
    member_count: number;
    created_at: string;
}

export default function TeamPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'members' | 'api-keys'>('members');

    useEffect(() => {
        loadTeams();
    }, []);

    const loadTeams = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/v1/teams', {
                credentials: 'include',
            });

            if (!response.ok) throw new Error('Failed to fetch teams');

            const data = await response.json();
            setTeams(data.teams || []);

            // Auto-select first team
            if (data.teams && data.teams.length > 0) {
                setSelectedTeam(data.teams[0]);
            }
        } catch (error) {
            console.error('Error loading teams:', error);
            toast.error('Failed to load teams');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (teams.length === 0) {
        return (
            <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
                <div className="text-center py-20">
                    <Users className="w-16 h-16 text-text-tertiary mx-auto mb-4 opacity-20" />
                    <h2 className="text-2xl font-bold text-text-primary mb-2">No Teams Yet</h2>
                    <p className="text-text-secondary mb-8">
                        Upgrade to Business or Enterprise to create team workspaces
                    </p>
                    <GlowButton onClick={() => window.location.href = '/pricing'}>
                        View Plans
                    </GlowButton>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm">
                            <Users className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">
                            Team <span className="text-gradient">Management</span>
                        </h1>
                    </div>
                    <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                        Collaborate with your team, manage permissions, and control API access.
                    </p>
                </div>
            </div>

            {/* Team Selector (if multiple teams) */}
            {teams.length > 1 && (
                <GlassCard>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-text-tertiary uppercase tracking-widest">
                            Select Team
                        </label>
                        <select
                            value={selectedTeam?.id || ''}
                            onChange={(e) => {
                                const team = teams.find(t => t.id === e.target.value);
                                setSelectedTeam(team || null);
                            }}
                            className="w-full md:w-auto px-4 py-3 bg-surface-elevated border border-border/50 rounded-xl text-sm font-bold text-text-primary focus:ring-2 focus:ring-primary/50 outline-none"
                        >
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>
                                    {team.name} ({team.plan})
                                </option>
                            ))}
                        </select>
                    </div>
                </GlassCard>
            )}

            {selectedTeam && (
                <>
                    {/* Team Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlassCard className="text-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                    <Users className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-text-primary">
                                        {selectedTeam.member_count || 0}
                                    </p>
                                    <p className="text-xs font-black text-text-tertiary uppercase tracking-widest">
                                        Team Members
                                    </p>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="text-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                                    <Crown className="w-6 h-6 text-success" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-text-primary uppercase">
                                        {selectedTeam.plan}
                                    </p>
                                    <p className="text-xs font-black text-text-tertiary uppercase tracking-widest">
                                        Plan Tier
                                    </p>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="text-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                                    <Key className="w-6 h-6 text-warning" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-text-primary">
                                        API
                                    </p>
                                    <p className="text-xs font-black text-text-tertiary uppercase tracking-widest">
                                        White-Label Access
                                    </p>
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-border/20">
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`px-6 py-3 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'members'
                                    ? 'text-primary border-b-2 border-primary'
                                    : 'text-text-tertiary hover:text-text-secondary'
                                }`}
                        >
                            <Users className="w-4 h-4 inline mr-2" />
                            Members
                        </button>
                        <button
                            onClick={() => setActiveTab('api-keys')}
                            className={`px-6 py-3 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'api-keys'
                                    ? 'text-primary border-b-2 border-primary'
                                    : 'text-text-tertiary hover:text-text-secondary'
                                }`}
                        >
                            <Key className="w-4 h-4 inline mr-2" />
                            API Keys
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'members' && (
                        <div className="space-y-6">
                            <InviteMember teamId={selectedTeam.id} onMemberAdded={loadTeams} />
                            <MemberList teamId={selectedTeam.id} ownerId={selectedTeam.owner_id} />
                        </div>
                    )}

                    {activeTab === 'api-keys' && (
                        <ApiKeyManager teamId={selectedTeam.id} />
                    )}
                </>
            )}
        </div>
    );
}
