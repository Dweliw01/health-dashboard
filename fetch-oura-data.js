#!/usr/bin/env node
/**
 * Fetch Oura Ring data via API and save to fitness-data/
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Get token from environment
const OURA_TOKEN = process.env.OURA_ACCESS_TOKEN;

if (!OURA_TOKEN) {
  console.error('❌ OURA_ACCESS_TOKEN not found in environment');
  process.exit(1);
}

// Calculate date range (last 30 days)
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

const formatDate = (date) => date.toISOString().split('T')[0];
const start = formatDate(startDate);
const end = formatDate(endDate);

console.log(`📅 Fetching Oura data from ${start} to ${end}`);

// API endpoints
const endpoints = {
  daily_activity: `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${start}&end_date=${end}`,
  daily_sleep: `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${start}&end_date=${end}`,
  daily_readiness: `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${start}&end_date=${end}`,
  heartrate: `https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=${start}T00:00:00&end_datetime=${end}T23:59:59`,
  sleep: `https://api.ouraring.com/v2/usercollection/sleep?start_date=${start}&end_date=${end}`,
  workout: `https://api.ouraring.com/v2/usercollection/workout?start_date=${start}&end_date=${end}`,
  session: `https://api.ouraring.com/v2/usercollection/session?start_date=${start}&end_date=${end}`,
  tag: `https://api.ouraring.com/v2/usercollection/tag?start_date=${start}&end_date=${end}`
};

// Fetch data from Oura API
function fetchOuraData(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Authorization': `Bearer ${OURA_TOKEN}`
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Failed to parse JSON: ${err.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

// Main execution
async function main() {
  const results = {
    sync_date: formatDate(new Date()),
    date_range: { start, end },
    data: {}
  };

  console.log('🔄 Fetching data from Oura API...');

  for (const [key, url] of Object.entries(endpoints)) {
    try {
      console.log(`  → Fetching ${key}...`);
      results.data[key] = await fetchOuraData(url);
      console.log(`  ✅ ${key}: ${results.data[key].data?.length || 0} records`);
    } catch (err) {
      console.error(`  ❌ ${key} failed: ${err.message}`);
      results.data[key] = { data: [], error: err.message };
    }
  }

  // Save to file
  const fitnessDataDir = path.join(__dirname, 'fitness-data');
  if (!fs.existsSync(fitnessDataDir)) {
    fs.mkdirSync(fitnessDataDir, { recursive: true });
  }

  const filename = `oura_sync_${formatDate(new Date())}.json`;
  const filepath = path.join(fitnessDataDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Data saved to: ${filepath}`);
  console.log(`📊 Total endpoints: ${Object.keys(endpoints).length}`);
  console.log(`🔥 Ready to process with: node process-oura-data.js`);
}

main().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});
