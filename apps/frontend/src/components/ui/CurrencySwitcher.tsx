'use client';

import { useState, useRef, useEffect } from 'react';
import { useCurrency, Currency } from '@/lib/useCurrency';
import { ChevronDown, DollarSign, Euro, PoundSterling } from 'lucide-react';

const currencyConfig: Record<Currency, { label: string; icon: typeof Euro; symbol: string }> = {
    EUR: { label: 'EUR', icon: Euro, symbol: '€' },
    USD: { label: 'USD', icon: DollarSign, symbol: '$' },
    GBP: { label: 'GBP', icon: PoundSterling, symbol: '£' },
};

export function CurrencySwitcher() {
    const { currency, setCurrency, isLoading } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const CurrentIcon = currencyConfig[currency].icon;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-elevated border border-border/50 hover:border-primary/50 transition-colors text-sm"
                disabled={isLoading}
                aria-label="Select currency"
            >
                <CurrentIcon className="w-4 h-4 text-primary" />
                <span className="font-medium">{currencyConfig[currency].label}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-xl bg-surface-elevated border border-border/50 shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {(Object.keys(currencyConfig) as Currency[]).map((curr) => {
                        const config = currencyConfig[curr];
                        const Icon = config.icon;
                        const isActive = currency === curr;

                        return (
                            <button
                                key={curr}
                                onClick={() => {
                                    setCurrency(curr);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-hover transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-text-secondary'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="font-medium">{config.label}</span>
                                <span className="text-text-tertiary ml-auto">{config.symbol}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default CurrencySwitcher;
