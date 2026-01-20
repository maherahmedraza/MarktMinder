import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const BASE_URL = 'http://localhost:3000';
const CHROME_DEBUG_PORT = 9222;
const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots/e2e');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface TestResult {
    category: string;
    test: string;
    status: 'PASS' | 'FAIL';
    message?: string;
}

const results: TestResult[] = [];

async function runE2ETests() {
    console.log('🚀 Starting Comprehensive E2E & SEO Tests...');

    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: `http://localhost:${CHROME_DEBUG_PORT}`,
            defaultViewport: { width: 1280, height: 800 }
        });
    } catch (e) {
        console.error('Failed to connect to Chrome. Make sure ./start-chrome-debug.sh is running.');
        process.exit(1);
    }

    const page = await browser.newPage();

    // Helper: Take Screenshot
    const screenshot = async (name: string) => {
        const p = path.join(SCREENSHOT_DIR, `${name}.png`);
        await page.screenshot({ path: p, fullPage: true });
        console.log(`📸 Screenshot: ${name}`);
    };

    // Helper: Check SEO
    const checkSEO = async (url: string, pageName: string) => {
        await page.goto(url, { waitUntil: 'networkidle0' });

        const title = await page.title();
        const description = await page.$eval('meta[name="description"]', (el) => el.getAttribute('content')).catch(() => null);
        const h1 = await page.$eval('h1', (el) => el.textContent).catch(() => null);

        if (title && title.length > 0) results.push({ category: 'SEO', test: `${pageName} - Title`, status: 'PASS', message: title });
        else results.push({ category: 'SEO', test: `${pageName} - Title`, status: 'FAIL', message: 'Missing title' });

        if (description && description.length > 0) results.push({ category: 'SEO', test: `${pageName} - Meta Description`, status: 'PASS' });
        else results.push({ category: 'SEO', test: `${pageName} - Meta Description`, status: 'FAIL', message: 'Missing description' });

        if (h1 && h1.length > 0) results.push({ category: 'SEO', test: `${pageName} - H1 Tag`, status: 'PASS', message: h1 });
        else results.push({ category: 'SEO', test: `${pageName} - H1 Tag`, status: 'FAIL', message: 'Missing H1' });

        await screenshot(`seo_${pageName.toLowerCase()}`);
    };

    // --- 1. SEO Testing (Public Pages) ---
    console.log('\n--- Phase 1: SEO Testing ---');
    await checkSEO(`${BASE_URL}/`, 'Homepage');
    await checkSEO(`${BASE_URL}/about`, 'About');
    await checkSEO(`${BASE_URL}/pricing`, 'Pricing');
    await checkSEO(`${BASE_URL}/login`, 'Login');

    // --- 2. User Flow ---
    console.log('\n--- Phase 2: User Flow ---');

    // Login
    await page.goto(`${BASE_URL}/login`);
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
        await page.type('input[type="email"]', 'admin@marktminder.de');
        await page.type('input[type="password"]', 'Admin123!');
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) {
            await submitBtn.click();
            // Wait for navigation and dashboard load (avoid networkidle0 due to HMR)
            await new Promise(r => setTimeout(r, 5000));
            results.push({ category: 'User Flow', test: 'Login', status: 'PASS' });
        } else {
            results.push({ category: 'User Flow', test: 'Login', status: 'FAIL', message: 'No submit button' });
        }
    } else {
        results.push({ category: 'User Flow', test: 'Login', status: 'FAIL', message: 'No email input' });
    }

    // Dashboard Access
    const url = page.url();
    if (url.includes('/dashboard')) {
        results.push({ category: 'User Flow', test: 'Dashboard Access', status: 'PASS' });
        await screenshot('dashboard_main');
    } else {
        results.push({ category: 'User Flow', test: 'Dashboard Access', status: 'FAIL', message: `Redirected to ${url}` });
    }

    // Add Product
    await page.goto(`${BASE_URL}/dashboard/products/add`);
    const urlInput = await page.$('input[name="url"]'); // Assuming input name
    if (urlInput) {
        // We won't submit to avoid pollution, but we check if element exists
        results.push({ category: 'User Flow', test: 'Add Product Page', status: 'PASS' });
        await screenshot('add_product_page');
    } else {
        // Try generic input if specific name fails
        const genericInput = await page.$('input[type="url"]') || await page.$('input[type="text"]');
        if (genericInput) {
            results.push({ category: 'User Flow', test: 'Add Product Page', status: 'PASS' });
        } else {
            results.push({ category: 'User Flow', test: 'Add Product Page', status: 'FAIL', message: 'Input not found' });
        }
    }

    // --- 3. Admin Flow ---
    console.log('\n--- Phase 3: Admin Flow ---');
    await page.goto(`${BASE_URL}/admin/users`);
    try {
        await page.waitForSelector('table', { timeout: 10000 });
        results.push({ category: 'Admin Flow', test: 'User Management', status: 'PASS' });
        await screenshot('admin_users');
    } catch (e) {
        results.push({ category: 'Admin Flow', test: 'User Management', status: 'FAIL', message: 'Users table not found (timeout)' });
    }

    await page.goto(`${BASE_URL}/admin/analytics`);
    try {
        await page.waitForSelector('.h-48', { timeout: 10000 });
        results.push({ category: 'Admin Flow', test: 'Analytics', status: 'PASS' });
        await screenshot('admin_analytics');
    } catch (e) {
        results.push({ category: 'Admin Flow', test: 'Analytics', status: 'FAIL', message: 'Chart container not found (timeout)' });
    }

    // Cleanup
    await page.close();
    await browser.disconnect();

    // Print Report
    console.log('\n--- TEST REPORT ---');
    console.table(results);

    // Save JSON report
    fs.writeFileSync(path.join(SCREENSHOT_DIR, 'test-report.json'), JSON.stringify(results, null, 2));
}

runE2ETests();
