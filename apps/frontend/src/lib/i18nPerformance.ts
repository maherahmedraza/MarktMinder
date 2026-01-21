/**
 * Localization Performance Monitoring
 * 
 * Tracks and measures performance metrics for i18n operations,
 * including translation loading times, locale switching, and message lookups.
 */

export interface LocalePerformanceMetrics {
    locale: string;
    loadTime: number; // ms to load translation bundle
    bundleSize: number; // bytes
    messageCount: number;
    cacheHits: number;
    cacheMisses: number;
    switchCount: number;
    averageLookupTime: number; // ms
}

export interface PerformanceReport {
    timestamp: Date;
    metrics: LocalePerformanceMetrics[];
    recommendations: string[];
    overallScore: number; // 0-100
}

// In-memory performance tracking
const performanceData: Map<string, {
    loadTimes: number[];
    lookupTimes: number[];
    cacheHits: number;
    cacheMisses: number;
    switchCount: number;
}> = new Map();

/**
 * Initialize tracking for a locale
 */
function initLocaleTracking(locale: string): void {
    if (!performanceData.has(locale)) {
        performanceData.set(locale, {
            loadTimes: [],
            lookupTimes: [],
            cacheHits: 0,
            cacheMisses: 0,
            switchCount: 0,
        });
    }
}

/**
 * Track translation bundle load time
 */
export function trackBundleLoad(locale: string, loadTimeMs: number): void {
    initLocaleTracking(locale);
    const data = performanceData.get(locale)!;
    data.loadTimes.push(loadTimeMs);

    // Log slow loads
    if (loadTimeMs > 500) {
        console.warn(`[i18n Performance] Slow bundle load for ${locale}: ${loadTimeMs}ms`);
    }
}

/**
 * Track message lookup time (for cached vs uncached lookups)
 */
export function trackLookup(locale: string, lookupTimeMs: number, cached: boolean): void {
    initLocaleTracking(locale);
    const data = performanceData.get(locale)!;
    data.lookupTimes.push(lookupTimeMs);

    if (cached) {
        data.cacheHits++;
    } else {
        data.cacheMisses++;
    }
}

/**
 * Track locale switch
 */
export function trackLocaleSwitch(fromLocale: string, toLocale: string): void {
    initLocaleTracking(toLocale);
    const data = performanceData.get(toLocale)!;
    data.switchCount++;
}

/**
 * Get performance metrics for a specific locale
 */
export function getLocaleMetrics(locale: string): LocalePerformanceMetrics | null {
    const data = performanceData.get(locale);
    if (!data) return null;

    const avgLoadTime = data.loadTimes.length > 0
        ? data.loadTimes.reduce((a, b) => a + b, 0) / data.loadTimes.length
        : 0;

    const avgLookupTime = data.lookupTimes.length > 0
        ? data.lookupTimes.reduce((a, b) => a + b, 0) / data.lookupTimes.length
        : 0;

    return {
        locale,
        loadTime: avgLoadTime,
        bundleSize: 0, // Would need to track actual bundle sizes
        messageCount: 0, // Would need to count messages
        cacheHits: data.cacheHits,
        cacheMisses: data.cacheMisses,
        switchCount: data.switchCount,
        averageLookupTime: avgLookupTime,
    };
}

/**
 * Generate performance report with recommendations
 */
export function generatePerformanceReport(): PerformanceReport {
    const metrics: LocalePerformanceMetrics[] = [];
    const recommendations: string[] = [];

    for (const locale of performanceData.keys()) {
        const localeMetrics = getLocaleMetrics(locale);
        if (localeMetrics) {
            metrics.push(localeMetrics);

            // Generate recommendations
            if (localeMetrics.loadTime > 500) {
                recommendations.push(`Consider code-splitting ${locale} translation bundle`);
            }

            const cacheRatio = localeMetrics.cacheHits /
                (localeMetrics.cacheHits + localeMetrics.cacheMisses || 1);
            if (cacheRatio < 0.8) {
                recommendations.push(`Low cache hit ratio (${(cacheRatio * 100).toFixed(0)}%) for ${locale} - consider preloading common messages`);
            }
        }
    }

    // Calculate overall score
    let overallScore = 100;
    for (const m of metrics) {
        if (m.loadTime > 300) overallScore -= 10;
        if (m.loadTime > 500) overallScore -= 10;
        if (m.averageLookupTime > 5) overallScore -= 5;
    }

    if (recommendations.length === 0) {
        recommendations.push('All localization metrics are within optimal ranges');
    }

    return {
        timestamp: new Date(),
        metrics,
        recommendations,
        overallScore: Math.max(0, overallScore),
    };
}

/**
 * Reset all performance data (useful for testing)
 */
export function resetPerformanceData(): void {
    performanceData.clear();
}

export default {
    trackBundleLoad,
    trackLookup,
    trackLocaleSwitch,
    getLocaleMetrics,
    generatePerformanceReport,
    resetPerformanceData,
};
