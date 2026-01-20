'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import {
    Zap, Plus, Trash2, Bell, BellOff, ChevronDown, ChevronUp,
    TrendingDown, Target, BarChart3, AlertTriangle, CheckCircle
} from 'lucide-react';
import api from '@/lib/api';

interface AlertTemplate {
    id: string;
    name: string;
    description: string;
    needsValue: boolean;
    valueType?: 'percent' | 'currency';
}

interface ConditionalAlert {
    id: string;
    name: string;
    conditions: any[];
    logic: 'AND' | 'OR';
    isActive: boolean;
    notifyVia: string[];
    lastTriggeredAt: string | null;
}

interface SmartAlertBuilderProps {
    productId: string;
    productTitle?: string;
    onAlertCreated?: () => void;
}

export function SmartAlertBuilder({ productId, productTitle, onAlertCreated }: SmartAlertBuilderProps) {
    const [templates, setTemplates] = useState<AlertTemplate[]>([]);
    const [alerts, setAlerts] = useState<ConditionalAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showBuilder, setShowBuilder] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [templateValue, setTemplateValue] = useState<string>('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadData();
    }, [productId]);

    async function loadData() {
        try {
            const [templatesRes, alertsRes] = await Promise.all([
                api.request<{ templates: AlertTemplate[] }>('/conditional-alerts/templates'),
                api.request<{ alerts: ConditionalAlert[] }>('/conditional-alerts'),
            ]);
            setTemplates(templatesRes.templates);
            setAlerts(alertsRes.alerts.filter(a => a.id)); // Filter to ensure valid alerts
        } catch (err: any) {
            console.error('Failed to load alerts data:', err);
        } finally {
            setIsLoading(false);
        }
    }

    async function createAlert() {
        if (!selectedTemplate) {
            setError('Please select an alert type');
            return;
        }

        const template = templates.find(t => t.id === selectedTemplate);
        if (template?.needsValue && !templateValue) {
            setError(`Please enter a ${template.valueType === 'currency' ? 'price' : 'percentage'}`);
            return;
        }

        setIsCreating(true);
        setError('');

        try {
            await api.request('/conditional-alerts/from-template', {
                method: 'POST',
                body: JSON.stringify({
                    productId,
                    template: selectedTemplate,
                    templateValue: templateValue ? parseFloat(templateValue) : undefined,
                    notifyVia: ['email', 'push'],
                }),
            });

            setSuccess('Smart Alert created!');
            setSelectedTemplate('');
            setTemplateValue('');
            setShowBuilder(false);
            loadData();
            onAlertCreated?.();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to create alert');
        } finally {
            setIsCreating(false);
        }
    }

    async function deleteAlert(alertId: string) {
        try {
            await api.request(`/conditional-alerts/${alertId}`, { method: 'DELETE' });
            setAlerts(alerts.filter(a => a.id !== alertId));
        } catch (err: any) {
            setError(err.message || 'Failed to delete alert');
        }
    }

    const productAlerts = alerts.filter(a => a.id); // Show all user alerts for now

    const getTemplateIcon = (templateId: string) => {
        switch (templateId) {
            case 'price_drop_10':
            case 'price_drop_20':
            case 'price_drop_custom':
                return <TrendingDown className="w-5 h-5" />;
            case 'at_lowest':
            case 'near_lowest':
                return <Target className="w-5 h-5" />;
            case 'below_price':
                return <BarChart3 className="w-5 h-5" />;
            case 'falling_trend':
            case 'buy_opportunity':
                return <Zap className="w-5 h-5" />;
            default:
                return <Bell className="w-5 h-5" />;
        }
    };

    if (isLoading) {
        return (
            <GlassCard className="animate-pulse">
                <div className="h-24 bg-surface-hover rounded-lg" />
            </GlassCard>
        );
    }

    return (
        <GlassCard>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/20">
                        <Zap className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-text-primary">Smart Alerts</h3>
                        <p className="text-xs text-text-secondary">Intelligent price monitoring</p>
                    </div>
                </div>
                <GlowButton
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBuilder(!showBuilder)}
                >
                    {showBuilder ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </GlowButton>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {success}
                </div>
            )}

            {/* Alert Builder */}
            {showBuilder && (
                <div className="mb-6 p-4 bg-surface/50 border border-border/30 rounded-xl space-y-4">
                    <p className="text-sm font-medium text-text-primary">Create a Smart Alert</p>

                    {/* Template Selection */}
                    <div className="grid grid-cols-2 gap-2">
                        {templates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => setSelectedTemplate(template.id)}
                                className={`p-3 rounded-lg border text-left transition-all ${selectedTemplate === template.id
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border/50 hover:border-primary/30 text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {getTemplateIcon(template.id)}
                                    <span className="text-sm font-medium">{template.name}</span>
                                </div>
                                <p className="text-xs opacity-70">{template.description}</p>
                            </button>
                        ))}
                    </div>

                    {/* Value Input (if needed) */}
                    {selectedTemplate && templates.find(t => t.id === selectedTemplate)?.needsValue && (
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={templateValue}
                                onChange={(e) => setTemplateValue(e.target.value)}
                                placeholder={templates.find(t => t.id === selectedTemplate)?.valueType === 'currency' ? 'Target price (€)' : 'Percentage (%)'}
                                className="flex-1 px-4 py-2 bg-background/50 border border-border/50 rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <span className="text-text-tertiary text-sm">
                                {templates.find(t => t.id === selectedTemplate)?.valueType === 'currency' ? '€' : '%'}
                            </span>
                        </div>
                    )}

                    <GlowButton
                        onClick={createAlert}
                        disabled={isCreating || !selectedTemplate}
                        className="w-full"
                    >
                        {isCreating ? 'Creating...' : 'Create Smart Alert'}
                    </GlowButton>
                </div>
            )}

            {/* Existing Alerts */}
            {productAlerts.length > 0 ? (
                <div className="space-y-2">
                    {productAlerts.slice(0, 5).map(alert => (
                        <div
                            key={alert.id}
                            className="flex items-center justify-between p-3 bg-surface/30 border border-border/30 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                {alert.isActive ? (
                                    <Bell className="w-4 h-4 text-primary" />
                                ) : (
                                    <BellOff className="w-4 h-4 text-text-tertiary" />
                                )}
                                <div>
                                    <p className="text-sm font-medium text-text-primary">{alert.name}</p>
                                    <p className="text-xs text-text-tertiary">
                                        {alert.conditions.length} condition{alert.conditions.length > 1 ? 's' : ''} ({alert.logic})
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => deleteAlert(alert.id)}
                                className="p-2 text-text-tertiary hover:text-error transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 text-text-secondary">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No smart alerts yet</p>
                    <p className="text-xs text-text-tertiary">Click + to create your first alert</p>
                </div>
            )}
        </GlassCard>
    );
}

export default SmartAlertBuilder;
