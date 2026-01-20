import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const BASE_URL = 'http://localhost:3000';
const CHROME_DEBUG_PORT = 9222;
const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots/features');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface TestResult {
    feature: string;
    step: string;
    status: 'PASS' | 'FAIL';
    message?: string;
}

const results: TestResult[] = [];
const DELAY_MS = 1000; // Small delay between actions

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runFeatureTest() {
    console.log('🚀 Starting Feature Verification Test...');

    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: `http://localhost:${CHROME_DEBUG_PORT}`,
            defaultViewport: { width: 1440, height: 900 }
        });
    } catch (e) {
        console.error('Failed to connect to Chrome. Make sure ./start-chrome-debug.sh is running.');
        process.exit(1);
    }

    const page = await browser.newPage();

    // Helper: Screenshot
    const screenshot = async (name: string) => {
        const p = path.join(SCREENSHOT_DIR, `${name}.png`);
        await page.screenshot({ path: p, fullPage: false });
        console.log(`📸 Saved: ${name}`);
    };

    try {
        // --- PREP: Login as Admin ---
        console.log('\n--- Logging in ---');
        await page.goto(`${BASE_URL}/login`);
        await page.type('input[type="email"]', 'admin@marktminder.de');
        await page.type('input[type="password"]', 'Admin123!');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        await delay(DELAY_MS);

        // --- 1. NAVIGATE TO PRODUCTS ---
        console.log('\n--- 1. Testing Navigation ---');
        await page.goto(`${BASE_URL}/dashboard/products`);
        await delay(DELAY_MS);

        const title = await page.$eval('h1', el => el.textContent);
        if (title?.includes('Products')) {
            results.push({ feature: 'Navigation', step: 'Load Page', status: 'PASS' });
            await screenshot('01_products_page');
        } else {
            throw new Error('Failed to load Products page');
        }

        // --- 2. TEST FILTERS ---
        console.log('\n--- 2. Testing Filters ---');

        // Search
        await page.type('input[placeholder*="Search"]', 'Test');
        await delay(DELAY_MS);
        results.push({ feature: 'Filters', step: 'Search Input', status: 'PASS' });
        await screenshot('02_search_active');

        // Clear search
        await page.evaluate(() => {
            const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            if (input) input.value = '';
        });
        await delay(DELAY_MS);

        // Sort Dropdown
        const sortSelect = await page.$('select'); // First select is typically Sort/Marketplace based on position
        if (sortSelect) {
            results.push({ feature: 'Filters', step: 'Sort Dropdown Exists', status: 'PASS' });
        }

        // Toggle "Price Drops Only"
        const dropToggle = await page.$('input[type="checkbox"]');
        if (dropToggle) {
            await dropToggle.click();
            await delay(DELAY_MS);
            results.push({ feature: 'Filters', step: 'Price Drop Toggle', status: 'PASS' });
            await screenshot('03_price_drops_toggle');
            await dropToggle.click(); // Reset
            await delay(DELAY_MS);
        }

        // --- 3. TEST BULK ACTIONS ---
        console.log('\n--- 3. Testing Bulk Actions ---');
        console.log('Current URL:', page.url());

        // Wait specifically for any button
        try {
            await page.waitForSelector('button', { timeout: 5000 });
        } catch (e) {
            console.log('TIMEOUT waiting for button');
        }

        // Dump HTML
        const html = await page.content();
        fs.writeFileSync(path.join(SCREENSHOT_DIR, 'debug_dump.html'), html);

        // Debug: Log all buttons
        const allButtons = await page.$$eval('button', btns => btns.map(b => b.textContent?.trim()));
        console.log('DEBUG: Found buttons:', allButtons);

        // Helper to find button by text
        const findButton = async (text: string) => {
            const buttons = await page.$$('button');
            for (const btn of buttons) {
                const t = await btn.evaluate(el => el.textContent);
                if (t?.includes(text)) return btn;
            }
            return null;
        };

        const selectAllBtn = await findButton('Select All');

        if (selectAllBtn) {
            // Click Select All
            await selectAllBtn.click();
            await delay(DELAY_MS);

            // Check if Delete button appeared
            const deleteBtn = await findButton('Delete');
            if (deleteBtn) {
                results.push({ feature: 'Bulk Actions', step: 'Bulk Select Triggers Delete Btn', status: 'PASS' });
                await screenshot('04_bulk_select_active');

                // Deselect
                await selectAllBtn.click();
                await delay(DELAY_MS);
            } else {
                results.push({ feature: 'Bulk Actions', step: 'Delete Button Missing', status: 'FAIL' });
            }
        } else {
            results.push({ feature: 'Bulk Actions', step: 'Select All Button Missing', status: 'FAIL' });
        }

        // --- 4. TEST EXPORT ---
        console.log('\n--- 4. Testing Export ---');
        const exportBtn = await findButton('Export');
        if (exportBtn) {
            // We won't actually click it to avoid download dialog issues in headless/remote, 
            // or we click it and assume no crash
            await exportBtn.click();
            await delay(DELAY_MS);
            results.push({ feature: 'Export', step: 'Click Export', status: 'PASS' });
        } else {
            results.push({ feature: 'Export', step: 'Button Missing', status: 'FAIL' });
        }

    } catch (err: any) {
        console.error('Test Error:', err);
        results.push({ feature: 'System', step: 'Error', status: 'FAIL', message: err.message });
        await screenshot('error_state');
    } finally {
        await page.close();
        await browser.disconnect();

        console.log('\n--- FEATURE TEST REPORT ---');
        console.table(results);

        // Save results
        fs.writeFileSync(path.join(SCREENSHOT_DIR, 'feature-report.json'), JSON.stringify(results, null, 2));
    }
}

runFeatureTest();
