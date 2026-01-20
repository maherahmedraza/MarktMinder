
import puppeteer from 'puppeteer';
import path from 'path';

const AMAZON_URL = 'https://www.amazon.de/dp/B0F9XN6MZW';
const SCREENSHOT_DIR = '/home/maher/.gemini/antigravity/brain/d8433a9b-9fa4-4e26-87d1-79e74d4b5289';

// Admin credentials
const ADMIN_EMAIL = 'admin@marktminder.de';
const ADMIN_PASSWORD = 'Admin123!';

async function run() {
    console.log('='.repeat(60));
    console.log('MarktMinder Full E2E Verification');
    console.log('='.repeat(60));

    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: 'http://localhost:9222',
            defaultViewport: null
        });
    } catch (e) {
        console.error('❌ Browser not connected. Run start-chrome-debug.sh');
        process.exit(1);
    }
    console.log('✅ Connected to browser\n');

    const page = await browser.newPage();
    const results: { test: string; status: 'PASS' | 'FAIL'; note?: string }[] = [];
    const pass = (test: string, note?: string) => {
        console.log(`✅ ${test}${note ? ': ' + note : ''}`);
        results.push({ test, status: 'PASS', note });
    };
    const fail = (test: string, note?: string) => {
        console.log(`❌ ${test}${note ? ': ' + note : ''}`);
        results.push({ test, status: 'FAIL', note });
    };
    const screenshot = async (name: string) => {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, name), fullPage: true });
    };

    try {
        // ============================================================
        // TEST 1: LOGIN WITH ADMIN ACCOUNT
        // ============================================================
        console.log('[1/8] Testing Login with Admin Account...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
        await screenshot('test_01_login_page.png');

        await page.type('input[name="email"]', ADMIN_EMAIL);
        await page.type('input[name="password"]', ADMIN_PASSWORD);
        await screenshot('test_02_login_filled.png');

        await page.click('button[type="submit"]');

        try {
            await page.waitForNavigation({ timeout: 8000 });
        } catch (e) {
            // May already be on dashboard
        }

        await screenshot('test_03_after_login.png');

        if (page.url().includes('/dashboard')) {
            pass('Admin Login', 'Redirected to dashboard');
        } else {
            const errorText = await page.evaluate(() => document.body.innerText);
            if (errorText.includes('Invalid') || errorText.includes('error')) {
                fail('Admin Login', 'Invalid credentials');
            } else {
                fail('Admin Login', `Unexpected URL: ${page.url()}`);
            }
        }

        // ============================================================
        // TEST 2: DASHBOARD
        // ============================================================
        console.log('\n[2/8] Testing Dashboard...');
        await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
        await screenshot('test_04_dashboard.png');

        const dashboardContent = await page.content();
        if (dashboardContent.includes('Dashboard') || dashboardContent.includes('Products') ||
            dashboardContent.includes('Welcome') || page.url().includes('/dashboard')) {
            pass('Dashboard');
        } else if (page.url().includes('/login')) {
            fail('Dashboard', 'Redirected to login - authentication issue');
        } else {
            fail('Dashboard');
        }

        // ============================================================
        // TEST 3: PRODUCTS PAGE
        // ============================================================
        console.log('\n[3/8] Testing Products Page...');
        await page.goto('http://localhost:3000/dashboard/products', { waitUntil: 'networkidle0' });
        await screenshot('test_05_products.png');

        const productsContent = await page.content();
        if (productsContent.includes('Products') || productsContent.includes('Add') ||
            page.url().includes('/products')) {
            pass('Products Page');
        } else {
            fail('Products Page');
        }

        // ============================================================
        // TEST 4: ADD PRODUCT
        // ============================================================
        console.log('\n[4/8] Testing Add Product...');
        await page.goto('http://localhost:3000/dashboard/products/add', { waitUntil: 'networkidle0' });
        await screenshot('test_06_add_product_form.png');

        const urlInput = await page.$('input[name="url"]');
        if (urlInput) {
            await page.evaluate(() => {
                const input = document.querySelector('input[name="url"]') as HTMLInputElement;
                if (input) input.value = '';
            });
            await page.type('input[name="url"]', AMAZON_URL);
            await screenshot('test_07_add_product_filled.png');

            const submitBtn = await page.$('button[type="submit"]');
            if (submitBtn) {
                await submitBtn.click();
                console.log('   Waiting for scraping (up to 30s)...');

                try {
                    await page.waitForFunction(() => {
                        const body = document.body.innerText;
                        return body.includes('success') ||
                            body.includes('already') ||
                            body.includes('error') ||
                            body.includes('Error') ||
                            window.location.href.includes('/products/');
                    }, { timeout: 30000 });

                    await screenshot('test_08_add_product_result.png');
                    const resultContent = await page.evaluate(() => document.body.innerText);

                    if (resultContent.includes('success') || page.url().includes('/products/')) {
                        pass('Add Product', 'Product added successfully');
                    } else if (resultContent.includes('already')) {
                        pass('Add Product', 'Product already tracked');
                    } else if (resultContent.includes('error') || resultContent.includes('Error')) {
                        fail('Add Product', 'Error during scraping');
                    } else {
                        pass('Add Product', 'Form submitted');
                    }
                } catch (e) {
                    await screenshot('test_08_add_product_timeout.png');
                    fail('Add Product', 'Timeout waiting for result');
                }
            } else {
                fail('Add Product', 'Submit button not found');
            }
        } else {
            fail('Add Product', 'URL input not found');
        }

        // ============================================================
        // TEST 5: ALERTS PAGE
        // ============================================================
        console.log('\n[5/8] Testing Alerts Page...');
        await page.goto('http://localhost:3000/dashboard/alerts', { waitUntil: 'networkidle0' });
        await screenshot('test_09_alerts.png');

        const alertsContent = await page.content();
        if (alertsContent.includes('Alerts') || alertsContent.includes('Price')) {
            pass('Alerts Page');

            // Check for human-readable labels
            if (alertsContent.includes('Price Target') || alertsContent.includes('Back in Stock')) {
                pass('Alert Labels', 'Human-readable labels found');
            } else if (alertsContent.includes('price_below') || alertsContent.includes('price_above')) {
                fail('Alert Labels', 'Raw enum values shown instead of human-readable labels');
            } else {
                pass('Alert Labels', 'No alerts to verify (empty state)');
            }
        } else if (page.url().includes('/login')) {
            fail('Alerts Page', 'Redirected to login');
        } else {
            fail('Alerts Page');
        }

        // ============================================================
        // TEST 6: ADMIN PANEL
        // ============================================================
        console.log('\n[6/8] Testing Admin Panel...');
        await page.goto('http://localhost:3000/admin/users', { waitUntil: 'networkidle0' });
        await screenshot('test_10_admin_users.png');

        const adminContent = await page.content();
        if (adminContent.includes('Users') || adminContent.includes('Admin') ||
            adminContent.includes('admin@marktminder.de')) {
            pass('Admin Panel', 'User management visible');
        } else if (page.url().includes('/login') || page.url().includes('/dashboard')) {
            fail('Admin Panel', 'Access denied or redirected');
        } else {
            fail('Admin Panel');
        }

        // ============================================================
        // TEST 7: SETTINGS PAGE
        // ============================================================
        console.log('\n[7/8] Testing Settings Page...');
        await page.goto('http://localhost:3000/dashboard/settings', { waitUntil: 'networkidle0' });
        await screenshot('test_11_settings.png');

        const settingsContent = await page.content();
        if (settingsContent.includes('Settings') || settingsContent.includes('Profile') ||
            settingsContent.includes('Subscription')) {
            pass('Settings Page');
        } else {
            fail('Settings Page');
        }

        // ============================================================
        // TEST 8: DEAL RADAR (Power tier feature)
        // ============================================================
        console.log('\n[8/8] Testing Deal Radar...');
        await page.goto('http://localhost:3000/dashboard/deals', { waitUntil: 'networkidle0' });
        await screenshot('test_12_deals.png');

        const dealsContent = await page.content();
        if (dealsContent.includes('Deal') || dealsContent.includes('Radar') ||
            dealsContent.includes('Upgrade')) {
            pass('Deal Radar', 'Page loads (may require upgrade)');
        } else {
            fail('Deal Radar');
        }

    } catch (error) {
        console.error('\n❌ Test error:', error);
    } finally {
        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('FINAL RESULTS');
        console.log('='.repeat(60));

        const passed = results.filter(r => r.status === 'PASS').length;
        const failed = results.filter(r => r.status === 'FAIL').length;

        console.log(`\n✅ Passed: ${passed}/${results.length}`);
        console.log(`❌ Failed: ${failed}/${results.length}`);

        if (failed > 0) {
            console.log('\nFailed Tests:');
            results.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`  - ${r.test}: ${r.note || 'No details'}`);
            });
        }

        console.log('\n📸 Screenshots saved to artifacts directory');
        console.log('='.repeat(60));

        browser.disconnect();
    }
}

run();
