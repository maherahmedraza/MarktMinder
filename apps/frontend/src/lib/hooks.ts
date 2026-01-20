'use client';

/**
 * TanStack Query Hooks for MarktMinder
 * 
 * Custom hooks for data fetching with automatic caching,
 * background refetching, and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { Product, Alert } from './api';

// ==========================================
// Query Keys
// ==========================================
export const queryKeys = {
    // User
    profile: ['profile'] as const,

    // Products
    products: ['products'] as const,
    product: (id: string) => ['product', id] as const,

    // Alerts
    alerts: ['alerts'] as const,
    alert: (id: string) => ['alert', id] as const,
};

// ==========================================
// Product Hooks
// ==========================================

export function useProducts(options?: { marketplace?: string; page?: number; limit?: number }) {
    return useQuery({
        queryKey: [...queryKeys.products, options],
        queryFn: () => api.getProducts(options),
    });
}

export function useProduct(id: string, range?: string) {
    return useQuery({
        queryKey: [...queryKeys.product(id), range],
        queryFn: () => api.getProduct(id, range),
        enabled: !!id,
    });
}

export function useAddProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { url: string; notes?: string }) =>
            api.addProduct(data.url, data.notes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.products });
        },
    });
}

export function useRemoveProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.removeProduct(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.products });
        },
    });
}

// ==========================================
// Alert Hooks
// ==========================================

export function useAlerts() {
    return useQuery({
        queryKey: queryKeys.alerts,
        queryFn: () => api.getAlerts(),
    });
}

export function useCreateAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: {
            productId: string;
            alertType: string;
            targetPrice?: number;
        }) => api.createAlert(data.productId, data.alertType, data.targetPrice),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
        },
    });
}

export function useToggleAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.toggleAlert(id),
        onMutate: async (id: string) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: queryKeys.alerts });
            const previousAlerts = queryClient.getQueryData(queryKeys.alerts);

            queryClient.setQueryData(queryKeys.alerts, (old: { alerts: Alert[] } | undefined) => {
                if (!old) return old;
                return {
                    ...old,
                    alerts: old.alerts.map((alert: Alert) =>
                        alert.id === id ? { ...alert, isActive: !alert.isActive } : alert
                    ),
                };
            });

            return { previousAlerts };
        },
        onError: (_err: Error, _id: string, context: { previousAlerts: unknown } | undefined) => {
            // Rollback on error
            if (context?.previousAlerts) {
                queryClient.setQueryData(queryKeys.alerts, context.previousAlerts);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
        },
    });
}

export function useDeleteAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.deleteAlert(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
        },
    });
}

// ==========================================
// Insight Hooks
// ==========================================

export function usePriceDrops(limit: number = 5) {
    return useQuery({
        queryKey: ['price-drops', limit],
        queryFn: () => api.getPriceDrops(limit),
    });
}

export function useProductPrediction(id: string) {
    return useQuery({
        queryKey: ['prediction', id],
        queryFn: () => api.getProductPrediction(id),
        enabled: !!id,
        staleTime: 60 * 60 * 1000, // 1 hour (predictions don't change often)
    });
}

export function useDeals(options?: { limit?: number; marketplace?: string; minDrop?: number }) {
    return useQuery({
        queryKey: ['deals', options],
        queryFn: () => api.getDeals(options),
        retry: (failureCount, error: any) => {
            // Don't retry on 403 (Upgrade required)
            if (error?.status === 403) return false;
            return failureCount < 3;
        }
    });
}

export function useDealStats() {
    return useQuery({
        queryKey: ['deal-stats'],
        queryFn: () => api.getDealStats(),
    });
}

// ==========================================
// Profile Hooks
// ==========================================

export function useProfile() {
    return useQuery({
        queryKey: queryKeys.profile,
        queryFn: () => api.getProfile(),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

// ==========================================
// Folder Hooks
// ==========================================

export function useFolders() {
    return useQuery({
        queryKey: ['folders'],
        queryFn: () => api.getFolders(),
    });
}

export function useCreateFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (name: string) => api.createFolder(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
    });
}

export function useMoveProductToFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ productId, folderId }: { productId: string; folderId: string }) =>
            api.moveProductToFolder(productId, folderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.products });
        },
    });
}

export function useUpdateFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.updateFolder(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
    });
}

export function useDeleteFolder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.deleteFolder(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] });
        },
    });
}

// ==========================================
// Admin Hooks
// ==========================================

export function useAdminStats(days?: string) {
    return useQuery({
        queryKey: ['admin-stats', days],
        queryFn: () => api.getAdminStats(days),
    });
}

export function useAdminProducts(options?: { page?: number; limit?: number; marketplace?: string; search?: string }) {
    return useQuery({
        queryKey: ['admin-products', options],
        queryFn: () => api.getAdminProducts(options),
    });
}

export function useAdminUsers(options?: { page?: number; limit?: number; search?: string }) {
    return useQuery({
        queryKey: ['admin-users', options],
        queryFn: () => api.getAdminUsers(options),
    });
}

export function useDeleteAdminUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.deleteAdminUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        },
    });
}

export function useBulkDeleteAdminUsers() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userIds: string[]) => api.bulkDeleteAdminUsers(userIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        },
    });
}
