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
  console.error('[ERROR] OURA_ACCESS_TOKEN not found in environment');
  process.exit(1);
}

// Calculate date range (last 30 days)
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

const formatDate = (date) => date.toISOString().split('T')[0];
const start = formatDate(startDate);
const end = formatDate(endDate);

console.log(`[OURA] Date range: ${start} to ${end}`);

// API endpoints - Core data
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

// Extended endpoints - May require specific Oura subscription/ring generation
const extendedEndpoints = {
  daily_spo2: `https://api.ouraring.com/v2/usercollection/daily_spo2?start_date=${start}&end_date=${end}`,
  daily_stress: `https://api.ouraring.com/v2/usercollection/daily_stress?start_date=${start}&end_date=${end}`,
  daily_resilience: `https://api.ouraring.com/v2/usercollection/daily_resilience?start_date=${start}&end_date=${end}`,
  vo2_max: `https://api.ouraring.com/v2/usercollection/vo2_max?start_date=${start}&end_date=${end}`
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
    data: {},
    extended: {}
  };

  console.log('[SYNC] Fetching data from Oura API...\n');

  // Fetch core endpoints
  console.log('Core Endpoints:');
  for (const [key, url] of Object.entries(endpoints)) {
    try {
      process.stdout.write(`  ${key}... `);
      results.data[key] = await fetchOuraData(url);
      console.log(`OK (${results.data[key].data?.length || 0} records)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      results.data[key] = { data: [], error: err.message };
    }
  }

  // Fetch extended endpoints (graceful failure)
  console.log('\nExtended Endpoints:');
  for (const [key, url] of Object.entries(extendedEndpoints)) {
    try {
      process.stdout.write(`  ${key}... `);
      results.extended[key] = await fetchOuraData(url);
      console.log(`OK (${results.extended[key].data?.length || 0} records)`);
    } catch (err) {
      console.log(`UNAVAILABLE: ${err.message}`);
      results.extended[key] = { data: [], unavailable: true, error: err.message };
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

  const coreCount = Object.keys(endpoints).length;
  const extendedCount = Object.keys(extendedEndpoints).length;
  const extendedAvailable = Object.values(results.extended).filter(e => !e.unavailable).length;

  console.log(`\n[COMPLETE] Data saved to: ${filepath}`);
  console.log(`  Core endpoints: ${coreCount}`);
  console.log(`  Extended endpoints: ${extendedAvailable}/${extendedCount} available`);
  console.log(`\nRun: node process-oura-data.js`);
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
