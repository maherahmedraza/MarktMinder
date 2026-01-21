/**
 * Translation Memory Management
 * 
 * Provides utilities for managing and caching translations,
 * tracking translation coverage, and finding missing translations.
 */

export interface TranslationEntry {
    key: string;
    value: string;
    locale: string;
    lastUpdated: Date;
    usageCount: number;
}

export interface TranslationCoverage {
    locale: string;
    totalKeys: number;
    translatedKeys: number;
    missingKeys: string[];
    coveragePercent: number;
}

export interface TranslationMemory {
    entries: Map<string, TranslationEntry>;
    referenceLocale: string;
    supportedLocales: string[];
}

// Global translation memory instance
const translationMemory: TranslationMemory = {
    entries: new Map(),
    referenceLocale: 'en',
    supportedLocales: ['en', 'de', 'fr', 'es', 'pt', 'ja'],
};

/**
 * Create a unique key for translation entry
 */
function createEntryKey(locale: string, key: string): string {
    return `${locale}:${key}`;
}

/**
 * Add or update a translation entry
 */
export function addTranslation(locale: string, key: string, value: string): void {
    const entryKey = createEntryKey(locale, key);
    const existing = translationMemory.entries.get(entryKey);

    translationMemory.entries.set(entryKey, {
        key,
        value,
        locale,
        lastUpdated: new Date(),
        usageCount: existing ? existing.usageCount : 0,
    });
}

/**
 * Get a translation with usage tracking
 */
export function getTranslation(locale: string, key: string): string | null {
    const entryKey = createEntryKey(locale, key);
    const entry = translationMemory.entries.get(entryKey);

    if (entry) {
        entry.usageCount++;
        return entry.value;
    }

    return null;
}

/**
 * Import translations from a JSON object (message file)
 */
export function importTranslations(locale: string, messages: Record<string, any>, prefix: string = ''): void {
    for (const [key, value] of Object.entries(messages)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string') {
            addTranslation(locale, fullKey, value);
        } else if (typeof value === 'object' && value !== null) {
            // Recursively handle nested objects
            importTranslations(locale, value, fullKey);
        }
    }
}

/**
 * Get all keys for the reference locale
 */
export function getReferenceKeys(): string[] {
    const keys: string[] = [];
    for (const [entryKey, entry] of translationMemory.entries) {
        if (entry.locale === translationMemory.referenceLocale) {
            keys.push(entry.key);
        }
    }
    return keys;
}

/**
 * Calculate translation coverage for a locale
 */
export function getCoverage(locale: string): TranslationCoverage {
    const referenceKeys = getReferenceKeys();
    const translatedKeys: string[] = [];
    const missingKeys: string[] = [];

    for (const key of referenceKeys) {
        const entryKey = createEntryKey(locale, key);
        if (translationMemory.entries.has(entryKey)) {
            translatedKeys.push(key);
        } else {
            missingKeys.push(key);
        }
    }

    return {
        locale,
        totalKeys: referenceKeys.length,
        translatedKeys: translatedKeys.length,
        missingKeys,
        coveragePercent: referenceKeys.length > 0
            ? (translatedKeys.length / referenceKeys.length) * 100
            : 100,
    };
}

/**
 * Get coverage report for all locales
 */
export function getCoverageReport(): TranslationCoverage[] {
    return translationMemory.supportedLocales.map(locale => getCoverage(locale));
}

/**
 * Find unused translations (translations with 0 usage)
 */
export function findUnusedTranslations(): TranslationEntry[] {
    const unused: TranslationEntry[] = [];

    for (const entry of translationMemory.entries.values()) {
        if (entry.usageCount === 0) {
            unused.push(entry);
        }
    }

    return unused;
}

/**
 * Find fuzzy matches for a translation (for translation suggestions)
 */
export function findSimilarTranslations(value: string, limit: number = 5): TranslationEntry[] {
    const matches: { entry: TranslationEntry; similarity: number }[] = [];
    const searchLower = value.toLowerCase();

    for (const entry of translationMemory.entries.values()) {
        const entryLower = entry.value.toLowerCase();

        // Simple similarity check (contains or starts with)
        let similarity = 0;
        if (entryLower === searchLower) {
            similarity = 1;
        } else if (entryLower.includes(searchLower) || searchLower.includes(entryLower)) {
            similarity = 0.7;
        } else if (entryLower.split(' ').some(word => searchLower.includes(word))) {
            similarity = 0.3;
        }

        if (similarity > 0) {
            matches.push({ entry, similarity });
        }
    }

    // Sort by similarity and return top matches
    return matches
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(m => m.entry);
}

/**
 * Export translations for a locale as JSON
 */
export function exportTranslations(locale: string): Record<string, any> {
    const result: Record<string, any> = {};

    for (const entry of translationMemory.entries.values()) {
        if (entry.locale !== locale) continue;

        // Reconstruct nested structure
        const parts = entry.key.split('.');
        let current = result;

        for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }

        current[parts[parts.length - 1]] = entry.value;
    }

    return result;
}

/**
 * Clear translation memory
 */
export function clearMemory(): void {
    translationMemory.entries.clear();
}

export default {
    addTranslation,
    getTranslation,
    importTranslations,
    getCoverage,
    getCoverageReport,
    findUnusedTranslations,
    findSimilarTranslations,
    exportTranslations,
    clearMemory,
};
