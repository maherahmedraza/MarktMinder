'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle, ChevronRight, Wand2, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';

interface ParsedCondition {
    id: string;
    field: string;
    operator: string;
    value: number | string | [number, number];
    unit?: string;
}

interface ParsedAlert {
    success: boolean;
    conditions: ParsedCondition[];
    logic: 'AND' | 'OR';
    summary: string;
    errors?: string[];
    suggestions?: string[];
    validation?: {
        valid: boolean;
        issues: string[];
    };
}

interface NLPAlertInputProps {
    productId: string;
    productTitle?: string;
    onAlertCreated?: (alert: any) => void;
    className?: string;
}

const EXAMPLE_PHRASES = [
    "Alert me when price drops below €50",
    "Notify me if it falls by 20%",
    "Tell me when it hits the lowest price",
    "Alert if it goes below €100 or drops 15%",
    "Let me know when it's back in stock",
];

export function NLPAlertInput({ productId, productTitle, onAlertCreated, className = '' }: NLPAlertInputProps) {
    const [text, setText] = useState('');
    const [parsed, setParsed] = useState<ParsedAlert | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Fetch suggestions on load
    useEffect(() => {
        fetchSuggestions('');
    }, []);

    // Debounced parsing
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (text.length < 5) {
            setParsed(null);
            return;
        }

        debounceRef.current = setTimeout(() => {
            parseText(text);
        }, 400);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [text]);

    async function fetchSuggestions(partialText: string) {
        try {
            const response = await fetch(`/api/alerts/nlp/suggestions?text=${encodeURIComponent(partialText)}`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setSuggestions(data.suggestions || []);
            }
        } catch (err) {
            // Silently fail, suggestions are not critical
        }
    }

    async function parseText(inputText: string) {
        setIsParsing(true);
        setError(null);

        try {
            const response = await fetch('/api/alerts/nlp/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ text: inputText }),
            });

            const data = await response.json();
            setParsed(data);

            if (data.suggestions) {
                setSuggestions(data.suggestions);
            }
        } catch (err) {
            setError('Failed to parse your request');
        } finally {
            setIsParsing(false);
        }
    }

    async function handleCreate() {
        if (!parsed?.success) return;

        setIsCreating(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/alerts/nlp/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    text,
                    productId,
                    notifyVia: ['email'],
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create alert');
            }

            const data = await response.json();
            setSuccess('Alert created successfully!');
            setText('');
            setParsed(null);

            if (onAlertCreated) {
                onAlertCreated(data.alert);
            }

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create alert');
        } finally {
            setIsCreating(false);
        }
    }

    function handleSuggestionClick(suggestion: string) {
        setText(suggestion);
        setShowSuggestions(false);
        inputRef.current?.focus();
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey && parsed?.success) {
            e.preventDefault();
            handleCreate();
        }
    }

    return (
        <GlassCard className={`${className} relative overflow-hidden`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Wand2 className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest">Natural Language Alert</h3>
                    <p className="text-xs text-text-tertiary">Describe your alert in plain English</p>
                </div>
            </div>

            {/* Input Area */}
            <div className="relative">
                <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={handleKeyDown}
                    placeholder='Try: "Alert me when price drops below €50"'
                    className="w-full h-24 px-4 py-3 bg-surface-hover/50 border border-border/50 rounded-xl text-text-primary placeholder-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />

                {/* Parsing Indicator */}
                {isParsing && (
                    <div className="absolute right-3 top-3">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                )}

                {/* Clear Button */}
                {text && (
                    <button
                        onClick={() => { setText(''); setParsed(null); }}
                        className="absolute right-3 bottom-3 p-1 hover:bg-surface rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-text-tertiary" />
                    </button>
                )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && !text && suggestions.length > 0 && (
                <div className="mt-2 p-2 bg-surface border border-border/30 rounded-xl shadow-xl">
                    <p className="px-2 py-1 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Suggestions</p>
                    {suggestions.map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}

            {/* Parse Result Preview */}
            {parsed && (
                <div className={`mt-4 p-4 rounded-xl border ${parsed.success
                        ? 'bg-success/5 border-success/20'
                        : 'bg-warning/5 border-warning/20'
                    }`}>
                    <div className="flex items-start gap-3">
                        {parsed.success ? (
                            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <p className={`text-sm font-medium ${parsed.success ? 'text-success' : 'text-warning'}`}>
                                {parsed.success ? 'Understood!' : 'Needs Clarification'}
                            </p>
                            <p className="text-sm text-text-secondary mt-1">{parsed.summary}</p>

                            {/* Condition Details */}
                            {parsed.conditions.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {parsed.conditions.map((condition, idx) => (
                                        <div key={condition.id} className="flex items-center gap-2 text-xs text-text-tertiary">
                                            <ChevronRight className="w-3 h-3" />
                                            <span className="font-mono">
                                                {condition.field} {condition.operator} {
                                                    Array.isArray(condition.value)
                                                        ? `[${condition.value.join(' - ')}]`
                                                        : condition.unit === 'currency'
                                                            ? `€${condition.value}`
                                                            : condition.unit === 'percent'
                                                                ? `${condition.value}%`
                                                                : condition.value
                                                }
                                            </span>
                                            {idx < parsed.conditions.length - 1 && (
                                                <span className="text-primary font-bold">{parsed.logic}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Validation Issues */}
                            {parsed.validation && !parsed.validation.valid && (
                                <div className="mt-2 text-xs text-warning">
                                    {parsed.validation.issues.map((issue, idx) => (
                                        <p key={idx}>⚠️ {issue}</p>
                                    ))}
                                </div>
                            )}

                            {/* Parser Suggestions */}
                            {parsed.suggestions && parsed.suggestions.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-xs text-text-tertiary">Try:</p>
                                    {parsed.suggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            className="text-xs text-primary hover:underline block"
                                        >
                                            "{suggestion}"
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2 text-success text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {success}
                </div>
            )}

            {/* Create Button */}
            <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-text-tertiary">
                    {productTitle && <span>For: <span className="text-text-secondary">{productTitle.slice(0, 40)}...</span></span>}
                </p>
                <GlowButton
                    onClick={handleCreate}
                    disabled={!parsed?.success || isCreating || !parsed?.validation?.valid}
                    className="min-w-[140px]"
                >
                    {isCreating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Creating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Create Alert
                        </>
                    )}
                </GlowButton>
            </div>

            {/* Example Phrases Footer */}
            <div className="mt-6 pt-4 border-t border-border/20">
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Example Phrases</p>
                <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PHRASES.slice(0, 3).map((phrase, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSuggestionClick(phrase)}
                            className="px-3 py-1.5 text-xs bg-surface-hover/50 hover:bg-surface-hover text-text-secondary rounded-lg transition-colors"
                        >
                            {phrase}
                        </button>
                    ))}
                </div>
            </div>
        </GlassCard>
    );
}

export default NLPAlertInput;
