#!/usr/bin/env node
/**
 * Daily Health Check - Analyze Oura data and generate proactive insights
 * Run via: node health-check.js
 */

const fs = require('fs');
const path = require('path');

// Load latest data
const dataPath = path.join(__dirname, '..', 'data.json');
if (!fs.existsSync(dataPath)) {
  console.log('⚠️  No data.json found. Run sync first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const m = data.metrics || {};
const insights = data.insights || {};

console.log('📊 Daily Health Check - ' + new Date().toLocaleDateString());
console.log('================================================\n');

// Analysis flags
const alerts = [];
const positives = [];
const recommendations = [];

// 1. SLEEP ANALYSIS
console.log('😴 Sleep & Recovery:');
console.log(`   Sleep Score: ${m.sleepScore || 0}%`);
console.log(`   Readiness: ${m.readinessScore || 0}%`);

if (m.sleepScore < 60) {
  alerts.push('🔴 Poor sleep quality (below 60%)');
  recommendations.push('Prioritize 7-9 hours of quality sleep tonight');
} else if (m.sleepScore >= 80) {
  positives.push('✅ Excellent sleep quality!');
}

if (m.readinessScore < 50) {
  alerts.push('🔴 Low readiness - body needs recovery');
  recommendations.push('Take it easy today. Light activity only.');
} else if (m.readinessScore >= 75) {
  positives.push('✅ High readiness - good day for intense workouts!');
}

// 2. ACTIVITY ANALYSIS
console.log('\n👟 Activity:');
console.log(`   Avg Steps (7 days): ${(m.dailyAvgSteps || 0).toLocaleString()}`);
console.log(`   Active Days: ${m.activeDays || 0}/7`);
console.log(`   Workouts: ${m.totalWorkouts || 0}`);

if (m.dailyAvgSteps < 5000) {
  alerts.push('🟡 Low step count (below 5k/day)');
  recommendations.push('Try to walk 10-15 minutes extra today');
} else if (m.dailyAvgSteps >= 10000) {
  positives.push('✅ Hitting 10k+ steps consistently!');
}

if (m.activeDays < 5) {
  alerts.push('🟡 Only ' + m.activeDays + '/7 days active');
  recommendations.push('Aim for at least 5 active days per week');
}

if (m.totalWorkouts === 0) {
  alerts.push('🟡 No workouts logged this week');
  recommendations.push('Schedule 2-3 workouts this week');
} else if (m.totalWorkouts >= 3) {
  positives.push('✅ Great workout frequency!');
}

// 3. HEART RATE ANALYSIS
console.log('\n❤️  Heart Rate:');
console.log(`   Resting HR: ${m.avgHeartRate || 0} bpm`);

if (m.avgHeartRate > 80) {
  alerts.push('🔴 Elevated resting HR (above 80 bpm)');
  recommendations.push('Consider stress management and extra recovery');
} else if (m.avgHeartRate < 60) {
  positives.push('✅ Excellent resting heart rate!');
}

// 4. TREND ANALYSIS
const weekChange = insights.performance?.weekChange || 0;
console.log('\n📈 Trends:');
console.log(`   Week-over-week: ${weekChange >= 0 ? '+' : ''}${weekChange}%`);

if (weekChange < -20) {
  alerts.push('🔴 Significant activity drop (>20%)');
  recommendations.push('Check what changed - get back to previous routine');
} else if (weekChange > 20) {
  positives.push('✅ Major improvement this week! Keep it up!');
}

// 5. CONSISTENCY
console.log(`   Consistency: ${m.consistency || 0}%`);
console.log(`   Current Streak: ${m.currentStreak || 0} days`);

if (m.consistency < 50) {
  alerts.push('🟡 Low consistency (below 50%)');
  recommendations.push('Focus on building daily habits');
} else if (m.consistency >= 80) {
  positives.push('✅ Excellent consistency!');
}

// SUMMARY
console.log('\n================================================');
console.log('📋 SUMMARY:\n');

if (positives.length > 0) {
  console.log('✅ What\'s Going Well:');
  positives.forEach(p => console.log('   ' + p));
  console.log('');
}

if (alerts.length > 0) {
  console.log('⚠️  Areas Needing Attention:');
  alerts.forEach(a => console.log('   ' + a));
  console.log('');
}

if (recommendations.length > 0) {
  console.log('💡 Today\'s Recommendations:');
  recommendations.forEach(r => console.log('   • ' + r));
  console.log('');
}

// Generate overall health score
let healthScore = 100;
if (m.sleepScore < 60) healthScore -= 15;
if (m.readinessScore < 50) healthScore -= 15;
if (m.dailyAvgSteps < 5000) healthScore -= 10;
if (m.avgHeartRate > 80) healthScore -= 10;
if (m.consistency < 50) healthScore -= 10;
if (m.activeDays < 5) healthScore -= 10;

healthScore = Math.max(0, healthScore);

console.log('🏆 Overall Health Score: ' + healthScore + '/100');

if (healthScore >= 80) {
  console.log('   Status: 🟢 EXCELLENT - Keep doing what you\'re doing!');
} else if (healthScore >= 60) {
  console.log('   Status: 🟡 GOOD - A few areas to improve');
} else {
  console.log('   Status: 🔴 NEEDS ATTENTION - Let\'s get back on track!');
}

console.log('\n================================================\n');

// Save report for Dubz to read
const report = {
  date: new Date().toISOString(),
  metrics: m,
  alerts: alerts,
  positives: positives,
  recommendations: recommendations,
  healthScore: healthScore
};

const reportPath = path.join(__dirname, 'latest-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log('📄 Report saved to: latest-report.json\n');

// Exit with status code based on alerts
if (alerts.filter(a => a.includes('🔴')).length > 0) {
  process.exit(1); // Critical alerts
} else if (alerts.length > 0) {
  process.exit(2); // Warning alerts
} else {
  process.exit(0); // All good
}
