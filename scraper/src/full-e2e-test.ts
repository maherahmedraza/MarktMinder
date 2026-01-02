import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const BASE_URL = 'http://localhost:3000';
const CHROME_DEBUG_PORT = 9222;
const SCREENSHOT_DIR = path.resolve(__dirname, '../screenshots/full_run');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface TestResult {
    flow: string;
    step: string;
    status: 'PASS' | 'FAIL';
    message?: string;
}

const results: TestResult[] = [];

async function runFullTest() {
    console.log('🚀 Starting Full System Re-test...');

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
        await page.screenshot({ path: p, fullPage: true });
        console.log(`📸 Saved: ${name}`);
    };

    try {
        // --- 1. NEW USER REGISTRATION FLOW ---
        console.log('\n--- 1. Testing New User Registration ---');
        await page.goto(`${BASE_URL}/register`);

        const testEmail = `testuser_${Date.now()}@example.com`;
        console.log(`Registering user: ${testEmail}`);

        await page.type('input[name="name"]', 'Test User');
        await page.type('input[name="email"]', testEmail);
        await page.type('input[name="password"]', 'Password123!');
        await page.type('input[name="confirm-password"]', 'Password123!');

        // Accept terms if checkbox exists (assuming id="terms" or similar based on standard patterns)
        const termsCheckbox = await page.$('input[type="checkbox"]');
        if (termsCheckbox) await termsCheckbox.click();

        const registerBtn = await page.$('button[type="submit"]');
        if (registerBtn) {
            await registerBtn.click();
            await new Promise(r => setTimeout(r, 5000)); // Wait for redirect

            if (page.url().includes('/dashboard')) {
                results.push({ flow: 'User', step: 'Registration', status: 'PASS' });
                await screenshot('1_user_dashboard_initial');
            } else {
                results.push({ flow: 'User', step: 'Registration', status: 'FAIL', message: `Redirect failed: ${page.url()}` });
            }
        } else {
            results.push({ flow: 'User', step: 'Registration', status: 'FAIL', message: 'No register button' });
        }

        // Test User Features
        if (page.url().includes('/dashboard')) {
            // Check Empty State
            await screenshot('2_user_dashboard_empty');

            // Add Product
            await page.goto(`${BASE_URL}/dashboard/products/add`);
            results.push({ flow: 'User', step: 'Nav to Add Product', status: 'PASS' });

            // Logout
            // Assuming logout is in sidebar or profile menu. 
            // Better to hit logout endpoint or clear cookies for next test
            await page.deleteCookie({ name: 'token', domain: 'localhost' }); // simplistic logout
            await page.goto(`${BASE_URL}/login`);
            console.log('User logged out.');
        }

        // --- 2. ADMIN FLOW ---
        console.log('\n--- 2. Testing Admin Flow ---');
        await page.goto(`${BASE_URL}/login`);

        await page.type('input[type="email"]', 'admin@marktminder.de');
        await page.type('input[type="password"]', 'Admin123!');

        const loginBtn = await page.$('button[type="submit"]');
        await loginBtn?.click();
        await new Promise(r => setTimeout(r, 5000));

        if (page.url().includes('/dashboard')) {
            results.push({ flow: 'Admin', step: 'Login', status: 'PASS' });
            await screenshot('3_admin_dashboard_user_view');
        } else {
            results.push({ flow: 'Admin', step: 'Login', status: 'FAIL', message: 'Admin login failed' });
        }

        // Go to Admin Dashboard
        await page.goto(`${BASE_URL}/admin`);
        // Wait for potential redirect or load
        await new Promise(r => setTimeout(r, 3000));

        if (page.url().includes('/admin')) {
            results.push({ flow: 'Admin', step: 'Access Admin Panel', status: 'PASS' });
            await screenshot('4_admin_dashboard_main');

            // 1. User Management
            await page.goto(`${BASE_URL}/admin/users`);
            try {
                await page.waitForSelector('table', { timeout: 10000 });
                results.push({ flow: 'Admin', step: 'User Management', status: 'PASS' });
                await screenshot('5_admin_users');
            } catch (e) {
                results.push({ flow: 'Admin', step: 'User Management', status: 'FAIL', message: 'Table not found' });
            }

            // 2. Product Management
            await page.goto(`${BASE_URL}/admin/products`);
            try {
                await page.waitForSelector('table', { timeout: 10000 });
                results.push({ flow: 'Admin', step: 'Product Management', status: 'PASS' });
                await screenshot('6_admin_products');
            } catch (e) {
                results.push({ flow: 'Admin', step: 'Product Management', status: 'FAIL', message: 'Table not found' });
            }

            // 3. Analytics
            await page.goto(`${BASE_URL}/admin/analytics`);
            try {
                // Wait for any chart/data container
                await page.waitForSelector('.h-48, canvas', { timeout: 10000 });
                results.push({ flow: 'Admin', step: 'Analytics', status: 'PASS' });
                await screenshot('7_admin_analytics');
            } catch (e) {
                results.push({ flow: 'Admin', step: 'Analytics', status: 'FAIL', message: 'Charts not found' });
            }

        } else {
            results.push({ flow: 'Admin', step: 'Access Admin Panel', status: 'FAIL', message: 'Redirected away from /admin' });
        }

    } catch (err: any) {
        console.error('Test Error:', err);
        results.push({ flow: 'System', step: 'Error', status: 'FAIL', message: err.message });
    } finally {
        await page.close();
        await browser.disconnect();

        console.log('\n--- FULL TEST REPORT ---');
        console.table(results);

        // Save results
        fs.writeFileSync(path.join(SCREENSHOT_DIR, 'full-report.json'), JSON.stringify(results, null, 2));
    }
}

runFullTest();
