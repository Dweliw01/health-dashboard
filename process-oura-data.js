#!/usr/bin/env node
/**
 * Process Oura Ring data and generate dashboard-ready JSON
 * Fixed version: Uses real data, no hardcoded values
 */

const fs = require('fs');
const path = require('path');

// Find the most recent oura_sync file
const fitnessDataDir = path.join(__dirname, 'fitness-data');
const ouraFiles = fs.readdirSync(fitnessDataDir)
  .filter(f => f.startsWith('oura_sync_') && f.endsWith('.json'))
  .sort()
  .reverse();

if (ouraFiles.length === 0) {
  console.error('No oura_sync_*.json files found in fitness-data/');
  process.exit(1);
}

const latestFile = path.join(fitnessDataDir, ouraFiles[0]);
console.log(`Using data from: ${ouraFiles[0]}`);

// Load Oura data
const ouraData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
const dailyActivity = ouraData.data.daily_activity.data || [];
const dailySleep = ouraData.data.daily_sleep.data || [];
const dailyReadiness = ouraData.data.daily_readiness.data || [];
const workouts = ouraData.data.workout.data || [];
const heartRateData = ouraData.data.heartrate.data || [];

// Helper functions
function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function getDayLabel(dateStr) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

// Get last 7 days of activity data
const last7Days = dailyActivity.slice(-7);
const last30Days = dailyActivity;

// Extract steps for last 7 days
const steps7Days = last7Days.map(d => d.steps || 0);
const avgSteps7Days = Math.round(avg(steps7Days));
const totalSteps30Days = last30Days.reduce((sum, d) => sum + (d.steps || 0), 0);
const avgSteps30Days = last30Days.length > 0 ? Math.round(totalSteps30Days / last30Days.length) : 0;

// Calories
const avgCalories7Days = Math.round(avg(last7Days.map(d => d.active_calories || 0)));
const totalCalories30Days = last30Days.reduce((sum, d) => sum + (d.active_calories || 0), 0);

// Activity scores
const avgActivityScore = Math.round(avg(last7Days.map(d => d.score || 0)));

// Sleep data
const last7Sleep = dailySleep.slice(-7);
const avgSleepScore = Math.round(avg(last7Sleep.map(d => d.score || 0)));

// Readiness data
const last7Readiness = dailyReadiness.slice(-7);
const avgReadinessScore = Math.round(avg(last7Readiness.map(d => d.score || 0)));
const latestReadiness = dailyReadiness[dailyReadiness.length - 1] || {};
const restingHR = latestReadiness.contributors?.resting_heart_rate ||
                  Math.round(avg(last7Readiness.map(d => d.contributors?.resting_heart_rate || 0).filter(x => x > 0))) ||
                  60;

// Calculate REAL heart rate trends from actual HR data
function calculateDailyHR() {
  const hrByDay = {};

  heartRateData.forEach(hr => {
    const day = hr.timestamp.split('T')[0];
    if (!hrByDay[day]) hrByDay[day] = [];
    hrByDay[day].push(hr.bpm);
  });

  // Get last 7 days with HR data
  const sortedDays = Object.keys(hrByDay).sort().slice(-7);
  return sortedDays.map(day => ({
    day,
    avgHR: Math.round(avg(hrByDay[day])),
    maxHR: Math.max(...hrByDay[day]),
    minHR: Math.min(...hrByDay[day])
  }));
}

const dailyHRTrends = calculateDailyHR();

// Calculate streaks (both current and longest)
function calculateStreaks(activityData, threshold = 10000) {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Calculate longest streak
  for (const day of activityData) {
    if (day.steps >= threshold) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Calculate current streak (from end)
  for (let i = activityData.length - 1; i >= 0; i--) {
    if (activityData[i].steps >= threshold) {
      currentStreak++;
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak };
}

const streaks = calculateStreaks(dailyActivity);

// Best day in last 7 days
const bestDay = last7Days.reduce((best, day) =>
  (day.steps > (best.steps || 0)) ? day : best, {});
const bestDayLabel = bestDay.day ? getDayLabel(bestDay.day) : 'N/A';

// REAL weekly comparison (split 30 days into 4 weeks)
function calculateWeeklyComparison() {
  const weeks = [[], [], [], []];

  // Distribute days into weeks (most recent is week 4)
  dailyActivity.forEach((day, i) => {
    const weekIndex = Math.floor(i / 7);
    if (weekIndex < 4) {
      weeks[weekIndex].push(day);
    }
  });

  // If we have more than 28 days, put extras in week 4
  if (dailyActivity.length > 28) {
    weeks[3] = dailyActivity.slice(-7);
    weeks[2] = dailyActivity.slice(-14, -7);
    weeks[1] = dailyActivity.slice(-21, -14);
    weeks[0] = dailyActivity.slice(-28, -21);
  }

  // Calculate workouts per week
  const workoutsByWeek = [0, 0, 0, 0];
  workouts.forEach(w => {
    const workoutDate = new Date(w.day);
    const now = new Date();
    const daysAgo = Math.floor((now - workoutDate) / (1000 * 60 * 60 * 24));
    const weekIndex = 3 - Math.floor(daysAgo / 7);
    if (weekIndex >= 0 && weekIndex < 4) {
      workoutsByWeek[weekIndex]++;
    }
  });

  return {
    labels: ["Week 1", "Week 2", "Week 3", "This Week"],
    steps: weeks.map(w => Math.round(avg(w.map(d => d.steps || 0)))),
    workouts: workoutsByWeek,
    calories: weeks.map(w => Math.round(avg(w.map(d => d.active_calories || 0))))
  };
}

const weeklyComparison = calculateWeeklyComparison();

// Days of week labels for last 7 days
const last7Labels = last7Days.map(d => getDayLabel(d.day));

// Calculate real time of day activity from MET data
const timeOfDayActivity = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const hourIndices = [6, 8, 10, 12, 14, 16, 18, 20, 22];
const activityCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];

last7Days.forEach(day => {
  if (day.met && day.met.items && day.met.items.length > 0) {
    hourIndices.forEach((targetHour, i) => {
      const metValue = day.met.items[targetHour] || 0;

      let activityBoost = 1;
      if (day.class_5_min) {
        const intervalIndex = targetHour * 12;
        const hourClass = day.class_5_min.substring(intervalIndex, intervalIndex + 12);
        const avgClass = hourClass.split('').reduce((sum, c) => sum + parseInt(c || 0), 0) / 12;
        activityBoost = Math.max(1, avgClass);
      }

      timeOfDayActivity[i] += (metValue * activityBoost * 100);
      activityCounts[i]++;
    });
  }
});

const avgTimeOfDay = timeOfDayActivity.map((val, i) =>
  activityCounts[i] > 0 ? Math.round(val / activityCounts[i]) : 0
);

// Process real workout data
function processWorkouts() {
  const workoutTypes = {};
  workouts.forEach(w => {
    const type = w.activity || 'Other';
    workoutTypes[type] = (workoutTypes[type] || 0) + 1;
  });

  if (Object.keys(workoutTypes).length === 0) {
    return { labels: [], values: [] };
  }

  // Sort by count descending
  const sorted = Object.entries(workoutTypes).sort((a, b) => b[1] - a[1]);
  return {
    labels: sorted.map(([type]) => type.charAt(0).toUpperCase() + type.slice(1)),
    values: sorted.map(([, count]) => count)
  };
}

const workoutDistribution = processWorkouts();

// Calculate active days (days with 5000+ steps)
const activeDays = last7Days.filter(d => d.steps >= 5000).length;

// Calculate consistency (% of days hitting 10k in last 30 days)
const daysOver10k = last30Days.filter(d => d.steps >= 10000).length;
const consistency = last30Days.length > 0 ? Math.round((daysOver10k / last30Days.length) * 100) : 0;

// Calculate fitness score from multiple metrics
const fitnessScore = Math.round(
  (avgActivityScore * 0.3) +
  (avgSleepScore * 0.25) +
  (avgReadinessScore * 0.25) +
  (consistency * 0.2)
);

// Week over week change
const thisWeekAvg = weeklyComparison.steps[3] || 0;
const lastWeekAvg = weeklyComparison.steps[2] || thisWeekAvg;
const weekChange = lastWeekAvg > 0 ? Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100) : 0;
const monthChange = avgSteps30Days > 0 ? Math.round(((avgSteps7Days - avgSteps30Days) / avgSteps30Days) * 100) : 0;

// Generate health alerts from real data
function generateAlerts() {
  const alerts = [];

  // Check for HR spikes
  const avgHR = avg(dailyHRTrends.map(d => d.avgHR));
  dailyHRTrends.forEach(d => {
    if (d.maxHR > avgHR * 1.3 && d.maxHR > 100) {
      alerts.push({
        type: 'warning',
        title: 'HR Spike Detected',
        message: `${getDayLabel(d.day)}: ${d.maxHR} bpm peak`,
        severity: 'medium'
      });
    }
  });

  // Check for low activity days
  last7Days.forEach(d => {
    if (d.steps > 0 && d.steps < avgSteps7Days * 0.5) {
      alerts.push({
        type: 'warning',
        title: 'Low Activity Day',
        message: `${getDayLabel(d.day)}: ${d.steps.toLocaleString()} steps`,
        severity: 'low'
      });
    }
  });

  // Check workout gap
  const recentWorkouts = workouts.filter(w => {
    const daysAgo = Math.floor((new Date() - new Date(w.day)) / (1000 * 60 * 60 * 24));
    return daysAgo <= 7;
  }).length;

  if (recentWorkouts === 0 && workouts.length > 0) {
    alerts.push({
      type: 'warning',
      title: 'Workout Gap',
      message: 'No workouts logged this week',
      severity: 'medium'
    });
  }

  // Check sleep
  if (avgSleepScore < 60) {
    alerts.push({
      type: 'warning',
      title: 'Sleep Quality Low',
      message: `Average sleep score: ${avgSleepScore}%`,
      severity: 'medium'
    });
  }

  // All clear if no alerts
  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      title: 'All Systems Good',
      message: 'No health concerns detected',
      severity: 'none'
    });
  }

  return alerts.slice(0, 4); // Max 4 alerts
}

// Generate output data
const dashboardData = {
  lastUpdated: new Date().toISOString(),
  today: {
    steps: last7Days[last7Days.length - 1]?.steps || 0,
    avgHeartRate: dailyHRTrends[dailyHRTrends.length - 1]?.avgHR || restingHR,
    calories: last7Days[last7Days.length - 1]?.active_calories || 0
  },
  thisWeek: {
    workouts: weeklyComparison.workouts[3],
    avgSteps: avgSteps7Days,
    avgCalories: avgCalories7Days
  },
  last7Days: {
    labels: last7Labels,
    values: steps7Days
  },
  heartRateTrends: {
    labels: dailyHRTrends.map(d => getDayLabel(d.day)),
    values: dailyHRTrends.map(d => d.avgHR),
    max: dailyHRTrends.map(d => d.maxHR),
    min: dailyHRTrends.map(d => d.minHR)
  },
  workoutDistribution,
  weeklyComparison,
  projection: {
    labels: ["Now", "Day 10", "Day 20", "Day 30"],
    actual: [avgSteps7Days, null, null, null],
    projected: [
      avgSteps7Days,
      Math.round(avgSteps7Days * (1 + weekChange/100 * 0.5)),
      Math.round(avgSteps7Days * (1 + weekChange/100 * 0.75)),
      Math.round(avgSteps7Days * (1 + weekChange/100))
    ]
  },
  timeOfDay: {
    labels: ["6am", "8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm", "10pm"],
    values: avgTimeOfDay
  },
  metrics: {
    dailyAvgSteps: avgSteps7Days,
    avgHeartRate: dailyHRTrends.length > 0 ? Math.round(avg(dailyHRTrends.map(d => d.avgHR))) : restingHR,
    restingHR: restingHR,
    activeDays,
    totalWorkouts: workouts.length,
    bestDaySteps: bestDay.steps || 0,
    bestDayLabel,
    caloriesPerDay: avgCalories7Days,
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    fitnessScore,
    activityScore: avgActivityScore,
    sleepScore: avgSleepScore,
    readinessScore: avgReadinessScore,
    consistency,
    totalSteps30Days,
    totalCalories30Days,
    daysTracked: last30Days.length
  },
  insights: {
    performance: {
      weekChange,
      monthChange,
      trend: weekChange >= 0 ? 'improving' : 'declining'
    },
    recovery: {
      readinessScore: avgReadinessScore,
      restingHR,
      sleepScore: avgSleepScore
    }
  },
  alerts: generateAlerts()
};

// Write to file
fs.writeFileSync(
  path.join(__dirname, 'data.json'),
  JSON.stringify(dashboardData, null, 2)
);

console.log('Oura data processed successfully!');
console.log(`  Avg steps (7 days): ${avgSteps7Days}`);
console.log(`  Resting HR: ${restingHR}`);
console.log(`  Current streak: ${streaks.currentStreak} days`);
console.log(`  Longest streak: ${streaks.longestStreak} days`);
console.log(`  Sleep score: ${avgSleepScore}`);
console.log(`  Readiness score: ${avgReadinessScore}`);
console.log(`  Fitness score: ${fitnessScore}`);
console.log(`  Active days: ${activeDays}/7`);
console.log(`  Workouts: ${workouts.length} total`);
