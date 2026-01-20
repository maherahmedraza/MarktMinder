'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { TrendingDown, Mail, Lock, User, AlertCircle, Loader2, Check, Shield, Zap, Target } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';

export default function RegisterPage() {
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const passwordStrength = getPasswordStrength(password);
    const isPasswordStrong = passwordStrength >= 3 && password.length >= 8;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (!password.match(/[A-Z]/) || !password.match(/[^a-zA-Z0-9]/)) {
            setError('Password must contain at least one uppercase letter and one special character');
            return;
        }

        setIsLoading(true);

        try {
            await register(email, password, name);

            // Check for plan in URL
            const params = new URLSearchParams(window.location.search);
            const plan = params.get('plan');

            if (plan && ['pro', 'power', 'business'].includes(plan)) {
                setIsLoading(true);
                const api = (await import('@/lib/api')).default;

                try {
                    const { url } = await api.request<{ url: string }>('/billing/create-checkout', {
                        method: 'POST',
                        body: {
                            tier: plan,
                            interval: 'monthly'
                        }
                    });

                    if (url) {
                        window.location.href = url;
                        return;
                    }
                } catch (billingError) {
                    console.error('Failed to initiate checkout:', billingError);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create account');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            {/* Background elements to match Login UI */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary via-primary/80 to-secondary rounded-2xl flex items-center justify-center shadow-glow transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                        <TrendingDown className="w-8 h-8 text-white group-hover:animate-bounce" />
                    </div>
                </Link>
                <h2 className="heading-1 text-center text-text-primary mb-2">
                    Create your account
                </h2>
                <p className="text-center text-text-tertiary font-bold uppercase tracking-widest text-[11px] mb-8">
                    Already have an account?{' '}
                    <Link href="/login" className="text-primary hover:text-primary/80 transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <GlassCard variant="pro" className="p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl flex items-center gap-3 animate-shake">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-xs font-bold uppercase tracking-wide">{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="name" className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">
                                Full name
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                                    <User className="h-5 w-5 text-text-tertiary group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-themed"
                                    placeholder="Enter your name"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">
                                Email address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                                    <Mail className="h-5 w-5 text-text-tertiary group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-themed"
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                                    <Lock className="h-5 w-5 text-text-tertiary group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-themed"
                                    placeholder="••••••••"
                                />
                            </div>

                            {/* Strength Indicator Refined */}
                            {password && (
                                <div className="mt-4 px-1">
                                    <div className="flex gap-1.5 h-1.5">
                                        {[1, 2, 3, 4].map((level) => (
                                            <div
                                                key={level}
                                                className={`flex-1 rounded-full transition-all duration-500 ${passwordStrength >= level
                                                    ? passwordStrength >= 3
                                                        ? 'bg-success shadow-glow-sm'
                                                        : passwordStrength >= 2
                                                            ? 'bg-warning'
                                                            : 'bg-error'
                                                    : 'bg-surface-hover/30'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-text-tertiary">
                                            Security Level: <span className={
                                                passwordStrength >= 3 ? 'text-success' :
                                                    passwordStrength >= 2 ? 'text-warning' : 'text-error'
                                            }>
                                                {passwordStrength >= 3 ? 'CALIBRATED' : passwordStrength >= 2 ? 'UNSTABLE' : 'CRITICAL'}
                                            </span>
                                        </p>
                                        <div className="flex gap-2">
                                            {password.length >= 8 && <Check className="w-3 h-3 text-success" />}
                                            {password.match(/[A-Z]/) && <Target className="w-3 h-3 text-success" />}
                                            {password.match(/[^a-zA-Z0-9]/) && <Zap className="w-3 h-3 text-success" />}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="confirm-password" className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">
                                Confirm password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                                    <Lock className="h-5 w-5 text-text-tertiary group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    id="confirm-password"
                                    name="confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input-themed"
                                    placeholder="••••••••"
                                />
                                {confirmPassword && password === confirmPassword && (
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                        <Shield className="h-4 w-4 text-success animate-pulse" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start bg-surface/30 p-3 rounded-xl border border-border/10">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    name="terms"
                                    type="checkbox"
                                    required
                                    className="h-4 w-4 rounded border-border/50 text-primary bg-surface focus:ring-primary focus:ring-offset-background transition-all"
                                />
                            </div>
                            <div className="ml-3">
                                <label htmlFor="terms" className="text-[10px] font-bold text-text-secondary leading-tight">
                                    I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                                </label>
                            </div>
                        </div>

                        <GlowButton
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    CREATING PORTAL...
                                </>
                            ) : (
                                <>
                                    <Shield className="w-5 h-5 mr-2" />
                                    CREATE ACCOUNT
                                </>
                            )}
                        </GlowButton>
                    </form>
                </GlassCard>
            </div>

            {/* Verification Icons Footer */}
            <div className="mt-12 flex justify-center gap-10 opacity-30 grayscale hover:opacity-60 hover:grayscale-0 transition-all duration-700">
                <Shield className="w-6 h-6 text-text-tertiary" />
                <Lock className="w-6 h-6 text-text-tertiary" />
                <Zap className="w-6 h-6 text-text-tertiary" />
            </div>
        </div>
    );
}

function getPasswordStrength(password: string): number {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
}
