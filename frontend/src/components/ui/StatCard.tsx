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
            className="flex items-center gap-5 transition-all hover:scale-[1.02] hover:-translate-y-1 duration-300 group overflow-hidden"
        >
            {/* Background Watermark Icon */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 text-primary/5 transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-12 pointer-events-none">
                {icon}
            </div>

            <div className={`relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-transform duration-500 group-hover:rotate-6 ${isHighlight
                ? 'bg-primary text-text-inverse border-primary/50 shadow-glow'
                : 'bg-surface-hover text-primary border-border'
                }`}>
                {icon}
            </div>

            <div className="relative z-10">
                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-1">{title}</p>
                <p className="text-2xl font-black font-mono tracking-tight leading-none text-text-primary">
                    {value}
                </p>
                {trend && (
                    <p className="text-[10px] text-success font-black mt-2 flex items-center gap-2 uppercase tracking-wide">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                        </span>
                        {trend}
                    </p>
                )}
            </div>
        </GlassCard>
    );
}
