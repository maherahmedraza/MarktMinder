'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

/**
 * TanStack Query Provider
 * 
 * Wraps the application with React Query capabilities for:
 * - Automatic caching and deduplication
 * - Background refetching
 * - Optimistic updates
 * - Loading/error state management
 */
export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Stale time: 5 minutes
                        staleTime: 5 * 60 * 1000,
                        // Cache time: 30 minutes
                        gcTime: 30 * 60 * 1000,
                        // Retry failed requests 3 times
                        retry: 3,
                        // Refetch on window focus (good for real-time data)
                        refetchOnWindowFocus: true,
                        // Refetch on reconnect
                        refetchOnReconnect: true,
                    },
                    mutations: {
                        // Retry mutations once
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

export default QueryProvider;
