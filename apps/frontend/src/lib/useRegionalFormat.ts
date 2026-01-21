'use client';

import { useLocale } from 'next-intl';
import { useCurrency } from './useCurrency';

export type Region = 'de' | 'us' | 'uk' | 'fr' | 'es' | 'pt' | 'jp';

interface RegionConfig {
    locale: string;
    currency: string;
    dateFormat: Intl.DateTimeFormatOptions;
    numberFormat: Intl.NumberFormatOptions;
    taxRate: number; // VAT/Sales tax rate
    taxName: string;
    timezone: string;
}

const regionConfigs: Record<Region, RegionConfig> = {
    de: {
        locale: 'de-DE',
        currency: 'EUR',
        dateFormat: { day: '2-digit', month: '2-digit', year: 'numeric' },
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        taxRate: 0.19,
        taxName: 'MwSt.',
        timezone: 'Europe/Berlin',
    },
    us: {
        locale: 'en-US',
        currency: 'USD',
        dateFormat: { month: 'short', day: 'numeric', year: 'numeric' },
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        taxRate: 0, // Varies by state
        taxName: 'Sales Tax',
        timezone: 'America/New_York',
    },
    uk: {
        locale: 'en-GB',
        currency: 'GBP',
        dateFormat: { day: 'numeric', month: 'long', year: 'numeric' },
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        taxRate: 0.20,
        taxName: 'VAT',
        timezone: 'Europe/London',
    },
    fr: {
        locale: 'fr-FR',
        currency: 'EUR',
        dateFormat: { day: 'numeric', month: 'long', year: 'numeric' },
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        taxRate: 0.20,
        taxName: 'TVA',
        timezone: 'Europe/Paris',
    },
    es: {
        locale: 'es-ES',
        currency: 'EUR',
        dateFormat: { day: 'numeric', month: 'long', year: 'numeric' },
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        taxRate: 0.21,
        taxName: 'IVA',
        timezone: 'Europe/Madrid',
    },
    pt: {
        locale: 'pt-PT',
        currency: 'EUR',
        dateFormat: { day: 'numeric', month: 'long', year: 'numeric' },
        numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        taxRate: 0.23,
        taxName: 'IVA',
        timezone: 'Europe/Lisbon',
    },
    jp: {
        locale: 'ja-JP',
        currency: 'JPY',
        dateFormat: { year: 'numeric', month: 'long', day: 'numeric' },
        numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
        taxRate: 0.10,
        taxName: '消費税',
        timezone: 'Asia/Tokyo',
    },
};

// Map language codes to default regions
const localeToRegion: Record<string, Region> = {
    en: 'uk',
    de: 'de',
    fr: 'fr',
    es: 'es',
    pt: 'pt',
    ja: 'jp',
};

/**
 * Hook for regional date, number, and tax formatting
 */
export function useRegionalFormat() {
    const locale = useLocale();
    const { currency } = useCurrency();

    // Infer region from locale
    const region: Region = localeToRegion[locale] || 'de';
    const config = regionConfigs[region];

    /**
     * Format a date according to regional preferences
     */
    const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        return new Intl.DateTimeFormat(config.locale, options || config.dateFormat).format(d);
    };

    /**
     * Format a relative time (e.g., "2 hours ago")
     */
    const formatRelativeTime = (date: Date | string | number): string => {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        const rtf = new Intl.RelativeTimeFormat(config.locale, { numeric: 'auto' });

        if (diffDay > 0) return rtf.format(-diffDay, 'day');
        if (diffHour > 0) return rtf.format(-diffHour, 'hour');
        if (diffMin > 0) return rtf.format(-diffMin, 'minute');
        return rtf.format(-diffSec, 'second');
    };

    /**
     * Format a number according to regional preferences
     */
    const formatNumber = (num: number, options?: Intl.NumberFormatOptions): string => {
        return new Intl.NumberFormat(config.locale, options || config.numberFormat).format(num);
    };

    /**
     * Format a percentage
     */
    const formatPercent = (num: number): string => {
        return new Intl.NumberFormat(config.locale, {
            style: 'percent',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        }).format(num);
    };

    /**
     * Calculate and format tax amount
     */
    const calculateTax = (priceWithTax: number): { netPrice: number; taxAmount: number; formattedTax: string } => {
        const netPrice = priceWithTax / (1 + config.taxRate);
        const taxAmount = priceWithTax - netPrice;

        return {
            netPrice,
            taxAmount,
            formattedTax: `inkl. ${formatNumber(taxAmount)} ${config.taxName} (${formatPercent(config.taxRate)})`,
        };
    };

    /**
     * Format a datetime for display
     */
    const formatDateTime = (date: Date | string | number): string => {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        return new Intl.DateTimeFormat(config.locale, {
            ...config.dateFormat,
            hour: '2-digit',
            minute: '2-digit',
        }).format(d);
    };

    return {
        region,
        config,
        formatDate,
        formatRelativeTime,
        formatNumber,
        formatPercent,
        calculateTax,
        formatDateTime,
    };
}

export default useRegionalFormat;
