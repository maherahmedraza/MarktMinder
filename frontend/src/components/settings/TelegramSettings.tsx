'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { Send, Link, Unlink, Bell, BellOff, Copy, Check, ExternalLink } from 'lucide-react';
import api from '@/lib/api';

interface TelegramStatus {
    linked: boolean;
    username?: string;
    notificationsEnabled: boolean;
    linkedAt?: string;
}

export function TelegramSettings() {
    const [status, setStatus] = useState<TelegramStatus | null>(null);
    const [linkCode, setLinkCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStatus();
    }, []);

    async function loadStatus() {
        try {
            const data = await api.request<TelegramStatus>('/telegram/status');
            setStatus(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    async function generateCode() {
        setIsGenerating(true);
        setError('');
        try {
            const data = await api.request<{ code: string }>('/telegram/generate-code', {
                method: 'POST',
            });
            setLinkCode(data.code);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    }

    async function unlinkAccount() {
        try {
            await api.request('/telegram/unlink', { method: 'POST' });
            setStatus({ linked: false, notificationsEnabled: false });
            setLinkCode(null);
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function toggleNotifications() {
        if (!status) return;
        try {
            await api.request('/telegram/toggle-notifications', {
                method: 'POST',
                body: JSON.stringify({ enabled: !status.notificationsEnabled }),
            });
            setStatus({ ...status, notificationsEnabled: !status.notificationsEnabled });
        } catch (err: any) {
            setError(err.message);
        }
    }

    async function copyCode() {
        if (!linkCode) return;
        await navigator.clipboard.writeText(`/link ${linkCode}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (isLoading) {
        return (
            <GlassCard className="animate-pulse">
                <div className="h-32 bg-surface-hover rounded-lg" />
            </GlassCard>
        );
    }

    return (
        <GlassCard>
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-[#0088cc]/10 rounded-xl flex items-center justify-center border border-[#0088cc]/20">
                    <Send className="w-6 h-6 text-[#0088cc]" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-text-primary">Telegram Notifications</h3>
                    <p className="text-sm text-text-secondary">Get instant price alerts on your phone</p>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                    {error}
                </div>
            )}

            {status?.linked ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-success/5 border border-success/20 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                                <Check className="w-5 h-5 text-success" />
                            </div>
                            <div>
                                <p className="font-medium text-text-primary">Connected</p>
                                {status.username && (
                                    <p className="text-sm text-text-secondary">@{status.username}</p>
                                )}
                            </div>
                        </div>
                        <GlowButton variant="outline" size="sm" onClick={unlinkAccount}>
                            <Unlink className="w-4 h-4 mr-2" />
                            Unlink
                        </GlowButton>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-surface-hover/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            {status.notificationsEnabled ? (
                                <Bell className="w-5 h-5 text-primary" />
                            ) : (
                                <BellOff className="w-5 h-5 text-text-tertiary" />
                            )}
                            <span className="text-text-primary">
                                {status.notificationsEnabled ? 'Notifications enabled' : 'Notifications paused'}
                            </span>
                        </div>
                        <GlowButton
                            variant="outline"
                            size="sm"
                            onClick={toggleNotifications}
                        >
                            {status.notificationsEnabled ? 'Pause' : 'Enable'}
                        </GlowButton>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-text-secondary">
                        Connect your Telegram account to receive instant notifications when:
                    </p>
                    <ul className="text-sm text-text-secondary space-y-1 ml-4 list-disc">
                        <li>Product prices drop</li>
                        <li>Target prices are reached</li>
                        <li>Daily deal summaries</li>
                    </ul>

                    {linkCode ? (
                        <div className="space-y-3">
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                <p className="text-sm text-text-secondary mb-2">1. Open Telegram and search for <strong>@MarktMinderBot</strong></p>
                                <p className="text-sm text-text-secondary mb-3">2. Send this command:</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-3 bg-background rounded-lg font-mono text-primary text-lg">
                                        /link {linkCode}
                                    </code>
                                    <GlowButton variant="outline" size="sm" onClick={copyCode}>
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </GlowButton>
                                </div>
                                <p className="text-xs text-text-tertiary mt-2">Code expires in 10 minutes</p>
                            </div>
                            <a
                                href="https://t.me/MarktMinderBot"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full p-3 bg-[#0088cc] text-white rounded-xl hover:bg-[#0077b5] transition-colors font-medium"
                            >
                                <Send className="w-5 h-5" />
                                Open Telegram
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    ) : (
                        <GlowButton
                            onClick={generateCode}
                            disabled={isGenerating}
                            className="w-full"
                        >
                            <Link className="w-4 h-4 mr-2" />
                            {isGenerating ? 'Generating...' : 'Link Telegram Account'}
                        </GlowButton>
                    )}
                </div>
            )}
        </GlassCard>
    );
}

export default TelegramSettings;
