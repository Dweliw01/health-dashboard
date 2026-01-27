#!/usr/bin/env node
/**
 * Parse Apple Health export.zip and extract key metrics
 * Simplified version - extracts basic health data from export.xml
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find the most recent Apple Health zip file
const fitnessDataDir = path.join(__dirname, 'fitness-data');
const zipFiles = fs.readdirSync(fitnessDataDir)
  .filter(f => f.startsWith('apple_health_') && f.endsWith('.zip'))
  .sort()
  .reverse();

if (zipFiles.length === 0) {
  console.log('⚠️  No Apple Health export.zip found');
  process.exit(0);
}

const latestZip = path.join(fitnessDataDir, zipFiles[0]);
console.log(`📦 Processing: ${zipFiles[0]}`);

// Extract the zip
const extractDir = path.join(fitnessDataDir, 'apple_extract');
if (fs.existsSync(extractDir)) {
  fs.rmSync(extractDir, { recursive: true });
}
fs.mkdirSync(extractDir, { recursive: true });

try {
  execSync(`unzip -q "${latestZip}" -d "${extractDir}"`);
  console.log('✅ Unzipped export');
} catch (err) {
  console.error('❌ Failed to unzip:', err.message);
  process.exit(1);
}

// Find export.xml
const xmlPath = path.join(extractDir, 'apple_health_export', 'export.xml');
if (!fs.existsSync(xmlPath)) {
  console.error('❌ export.xml not found in zip');
  process.exit(1);
}

console.log('📄 Found export.xml, parsing...');

// Simple XML parsing for key metrics
const xml = fs.readFileSync(xmlPath, 'utf8');

// Extract workouts (simplified regex parsing)
const workouts = [];
const workoutRegex = /<Workout workoutActivityType="(.*?)" .*?duration="(.*?)" .*?totalEnergyBurned="(.*?)".*?>/g;
let match;
while ((match = workoutRegex.exec(xml)) !== null) {
  workouts.push({
    type: match[1],
    duration: parseFloat(match[2]),
    calories: parseFloat(match[3])
  });
}

console.log(`  Found ${workouts.length} workouts`);

// Extract step count (last 7 days)
const today = new Date();
const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
const stepRegex = /<Record type="HKQuantityTypeIdentifierStepCount" .*?startDate="(.*?)" .*?value="(.*?)".*?\/>/g;
const steps = [];
while ((match = stepRegex.exec(xml)) !== null) {
  const date = new Date(match[1]);
  if (date >= sevenDaysAgo) {
    steps.push({
      date: match[1],
      count: parseInt(match[2])
    });
  }
}

// Group steps by day
const stepsByDay = {};
steps.forEach(s => {
  const day = s.date.split(' ')[0];
  stepsByDay[day] = (stepsByDay[day] || 0) + s.count;
});

const avgSteps = Object.values(stepsByDay).length > 0 
  ? Math.round(Object.values(stepsByDay).reduce((a, b) => a + b, 0) / Object.values(stepsByDay).length)
  : 0;

console.log(`  Avg steps (7 days): ${avgSteps}`);

// Workout distribution
const workoutTypes = {};
workouts.forEach(w => {
  const type = w.type.replace('HKWorkoutActivityType', '');
  workoutTypes[type] = (workoutTypes[type] || 0) + 1;
});

// Save processed data
const date = new Date().toISOString().split('T')[0];
const outputData = {
  exportDate: date,
  sourceFile: zipFiles[0],
  metrics: {
    steps: avgSteps,
    totalWorkouts: workouts.length,
    avgWorkoutDuration: workouts.length > 0 
      ? Math.round(workouts.reduce((sum, w) => sum + w.duration, 0) / workouts.length / 60) 
      : 0,
    totalCaloriesBurned: Math.round(workouts.reduce((sum, w) => sum + w.calories, 0))
  },
  workouts: workouts.slice(0, 20), // Last 20 workouts
  workoutDistribution: workoutTypes,
  stepsByDay: stepsByDay
};

const outputPath = path.join(fitnessDataDir, `apple_health_${date}.json`);
fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
console.log(`✅ Saved parsed data: ${path.basename(outputPath)}`);

// Clean up
fs.rmSync(extractDir, { recursive: true });
console.log('🧹 Cleaned up temporary files');

console.log('\n📊 Summary:');
console.log(`  Steps (7-day avg): ${avgSteps}`);
console.log(`  Workouts: ${workouts.length}`);
console.log(`  Workout types: ${Object.keys(workoutTypes).join(', ')}`);
