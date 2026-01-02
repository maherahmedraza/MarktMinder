'use client';

import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    variant?: 'danger' | 'warning' | 'default';
    itemCount?: number;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false,
    variant = 'default',
    itemCount,
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
            button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
            border: 'border-red-200 dark:border-red-800',
        },
        warning: {
            icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
            button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
            border: 'border-amber-200 dark:border-amber-800',
        },
        default: {
            icon: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
            button: 'bg-primary-800 hover:bg-primary-700 focus:ring-primary-500',
            border: 'border-gray-200 dark:border-gray-700',
        },
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className={`relative bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl border ${styles.border}`}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-full ${styles.icon}`}>
                        {variant === 'danger' ? (
                            <Trash2 className="w-6 h-6" />
                        ) : (
                            <AlertTriangle className="w-6 h-6" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        {itemCount && itemCount > 1 && (
                            <span className="text-sm text-red-500 font-medium">
                                {itemCount} items will be deleted
                            </span>
                        )}
                    </div>
                </div>

                {/* Message */}
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {message}
                </p>

                {/* Warning box for danger variant */}
                {variant === 'danger' && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-6">
                        <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>This action cannot be undone.</span>
                        </p>
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${styles.button}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                {confirmText}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmDialog;
