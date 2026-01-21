'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Currency = 'EUR' | 'USD' | 'GBP';

interface CurrencyContextType {
    currency: Currency;
    setCurrency: (currency: Currency) => void;
    formatPrice: (amount: number, sourceCurrency?: Currency) => string;
    convertPrice: (amount: number, from: Currency, to: Currency) => number;
    rates: Record<Currency, number>;
    isLoading: boolean;
}

// Default exchange rates (EUR as base)
const DEFAULT_RATES: Record<Currency, number> = {
    EUR: 1,
    USD: 1.08,
    GBP: 0.86,
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrencyState] = useState<Currency>('EUR');
    const [rates, setRates] = useState<Record<Currency, number>>(DEFAULT_RATES);
    const [isLoading, setIsLoading] = useState(true);

    // Load saved currency preference
    useEffect(() => {
        const saved = localStorage.getItem('preferred_currency') as Currency;
        if (saved && ['EUR', 'USD', 'GBP'].includes(saved)) {
            setCurrencyState(saved);
        }

        // Fetch live exchange rates (optional - use free API)
        fetchExchangeRates();
    }, []);

    const fetchExchangeRates = async () => {
        try {
            // Using a free exchange rate API
            // In production, consider using a more reliable paid API
            const response = await fetch(
                'https://api.exchangerate-api.com/v4/latest/EUR'
            );
            if (response.ok) {
                const data = await response.json();
                setRates({
                    EUR: 1,
                    USD: data.rates.USD || DEFAULT_RATES.USD,
                    GBP: data.rates.GBP || DEFAULT_RATES.GBP,
                });
            }
        } catch (error) {
            console.warn('Failed to fetch exchange rates, using defaults');
        } finally {
            setIsLoading(false);
        }
    };

    const setCurrency = (newCurrency: Currency) => {
        setCurrencyState(newCurrency);
        localStorage.setItem('preferred_currency', newCurrency);
    };

    const convertPrice = (amount: number, from: Currency, to: Currency): number => {
        if (from === to) return amount;
        // Convert to EUR first, then to target currency
        const inEur = amount / rates[from];
        return inEur * rates[to];
    };

    const formatPrice = (amount: number, sourceCurrency: Currency = 'EUR'): string => {
        const converted = convertPrice(amount, sourceCurrency, currency);

        const formatter = new Intl.NumberFormat(
            currency === 'EUR' ? 'de-DE' : currency === 'GBP' ? 'en-GB' : 'en-US',
            {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }
        );

        return formatter.format(converted);
    };

    return (
        <CurrencyContext.Provider
            value={{
                currency,
                setCurrency,
                formatPrice,
                convertPrice,
                rates,
                isLoading,
            }}
        >
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}

export default useCurrency;
