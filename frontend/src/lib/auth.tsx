'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api, { User, Tokens } from './api';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const accessToken = Cookies.get('accessToken');
            const refreshToken = Cookies.get('refreshToken');

            if (!accessToken && !refreshToken) {
                setIsLoading(false);
                return;
            }

            if (accessToken) {
                api.setToken(accessToken);
                const { user: userData } = await api.getProfile();
                setUser(userData);
            } else if (refreshToken) {
                // Try to refresh
                const { tokens } = await api.refreshToken(refreshToken);
                saveTokens(tokens);
                api.setToken(tokens.accessToken);
                const { user: userData } = await api.getProfile();
                setUser(userData);
            }
        } catch (error) {
            // Clear invalid tokens
            clearTokens();
        } finally {
            setIsLoading(false);
        }
    }

    function saveTokens(tokens: Tokens) {
        const expiresIn = tokens.expiresIn / (24 * 60 * 60); // Convert seconds to days
        Cookies.set('accessToken', tokens.accessToken, { expires: expiresIn });
        Cookies.set('refreshToken', tokens.refreshToken, { expires: 30 }); // 30 days
        api.setToken(tokens.accessToken);
    }

    function clearTokens() {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        api.setToken(null);
    }

    async function login(email: string, password: string) {
        const { user: userData, tokens } = await api.login(email, password);
        saveTokens(tokens);
        setUser(userData);
        router.push('/dashboard');
    }

    async function register(email: string, password: string, name: string) {
        const { user: userData, tokens } = await api.register(email, password, name);
        saveTokens(tokens);
        setUser(userData);
        router.push('/dashboard');
    }

    async function logout() {
        try {
            const refreshToken = Cookies.get('refreshToken');
            if (refreshToken) {
                await api.logout(refreshToken);
            }
        } catch (error) {
            // Ignore errors during logout
        } finally {
            clearTokens();
            setUser(null);
            router.push('/');
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
