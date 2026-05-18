const { chromium } = require('playwright');
const axios = require('axios');
const path = require('path');

async function testApiDirect() {
  const USER_DATA_DIR = path.join(__dirname, 'user_data');
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, { headless: true });
  const cookies = await context.cookies('https://www.univstore.com');
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  
  console.log('🍪 Cookie:', cookieString);
  
  const testId = '13704';
  try {
    const res = await axios.get(`https://www.univstore.com/api/item/${testId}`, {
      headers: {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.univstore.com/'
      }
    });
    console.log('✅ API Result:', res.data);
  } catch (err) {
    console.error('❌ API Direct Access Failed:', err.message);
    if (err.response) console.log('Status:', err.response.status);
  } finally {
    await context.close();
  }
}

testApiDirect();
