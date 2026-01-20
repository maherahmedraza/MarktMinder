'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Package, Trash2, ToggleLeft, ToggleRight, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useAlerts, useToggleAlert, useDeleteAlert } from '@/lib/hooks';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';

export default function AlertsPage() {
    // Data Fetching
    const {
        data: alertsData,
        isLoading: isAlertsLoading,
        error: alertsError
    } = useAlerts();

    // Mutations
    const toggleMutation = useToggleAlert();
    const deleteMutation = useDeleteAlert();

    const alerts = alertsData?.alerts || [];

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; alertId?: string }>({ isOpen: false });

    function handleToggle(alertId: string) {
        toggleMutation.mutate(alertId);
    }

    function confirmDelete(alertId: string) {
        setDeleteModal({ isOpen: true, alertId });
    }

    async function handleConfirmDelete() {
        if (!deleteModal.alertId) return;

        try {
            await deleteMutation.mutateAsync(deleteModal.alertId);
            setDeleteModal({ isOpen: false });
        } catch (err) {
            // Error handling is managed by React Query / Mutation state or global toaster
            console.error('Failed to delete alert', err);
        }
    }

    function getAlertTypeLabel(type: string): string {
        switch (type) {
            case 'price_below': return 'Price Target';
            case 'price_above': return 'Price Above Limit';
            case 'price_drop_pct': return 'Price Drop (%)';
            case 'price_rise_pct': return 'Price Increase (%)';
            case 'back_in_stock': return 'Back in Stock';
            case 'all_time_low': return 'All-Time Low';
            case 'any_change': return 'Any Price Change';
            default: return type.replace(/_/g, ' ');
        }
    }

    function getAlertTypeColor(type: string): string {
        switch (type) {
            case 'price_drop': return 'bg-green-100 text-green-800';
            case 'target_price': return 'bg-blue-100 text-blue-800';
            case 'back_in_stock': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    }

    if (isAlertsLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Bell className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="mt-8 text-xs font-black text-text-tertiary uppercase tracking-[0.4em] animate-pulse">Syncing Alert Nodes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm">
                            <Bell className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase italic">
                            Signal <span className="text-gradient">Alerts</span>
                        </h1>
                    </div>
                    <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                        Active market imbalance triggers. Real-time interception protocols for high-yield discovery.
                    </p>
                </div>
                <Link href="/dashboard/products" className="hidden sm:block">
                    <GlowButton variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        INITIALIZE_ALERT
                    </GlowButton>
                </Link>
            </div>

            {alertsError && (
                <div className="mb-6 bg-error/10 border border-error/20 text-error px-4 py-3 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{(alertsError as Error).message || 'Failed to load alerts'}</span>
                </div>
            )}

            {alerts.length === 0 ? (
                <GlassCard className="text-center py-24 border-dashed border-2 border-border/50">
                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-8 border border-border shadow-inner">
                        <Bell className="w-10 h-10 text-text-tertiary opacity-20" />
                    </div>
                    <h3 className="text-2xl font-black text-text-primary mb-4 tracking-tight uppercase">No Signals Active</h3>
                    <p className="text-text-secondary mb-8 max-w-md mx-auto">
                        Track price movements with precision. Create an alert from any product page to get notifications direct to your dashboard.
                    </p>
                    <Link href="/dashboard/products">
                        <GlowButton>
                            <Package className="w-4 h-4 mr-2" />
                            Browse Products
                        </GlowButton>
                    </Link>
                </GlassCard>
            ) : (
                <div className="space-y-6">
                    {/* Desktop Table Layout */}
                    <div className="hidden md:block">
                        <GlassCard padding="none" className="overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-surface-hover/50 border-b border-border/50">
                                    <tr>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-text-tertiary uppercase tracking-widest">Product</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-text-tertiary uppercase tracking-widest">Trigger Type</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-text-tertiary uppercase tracking-widest">Target Price</th>
                                        <th className="text-left px-6 py-4 text-xs font-bold text-text-tertiary uppercase tracking-widest">Status</th>
                                        <th className="text-right px-6 py-4 text-xs font-bold text-text-tertiary uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {alerts.map((alert) => (
                                        <tr key={alert.id} className="hover:bg-surface-hover/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    {alert.product?.imageUrl ? (
                                                        <img
                                                            src={alert.product.imageUrl}
                                                            alt={alert.product.title || 'Product'}
                                                            className="w-12 h-12 rounded-xl object-cover border border-border/50"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center border border-border/50">
                                                            <Package className="w-6 h-6 text-text-tertiary/50" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={`/dashboard/products/${alert.productId}`}
                                                            className="text-sm font-bold text-text-primary hover:text-primary transition-colors line-clamp-1"
                                                        >
                                                            {alert.product?.title || 'Unknown Product'}
                                                        </Link>
                                                        <p className="text-xs text-text-tertiary mt-0.5 font-mono">
                                                            CURRENT: €{alert.product?.currentPrice ? Number(alert.product.currentPrice).toFixed(2) : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getAlertTypeColor(alert.alertType)}`}>
                                                    {getAlertTypeLabel(alert.alertType)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-black text-text-primary font-mono antialiased">
                                                {alert.targetPrice ? `€${Number(alert.targetPrice).toFixed(2)}` : '---'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggle(alert.id)}
                                                    className="flex items-center gap-3 group transition-colors"
                                                    disabled={toggleMutation.isPending && toggleMutation.variables === alert.id}
                                                >
                                                    {alert.isActive ? (
                                                        <>
                                                            <ToggleRight className="w-7 h-7 text-success group-hover:drop-shadow-glow transition-all" />
                                                            <span className="text-xs font-bold text-success uppercase tracking-widest">Active</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ToggleLeft className="w-7 h-7 text-text-tertiary" />
                                                            <span className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Paused</span>
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => confirmDelete(alert.id)}
                                                    className="p-2 text-text-tertiary hover:text-error hover:bg-error/5 rounded-xl transition-all"
                                                    title="Delete alert"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </GlassCard>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden space-y-4">
                        {alerts.map((alert) => (
                            <GlassCard key={alert.id} padding="default">
                                <div className="flex items-start gap-4 mb-4">
                                    {alert.product?.imageUrl ? (
                                        <img
                                            src={alert.product.imageUrl}
                                            alt={alert.product.title || 'Product'}
                                            className="w-16 h-16 rounded-xl object-cover border border-border/50"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-surface rounded-xl flex items-center justify-center border border-border/50">
                                            <Package className="w-8 h-8 text-text-tertiary/50" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <Link
                                            href={`/dashboard/products/${alert.productId}`}
                                            className="text-sm font-bold text-text-primary hover:text-primary line-clamp-2"
                                        >
                                            {alert.product?.title || 'Unknown Product'}
                                        </Link>
                                        <p className="text-xs text-text-tertiary mt-1 font-mono uppercase">
                                            CURRENT: €{alert.product?.currentPrice ? Number(alert.product.currentPrice).toFixed(2) : 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/10">
                                    <div className="flex flex-col gap-1">
                                        <span className={`inline-flex px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border w-fit ${getAlertTypeColor(alert.alertType)}`}>
                                            {getAlertTypeLabel(alert.alertType)}
                                        </span>
                                        {alert.targetPrice && (
                                            <span className="text-sm font-black text-text-primary font-mono mt-1">
                                                €{Number(alert.targetPrice).toFixed(2)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button onClick={() => handleToggle(alert.id)}>
                                            {alert.isActive ? (
                                                <ToggleRight className="w-8 h-8 text-success" />
                                            ) : (
                                                <ToggleLeft className="w-8 h-8 text-text-tertiary" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(alert.id)}
                                            className="p-2 text-error hover:bg-error/5 rounded-xl"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>

                    {/* How Alerts Work - Info Card */}
                    <GlassCard variant="pro" className="!bg-primary/5 border-primary/20">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                <Bell className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="heading-3 text-text-primary">How alerts work</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-text-primary">Price Target</p>
                                <p className="text-xs text-text-secondary leading-relaxed">Notifications trigger only when a product reaches or goes below your specified limit.</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-text-primary">Global Tracking</p>
                                <p className="text-xs text-text-secondary leading-relaxed">Our scrapers monitor all supported marketplaces 24/7 to ensure you never miss a deal.</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-text-primary">Zero Lag</p>
                                <p className="text-xs text-text-secondary leading-relaxed">Get instant dashboard notifications and optional emails the moment a target is hit.</p>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            )}

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false })}
                onConfirm={handleConfirmDelete}
                title="Deactivate Price Alert?"
                message="This action will permanently stop monitoring for this price target. You can re-enable it at any time from the product page."
                isDestructive={true}
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
