'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Settings, User, Bell, Shield, Trash2, Save, Loader2, CheckCircle, AlertCircle, Cookie, CreditCard, Zap, ExternalLink, Crown } from 'lucide-react';
import { resetConsent, getConsentSettings } from '@/components/CookieConsent';

export default function SettingsPage() {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Profile form state
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');

    // Notification settings
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [priceDropAlerts, setPriceDropAlerts] = useState(true);
    const [weeklyDigest, setWeeklyDigest] = useState(false);

    // Subscription state
    const [subscription, setSubscription] = useState<any>(null);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);
    const [billingLoading, setBillingLoading] = useState(false);

    // Fetch subscription data when billing tab is active
    useEffect(() => {
        if (activeTab === 'billing' && !subscription) {
            fetchSubscription();
        }
    }, [activeTab]);

    async function fetchSubscription() {
        setSubscriptionLoading(true);
        try {
            const data = await api.request<any>('/billing/subscription');
            setSubscription(data);
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
        } finally {
            setSubscriptionLoading(false);
        }
    }

    async function handleManageBilling() {
        setBillingLoading(true);
        try {
            const { url } = await api.request<{ url: string }>('/billing/create-portal', { method: 'POST' });
            if (url) window.location.href = url;
        } catch (error: any) {
            alert(error.message || 'Failed to open billing portal');
        } finally {
            setBillingLoading(false);
        }
    }

    async function handleUpgrade(tier: string) {
        setBillingLoading(true);
        try {
            const { url } = await api.request<{ url: string }>('/billing/create-checkout', {
                method: 'POST',
                body: { tier, interval: 'monthly' }
            });
            if (url) window.location.href = url;
        } catch (error: any) {
            alert(error.message || 'Failed to start checkout');
        } finally {
            setBillingLoading(false);
        }
    }

    async function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsSaving(false);
    }

    async function handleSaveNotifications(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        setMessage({ type: 'success', text: 'Notification preferences saved!' });
        setIsSaving(false);
    }

    async function handleDeleteAccount() {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            return;
        }

        if (!confirm('This will permanently delete all your data including tracked products and alerts. Continue?')) {
            return;
        }

        // In production, make API call to delete account
        logout();
    }

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'billing', label: 'Billing', icon: CreditCard },
        { id: 'privacy', label: 'Privacy', icon: Cookie },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account and preferences</p>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span>{message.text}</span>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'text-primary-800 dark:text-primary-100 border-b-2 border-primary-800 dark:border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <form onSubmit={handleSaveProfile} className="max-w-lg space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Full Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-3 bg-primary-800 dark:bg-primary-700 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <form onSubmit={handleSaveNotifications} className="max-w-lg space-y-6">
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">Email Alerts</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Receive price alerts via email</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={emailAlerts}
                                        onChange={(e) => setEmailAlerts(e.target.checked)}
                                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">Instant Price Drop Notifications</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Get notified immediately when prices drop</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={priceDropAlerts}
                                        onChange={(e) => setPriceDropAlerts(e.target.checked)}
                                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">Weekly Digest</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Receive a weekly summary of price changes</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={weeklyDigest}
                                        onChange={(e) => setWeeklyDigest(e.target.checked)}
                                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                    />
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-3 bg-primary-800 dark:bg-primary-700 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Preferences
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && (
                        <div className="max-w-3xl space-y-6">
                            {subscriptionLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                                </div>
                            ) : subscription ? (
                                <>
                                    {/* Current Plan */}
                                    <div className={`rounded-xl p-6 text-white relative overflow-hidden ${subscription.subscription.tier === 'free'
                                            ? 'bg-gradient-to-br from-gray-700 to-gray-900'
                                            : subscription.subscription.tier === 'pro'
                                                ? 'bg-gradient-to-br from-primary-800 to-primary-900'
                                                : subscription.subscription.tier === 'power'
                                                    ? 'bg-gradient-to-br from-yellow-600 to-orange-700'
                                                    : 'bg-gradient-to-br from-purple-700 to-indigo-900'
                                        }`}>
                                        <div className="relative z-10 flex items-start justify-between">
                                            <div>
                                                <p className="text-white/70 text-sm font-medium mb-1">Current Plan</p>
                                                <h3 className="text-2xl font-bold flex items-center gap-2 capitalize">
                                                    {subscription.subscription.tier === 'free' ? (
                                                        'Free'
                                                    ) : (
                                                        <>
                                                            <Crown className="w-5 h-5" />
                                                            {subscription.subscription.tier}
                                                        </>
                                                    )}
                                                    <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full capitalize">
                                                        {subscription.subscription.status}
                                                    </span>
                                                </h3>
                                                {subscription.subscription.tier !== 'free' && subscription.subscription.currentPeriodEnd && (
                                                    <p className="text-white/60 text-sm mt-2">
                                                        {subscription.subscription.cancelAtPeriodEnd ? 'Cancels on: ' : 'Renews on: '}
                                                        <span className="text-white">
                                                            {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="bg-white/10 p-3 rounded-xl">
                                                {subscription.subscription.tier === 'power' ? (
                                                    <Zap className="w-8 h-8 text-yellow-300" />
                                                ) : subscription.subscription.tier === 'business' ? (
                                                    <Crown className="w-8 h-8 text-purple-300" />
                                                ) : (
                                                    <CreditCard className="w-8 h-8 text-white/60" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div>
                                                <p className="text-white/60 text-xs uppercase tracking-wider">Products</p>
                                                <p className="text-lg font-semibold">
                                                    {subscription.usage.currentProducts} / {subscription.limits.maxProducts === -1 ? '∞' : subscription.limits.maxProducts}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-xs uppercase tracking-wider">Alerts</p>
                                                <p className="text-lg font-semibold">
                                                    {subscription.usage.currentAlerts} / {subscription.limits.maxAlerts === -1 ? '∞' : subscription.limits.maxAlerts}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-xs uppercase tracking-wider">History</p>
                                                <p className="text-lg font-semibold">
                                                    {subscription.subscription.tier === 'free' ? '30 days' : 'Full'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-xs uppercase tracking-wider">AI Predictions</p>
                                                <p className={`text-lg font-semibold ${subscription.subscription.tier === 'free' ? 'text-gray-400' : 'text-green-400'}`}>
                                                    {subscription.subscription.tier === 'free' ? 'Locked' : 'Enabled'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Upgrade Options - Only show for free/pro users */}
                                    {subscription.subscription.tier !== 'business' && (
                                        <div className="bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-xl p-6">
                                            <div className="flex items-center justify-between flex-wrap gap-4">
                                                <div>
                                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {subscription.subscription.tier === 'free' ? 'Upgrade to Pro' : 'Upgrade to Power'}
                                                    </h4>
                                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                                        {subscription.subscription.tier === 'free'
                                                            ? 'Unlock AI predictions, full history, and 50 products.'
                                                            : 'Get Deal Radar, Price DNA, and 200 products.'}
                                                    </p>
                                                </div>
                                                <button
                                                    className="bg-primary-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                                                    onClick={() => handleUpgrade(subscription.subscription.tier === 'free' ? 'pro' : 'power')}
                                                    disabled={billingLoading}
                                                >
                                                    {billingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                                    {subscription.subscription.tier === 'free' ? 'Upgrade to Pro' : 'Upgrade to Power'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Manage Billing - Only show for paid users */}
                                    {subscription.subscription.tier !== 'free' && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Manage Subscription</h3>
                                            <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6">
                                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                                    Update your payment method, view invoices, or cancel your subscription.
                                                </p>
                                                <button
                                                    onClick={handleManageBilling}
                                                    disabled={billingLoading}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                                                >
                                                    {billingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                                                    Open Billing Portal
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Payment Methods - Only for free users */}
                                    {subscription.subscription.tier === 'free' && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Methods</h3>
                                            <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-8 text-center">
                                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <CreditCard className="w-6 h-6 text-gray-400" />
                                                </div>
                                                <p className="text-gray-500 dark:text-gray-400 mb-4">Upgrade to a paid plan to add payment methods</p>
                                                <button
                                                    onClick={() => window.location.href = '/pricing'}
                                                    className="text-primary-600 dark:text-primary-400 font-medium text-sm hover:underline"
                                                >
                                                    View Pricing Plans
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    Failed to load subscription data. <button onClick={fetchSubscription} className="text-primary-600 hover:underline">Retry</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Privacy Tab */}
                    {activeTab === 'privacy' && (
                        <div className="max-w-lg space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Cookie-Einstellungen</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    Verwalten Sie Ihre Cookie-Präferenzen gemäß DSGVO und TTDSG.
                                </p>
                                <button
                                    onClick={() => resetConsent()}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-white transition-colors"
                                >
                                    <Cookie className="w-4 h-4" />
                                    Cookie-Einstellungen ändern
                                </button>
                            </div>

                            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ihre Rechte nach DSGVO</h3>
                                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                    <li>• <strong>Auskunftsrecht:</strong> Sie können jederzeit Auskunft über Ihre gespeicherten Daten verlangen.</li>
                                    <li>• <strong>Recht auf Berichtigung:</strong> Falsche Daten können korrigiert werden.</li>
                                    <li>• <strong>Recht auf Löschung:</strong> Sie können die Löschung Ihrer Daten verlangen.</li>
                                    <li>• <strong>Recht auf Datenübertragbarkeit:</strong> Ihre Daten in maschinenlesbarem Format erhalten.</li>
                                    <li>• <strong>Widerspruchsrecht:</strong> Der Verarbeitung Ihrer Daten widersprechen.</li>
                                </ul>
                            </div>

                            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Daten exportieren</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    Laden Sie eine Kopie aller Ihrer persönlichen Daten herunter.
                                </p>
                                <button
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-800 dark:bg-primary-700 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                                >
                                    Daten herunterladen
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="max-w-lg space-y-8">
                            {/* Change Password */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Current Password
                                        </label>
                                        <input
                                            id="current-password"
                                            type="password"
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            New Password
                                        </label>
                                        <input
                                            id="new-password"
                                            type="password"
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Confirm New Password
                                        </label>
                                        <input
                                            id="confirm-new-password"
                                            type="password"
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 px-6 py-3 bg-primary-800 dark:bg-primary-700 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                                    >
                                        <Shield className="w-4 h-4" />
                                        Update Password
                                    </button>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    Once you delete your account, there is no going back. Please be certain.
                                </p>
                                <button
                                    onClick={handleDeleteAccount}
                                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
