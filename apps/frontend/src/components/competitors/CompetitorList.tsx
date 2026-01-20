'use client';

import { useState } from 'react';
import { CompetitorCard } from './CompetitorCard';
import { GlassCard } from '../ui/GlassCard';
import { Plus } from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';

interface CompetitorListProps {
    competitors: any[];
    onRemove: (id: string) => void;
    onAddClick: () => void;
}

export function CompetitorList({ competitors, onRemove, onAddClick }: CompetitorListProps) {
    if (competitors.length === 0) {
        return (
            <GlassCard className="text-center py-16 flex flex-col items-center">
                <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mb-6">
                    <Plus className="w-8 h-8 text-text-tertiary" />
                </div>
                <h3 className="text-xl font-black text-text-primary mb-2">
                    No Competitors Tracked
                </h3>
                <p className="text-text-secondary max-w-md mx-auto mb-8">
                    Start monitoring competitor prices to stay ahead of the market.
                    Compare your products directly against Amazon, Otto, and Etsy listings.
                </p>
                <GlowButton onClick={onAddClick}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Competitor
                </GlowButton>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <GlowButton onClick={onAddClick} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Competitor
                </GlowButton>
            </div>

            <div className="grid gap-4">
                {competitors.map((comp) => (
                    <CompetitorCard
                        key={comp.id}
                        competitor={comp}
                        onRemove={onRemove}
                    />
                ))}
            </div>
        </div>
    );
}
