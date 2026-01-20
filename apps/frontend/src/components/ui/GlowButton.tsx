import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'default' | 'lg' | 'icon';
    isLoading?: boolean;
    hasGlow?: boolean;
}

export function GlowButton({
    className,
    variant = 'primary',
    size = 'default',
    isLoading = false,
    hasGlow = true,
    children,
    disabled,
    ...props
}: GlowButtonProps) {
    const baseStyles = "inline-flex items-center justify-center rounded-full font-medium transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background";

    const variants = {
        primary: "bg-gradient-to-r from-primary to-primary-hover text-white hover:scale-105 active:scale-95 border border-transparent",
        secondary: "bg-surface-hover text-text-primary hover:bg-surface border border-border hover:border-primary/50",
        outline: "bg-transparent border border-border text-text-primary hover:border-primary hover:bg-primary/5",
        ghost: "bg-transparent text-text-secondary hover:text-primary hover:bg-primary/5",
        danger: "bg-error/10 text-error hover:bg-error/20 border border-error/20 hover:border-error/50"
    };

    const glows = {
        primary: "shadow-glow hover:shadow-[0_0_30px_-5px_var(--color-primary)]",
        secondary: "hover:shadow-lg",
        outline: "hover:shadow-glow",
        ghost: "",
        danger: "hover:shadow-[0_0_20px_-5px_var(--color-error)]"
    };

    const sizes = {
        sm: "h-8 px-4 text-xs",
        default: "h-11 px-6 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "h-11 w-11"
    };

    return (
        <button
            className={cn(
                baseStyles,
                variants[variant],
                sizes[size],
                hasGlow && !disabled ? glows[variant] : "",
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
}
