'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { TrendingDown, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

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
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link href="/" className="flex items-center justify-center gap-2">
                    <div className="w-12 h-12 bg-primary-800 rounded-xl flex items-center justify-center">
                        <TrendingDown className="w-7 h-7 text-white" />
                    </div>
                </Link>
                <h1 className="mt-6 text-center text-3xl font-bold text-gray-900">
                    Sign in to your account
                </h1>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Or{' '}
                    <Link href="/register" className="text-primary-600 hover:text-primary-500 font-medium">
                        create a new account
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <Link href="/forgot-password" className="text-primary-600 hover:text-primary-500 font-medium">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary-800 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or continue with</span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <a
                                href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/google`}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                            >
                                <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                                    <path
                                        d="M12.0003 20.45c4.6593 0 8.3604-3.882 8.3604-8.5995 0-.693-.0643-1.3695-.195-2.025h-8.1654v4.065h4.6862c-.2205 1.485-1.464 4.095-4.6863 4.095-2.775 0-5.1195-2.235-5.1195-5.535 0-3.3 2.3445-5.535 5.1195-5.535 1.566 0 2.871.615 3.8685 1.485l3.0135-2.925C17.1558 3.525 14.7738 2.55 12.0003 2.55 6.7803 2.55 2.5503 6.78 2.5503 12s4.23 9.45 9.45 9.45z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M2.5503 12c0-.825.132-1.62.378-2.37L6.5988 12.63c-.15.42-.2325.87-.2325 1.3425-.0015.006-.003.012-.003.018 0-.006.0015-.012.003-.018l-3.816 2.97c-.0015-.006-.003-.012-.003-.018-.0015-.018-.003-.036-.003-.054-.246-.75-.378-1.545-.378-2.37z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12.0003 20.45c2.583 0 4.8855-.891 6.6435-2.409l-3.237-2.673c-.8085.594-1.926 1.017-3.4065 1.017-2.6595 0-4.9605-1.74-5.787-4.143l-3.816 3.069c1.866 3.654 5.6295 6.1395 9.5985 6.1395z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M6.2133 9.873c.423-1.2855 1.455-2.3445 2.766-2.934-.0555.228-.093.462-.111.7005-.018.2385-.0285.4785-.0285.72 0 1.2555.297 2.4435.8235 3.4995l-3.8175 2.97c-.0525-.0915-.1035-.1845-.153-.279-1.3965-2.5815-1.3965-5.703 0-8.2845l.5205.5205z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                <span>Sign in with Google</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
