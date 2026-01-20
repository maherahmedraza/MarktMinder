'use client';

import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { GlassCard } from './ui/GlassCard';
import { GlowButton } from './ui/GlowButton';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    eventId?: string;
}

/**
 * Error Boundary component that catches React errors and reports them to Sentry
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Capture the error with Sentry
        Sentry.captureException(error, {
            contexts: {
                react: {
                    componentStack: errorInfo.componentStack,
                },
            },
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
                    <GlassCard className="max-w-md w-full text-center space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold text-red-400">Oops!</h1>
                            <p className="text-gray-300">Something went wrong</p>
                        </div>

                        <p className="text-sm text-gray-400">
                            We've been notified of this error and are working on a fix.
                        </p>

                        <div className="flex gap-3 justify-center">
                            <GlowButton
                                onClick={() => window.location.reload()}
                                variant="primary"
                            >
                                Reload Page
                            </GlowButton>

                            <GlowButton
                                onClick={() => {
                                    this.setState({ hasError: false });
                                    window.history.back();
                                }}
                                variant="secondary"
                            >
                                Go Back
                            </GlowButton>
                        </div>
                    </GlassCard>
                </div>
            );
        }

        return this.props.children;
    }
}
