
import { scraperApi } from '../browser/ScraperApi.js';

async function checkAccount() {
    const info = await scraperApi.getAccountInfo();
    if (info) {
        console.log('💳 ScraperAPI Account Info:');
        console.log(`   Limit:       ${info.requestLimit}`);
        console.log(`   Used:        ${info.requestCount}`);
        console.log(`   Remaining:   ${info.requestLimit - info.requestCount}`);
        console.log(`   Concurrency: ${info.concurrencyLimit}`);
    } else {
        console.error('❌ Failed to fetch ScraperAPI account info');
    }
}

checkAccount();
