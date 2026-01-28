/**
 * Recommendation Engine - Morning Coach intelligence
 * Analyzes health data and generates actionable recommendations
 * HRV is the primary recovery indicator
 */

const RecommendationEngine = {

  // Priority order for deficit detection
  priorities: [
    'criticalRecovery',   // HRV < 70% baseline OR Readiness < 50 OR Sleep < 50
    'hrvDropAlert',       // HRV significantly below baseline
    'deepSleepDeficit',   // Deep sleep < 60 min for 3+ days
    'highStressAlert',    // High stress, low recovery
    'workoutDeficit',     // No workout in 3+ days
    'sleepDebt',          // Sleep score < 70 for 3+ days
    'stepDeficit',        // Steps < 50% of goal
    'maintenanceMode'     // Everything is fine
  ],

  /**
   * Get HRV baseline from goals or default
   */
  getHrvBaseline(goals) {
    if (goals?.hrvBaseline?.target) {
      return goals.hrvBaseline.target;
    }
    return 40; // Default baseline
  },

  /**
   * Main analysis function - synthesizes all data
   */
  analyzeToday(data, goals, history) {
    return {
      readiness: this.assessReadiness(data, goals),
      priority: this.findTopPriority(data, goals, history),
      workout: this.recommendWorkout(data, goals),
      yesterday: this.summarizeYesterday(data, history),
      thisWeek: this.summarizeThisWeek(data),
      recoveryFactors: this.getRecoveryFactors(data, goals),
      greeting: this.getGreeting()
    };
  },

  /**
   * Enhanced readiness assessment using HRV, sleep stages, stress
   */
  assessReadiness(data, goals) {
    const readinessScore = data.metrics?.readinessScore || 0;
    const sleepScore = data.metrics?.sleepScore || 0;
    const hrv = data.hrv?.current || 0;
    const hrvBaseline = this.getHrvBaseline(goals);
    const hrvPercentage = hrvBaseline > 0 ? (hrv / hrvBaseline) * 100 : 100;

    // Get most recent sleep data
    const lastSleep = data.sleepStages?.last7Days?.[data.sleepStages?.last7Days?.length - 1];
    const deepSleep = lastSleep?.deep || 0;
    const stressSummary = data.stress?.today?.summary || 'normal';

    // Weighted readiness calculation - HRV is primary
    const weights = {
      hrv: 0.35,
      readiness: 0.25,
      sleep: 0.20,
      deepSleep: 0.10,
      stress: 0.10
    };

    const hrvScore = Math.min(100, hrvPercentage);
    const deepSleepScore = Math.min(100, (deepSleep / 90) * 100);
    const stressScore = stressSummary === 'restored' ? 100 :
                        stressSummary === 'normal' ? 75 :
                        stressSummary === 'stressful' ? 40 : 60;

    const compositeScore = Math.round(
      (hrvScore * weights.hrv) +
      (readinessScore * weights.readiness) +
      (sleepScore * weights.sleep) +
      (deepSleepScore * weights.deepSleep) +
      (stressScore * weights.stress)
    );

    // Determine limiting factor
    const factors = [
      { name: 'HRV', score: hrvScore, value: `${hrv}ms (${Math.round(hrvPercentage)}%)` },
      { name: 'Readiness', score: readinessScore, value: readinessScore },
      { name: 'Sleep', score: sleepScore, value: sleepScore },
      { name: 'Deep Sleep', score: deepSleepScore, value: `${deepSleep} min` },
      { name: 'Recovery', score: stressScore, value: stressSummary }
    ];
    const limitingFactor = factors.reduce((min, f) => f.score < min.score ? f : min);

    if (compositeScore >= 75 && hrvPercentage >= 90) {
      return {
        level: 'good',
        label: 'Ready to Push',
        color: '#10b981',
        description: 'HRV is strong and recovery looks good. Great day for challenging workouts.',
        compositeScore,
        limitingFactor: null,
        factors,
        dots: 5
      };
    } else if (compositeScore >= 60 || (hrvPercentage >= 80 && readinessScore >= 60)) {
      return {
        level: 'moderate',
        label: 'Moderate Capacity',
        color: '#f59e0b',
        description: `Decent recovery, but ${limitingFactor.name} is holding you back. Good for steady-state activity.`,
        compositeScore,
        limitingFactor,
        factors,
        dots: 3
      };
    } else {
      return {
        level: 'low',
        label: 'Recovery Focus',
        color: '#ef4444',
        description: `${limitingFactor.name} is low (${limitingFactor.value}). Light movement only, prioritize recovery.`,
        compositeScore,
        limitingFactor,
        factors,
        dots: 1
      };
    }
  },

  /**
   * Get detailed recovery factors for display
   */
  getRecoveryFactors(data, goals) {
    const hrvBaseline = this.getHrvBaseline(goals);
    const hrvCurrent = data.hrv?.current || 0;
    const lastSleep = data.sleepStages?.last7Days?.[data.sleepStages?.last7Days?.length - 1];

    return {
      hrv: {
        current: hrvCurrent,
        baseline: hrvBaseline,
        percentage: hrvBaseline > 0 ? Math.round((hrvCurrent / hrvBaseline) * 100) : 0,
        trend: data.hrv?.status || 'unknown',
        status: this.getHrvStatus(hrvCurrent, hrvBaseline)
      },
      deepSleep: {
        value: lastSleep?.deep || 0,
        target: 90,
        percentage: Math.round(((lastSleep?.deep || 0) / 90) * 100),
        status: this.getDeepSleepStatus(lastSleep?.deep || 0)
      },
      sleepScore: {
        value: data.metrics?.sleepScore || 0,
        status: this.getSleepStatus(data.metrics?.sleepScore || 0)
      },
      stress: {
        stressMinutes: data.stress?.today?.stressMinutes || 0,
        recoveryMinutes: data.stress?.today?.recoveryMinutes || 0,
        summary: data.stress?.today?.summary || 'unknown',
        status: this.getStressStatus(data.stress?.today)
      },
      efficiency: {
        value: lastSleep?.efficiency || 0,
        status: (lastSleep?.efficiency || 0) >= 85 ? 'good' : 'warning'
      }
    };
  },

  getHrvStatus(current, baseline) {
    if (!current || !baseline) return { level: 'unknown', label: 'No data' };
    const pct = (current / baseline) * 100;
    if (pct >= 95) return { level: 'good', label: 'Above baseline' };
    if (pct >= 85) return { level: 'normal', label: 'Normal' };
    if (pct >= 70) return { level: 'warning', label: 'Below baseline' };
    return { level: 'low', label: 'Significantly low' };
  },

  getDeepSleepStatus(minutes) {
    if (minutes >= 90) return { level: 'good', label: 'Optimal' };
    if (minutes >= 60) return { level: 'normal', label: 'Adequate' };
    if (minutes >= 30) return { level: 'warning', label: 'Low' };
    return { level: 'low', label: 'Very low' };
  },

  getSleepStatus(score) {
    if (score >= 80) return { level: 'good', label: 'Excellent' };
    if (score >= 70) return { level: 'normal', label: 'Good' };
    if (score >= 60) return { level: 'warning', label: 'Fair' };
    return { level: 'low', label: 'Poor' };
  },

  getStressStatus(stressData) {
    if (!stressData) return { level: 'unknown', label: 'No data' };
    if (stressData.summary === 'restored') return { level: 'good', label: 'Restored' };
    if (stressData.summary === 'normal') return { level: 'normal', label: 'Balanced' };
    if (stressData.summary === 'stressful') return { level: 'warning', label: 'High stress' };
    return { level: 'unknown', label: stressData.summary || 'Unknown' };
  },

  /**
   * Find the top priority action for today
   */
  findTopPriority(data, goals, history) {
    const metrics = data.metrics || {};
    const hrv = data.hrv?.current || 0;
    const hrvBaseline = this.getHrvBaseline(goals);
    const hrvPercentage = hrvBaseline > 0 ? (hrv / hrvBaseline) * 100 : 100;
    const lastSleep = data.sleepStages?.last7Days?.[data.sleepStages?.last7Days?.length - 1];
    const deepSleep = lastSleep?.deep || 0;
    const stressData = data.stress?.today || {};

    // CRITICAL: HRV crash or very low scores
    if (hrvPercentage < 70 || metrics.readinessScore < 50 || metrics.sleepScore < 50) {
      const reason = hrvPercentage < 70 ?
        `HRV is ${Math.round(hrvPercentage)}% of your baseline - your body is stressed` :
        `Your ${metrics.sleepScore < 50 ? 'sleep' : 'readiness'} score is critically low`;
      return {
        type: 'critical',
        icon: 'alert-octagon',
        title: 'Recovery Day',
        action: 'Skip intense exercise. Prioritize rest, hydration, and early bedtime.',
        reason,
        color: '#ef4444'
      };
    }

    // HRV below baseline warning
    if (hrvPercentage < 85 && hrvPercentage >= 70) {
      return {
        type: 'hrvWarning',
        icon: 'heart',
        title: 'HRV Below Baseline',
        action: 'Moderate activity only. Your nervous system needs lighter stress today.',
        reason: `HRV is ${hrv}ms (${Math.round(hrvPercentage)}% of your ${hrvBaseline}ms baseline).`,
        color: '#f59e0b'
      };
    }

    // Deep sleep deficit
    const avgDeepSleep = data.sleepStages?.avgDeep || 0;
    if (avgDeepSleep > 0 && avgDeepSleep < 60) {
      return {
        type: 'deepSleep',
        icon: 'moon',
        title: 'Deep Sleep Deficit',
        action: 'No alcohol, no late meals, cool bedroom. Consider magnesium before bed.',
        reason: `Averaging ${Math.round(avgDeepSleep)} min deep sleep (need 90+ for optimal recovery).`,
        color: '#8b5cf6'
      };
    }

    // High stress, low recovery
    if (stressData.stressMinutes > 300 && stressData.recoveryMinutes < 120) {
      return {
        type: 'stress',
        icon: 'activity',
        title: 'High Stress Load',
        action: 'Include 20+ minutes of relaxation today. Walk, breathe, or meditate.',
        reason: `Yesterday: ${Math.round(stressData.stressMinutes/60)}h stress vs ${Math.round(stressData.recoveryMinutes/60)}h recovery.`,
        color: '#f59e0b'
      };
    }

    // Workout deficit
    const daysSinceWorkout = this.daysSinceLastWorkout(data);
    if (daysSinceWorkout >= 3) {
      return {
        type: 'workout',
        icon: 'dumbbell',
        title: `${daysSinceWorkout} Days Since Workout`,
        action: this.getWorkoutSuggestion(metrics.readinessScore, hrvPercentage),
        reason: 'Consistency matters more than intensity. Get moving today.',
        color: '#6366f1'
      };
    }

    // Sleep debt
    const avgSleep = metrics.sleepScore || 0;
    if (avgSleep > 0 && avgSleep < 70) {
      return {
        type: 'sleep',
        icon: 'moon',
        title: 'Sleep Quality Low',
        action: 'Target 8+ hours tonight. No screens after 9pm.',
        reason: `Your sleep score is ${avgSleep}. Below 70 impacts HRV and recovery.`,
        color: '#8b5cf6'
      };
    }

    // Step deficit
    const avgSteps = metrics.dailyAvgSteps || 0;
    const stepGoal = goals?.dailySteps?.target || 10000;
    if (avgSteps > 0 && avgSteps < stepGoal * 0.5) {
      return {
        type: 'steps',
        icon: 'footprints',
        title: 'Movement Deficit',
        action: `Aim for ${stepGoal.toLocaleString()} steps today. Take a walk after each meal.`,
        reason: `Averaging ${avgSteps.toLocaleString()} steps - well below your goal.`,
        color: '#6366f1'
      };
    }

    // All good - maintenance
    return {
      type: 'maintenance',
      icon: 'check-circle',
      title: 'On Track',
      action: 'Maintain your routine. Your HRV and recovery look solid.',
      reason: `HRV at ${Math.round(hrvPercentage)}% of baseline. All systems go.`,
      color: '#10b981'
    };
  },

  /**
   * Calculate days since last workout
   */
  daysSinceLastWorkout(data) {
    const workoutsThisWeek = data.thisWeek?.workouts || 0;
    if (workoutsThisWeek > 0) return 0;
    // Estimate based on total workouts and days tracked
    const totalWorkouts = data.metrics?.totalWorkouts || 0;
    const daysTracked = data.metrics?.daysTracked || 30;
    if (totalWorkouts === 0) return daysTracked;
    // Rough estimate
    return Math.min(7, Math.round(daysTracked / Math.max(1, totalWorkouts)));
  },

  /**
   * Get workout suggestion based on readiness
   */
  getWorkoutSuggestion(readiness, hrvPercentage) {
    if (hrvPercentage >= 95 && readiness >= 75) {
      return 'Great day for high intensity - HIIT, heavy lifting, or sprints.';
    } else if (hrvPercentage >= 85 && readiness >= 65) {
      return 'Good day for moderate effort - steady cardio or strength training.';
    } else if (hrvPercentage >= 70) {
      return 'Keep it light - walking, yoga, or stretching.';
    }
    return 'Focus on recovery - gentle movement only.';
  },

  /**
   * Enhanced workout recommendation using HRV as primary indicator
   */
  recommendWorkout(data, goals) {
    const readiness = data.metrics?.readinessScore || 50;
    const hrv = data.hrv?.current || 0;
    const hrvBaseline = this.getHrvBaseline(goals);
    const hrvPercentage = hrvBaseline > 0 ? (hrv / hrvBaseline) * 100 : 100;
    const lastSleep = data.sleepStages?.last7Days?.[data.sleepStages?.last7Days?.length - 1];
    const deepSleep = lastSleep?.deep || 60;

    if (hrvPercentage >= 95 && readiness >= 75 && deepSleep >= 75) {
      return {
        type: 'intense',
        label: 'High Intensity OK',
        suggestions: ['HIIT', 'Heavy lifting', 'Sprint intervals', 'Competitive sports'],
        duration: '45-60 min',
        icon: 'flame',
        color: '#ef4444',
        reason: `HRV at ${Math.round(hrvPercentage)}% with ${deepSleep} min deep sleep. Push hard.`
      };
    } else if (hrvPercentage >= 85 && readiness >= 65) {
      return {
        type: 'moderate',
        label: 'Moderate Effort',
        suggestions: ['Steady cardio', 'Moderate lifting', 'Swimming', 'Cycling'],
        duration: '30-45 min',
        icon: 'trending-up',
        color: '#f59e0b',
        reason: 'HRV is good but not peak. Solid training day without max efforts.'
      };
    } else if (hrvPercentage >= 70 && readiness >= 50) {
      return {
        type: 'light',
        label: 'Light Activity',
        suggestions: ['Walking', 'Yoga', 'Stretching', 'Light swim'],
        duration: '20-30 min',
        icon: 'footprints',
        color: '#10b981',
        reason: 'HRV below baseline. Active recovery helps more than pushing.'
      };
    } else {
      return {
        type: 'rest',
        label: 'Active Recovery',
        suggestions: ['Rest day', 'Gentle stretching', 'Short walk', 'Meditation'],
        duration: '0-15 min',
        icon: 'pause',
        color: '#8b5cf6',
        reason: `HRV at ${Math.round(hrvPercentage)}% - your body needs rest to recover.`
      };
    }
  },

  /**
   * Summarize yesterday's performance
   */
  summarizeYesterday(data, history) {
    const lastSleep = data.sleepStages?.last7Days?.[data.sleepStages?.last7Days?.length - 1];

    return {
      sleepScore: data.metrics?.sleepScore || 0,
      hrv: data.hrv?.current || 0,
      deep: lastSleep?.deep || 0,
      rem: lastSleep?.rem || 0,
      efficiency: lastSleep?.efficiency || 0,
      steps: data.today?.steps || data.metrics?.dailyAvgSteps || 0
    };
  },

  /**
   * Summarize this week
   */
  summarizeThisWeek(data) {
    return {
      workouts: data.thisWeek?.workouts || 0,
      workoutGoal: 4, // Could come from goals
      avgSteps: data.metrics?.dailyAvgSteps || 0,
      avgHrv: data.hrv?.avg7Days || 0,
      avgDeepSleep: data.sleepStages?.avgDeep || 0,
      activeDays: data.metrics?.activeDays || 0
    };
  },

  /**
   * Get time-appropriate greeting
   */
  getGreeting() {
    const hour = new Date().getHours();
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    let text;
    if (hour < 12) {
      text = 'Good morning';
    } else if (hour < 17) {
      text = 'Good afternoon';
    } else {
      text = 'Good evening';
    }

    return { text, date };
  },

  /**
   * Helper: Calculate average of a metric from array
   */
  averageMetric(arr, key) {
    const values = arr.map(item => item[key]).filter(v => v != null && v > 0);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  },

  /**
   * Generate Recovery Protocol when recovery indicators are low
   * Triggers when: readiness < 70 OR HRV < 85% baseline OR sleep score < 60
   */
  generateRecoveryProtocol(data, goals) {
    const readinessScore = data.metrics?.readinessScore || 0;
    const sleepScore = data.metrics?.sleepScore || 0;
    const hrv = data.hrv?.current || 0;
    const hrvBaseline = this.getHrvBaseline(goals);
    const hrvPercentage = hrvBaseline > 0 ? (hrv / hrvBaseline) * 100 : 100;
    const stressData = data.stress?.today || {};

    // Check triggers
    const triggers = [];
    if (readinessScore > 0 && readinessScore < 70) {
      triggers.push({ type: 'readiness', label: 'Low Readiness', value: readinessScore, severity: readinessScore < 50 ? 'critical' : 'warning' });
    }
    if (hrvPercentage < 85 && hrv > 0) {
      triggers.push({ type: 'hrv', label: 'Low HRV', value: `${Math.round(hrvPercentage)}%`, severity: hrvPercentage < 70 ? 'critical' : 'warning' });
    }
    if (sleepScore > 0 && sleepScore < 60) {
      triggers.push({ type: 'sleep', label: 'Low Sleep Score', value: sleepScore, severity: sleepScore < 50 ? 'critical' : 'warning' });
    }
    if (stressData.stressMinutes > 300 && stressData.recoveryMinutes < 120) {
      triggers.push({ type: 'stress', label: 'High Stress', value: `${Math.round(stressData.stressMinutes / 60)}h`, severity: 'warning' });
    }

    // No triggers, no protocol needed
    if (triggers.length === 0) {
      return null;
    }

    // Generate recommendations based on what's low
    const recommendations = [];
    const triggerTypes = triggers.map(t => t.type);

    if (triggerTypes.includes('hrv')) {
      recommendations.push({
        icon: 'heart',
        text: 'Avoid intense exercise today - your nervous system needs rest',
        priority: 1
      });
      recommendations.push({
        icon: 'wind',
        text: 'Practice 10+ min of deep breathing or meditation',
        priority: 2
      });
    }

    if (triggerTypes.includes('readiness')) {
      recommendations.push({
        icon: 'moon',
        text: 'Prioritize sleep tonight - aim for 8+ hours in bed',
        priority: 1
      });
      recommendations.push({
        icon: 'coffee',
        text: 'Limit caffeine to morning only',
        priority: 3
      });
    }

    if (triggerTypes.includes('sleep')) {
      recommendations.push({
        icon: 'thermometer',
        text: 'Optimize bedroom: cool (65-68F), dark, no screens after 9pm',
        priority: 2
      });
      recommendations.push({
        icon: 'x-circle',
        text: 'No alcohol or late meals tonight',
        priority: 3
      });
    }

    if (triggerTypes.includes('stress')) {
      recommendations.push({
        icon: 'clock',
        text: 'Schedule 30+ min relaxation time today',
        priority: 2
      });
      recommendations.push({
        icon: 'sun',
        text: 'Take a walk outside if possible',
        priority: 3
      });
    }

    // Sort by priority and take top 4
    recommendations.sort((a, b) => a.priority - b.priority);
    const topRecommendations = recommendations.slice(0, 4);

    // Determine overall severity
    const hasCritical = triggers.some(t => t.severity === 'critical');
    const severity = hasCritical ? 'critical' : 'warning';

    return {
      active: true,
      severity,
      title: hasCritical ? 'Recovery Day Needed' : 'Recovery Focus Recommended',
      subtitle: 'Your body is showing signs of stress or fatigue',
      triggers,
      recommendations: topRecommendations
    };
  },

  /**
   * Calculate optimal bedtime based on sleep patterns
   */
  calculateOptimalBedtime(data, targetWakeTime = '07:00') {
    // Get stored wake time or use default
    const storedWakeTime = typeof localStorage !== 'undefined'
      ? localStorage.getItem('health_dashboard_wake_time') || targetWakeTime
      : targetWakeTime;

    const last30Days = data.sleepStages?.last30Days || [];
    if (last30Days.length < 7) {
      return null; // Not enough data
    }

    // Find nights with best efficiency (top 30%)
    const nightsWithEfficiency = last30Days
      .filter(n => n.efficiency && n.total && n.latency != null)
      .sort((a, b) => b.efficiency - a.efficiency);

    const topNights = nightsWithEfficiency.slice(0, Math.ceil(nightsWithEfficiency.length * 0.3));

    if (topNights.length === 0) {
      return null;
    }

    // Calculate averages from best nights
    const avgSleepDuration = Math.round(topNights.reduce((sum, n) => sum + n.total, 0) / topNights.length);
    const avgLatency = Math.round(topNights.reduce((sum, n) => sum + (n.latency || 0), 0) / topNights.length);
    const avgEfficiency = Math.round(topNights.reduce((sum, n) => sum + n.efficiency, 0) / topNights.length);

    // Parse wake time
    const [wakeHour, wakeMinute] = storedWakeTime.split(':').map(Number);
    const wakeTimeMinutes = wakeHour * 60 + wakeMinute;

    // Calculate bedtime: wake time - target sleep - latency buffer
    // Target sleep = avg duration from best nights (rounded to nearest 30 min)
    const targetSleepMinutes = Math.round(avgSleepDuration / 30) * 30;
    const latencyBuffer = Math.max(15, avgLatency + 10); // Add 10 min buffer

    let bedtimeMinutes = wakeTimeMinutes - targetSleepMinutes - latencyBuffer;
    if (bedtimeMinutes < 0) bedtimeMinutes += 24 * 60;

    // Format bedtime
    const bedtimeHour = Math.floor(bedtimeMinutes / 60);
    const bedtimeMinute = bedtimeMinutes % 60;
    const period = bedtimeHour >= 12 ? 'PM' : 'AM';
    const displayHour = bedtimeHour === 0 ? 12 : bedtimeHour > 12 ? bedtimeHour - 12 : bedtimeHour;
    const bedtimeFormatted = `${displayHour}:${bedtimeMinute.toString().padStart(2, '0')} ${period}`;

    // Wind-down reminder (30 min before bedtime)
    let windDownMinutes = bedtimeMinutes - 30;
    if (windDownMinutes < 0) windDownMinutes += 24 * 60;
    const windDownHour = Math.floor(windDownMinutes / 60);
    const windDownMinute = windDownMinutes % 60;
    const windDownPeriod = windDownHour >= 12 ? 'PM' : 'AM';
    const windDownDisplayHour = windDownHour === 0 ? 12 : windDownHour > 12 ? windDownHour - 12 : windDownHour;
    const windDownFormatted = `${windDownDisplayHour}:${windDownMinute.toString().padStart(2, '0')} ${windDownPeriod}`;

    // Format wake time for display
    const wakePeriod = wakeHour >= 12 ? 'PM' : 'AM';
    const wakeDisplayHour = wakeHour === 0 ? 12 : wakeHour > 12 ? wakeHour - 12 : wakeHour;
    const wakeTimeFormatted = `${wakeDisplayHour}:${wakeMinute.toString().padStart(2, '0')} ${wakePeriod}`;

    // Format target sleep duration
    const targetHours = Math.floor(targetSleepMinutes / 60);
    const targetMins = targetSleepMinutes % 60;
    const targetSleepFormatted = targetMins > 0
      ? `${targetHours}h ${targetMins}m`
      : `${targetHours} hours`;

    return {
      bedtime: bedtimeFormatted,
      bedtimeMinutes,
      windDown: windDownFormatted,
      windDownMinutes,
      wakeTime: wakeTimeFormatted,
      wakeTimeRaw: storedWakeTime,
      targetSleep: targetSleepFormatted,
      targetSleepMinutes,
      avgLatency,
      avgEfficiency,
      basedOnNights: topNights.length,
      totalNightsAnalyzed: last30Days.length
    };
  },

  /**
   * Save target wake time
   */
  saveTargetWakeTime(time) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('health_dashboard_wake_time', time);
    }
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RecommendationEngine;
}
