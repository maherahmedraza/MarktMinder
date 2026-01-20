'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { TrendingDown, Mail, Lock, AlertCircle, Loader2, Target, Zap, Shield } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Failed to login');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] animate-pulse-slow" />
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/10 rounded-full blur-[100px] animate-pulse-slow" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <Link href="/" className="flex items-center justify-center gap-3 group">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm group-hover:scale-110 transition-transform">
                        <TrendingDown className="w-8 h-8 text-primary" />
                    </div>
                </Link>
                <h1 className="mt-8 text-center text-4xl font-black text-text-primary tracking-tight uppercase">
                    Access <span className="text-gradient">Portal</span>
                </h1>
                <p className="mt-3 text-center text-text-tertiary font-bold uppercase tracking-[0.2em] text-[10px]">
                    Synchronizing Neural Interface
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <GlassCard variant="pro" className="py-10 px-6 sm:px-10 border-border/50 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {error && (
                            <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl flex items-center gap-3 animate-shake">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-xs font-black uppercase tracking-widest">{error}</span>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">
                                    Entity Identifier
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-primary transition-colors">
                                        <Mail className="h-5 w-5 text-text-tertiary" />
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
                                        placeholder="user@marktminder.de"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">
                                    Decryption Key
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-primary transition-colors">
                                        <Lock className="h-5 w-5 text-text-tertiary" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-themed"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 bg-surface border-border text-primary focus:ring-primary rounded cursor-pointer transition-all"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-[10px] font-black text-text-secondary uppercase tracking-widest cursor-pointer hover:text-text-primary transition-colors">
                                    Persistent Session
                                </label>
                            </div>

                            <Link href="/forgot-password" title="Recover Access" className="text-[10px] font-black text-primary hover:text-primary-hover uppercase tracking-widest transition-all">
                                Lost Key?
                            </Link>
                        </div>

                        <GlowButton
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-xs font-black uppercase tracking-[0.2em]">Authenticating...</span>
                                </div>
                            ) : (
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Initialize Interface</span>
                            )}
                        </GlowButton>
                    </form>

                    <div className="mt-10">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border/30" />
                            </div>
                            <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.3em]">
                                <span className="px-4 bg-surface-elevated text-text-tertiary">External Protocols</span>
                            </div>
                        </div>

                        <div className="mt-8">
                            <a
                                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/google`}
                                className="w-full flex items-center justify-center gap-4 h-14 bg-surface/50 border border-border/50 rounded-xl text-xs font-black text-text-primary uppercase tracking-widest hover:bg-surface-hover hover:border-primary/30 transition-all shadow-sm group"
                            >
                                <div className="w-6 h-6 flex items-center justify-center bg-white rounded-lg p-1 group-hover:scale-110 transition-transform shadow-sm">
                                    <svg viewBox="0 0 24 24" className="w-full h-full">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
                                    </svg>
                                </div>
                                <span className="group-hover:text-primary transition-colors">Neural Sync (Google)</span>
                            </a>
                        </div>
                    </div>

                    <div className="mt-8 text-center px-4">
                        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest leading-relaxed">
                            New operative?{' '}
                            <Link href="/register" className="text-primary hover:text-primary-hover underline underline-offset-4 transition-all">
                                Register Credentials
                            </Link>
                        </p>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
