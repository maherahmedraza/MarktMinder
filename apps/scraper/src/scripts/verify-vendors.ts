
import puppeteer from 'puppeteer';
import { scraperFactory } from '../scrapers/index.js';
import logger from '../logger.js';
import path from 'path';
import fs from 'fs';

const TEST_URLS = [
    { name: 'Amazon', url: 'https://www.amazon.de/dp/B0F9XN6MZW' },
    { name: 'Etsy', url: 'https://www.etsy.com/de/listing/1360565894/vintage-t-shirt-design-bundle-custom' },
    { name: 'Otto', url: 'https://www.otto.de/p/apple-iphone-13-128gb-5g-display-15-4-cm-6-1-zoll-12-mp-kamera-1442129523/#variationId=1442129524' }
];

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots/test-verify');

async function verifyScrapers() {
    console.log('🕷️ MarktMinder Scraper Verification Engine');
    console.log('==========================================\n');

    if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    let browser;
    try {
        // Try connecting to existing debug chrome first
        try {
            browser = await puppeteer.connect({
                browserURL: 'http://localhost:9222',
                defaultViewport: { width: 1280, height: 800 }
            });
            console.log('✅ Connected to existing Chrome instance (9222)');
        } catch (e) {
            console.log('🚀 Launching new Headless Chrome...');
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }

        const stats = { pass: 0, fail: 0 };

        for (const test of TEST_URLS) {
            console.log(`\n🔍 Testing [${test.name}] Scraper...`);
            console.log(`🔗 URL: ${test.url}`);

            const scraper = scraperFactory.getScraperForUrl(test.url);
            if (!scraper) {
                console.error(`❌ No scraper found for ${test.name}`);
                stats.fail++;
                continue;
            }

            const startTime = Date.now();
            try {
                // We use the scraper's scrape method directly
                // Note: BaseScraper.scrape(url) handles browser page management internally
                const result = await scraper.scrape(test.url);
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);

                if (result.success && result.product) {
                    const p = result.product;
                    console.log(`✅ SUCCESS (${duration}s)`);
                    console.log(`   📦 Title:    ${p.title?.substring(0, 60)}...`);
                    console.log(`   💶 Price:    ${p.currency} ${p.price}`);
                    console.log(`   🚚 Status:   ${p.availability}`);
                    console.log(`   🏢 Seller:   ${p.sellerName || 'N/A'}`);
                    stats.pass++;
                } else {
                    console.error(`❌ FAILED (${duration}s)`);
                    console.error(`   ⚠️ Reason:   ${result.error || 'Unknown error'}`);
                    stats.fail++;
                }
            } catch (error) {
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                console.error(`❌ CRASHED (${duration}s)`);
                console.error(`   ⚠️ Error:    ${error instanceof Error ? error.message : String(error)}`);
                stats.fail++;
            }
        }

        console.log('\n' + '='.repeat(42));
        console.log('🏁 SCRAPER TEST VERIFICATION SUMMARY');
        console.log('='.repeat(42));
        console.log(`✅ Passed:  ${stats.pass}`);
        console.log(`❌ Failed:  ${stats.fail}`);
        console.log('='.repeat(42));

        if (stats.fail > 0) {
            process.exit(1);
        }
    } catch (err) {
        console.error('Fatal test error:', err);
        process.exit(1);
    } finally {
        if (browser) {
            try {
                // If we connected, we disconnect. If we launched, we close.
                // puppeteer.connect returns a browser where disconnect is preferred.
                // puppeteer.launch returns a browser where close is preferred.
                // But disconnect() on a launched browser works too.
                await browser.disconnect();
            } catch (e) {
                // ignore
            }
        }
    }
}

verifyScrapers();
