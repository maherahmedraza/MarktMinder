'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { Settings, User, Bell, Shield, Trash2, Save, Loader2, CheckCircle, AlertCircle, Cookie, CreditCard, Zap, ExternalLink, Crown } from 'lucide-react';
import { resetConsent, getConsentSettings } from '@/components/CookieConsent';
import { subscribeToPush } from '@/lib/push';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { TelegramSettings } from '@/components/settings/TelegramSettings';

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
    const [pushAlerts, setPushAlerts] = useState(false);
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
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-sm">
                            <Settings className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-black text-text-primary tracking-tight uppercase">
                            System <span className="text-gradient">Config</span>
                        </h1>
                    </div>
                    <p className="text-text-secondary max-w-2xl text-lg font-medium leading-relaxed">
                        Identity parameters and communication protocols. Control Tower // User Configuration
                    </p>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 transition-all animate-in slide-in-from-top-2 focus-ring ${message.type === 'success'
                    ? 'bg-success/5 border-success/20 text-success'
                    : 'bg-error/5 border-error/20 text-error'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span className="text-sm font-bold uppercase tracking-wide">{message.text}</span>
                </div>
            )}

            <GlassCard padding="none" className="overflow-hidden">
                <div className="flex border-b border-border/10 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-8 py-5 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 ${activeTab === tab.id
                                ? 'text-primary border-primary bg-primary/5'
                                : 'text-text-tertiary border-transparent hover:text-text-secondary hover:bg-surface/50'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-8">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <form onSubmit={handleSaveProfile} className="max-w-xl space-y-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">
                                        Identity Label
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-primary transition-all placeholder:text-text-tertiary/30"
                                        placeholder="Enter your name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">
                                        Communication Node (Email)
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-primary transition-all placeholder:text-text-tertiary/30"
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>

                            <GlowButton
                                type="submit"
                                disabled={isSaving}
                                className="w-full sm:w-auto"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Update Profile
                                    </>
                                )}
                            </GlowButton>
                        </form>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <>
                            <form onSubmit={handleSaveNotifications} className="max-w-xl space-y-8">
                                <div className="grid grid-cols-1 gap-4">
                                    {[
                                        { id: 'email', label: 'Email Alerts', sub: 'Receive price alerts via email', checked: emailAlerts, set: setEmailAlerts },
                                        { id: 'price', label: 'Instant Drops', sub: 'Neural notifications on price delta', checked: priceDropAlerts, set: setPriceDropAlerts },
                                        { id: 'weekly', label: 'Weekly Summary', sub: 'Consolidated market intelligence', checked: weeklyDigest, set: setWeeklyDigest },
                                    ].map((item) => (
                                        <label key={item.id} className="group flex items-center justify-between p-5 bg-surface/30 border border-border/50 rounded-2xl cursor-pointer hover:bg-surface-hover/50 hover:border-primary/30 transition-all">
                                            <div>
                                                <p className="text-sm font-bold text-text-primary uppercase tracking-wide mb-1">{item.label}</p>
                                                <p className="text-xs text-text-tertiary font-medium">{item.sub}</p>
                                            </div>
                                            <div className={`w-12 h-6 rounded-full relative transition-colors ${item.checked ? 'bg-primary' : 'bg-surface-elevated'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.checked ? 'left-7' : 'left-1 shadow-sm'}`} />
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={item.checked}
                                                onChange={(e) => item.set(e.target.checked)}
                                                className="hidden"
                                            />
                                        </label>
                                    ))}

                                    <label className="group flex items-center justify-between p-5 bg-surface/30 border border-border/50 rounded-2xl cursor-pointer hover:bg-surface-hover/50 hover:border-primary/30 transition-all">
                                        <div>
                                            <p className="text-sm font-bold text-text-primary uppercase tracking-wide mb-1">Push Notifications</p>
                                            <p className="text-xs text-text-tertiary font-medium">Browser-level deal alerts</p>
                                        </div>
                                        <div className={`w-12 h-6 rounded-full relative transition-colors ${pushAlerts ? 'bg-primary' : 'bg-surface-elevated'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pushAlerts ? 'left-7' : 'left-1 shadow-sm'}`} />
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={pushAlerts}
                                            onChange={async (e) => {
                                                const checked = e.target.checked;
                                                if (checked) {
                                                    try {
                                                        await subscribeToPush();
                                                        setPushAlerts(true);
                                                        setMessage({ type: 'success', text: 'Protocol initialized: Push active' });
                                                    } catch (err) {
                                                        console.error(err);
                                                        setPushAlerts(false);
                                                        setMessage({ type: 'error', text: 'Protocol failed: Check permissions' });
                                                    }
                                                } else {
                                                    setPushAlerts(false);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                <GlowButton
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full sm:w-auto"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Commit Settings
                                        </>
                                    )}
                                </GlowButton>
                            </form>

                            {/* Telegram Integration */}
                            <div className="mt-8 pt-8 border-t border-border/20 max-w-xl">
                                <TelegramSettings />
                            </div>
                        </>
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && (
                        <div className="space-y-8">
                            {subscriptionLoading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
                                    <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mt-4">Retrieving Ledger...</p>
                                </div>
                            ) : subscription ? (
                                <>
                                    {/* Current Plan Card */}
                                    <div className="relative group overflow-hidden rounded-3xl p-1 bg-gradient-to-br from-primary/30 via-border/20 to-secondary/30">
                                        <div className="relative bg-background/90 backdrop-blur-xl rounded-[22px] p-8 overflow-hidden">
                                            {/* Decorative Background Icon */}
                                            <div className="absolute -right-12 -bottom-12 p-8 text-primary/5 group-hover:text-primary/10 transition-colors pointer-events-none">
                                                <CreditCard className="w-64 h-64 -rotate-12" />
                                            </div>

                                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                                <div className="space-y-4">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-mono">Current Subscription</p>
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="heading-2 text-text-primary capitalize">
                                                                {subscription.subscription.tier} Tier
                                                            </h3>
                                                            <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest">
                                                                {subscription.subscription.status}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {subscription.subscription.tier !== 'free' && subscription.subscription.currentPeriodEnd && (
                                                        <div className="flex items-center gap-2 text-text-tertiary">
                                                            <Zap className="w-4 h-4 text-primary" />
                                                            <span className="text-xs font-bold uppercase tracking-wider">
                                                                {subscription.subscription.cancelAtPeriodEnd ? 'Expires' : 'Sync Date'}:
                                                                <span className="text-text-secondary ml-2">
                                                                    {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-x-12 gap-y-6 md:border-l border-border/20 md:pl-12">
                                                    <div>
                                                        <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">Products</p>
                                                        <p className="text-xl font-black font-mono text-text-primary">
                                                            {subscription.usage.currentProducts}<span className="text-text-tertiary text-sm">/{subscription.limits.maxProducts === -1 ? '∞' : subscription.limits.maxProducts}</span>
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">Intelligence</p>
                                                        <p className={`text-sm font-black uppercase tracking-widest ${subscription.subscription.tier === 'free' ? 'text-text-tertiary' : 'text-primary'}`}>
                                                            {subscription.subscription.tier === 'free' ? 'Standard' : 'Neural+'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Upgrade Action */}
                                    {subscription.subscription.tier !== 'business' && (
                                        <GlassCard variant="pro" className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-10">
                                            <div className="space-y-2">
                                                <h4 className="heading-3 text-text-primary">Expand Capabilities</h4>
                                                <p className="text-sm text-text-secondary max-w-md">
                                                    {subscription.subscription.tier === 'free'
                                                        ? 'Initialize full neural history, AI price projections, and 50 tracked asset slots.'
                                                        : 'Deploy Deal Radar, automated price DNA sequencing, and 200 high-frequency asset slots.'}
                                                </p>
                                            </div>
                                            <GlowButton
                                                onClick={() => handleUpgrade(subscription.subscription.tier === 'free' ? 'pro' : 'power')}
                                                disabled={billingLoading}
                                                className="w-full md:w-auto min-w-[180px]"
                                            >
                                                {billingLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                                                Level Up Tier
                                            </GlowButton>
                                        </GlassCard>
                                    )}

                                    {/* Portal Access */}
                                    {subscription.subscription.tier !== 'free' && (
                                        <div className="pt-4 border-t border-border/10">
                                            <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-4">Financial Dashboard</p>
                                            <button
                                                onClick={handleManageBilling}
                                                disabled={billingLoading}
                                                className="flex items-center gap-2 group text-text-secondary hover:text-primary transition-colors text-sm font-bold uppercase tracking-widest"
                                            >
                                                {billingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                                                Open Stripe Billing Portal
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-20 bg-surface/20 rounded-3xl border border-dashed border-border/50">
                                    <AlertCircle className="w-10 h-10 text-error/40 mx-auto mb-4" />
                                    <p className="text-sm text-text-tertiary font-bold uppercase tracking-widest">ledger connection failed</p>
                                    <button onClick={fetchSubscription} className="mt-4 text-primary text-xs font-black uppercase tracking-[0.2em] hover:text-primary-hover">Retry Connection</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Privacy Tab */}
                    {activeTab === 'privacy' && (
                        <div className="max-w-2xl space-y-10">
                            <div className="space-y-4">
                                <h3 className="heading-3 text-text-primary">Data Sovereignty</h3>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    Manage your data interaction protocols and privacy boundaries in accordance with DSGVO/TTDSG regulations.
                                </p>
                                <GlowButton variant="outline" onClick={() => resetConsent()}>
                                    <Cookie className="w-4 h-4 mr-2" />
                                    Re-initialize Cookie Policy
                                </GlowButton>
                            </div>

                            <div className="pt-10 border-t border-border/10 space-y-6">
                                <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-mono">Your Genetic Data Rights (DSGVO)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[
                                        { title: 'Auskunftsrecht', desc: 'Request full data exposure record.' },
                                        { title: 'Berichtigung', desc: 'Modify existing data nodes.' },
                                        { title: 'Löschung', desc: 'Terminate all associated data.' },
                                        { title: 'Datenübertragbarkeit', desc: 'Export datasets in machine-readable format.' }
                                    ].map((right, idx) => (
                                        <div key={idx} className="p-5 bg-surface/20 rounded-2xl border border-border/30">
                                            <p className="text-xs font-black text-text-primary uppercase tracking-wide mb-1">{right.title}</p>
                                            <p className="text-[11px] text-text-tertiary leading-relaxed">{right.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-10 border-t border-border/10 space-y-4">
                                <h3 className="heading-3 text-text-primary">Dataset Extraction</h3>
                                <p className="text-sm text-text-secondary">Download a complete snapshot of your neural interaction history and asset metadata.</p>
                                <GlowButton variant="secondary">
                                    Initialize Data Extraction
                                </GlowButton>
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="max-w-xl space-y-12">
                            {/* Change Password */}
                            <div className="space-y-8">
                                <h3 className="heading-3 text-text-primary">Access Protocol Update</h3>
                                <div className="space-y-4">
                                    {[
                                        { id: 'curr', label: 'Current Access Key', ph: '********' },
                                        { id: 'new', label: 'New Access Key', ph: 'Minimum 12 chars' },
                                        { id: 'conf', label: 'Confirm New Key', ph: 'Repeat new key' }
                                    ].map((field) => (
                                        <div key={field.id} className="space-y-2">
                                            <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest ml-1">{field.label}</label>
                                            <input
                                                type="password"
                                                className="w-full px-4 py-3.5 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-text-primary transition-all placeholder:text-text-tertiary/20"
                                                placeholder={field.ph}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <GlowButton className="w-full sm:w-auto">
                                    <Shield className="w-4 h-4 mr-2" />
                                    Rotate Access Keys
                                </GlowButton>
                            </div>

                            {/* Danger Zone */}
                            <div className="pt-12 border-t border-border/10">
                                <div className="bg-error/5 border border-error/20 p-8 rounded-[2rem] space-y-6">
                                    <div>
                                        <h3 className="text-lg font-black text-error uppercase tracking-widest">Nuclear Option</h3>
                                        <p className="text-xs text-text-tertiary font-medium mt-1 uppercase tracking-wide">Account termination and data erasure.</p>
                                    </div>
                                    <p className="text-sm text-text-secondary leading-relaxed">
                                        Terminating this account will permanently erase all tracking history, price delta logs, and neural predictions. This action is <span className="text-error font-black underline underline-offset-4">irreversible</span>.
                                    </p>
                                    <GlowButton
                                        onClick={handleDeleteAccount}
                                        variant="danger"
                                        className="w-full sm:w-auto"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Self-Destruct Account
                                    </GlowButton>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}
