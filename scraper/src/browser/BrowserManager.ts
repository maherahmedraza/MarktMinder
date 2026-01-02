import puppeteer, { Browser, Page, LaunchOptions } from 'puppeteer';
import config from '../config.js';
import logger from '../logger.js';
import { proxyManager, Proxy } from './ProxyManager.js';
import { setupAntiDetection, humanDelay, getRandomUserAgent } from './AntiDetection.js';

export interface BrowserOptions {
    headless?: boolean;
    proxy?: string;
    userAgent?: string;
}

/**
 * Smart Browser Manager with Proxy Rotation and Anti-Detection
 * 
 * Features:
 * - Free proxy rotation from public APIs
 * - Advanced anti-detection (stealth mode)
 * - Connection pooling for efficiency
 * - Memory-efficient page recycling
 * - Automatic retry with different proxies
 */
export class BrowserManager {
    private browser: Browser | null = null;
    private pagePool: Page[] = [];
    private maxPages: number;
    private pageUseCount: Map<Page, number> = new Map();
    private maxPageUsage: number = 30; // Recycle pages after 30 uses
    private currentProxy: Proxy | null = null;
    private initialized = false;

    constructor(maxPages: number = 5) {
        this.maxPages = maxPages;
    }

    /**
     * Initialize browser with proxy support
     */
    async initialize(options: BrowserOptions = {}): Promise<void> {
        if (this.browser) {
            return;
        }

        // Initialize proxy manager
        if (!this.initialized) {
            await proxyManager.initialize();
            this.initialized = true;
        }

        const launchArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--ignore-certificate-errors',
        ];

        // Try to get a proxy
        this.currentProxy = proxyManager.getNext();
        if (this.currentProxy) {
            launchArgs.push(`--proxy-server=${this.currentProxy.host}:${this.currentProxy.port}`);
            logger.info(`Using proxy: ${this.currentProxy.host}:${this.currentProxy.port}`);
        } else {
            logger.info('No proxy available, using direct connection with stealth mode');
        }

        const launchOptions: LaunchOptions = {
            headless: true,
            args: launchArgs,
        };

        let retries = 3;
        while (retries > 0) {
            try {
                this.browser = await puppeteer.launch(launchOptions);
                logger.info('Browser initialized successfully');
                return;
            } catch (error) {
                retries--;
                if (this.currentProxy) {
                    proxyManager.markFailed(this.currentProxy);
                }

                if (retries === 0) throw error;

                // Try different proxy
                this.currentProxy = proxyManager.getNext();
                if (this.currentProxy) {
                    launchOptions.args = launchArgs.filter(a => !a.startsWith('--proxy-server'));
                    launchOptions.args!.push(`--proxy-server=${this.currentProxy.host}:${this.currentProxy.port}`);
                    logger.warn(`Retrying with different proxy: ${this.currentProxy.host}:${this.currentProxy.port}`);
                } else {
                    logger.warn(`Browser launch failed, retrying without proxy... (${retries} attempts left)`);
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    /**
     * Get a page with anti-detection applied
     */
    async getPage(): Promise<Page> {
        if (!this.browser) {
            await this.initialize();
        }

        // Try to reuse a page from pool
        while (this.pagePool.length > 0) {
            const page = this.pagePool.pop()!;
            const useCount = this.pageUseCount.get(page) || 0;

            if (useCount >= this.maxPageUsage) {
                await page.close().catch(() => { });
                this.pageUseCount.delete(page);
                continue;
            }

            try {
                await page.goto('about:blank', { timeout: 5000 });
                this.pageUseCount.set(page, useCount + 1);
                return page;
            } catch {
                await page.close().catch(() => { });
                this.pageUseCount.delete(page);
            }
        }

        // Create new page with full anti-detection
        const page = await this.browser!.newPage();
        this.pageUseCount.set(page, 1);

        // Apply comprehensive anti-detection
        await setupAntiDetection(page);

        // Block analytics and tracking
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();
            const resourceType = request.resourceType();

            // Block tracking/analytics
            const blockedDomains = [
                'google-analytics', 'googletagmanager', 'facebook',
                'doubleclick', 'adsense', 'amazon-adsystem',
                'scorecardresearch', 'quantserve', 'cloudfront.net/rum'
            ];

            if (blockedDomains.some(domain => url.includes(domain))) {
                request.abort();
                return;
            }

            // Block heavy resources for speed
            const blockedTypes = ['image', 'media', 'font'];
            if (blockedTypes.includes(resourceType)) {
                request.abort();
            } else {
                request.continue();
            }
        });

        // Handle proxy authentication if needed
        if (this.currentProxy?.username) {
            await page.authenticate({
                username: this.currentProxy.username,
                password: this.currentProxy.password || '',
            });
        }

        return page;
    }

    /**
     * Mark current proxy as successful
     */
    markProxySuccess(): void {
        if (this.currentProxy) {
            proxyManager.markSuccess(this.currentProxy);
        }
    }

    /**
     * Mark current proxy as failed and rotate
     */
    async rotateProxy(): Promise<void> {
        if (this.currentProxy) {
            proxyManager.markFailed(this.currentProxy);
        }

        // Close current browser and restart with new proxy
        await this.close();
        this.currentProxy = proxyManager.getNext();
        await this.initialize();
    }

    /**
     * Return page to pool
     */
    async releasePage(page: Page): Promise<void> {
        const useCount = this.pageUseCount.get(page) || 0;

        if (useCount >= this.maxPageUsage || this.pagePool.length >= this.maxPages) {
            await page.close().catch(() => { });
            this.pageUseCount.delete(page);
            return;
        }

        try {
            const client = await page.createCDPSession();
            await client.send('Network.clearBrowserCookies');
            await client.send('Network.clearBrowserCache');
            await page.goto('about:blank', { timeout: 5000 });
            this.pagePool.push(page);
        } catch {
            await page.close().catch(() => { });
            this.pageUseCount.delete(page);
        }
    }

    /**
     * Close browser and cleanup
     */
    async close(): Promise<void> {
        for (const page of this.pagePool) {
            await page.close().catch(() => { });
        }
        this.pagePool = [];
        this.pageUseCount.clear();

        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            logger.info('Browser closed');
        }
    }

    /**
     * Get browser instance
     */
    getBrowser(): Browser | null {
        return this.browser;
    }

    /**
     * Get status info
     */
    getStatus(): {
        poolSize: number;
        proxyActive: boolean;
        proxyHost: string | null;
        proxyStats: { total: number; healthy: number };
    } {
        const proxyStats = proxyManager.getStats();
        return {
            poolSize: this.pagePool.length,
            proxyActive: this.currentProxy !== null,
            proxyHost: this.currentProxy ? `${this.currentProxy.host}:${this.currentProxy.port}` : null,
            proxyStats: { total: proxyStats.total, healthy: proxyStats.healthy },
        };
    }
}

// Singleton instance
export const browserManager = new BrowserManager();
export default browserManager;
