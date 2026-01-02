import puppeteer from 'puppeteer-core'; // Use core to avoid launching bundled chrome
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTest() {
    console.log('Connecting to Chrome at http://localhost:9222...');

    try {
        const browser = await puppeteer.connect({
            browserURL: 'http://localhost:9222',
            defaultViewport: { width: 1280, height: 800 }
        });

        console.log('Connected to browser.');
        const page = await browser.newPage();

        // Helper to take screenshot
        const takeScreenshot = async (name: string, url: string) => {
            console.log(`Navigating to ${url}...`);
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

            // Wait a bit for animations
            await new Promise(r => setTimeout(r, 1000));

            const screenshotPath = path.resolve(__dirname, `../screenshots/${name}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`Saved screenshot: ${screenshotPath}`);
        };

        // Test Flows
        await takeScreenshot('01_homepage', 'http://localhost:3000/');
        await takeScreenshot('02_pricing', 'http://localhost:3000/pricing');

        // Login Flow
        console.log('Testing Login...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });

        // Type credentials (adjust based on your actual DOM)
        // Assuming standard inputs
        await page.type('input[type="email"]', 'admin@marktminder.de');
        await page.type('input[type="password"]', 'Admin123!');

        // Click login button - assuming it's a button with type submit or text 'Sign in'
        // Let's try to find it generically
        const loginBtn = await page.$('button[type="submit"]');
        if (loginBtn) {
            await loginBtn.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            await new Promise(r => setTimeout(r, 2000)); // Wait for dashboard load

            const dashboardPath = path.resolve(__dirname, `../screenshots/03_dashboard.png`);
            await page.screenshot({ path: dashboardPath, fullPage: true });
            console.log(`Saved screenshot: ${dashboardPath}`);

            // Products Flow
            console.log('Navigating to Products...');
            await page.goto('http://localhost:3000/dashboard/products', { waitUntil: 'networkidle0' });
            await new Promise(r => setTimeout(r, 1000));
            const productsPath = path.resolve(__dirname, `../screenshots/04_products.png`);
            await page.screenshot({ path: productsPath, fullPage: true });
            console.log(`Saved screenshot: ${productsPath}`);
        } else {
            console.error('Could not find login button');
        }

        await page.close();
        await browser.disconnect();
        console.log('Test complete.');

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

runTest();
