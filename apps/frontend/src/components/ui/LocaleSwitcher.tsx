'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, Globe } from 'lucide-react';
import { useLocale } from 'next-intl';

const locales = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
] as const;

export function LocaleSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
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

    const currentLocale = locales.find(l => l.code === locale) || locales[0];

    const handleLocaleChange = (newLocale: string) => {
        // Set cookie and refresh
        document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;

        startTransition(() => {
            // Refresh the page to apply new locale
            router.refresh();
        });

        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-elevated border border-border/50 hover:border-primary/50 transition-colors text-sm"
                disabled={isPending}
                aria-label="Select language"
            >
                <Globe className="w-4 h-4 text-primary" />
                <span className="font-medium">{currentLocale.flag} {currentLocale.code.toUpperCase()}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl bg-surface-elevated border border-border/50 shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {locales.map((loc) => {
                        const isActive = locale === loc.code;

                        return (
                            <button
                                key={loc.code}
                                onClick={() => handleLocaleChange(loc.code)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-hover transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-text-secondary'
                                    }`}
                            >
                                <span className="text-lg">{loc.flag}</span>
                                <span className="font-medium">{loc.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default LocaleSwitcher;
