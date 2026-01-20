'use client';

import { AlertTriangle, Bell, Loader2 } from 'lucide-react';

export interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isDestructive?: boolean;
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isDestructive = false,
    isLoading = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${isDestructive ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'}`}>
                        {isDestructive ? <AlertTriangle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">{message}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 text-white rounded-lg transition-colors font-medium flex items-center gap-2 ${isDestructive
                            ? 'bg-red-600 hover:bg-red-700 disabled:hover:bg-red-600'
                            : 'bg-primary-600 hover:bg-primary-700 disabled:hover:bg-primary-600'
                            } disabled:opacity-50`}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isDestructive ? 'Delete' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
