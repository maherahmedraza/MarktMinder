'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const expiresIn = searchParams.get('expiresIn');
        const error = searchParams.get('error');

        if (error) {
            router.push(`/login?error=${encodeURIComponent(error)}`);
            return;
        }

        if (accessToken && refreshToken) {
            // Save tokens exactly as AuthProvider does
            const expiresInSeconds = parseInt(expiresIn || '3600', 10);
            const accessTokenDays = Math.max(expiresInSeconds / (24 * 60 * 60), 1 / 24);

            Cookies.set('accessToken', accessToken, {
                expires: accessTokenDays,
                path: '/',
                sameSite: 'lax'
            });

            Cookies.set('refreshToken', refreshToken, {
                expires: 30, // 30 days
                path: '/',
                sameSite: 'lax'
            });

            // Set token in API instance
            api.setToken(accessToken);

            // Redirect to dashboard
            // We force a hard reload effectively by using window.location to ensure AuthProvider picks up the cookies
            // Or we can just trust that AuthProvider's checkAuth will run on mount of Dashboard
            // For smoother experience, router.push is better, but AuthContext needs to be aware.
            // Since AuthContext reads cookies on mount, and we just set them, if we redirect to a page wrapped in AuthProvider, it might re-check?
            // AuthProvider runs checkAuth on mount (useEffect []). If we are already mounted, it won't re-run.
            // But we are in a different route here. When we navigate to /dashboard, the layout remains mounted?
            // Usually AuthProvider is in root layout.
            // To be safe, we can force a reload or rely on simple navigation if AuthProvider listens to something.
            // Looking at auth.tsx, it only runs checkAuth on mount.
            // So a hard reload is safest to ensure state is synced.
            window.location.href = '/dashboard';
        } else {
            router.push('/login?error=Invalid+callback+parameters');
        }
    }, [router, searchParams]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
                <h2 className="text-xl font-semibold text-gray-900">Completing sign in...</h2>
                <p className="text-gray-500">Please wait while we redirect you.</p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
