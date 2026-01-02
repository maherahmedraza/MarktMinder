'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, TrendingDown, Package, Loader2, AlertCircle } from 'lucide-react';
import api, { Alert } from '@/lib/api';

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadAlerts();
    }, []);

    async function loadAlerts() {
        try {
            setIsLoading(true);
            const { alerts: alertsData } = await api.getAlerts();
            setAlerts(alertsData);
        } catch (err: any) {
            setError(err.message || 'Failed to load alerts');
        } finally {
            setIsLoading(false);
        }
    }

    async function handleToggle(alertId: string) {
        try {
            const { alert: updatedAlert } = await api.toggleAlert(alertId);
            setAlerts(alerts.map(a => a.id === alertId ? updatedAlert : a));
        } catch (err: any) {
            setError(err.message || 'Failed to toggle alert');
        }
    }

    async function handleDelete(alertId: string) {
        if (!confirm('Are you sure you want to delete this alert?')) return;

        try {
            await api.deleteAlert(alertId);
            setAlerts(alerts.filter(a => a.id !== alertId));
        } catch (err: any) {
            setError(err.message || 'Failed to delete alert');
        }
    }

    function getAlertTypeLabel(type: string): string {
        switch (type) {
            case 'price_drop': return 'Price Drop';
            case 'target_price': return 'Target Price';
            case 'back_in_stock': return 'Back in Stock';
            default: return type;
        }
    }

    function getAlertTypeColor(type: string): string {
        switch (type) {
            case 'price_drop': return 'bg-green-100 text-green-800';
            case 'target_price': return 'bg-blue-100 text-blue-800';
            case 'back_in_stock': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Price Alerts</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Get notified when prices change</p>
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {alerts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No alerts yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        Create alerts on your tracked products to get notified when prices drop or reach your target.
                    </p>
                    <Link
                        href="/dashboard/products"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <Package className="w-4 h-4" />
                        View Products
                    </Link>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">Product</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">Alert Type</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">Target Price</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {alerts.map((alert) => (
                                    <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {alert.product?.imageUrl ? (
                                                    <img
                                                        src={alert.product.imageUrl}
                                                        alt={alert.product.title}
                                                        className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-700"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                        <Package className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <Link
                                                        href={`/dashboard/products/${alert.productId}`}
                                                        className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-1"
                                                    >
                                                        {alert.product?.title || 'Unknown Product'}
                                                    </Link>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Current: €{alert.product?.currentPrice ? Number(alert.product.currentPrice).toFixed(2) : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getAlertTypeColor(alert.alertType)}`}>
                                                {getAlertTypeLabel(alert.alertType)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                                            {alert.targetPrice ? `€${Number(alert.targetPrice).toFixed(2)}` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggle(alert.id)}
                                                className="flex items-center gap-2"
                                            >
                                                {alert.isActive ? (
                                                    <>
                                                        <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-500" />
                                                        <span className="text-sm text-green-600 dark:text-green-500 font-medium">Active</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">Paused</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(alert.id)}
                                                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete alert"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Info Card */}
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    How alerts work
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200/80 space-y-2">
                    <li>• <strong>Price Drop:</strong> Get notified when the price decreases by any amount</li>
                    <li>• <strong>Target Price:</strong> Get notified when the price reaches or goes below your target</li>
                    <li>• <strong>Back in Stock:</strong> Get notified when an out-of-stock item becomes available</li>
                </ul>
            </div>
        </div>
    );
}
