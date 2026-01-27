#!/usr/bin/env node
/**
 * Process Apple Health data and merge with Oura data for dashboard
 */

const fs = require('fs');
const path = require('path');

// Find the most recent Apple Health file
const fitnessDataDir = path.join(__dirname, 'fitness-data');
let appleHealthData = null;

try {
  const appleFiles = fs.readdirSync(fitnessDataDir)
    .filter(f => f.startsWith('apple_health_') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (appleFiles.length > 0) {
    const latestAppleFile = path.join(fitnessDataDir, appleFiles[0]);
    console.log(`📱 Using Apple Health data from: ${appleFiles[0]}`);
    appleHealthData = JSON.parse(fs.readFileSync(latestAppleFile, 'utf8'));
  }
} catch (err) {
  console.log('⚠️  No Apple Health data found, skipping...');
}

// Load existing dashboard data (from Oura)
let dashboardData = null;
const dataFile = path.join(__dirname, 'data.json');

if (fs.existsSync(dataFile)) {
  dashboardData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  console.log('📊 Loaded existing dashboard data');
} else {
  console.error('❌ No data.json found. Run process-oura-data.js first.');
  process.exit(1);
}

// Merge Apple Health data if available
if (appleHealthData) {
  console.log('🔄 Merging Apple Health data with Oura data...');
  
  // Extract Apple Health metrics
  const appleMetrics = appleHealthData.metrics || {};
  
  // Merge workout data if available
  if (appleHealthData.workouts && appleHealthData.workouts.length > 0) {
    dashboardData.metrics.totalWorkouts = appleHealthData.workouts.length;
    
    // Update workout distribution
    const workoutTypes = {};
    appleHealthData.workouts.forEach(w => {
      const type = w.type || 'Other';
      workoutTypes[type] = (workoutTypes[type] || 0) + 1;
    });
    
    dashboardData.workoutDistribution = {
      labels: Object.keys(workoutTypes),
      values: Object.values(workoutTypes)
    };
    
    console.log(`  ✅ Added ${appleHealthData.workouts.length} workouts`);
  }
  
  // Merge step data if not from Oura
  if (appleMetrics.steps && !dashboardData.metrics.dailyAvgSteps) {
    dashboardData.metrics.dailyAvgSteps = appleMetrics.steps;
    console.log(`  ✅ Added steps: ${appleMetrics.steps}`);
  }
  
  // Add Apple-specific metrics
  if (appleMetrics.activeEnergyBurned) {
    dashboardData.metrics.activeEnergyBurned = appleMetrics.activeEnergyBurned;
    console.log(`  ✅ Added active energy: ${appleMetrics.activeEnergyBurned}`);
  }
  
  if (appleMetrics.exerciseMinutes) {
    dashboardData.metrics.exerciseMinutes = appleMetrics.exerciseMinutes;
    console.log(`  ✅ Added exercise minutes: ${appleMetrics.exerciseMinutes}`);
  }
  
  // Mark as combined data source
  dashboardData.dataSources = dashboardData.dataSources || [];
  if (!dashboardData.dataSources.includes('Apple Health')) {
    dashboardData.dataSources.push('Apple Health');
  }
  if (!dashboardData.dataSources.includes('Oura Ring')) {
    dashboardData.dataSources.push('Oura Ring');
  }
}

// Save merged data
fs.writeFileSync(dataFile, JSON.stringify(dashboardData, null, 2));
console.log('✅ Dashboard data updated with Apple Health integration!');
console.log(`📊 Data sources: ${dashboardData.dataSources?.join(', ') || 'Oura Ring'}`);
