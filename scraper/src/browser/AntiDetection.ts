/**
 * Enhanced Anti-Detection Module
 * 
 * Techniques to avoid bot detection:
 * 1. Random delays between actions
 * 2. Human-like mouse movements
 * 3. Realistic viewport sizes
 * 4. Browser fingerprint randomization
 * 5. Cookie and localStorage management
 */

import { Page } from 'puppeteer';

// Common desktop viewport sizes
const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 2560, height: 1440 },
];

// Realistic user agents (updated 2026)
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// Accept-Language headers for different regions
const ACCEPT_LANGUAGES = [
    'en-US,en;q=0.9',
    'de-DE,de;q=0.9,en;q=0.8',
    'en-GB,en;q=0.9,en-US;q=0.8',
    'fr-FR,fr;q=0.9,en;q=0.8',
];

/**
 * Get random element from array
 */
function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Random delay with jitter
 */
export async function humanDelay(minMs: number = 500, maxMs: number = 2000): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Get random viewport size
 */
export function getRandomViewport(): { width: number; height: number } {
    return randomChoice(VIEWPORTS);
}

/**
 * Get random user agent
 */
export function getRandomUserAgent(): string {
    return randomChoice(USER_AGENTS);
}

/**
 * Get random accept-language header
 */
export function getRandomAcceptLanguage(): string {
    return randomChoice(ACCEPT_LANGUAGES);
}

/**
 * Apply stealth settings to page
 */
export async function applyStealthSettings(page: Page): Promise<void> {
    // Override navigator properties to hide automation
    await page.evaluateOnNewDocument(() => {
        // Hide webdriver
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });

        // Hide automation
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en', 'de'],
        });

        // Realistic plugins
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin' },
                { name: 'Chrome PDF Viewer' },
                { name: 'Native Client' },
            ],
        });

        // Hide chrome
        // @ts-ignore
        window.chrome = {
            runtime: {},
        };

        // Realistic screen
        Object.defineProperty(screen, 'colorDepth', {
            get: () => 24,
        });

        // Permission status
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
            parameters.name === 'notifications'
                ? Promise.resolve({ state: 'prompt' } as PermissionStatus)
                : originalQuery(parameters);
    });
}

/**
 * Simulate human-like scrolling
 */
export async function humanScroll(page: Page): Promise<void> {
    const scrollAmount = Math.floor(Math.random() * 500) + 200;
    await page.evaluate((amount) => {
        window.scrollBy({
            top: amount,
            behavior: 'smooth'
        });
    }, scrollAmount);
    await humanDelay(300, 800);
}

/**
 * Simulate random mouse movements
 */
export async function randomMouseMovement(page: Page): Promise<void> {
    const viewport = page.viewport();
    if (!viewport) return;

    const x = Math.floor(Math.random() * viewport.width);
    const y = Math.floor(Math.random() * viewport.height);

    await page.mouse.move(x, y, { steps: 10 });
    await humanDelay(100, 300);
}

/**
 * Full anti-detection setup for a page
 */
export async function setupAntiDetection(page: Page): Promise<void> {
    const viewport = getRandomViewport();
    const userAgent = getRandomUserAgent();
    const acceptLanguage = getRandomAcceptLanguage();

    // Set viewport
    await page.setViewport(viewport);

    // Set user agent
    await page.setUserAgent(userAgent);

    // Set headers
    await page.setExtraHTTPHeaders({
        'Accept-Language': acceptLanguage,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
    });

    // Apply stealth settings
    await applyStealthSettings(page);
}

export default {
    humanDelay,
    getRandomViewport,
    getRandomUserAgent,
    getRandomAcceptLanguage,
    applyStealthSettings,
    humanScroll,
    randomMouseMovement,
    setupAntiDetection,
};
