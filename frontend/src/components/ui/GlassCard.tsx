import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'interactive' | 'pro' | 'glass';
    padding?: 'none' | 'sm' | 'default' | 'lg';
}

export function GlassCard({
    children,
    className,
    variant = 'default',
    padding = 'default',
    ...props
}: GlassCardProps) {
    const variants = {
        default: "bg-surface border border-white/5 dark:border-white/[0.08]",
        elevated: "bg-surface-elevated border border-border-strong shadow-lg",
        interactive: "bg-surface border border-border/50 hover:border-primary/50 hover:bg-surface-hover/80 hover:shadow-glow transition-all duration-300 group",
        pro: "bg-surface-elevated border border-primary/30 shadow-glow relative overflow-hidden",
        glass: "glass-panel"
    };

    const paddings = {
        none: "",
        sm: "p-4",
        default: "p-6",
        lg: "p-8"
    };

    return (
        <div
            className={cn(
                "relative rounded-3xl transition-all duration-300",
                variants[variant],
                padding === 'none' ? 'p-0' : paddings[padding],
                className
            )}
            {...props}
        >
            {/* Pro Variant Decorative Elements */}
            {variant === 'pro' && (
                <>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full pointer-events-none" />
                    <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
                </>
            )}

            {/* Interactive Hover Highlight */}
            {variant === 'interactive' && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
            )}

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
