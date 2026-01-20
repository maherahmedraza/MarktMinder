/**
 * Enhanced Anti-Detection Module
 * 
 * Complements puppeteer-extra-plugin-stealth with:
 * 1. Random delays between actions
 * 2. Human-like mouse movements
 * 3. Dynamic scrolling behavior
 * 4. Realistic viewport and header management
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
 * Simulate human-like scrolling with variable acceleration
 */
export async function humanScroll(page: Page): Promise<void> {
    const scrollAmount = Math.floor(Math.random() * 500) + 200;
    await page.evaluate((amount) => {
        return new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= amount || totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    }, scrollAmount);
    await humanDelay(300, 800);
}

/**
 * Simulate random mouse movements with bezier-like steps
 */
export async function randomMouseMovement(page: Page): Promise<void> {
    const viewport = page.viewport();
    if (!viewport) return;

    const x = Math.floor(Math.random() * viewport.width);
    const y = Math.floor(Math.random() * viewport.height);

    // Use more steps for smoother movement
    await page.mouse.move(x, y, { steps: 25 });
    await humanDelay(100, 300);
}

/**
 * setupAntiDetection refactored to complement Stealth Plugin
 * NOTE: Most navigator properties are now handled by puppeteer-extra-plugin-stealth
 */
export async function setupAntiDetection(page: Page): Promise<void> {
    const viewport = getRandomViewport();

    // Set viewport
    await page.setViewport(viewport);

    // Additional headers that complement stealth plugin
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,de-DE;q=0.8,de;q=0.7',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
    });
}

export default {
    humanDelay,
    getRandomViewport,
    humanScroll,
    randomMouseMovement,
    setupAntiDetection,
};
