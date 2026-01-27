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
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RecommendationEngine;
}
