
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';


// Load env vars
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_12345';
const API_URL = 'http://localhost:3001/api';

// Product ID from your previous check
const PRODUCT_ID = '88888888-8888-8888-8888-888888888888';
const USER_ID = '11111111-1111-1111-1111-111111111111'; // Mock UUID

async function runTests() {
    console.log('🚀 Starting Innovation Features Verification');

    // 1. Generate Token
    const token = jwt.sign({ userId: USER_ID, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ Generated Test Token');

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        // 2. Test Deal Radar - Discover Deals
        console.log('\n📡 Testing Deal Radar: /products/deals');
        const dealsRes = await fetch(`${API_URL}/products/deals?limit=5`, { headers });
        if (dealsRes.status === 200) {
            const data = await dealsRes.json() as any;
            console.log(`✅ Deal Radar Success: Found ${data.count} deals`);
            if (data.deals.length > 0) {
                console.log('   Sample Deal:', {
                    name: data.deals[0].productName,
                    score: data.deals[0].dealScore,
                    recommendation: data.deals[0].recommendation
                });
            } else {
                console.log('   (No deals found matching criteria, but endpoint works)');
            }
        } else {
            console.error(`❌ Deal Radar Failed: ${dealsRes.status} ${dealsRes.statusText}`);
            const text = await dealsRes.text();
            console.error('   Response:', text);
        }

        // 3. Test Deal Radar - Stats
        console.log('\n📊 Testing Deal Stats: /products/deals/stats');
        const statsRes = await fetch(`${API_URL}/products/deals/stats`, { headers });
        if (statsRes.status === 200) {
            const data = await statsRes.json() as any;
            console.log('✅ Deal Stats Success:', data);
        } else {
            console.error(`❌ Deal Stats Failed: ${statsRes.status}`);
        }

        // 4. Test Price DNA
        console.log(`\n🧬 Testing Price DNA: /products/${PRODUCT_ID}/dna`);
        const dnaRes = await fetch(`${API_URL}/products/${PRODUCT_ID}/dna`, { headers });
        if (dnaRes.status === 200) {
            const data = await dnaRes.json() as any;
            console.log('✅ Price DNA Success');
            console.log('   Volatility:', data.dna.volatilityClass);
            console.log('   Best Day:', data.dna.bestDayToBuy);
            console.log('   Recommendation:', data.dna.buyingRecommendation);
            console.log('   Insights:', data.dna.insights);
        } else {
            console.error(`❌ Price DNA Failed: ${dnaRes.status} ${dnaRes.statusText}`);
            const text = await dnaRes.text();
            console.error('   Response:', text);
        }

    } catch (error) {
        console.error('❌ Test Execution Failed:', error);
    }
}

runTests();
