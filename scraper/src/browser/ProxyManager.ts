import logger from '../logger.js';
import config from '../config.js';

export interface Proxy {
    host: string;
    port: number;
    protocol: 'http' | 'https' | 'socks5';
    username?: string;
    password?: string;
    country?: string;
    lastUsed?: Date;
    failCount: number;
    successCount: number;
}

/**
 * Free Proxy Manager with rotation and health checking
 * 
 * Free Proxy Sources:
 * 1. Environment variable proxy (if configured)
 * 2. Free proxy lists from public APIs
 * 3. No proxy (direct connection with enhanced stealth)
 * 
 * For production, consider:
 * - ScraperAPI (https://scraperapi.com) - 5,000 free API calls/month
 * - Bright Data (https://brightdata.com) - Free trial
 * - ProxyScrape (https://proxyscrape.com) - Free proxy list API
 */
export class ProxyManager {
    private proxies: Proxy[] = [];
    private currentIndex = 0;
    private lastFetch = 0;
    private fetchInterval = 30 * 60 * 1000; // 30 minutes

    /**
     * Initialize with environment proxy or fetch free ones
     */
    async initialize(): Promise<void> {
        // Check for configured proxy first
        const envProxy = process.env.PROXY_HOST;
        if (envProxy) {
            this.proxies.push({
                host: envProxy,
                port: parseInt(process.env.PROXY_PORT || '8080', 10),
                protocol: 'http',
                username: process.env.PROXY_USERNAME,
                password: process.env.PROXY_PASSWORD,
                failCount: 0,
                successCount: 0,
            });
            logger.info(`ProxyManager: Using configured proxy ${envProxy}`);
            return;
        }

        // Fetch free proxies if enabled
        if (config.proxy.useFreeProxies) {
            await this.fetchFreeProxies();
        } else {
            logger.info('ProxyManager: Free proxies disabled by config');
        }
    }

    /**
     * Fetch free proxies from public sources
     */
    async fetchFreeProxies(): Promise<void> {
        const now = Date.now();
        if (this.proxies.length > 0 && (now - this.lastFetch) < this.fetchInterval) {
            return;
        }

        logger.info('ProxyManager: Fetching free proxies...');
        const newProxies: Proxy[] = [];

        // Source 1: ProxyScrape API (free)
        try {
            const response = await fetch(
                'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all'
            );
            const text = await response.text();
            const lines = text.trim().split('\n');

            for (const line of lines.slice(0, 20)) { // Limit to 20
                const [host, port] = line.trim().split(':');
                if (host && port) {
                    newProxies.push({
                        host,
                        port: parseInt(port, 10),
                        protocol: 'http',
                        failCount: 0,
                        successCount: 0,
                    });
                }
            }
        } catch (error) {
            logger.warn('Failed to fetch from ProxyScrape:', error);
        }

        // Source 2: Free-Proxy-List API
        try {
            const response = await fetch('https://www.proxy-list.download/api/v1/get?type=http');
            const text = await response.text();
            const lines = text.trim().split('\n');

            for (const line of lines.slice(0, 10)) {
                const [host, port] = line.trim().split(':');
                if (host && port && !newProxies.some(p => p.host === host)) {
                    newProxies.push({
                        host,
                        port: parseInt(port, 10),
                        protocol: 'http',
                        failCount: 0,
                        successCount: 0,
                    });
                }
            }
        } catch (error) {
            logger.warn('Failed to fetch from proxy-list.download:', error);
        }

        if (newProxies.length > 0) {
            this.proxies = newProxies;
            this.lastFetch = now;
            logger.info(`ProxyManager: Loaded ${newProxies.length} free proxies`);
        } else {
            logger.warn('ProxyManager: No free proxies available, using direct connection');
        }
    }

    /**
     * Get next proxy with rotation
     */
    getNext(): Proxy | null {
        if (this.proxies.length === 0) {
            return null;
        }

        // Filter out proxies with too many failures
        const healthyProxies = this.proxies.filter(p => p.failCount < 3);
        if (healthyProxies.length === 0) {
            // Reset all fail counts and try again
            this.proxies.forEach(p => p.failCount = 0);
            logger.info('ProxyManager: Reset all proxy fail counts');
        }

        const available = healthyProxies.length > 0 ? healthyProxies : this.proxies;
        this.currentIndex = (this.currentIndex + 1) % available.length;

        const proxy = available[this.currentIndex];
        proxy.lastUsed = new Date();

        return proxy;
    }

    /**
     * Get proxy URL string for Puppeteer
     */
    getProxyUrl(proxy: Proxy): string {
        if (proxy.username && proxy.password) {
            return `${proxy.protocol}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
        }
        return `${proxy.protocol}://${proxy.host}:${proxy.port}`;
    }

    /**
     * Mark proxy as successful
     */
    markSuccess(proxy: Proxy): void {
        proxy.successCount++;
        proxy.failCount = Math.max(0, proxy.failCount - 1);
    }

    /**
     * Mark proxy as failed
     */
    markFailed(proxy: Proxy): void {
        proxy.failCount++;
        logger.debug(`Proxy ${proxy.host}:${proxy.port} failed (count: ${proxy.failCount})`);
    }

    /**
     * Get stats
     */
    getStats(): { total: number; healthy: number; lastFetch: Date | null } {
        return {
            total: this.proxies.length,
            healthy: this.proxies.filter(p => p.failCount < 3).length,
            lastFetch: this.lastFetch ? new Date(this.lastFetch) : null,
        };
    }

    /**
     * Check if proxies are available
     */
    hasProxies(): boolean {
        return this.proxies.length > 0;
    }
}

// Singleton
export const proxyManager = new ProxyManager();
export default proxyManager;
