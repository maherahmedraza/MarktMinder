import React from 'react';
import { GlassCard } from './GlassCard';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: string;
    isHighlight?: boolean;
}

export function StatCard({
    title,
    value,
    icon,
    trend,
    isHighlight
}: StatCardProps) {
    return (
        <GlassCard
            variant={isHighlight ? 'pro' : 'default'}
            className="flex items-center gap-5 transition-all hover:scale-[1.02] hover:-translate-y-1 duration-300 group overflow-hidden border-border/40"
        >
            {/* Background Decorative Element */}
            <div className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-[0.03] transition-transform duration-700 group-hover:scale-150 group-hover:rotate-12 pointer-events-none ${isHighlight ? 'text-primary' : 'text-text-primary'}`}>
                {icon}
            </div>

            <div className={`relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:rotate-6 group-hover:shadow-glow-sm ${isHighlight
                ? 'bg-primary/20 text-primary border-primary/30 shadow-glow-sm'
                : 'bg-surface-hover/50 text-text-tertiary border-border/50 group-hover:text-primary group-hover:border-primary/30'
                }`}>
                {icon}
            </div>

            <div className="relative z-10 flex-1">
                <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.3em] mb-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                    {title}
                </p>
                <p className="text-2xl font-black font-mono tracking-tighter leading-none text-text-primary group-hover:text-primary transition-colors">
                    {value}
                </p>
                {trend ? (
                    <div className="mt-2 flex items-center gap-2">
                        <div className="flex h-1.5 w-1.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
                        </div>
                        <span className="text-[9px] font-black text-success uppercase tracking-widest opacity-80 group-hover:opacity-100">
                            {trend}
                        </span>
                    </div>
                ) : (
                    <div className="mt-2 flex items-center gap-2">
                        <div className="h-[2px] w-6 bg-border/30 rounded-full" />
                        <span className="text-[8px] font-black text-text-tertiary uppercase tracking-widest opacity-30">
                            NOMINAL_STATE
                        </span>
                    </div>
                )}
            </div>
        </GlassCard>
    );
}
