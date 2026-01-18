
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function run() {
    console.log('Connecting to browser...');
    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: 'http://localhost:9222',
            defaultViewport: null
        });
    } catch (e) {
        console.error('Could not connect. Run start-chrome-debug.sh first.');
        process.exit(1);
    }

    const page = await browser.newPage();
    const screenshotDir = '/home/maher/.gemini/antigravity/brain/d8433a9b-9fa4-4e26-87d1-79e74d4b5289';

    try {
        // Navigate to login page
        console.log('1. Navigating to login page...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
        await page.screenshot({ path: path.join(screenshotDir, '01_login_page.png'), fullPage: true });
        console.log('   Screenshot: 01_login_page.png');

        // Try to register a new user first
        console.log('2. Navigating to register page...');
        await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle0' });
        await page.screenshot({ path: path.join(screenshotDir, '02_register_page.png'), fullPage: true });
        console.log('   Screenshot: 02_register_page.png');

        // Fill registration form
        const nameInput = await page.$('input[name="name"]');
        if (nameInput) {
            console.log('3. Filling registration form...');
            const uniqueEmail = `test${Date.now()}@example.com`;
            await page.type('input[name="name"]', 'Test User');
            await page.type('input[name="email"]', uniqueEmail);
            await page.type('input[name="password"]', 'password123');

            // Check for confirm password field
            const confirmPassword = await page.$('input[name="confirmPassword"]');
            if (confirmPassword) {
                await page.type('input[name="confirmPassword"]', 'password123');
            }

            await page.screenshot({ path: path.join(screenshotDir, '03_filled_register.png'), fullPage: true });
            console.log('   Screenshot: 03_filled_register.png');

            // Submit
            console.log('4. Submitting registration...');
            await page.click('button[type="submit"]');
            await new Promise(r => setTimeout(r, 3000)); // Wait for response
            await page.screenshot({ path: path.join(screenshotDir, '04_after_register.png'), fullPage: true });
            console.log('   Screenshot: 04_after_register.png');
            console.log(`   Current URL: ${page.url()}`);
        } else {
            console.log('   Registration form not found');
        }

        // Check dashboard
        console.log('5. Navigating to dashboard...');
        await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
        await page.screenshot({ path: path.join(screenshotDir, '05_dashboard.png'), fullPage: true });
        console.log('   Screenshot: 05_dashboard.png');
        console.log(`   Current URL: ${page.url()}`);

        // Check products page
        console.log('6. Navigating to products...');
        await page.goto('http://localhost:3000/dashboard/products', { waitUntil: 'networkidle0' });
        await page.screenshot({ path: path.join(screenshotDir, '06_products.png'), fullPage: true });
        console.log('   Screenshot: 06_products.png');

        // Check alerts page
        console.log('7. Navigating to alerts...');
        await page.goto('http://localhost:3000/dashboard/alerts', { waitUntil: 'networkidle0' });
        await page.screenshot({ path: path.join(screenshotDir, '07_alerts.png'), fullPage: true });
        console.log('   Screenshot: 07_alerts.png');

        // Check add product page
        console.log('8. Navigating to add product...');
        await page.goto('http://localhost:3000/dashboard/products/add', { waitUntil: 'networkidle0' });
        await page.screenshot({ path: path.join(screenshotDir, '08_add_product.png'), fullPage: true });
        console.log('   Screenshot: 08_add_product.png');

        console.log('\n✅ Screenshots saved to artifacts directory');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        browser.disconnect();
    }
}

run();
