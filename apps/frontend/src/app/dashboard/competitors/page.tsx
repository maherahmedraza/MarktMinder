'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { CompetitorList } from '@/components/competitors/CompetitorList';
import { GlassCard } from '@/components/ui/GlassCard';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { GlowButton } from '@/components/ui/GlowButton';

export default function CompetitorsPage() {
    const { user } = useAuth();
    const [competitors, setCompetitors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form state
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [competitorUrl, setCompetitorUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch competitors
    // Note: We need a team ID. For MVP assuming user has one team or selecting first.
    // In real app, we'd have a team context or selector.
    // Fetch user's teams first to get ID
    const [teamId, setTeamId] = useState<string | null>(null);

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const res = await fetch('/api/v1/teams', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.teams && data.teams.length > 0) {
                        setTeamId(data.teams[0].id); // Pick first team for now
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchTeam();
    }, []);

    useEffect(() => {
        if (!teamId) return;
        loadCompetitors();
        loadProducts(); // Pre-load products for the modal
    }, [teamId]);

    const loadCompetitors = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/v1/teams/${teamId}/competitors`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setCompetitors(data.competitors || []);
            }
        } catch (error) {
            toast.error('Failed to load competitors');
        } finally {
            setIsLoading(false);
        }
    };

    const loadProducts = async () => {
        try {
            const res = await fetch('/api/v1/products?limit=100', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (error) {
            console.error('Failed to load products');
        }
    };

    const handleAddCompetitor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamId) return;

        try {
            setIsSubmitting(true);
            const res = await fetch(`/api/v1/teams/${teamId}/competitors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: selectedProductId,
                    competitor_url: competitorUrl
                }),
                credentials: 'include'
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to add competitor');
            }

            toast.success('Competitor added successfully');
            setShowAddModal(false);
            setCompetitorUrl('');
            setSelectedProductId('');
            loadCompetitors();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (!confirm('Stop monitoring this competitor?')) return;
        if (!teamId) return;

        try {
            const res = await fetch(`/api/v1/teams/${teamId}/competitors/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                toast.success('Competitor removed');
                loadCompetitors();
            }
        } catch (error) {
            toast.error('Failed to remove competitor');
        }
    };

    if (!teamId) {
        // Show empty state or loading until team is found found
        // If no team, likely simple user. Suggest creating team?
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="animate-pulse text-text-tertiary">Loading Team Context...</div>
                {/* Fallback if it takes too long: "You need to create a Team first" */}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-black text-text-primary uppercase tracking-tight">
                    Competitor Intelligence
                </h1>
                <p className="text-text-secondary max-w-2xl">
                    Track competitor pricing strategies in real-time. Compare your products against market rivals.
                </p>
            </div>

            <CompetitorList
                competitors={competitors}
                onRemove={handleRemove}
                onAddClick={() => setShowAddModal(true)}
            />

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <GlassCard className="w-full max-w-lg relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-lg font-black text-text-primary uppercase tracking-tight mb-6">
                            Monitor New Competitor
                        </h2>

                        <form onSubmit={handleAddCompetitor} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-text-tertiary uppercase tracking-widest mb-2">
                                    Your Product
                                </label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="w-full px-4 py-3 bg-surface-elevated border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none appearance-none"
                                    required
                                >
                                    <option value="">Select a product to compare...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.title.substring(0, 50)}... ({p.marketplace})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-text-tertiary uppercase tracking-widest mb-2">
                                    Competitor URL
                                </label>
                                <input
                                    type="url"
                                    value={competitorUrl}
                                    onChange={(e) => setCompetitorUrl(e.target.value)}
                                    placeholder="https://amazon.de/dp/..."
                                    className="w-full px-4 py-3 bg-surface-elevated border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                    required
                                />
                                <p className="text-[10px] text-text-tertiary mt-2">
                                    Supported: Amazon, Etsy, Otto
                                </p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <GlowButton type="submit" disabled={isSubmitting} className="flex-1">
                                    {isSubmitting ? 'Analyzing...' : 'Start Monitoring'}
                                </GlowButton>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
