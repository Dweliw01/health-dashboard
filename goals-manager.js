/**
 * Goals Manager - Data layer for health dashboard goals system
 * Handles goal persistence, progress tracking, and streak calculations
 */

const GoalsManager = {
  STORAGE_KEY: 'health_dashboard_goals',
  HISTORY_KEY: 'health_dashboard_goal_history',
  BASELINES_KEY: 'health_dashboard_baselines',

  // Default goals configuration
  defaultGoals: {
    // Activity Goals
    dailySteps: {
      target: 10000,
      enabled: true,
      category: 'activity',
      label: 'Daily Steps',
      unit: 'steps',
      description: 'Target daily step count'
    },
    weeklyWorkouts: {
      target: 4,
      enabled: true,
      category: 'activity',
      label: 'Weekly Workouts',
      unit: 'per week',
      description: 'Number of workouts per week'
    },
    activeDays: {
      target: 5,
      enabled: true,
      category: 'activity',
      label: 'Active Days',
      unit: 'days/week',
      description: 'Days with 5000+ steps'
    },

    // Recovery Goals
    readinessScore: {
      target: 70,
      enabled: true,
      category: 'recovery',
      label: 'Readiness Score',
      unit: 'minimum',
      description: 'Maintain readiness above this level'
    },
    hrvBaseline: {
      target: 40,
      enabled: true,
      category: 'recovery',
      label: 'HRV Baseline',
      unit: 'ms minimum',
      description: 'Heart rate variability threshold',
      autoBaseline: true
    },

    // Sleep Goals
    sleepScore: {
      target: 75,
      enabled: true,
      category: 'sleep',
      label: 'Sleep Score',
      unit: 'minimum',
      description: 'Target sleep quality score'
    },
    deepSleepMinutes: {
      target: 90,
      enabled: true,
      category: 'sleep',
      label: 'Deep Sleep',
      unit: 'minutes',
      description: 'Target deep sleep duration'
    },
    sleepEfficiency: {
      target: 85,
      enabled: true,
      category: 'sleep',
      label: 'Sleep Efficiency',
      unit: '%',
      description: 'Time asleep vs time in bed'
    },
    remSleepMinutes: {
      target: 90,
      enabled: false,
      category: 'sleep',
      label: 'REM Sleep',
      unit: 'minutes',
      description: 'Target REM sleep duration'
    },

    // Stress Goals
    maxStressMinutes: {
      target: 240,
      enabled: false,
      category: 'stress',
      label: 'Max Stress Time',
      unit: 'minutes/day',
      description: 'Maximum time in high stress',
      inverted: true
    },
    minRecoveryMinutes: {
      target: 180,
      enabled: false,
      category: 'stress',
      label: 'Min Recovery Time',
      unit: 'minutes/day',
      description: 'Minimum recovery time'
    }
  },

  // Category configuration (no emojis)
  categories: {
    activity: {
      label: 'Activity',
      color: '#6366f1',
      icon: 'activity'
    },
    recovery: {
      label: 'Recovery',
      color: '#10b981',
      icon: 'heart'
    },
    sleep: {
      label: 'Sleep',
      color: '#8b5cf6',
      icon: 'moon'
    },
    stress: {
      label: 'Stress',
      color: '#f59e0b',
      icon: 'zap'
    }
  },

  /**
   * Load goals from localStorage
   */
  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new goals added in updates
        const mergedGoals = { ...this.defaultGoals };
        Object.keys(parsed.goals || {}).forEach(key => {
          if (mergedGoals[key]) {
            mergedGoals[key] = { ...mergedGoals[key], ...parsed.goals[key] };
          }
        });
        return {
          goals: mergedGoals,
          updatedAt: parsed.updatedAt
        };
      }
    } catch (err) {
      console.warn('Failed to load goals:', err);
    }
    return { goals: { ...this.defaultGoals } };
  },

  /**
   * Save goals to localStorage
   */
  save(goals) {
    try {
      const data = {
        version: 2,
        goals,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('Failed to save goals:', err);
      return false;
    }
  },

  /**
   * Get a single goal
   */
  getGoal(metric) {
    const { goals } = this.load();
    return goals[metric] || null;
  },

  /**
   * Update a single goal
   */
  updateGoal(metric, updates) {
    const { goals } = this.load();
    if (goals[metric]) {
      goals[metric] = { ...goals[metric], ...updates };
      this.save(goals);
      return true;
    }
    return false;
  },

  /**
   * Calculate progress for a metric
   */
  getProgress(metric, currentValue) {
    const { goals } = this.load();
    const goal = goals[metric];

    if (!goal || !goal.enabled || currentValue == null) {
      return null;
    }

    const isInverted = goal.inverted || false;
    let percentage, achieved;

    if (isInverted) {
      // For inverted goals (like stress), lower is better
      percentage = goal.target > 0
        ? Math.round(((goal.target - currentValue) / goal.target) * 100 + 100)
        : 100;
      achieved = currentValue <= goal.target;
    } else {
      percentage = goal.target > 0
        ? Math.round((currentValue / goal.target) * 100)
        : 0;
      achieved = currentValue >= goal.target;
    }

    return {
      metric,
      current: currentValue,
      target: goal.target,
      percentage: Math.max(0, percentage),
      achieved,
      category: goal.category,
      inverted: isInverted,
      label: goal.label,
      unit: goal.unit
    };
  },

  /**
   * Get all progress for dashboard display
   */
  getAllProgress(currentData) {
    const { goals } = this.load();
    const progress = {};

    Object.keys(goals).forEach(metric => {
      if (goals[metric].enabled && currentData[metric] != null) {
        progress[metric] = this.getProgress(metric, currentData[metric]);
      }
    });

    return progress;
  },

  /**
   * Get goals grouped by category
   */
  getGoalsByCategory() {
    const { goals } = this.load();
    const byCategory = {};

    Object.entries(goals).forEach(([key, goal]) => {
      const cat = goal.category || 'other';
      if (!byCategory[cat]) {
        byCategory[cat] = {
          ...this.categories[cat],
          goals: []
        };
      }
      byCategory[cat].goals.push({ key, ...goal });
    });

    return byCategory;
  },

  /**
   * Get enabled goals count
   */
  getEnabledCount() {
    const { goals } = this.load();
    return Object.values(goals).filter(g => g.enabled).length;
  },

  /**
   * Calculate daily achievement summary
   */
  calculateDailySummary(currentData) {
    const { goals } = this.load();
    const summary = {
      achieved: 0,
      total: 0,
      byCategory: {},
      details: []
    };

    Object.entries(goals).forEach(([metric, goal]) => {
      if (!goal.enabled) return;

      const value = currentData[metric];
      if (value == null) return;

      const progress = this.getProgress(metric, value);
      if (!progress) return;

      summary.total++;
      if (progress.achieved) {
        summary.achieved++;
      }

      // Category summary
      if (!summary.byCategory[goal.category]) {
        summary.byCategory[goal.category] = { achieved: 0, total: 0 };
      }
      summary.byCategory[goal.category].total++;
      if (progress.achieved) {
        summary.byCategory[goal.category].achieved++;
      }

      summary.details.push(progress);
    });

    summary.percentage = summary.total > 0
      ? Math.round((summary.achieved / summary.total) * 100)
      : 0;

    return summary;
  },

  // --- History & Streaks ---

  /**
   * Load goal history
   */
  loadHistory() {
    try {
      const stored = localStorage.getItem(this.HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.warn('Failed to load history:', err);
      return [];
    }
  },

  /**
   * Record daily achievement
   */
  recordDailyAchievement(date, achievements) {
    const history = this.loadHistory();

    // Check if we already have an entry for this date
    const existingIndex = history.findIndex(h => h.date === date);

    const entry = {
      date,
      achievements,
      timestamp: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      history[existingIndex] = entry;
    } else {
      history.push(entry);
    }

    // Keep only last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const filtered = history.filter(h => new Date(h.date) >= cutoff);

    try {
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Failed to save history:', err);
    }

    this.updateStreaks();
  },

  /**
   * Calculate streak for a metric
   */
  calculateStreak(metric) {
    const history = this.loadHistory();
    if (history.length === 0) return { current: 0, longest: 0 };

    // Sort by date descending
    const sorted = [...history].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    let current = 0;
    let longest = 0;
    let tempStreak = 0;

    // Calculate current streak (from most recent)
    for (const entry of sorted) {
      if (entry.achievements[metric]?.achieved) {
        current++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    const chronological = [...history].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    for (const entry of chronological) {
      if (entry.achievements[metric]?.achieved) {
        tempStreak++;
        longest = Math.max(longest, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    return { current, longest };
  },

  /**
   * Get all streaks
   */
  getAllStreaks() {
    const { goals } = this.load();
    const streaks = {};

    Object.keys(goals).forEach(metric => {
      if (goals[metric].enabled) {
        streaks[metric] = this.calculateStreak(metric);
      }
    });

    return streaks;
  },

  /**
   * Update streaks cache
   */
  updateStreaks() {
    const streaks = this.getAllStreaks();
    try {
      localStorage.setItem(
        this.STORAGE_KEY + '_streaks',
        JSON.stringify({ streaks, updatedAt: new Date().toISOString() })
      );
    } catch (err) {
      console.warn('Failed to cache streaks:', err);
    }
    return streaks;
  },

  // --- Baselines ---

  /**
   * Calculate HRV baseline from data
   */
  calculateHrvBaseline(hrvData) {
    if (!hrvData || hrvData.length < 7) {
      return 40; // Default if insufficient data
    }
    const validValues = hrvData.filter(v => v != null && v > 0);
    if (validValues.length === 0) return 40;

    const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    // Set baseline at 90% of average (allows for normal variation)
    return Math.round(avg * 0.9);
  },

  /**
   * Update auto-calculated baselines
   */
  updateBaselines(data) {
    const { goals } = this.load();

    // Auto-update HRV baseline if enabled
    if (goals.hrvBaseline?.autoBaseline && data.hrv?.trend30Days) {
      const newBaseline = this.calculateHrvBaseline(data.hrv.trend30Days);
      if (newBaseline !== goals.hrvBaseline.target) {
        goals.hrvBaseline.target = newBaseline;
        this.save(goals);
      }
    }

    // Store baselines
    try {
      localStorage.setItem(this.BASELINES_KEY, JSON.stringify({
        hrv30DayAvg: data.hrv?.avg30Days || null,
        hrvBaseline: goals.hrvBaseline?.target || 40,
        updatedAt: new Date().toISOString()
      }));
    } catch (err) {
      console.warn('Failed to save baselines:', err);
    }
  },

  /**
   * Reset to default goals
   */
  resetToDefaults() {
    this.save({ ...this.defaultGoals });
    return this.load();
  },

  /**
   * Export goals and history
   */
  export() {
    return {
      goals: this.load(),
      history: this.loadHistory(),
      exportedAt: new Date().toISOString()
    };
  },

  /**
   * Import goals and history
   */
  import(data) {
    try {
      if (data.goals) {
        this.save(data.goals.goals || data.goals);
      }
      if (data.history) {
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(data.history));
      }
      return true;
    } catch (err) {
      console.error('Failed to import:', err);
      return false;
    }
  },

  /**
   * Generate AI-powered goal suggestions based on current performance
   * Returns up to 3 suggestions
   */
  generateSuggestions(data) {
    const { goals } = this.load();
    const suggestions = [];
    const oura = data || {};

    // Get current averages from data
    const avgDeep = oura.sleepStages?.avgDeep || 0;
    const avgRem = oura.sleepStages?.avgRem || 0;
    const avgEfficiency = oura.sleepStages?.avgEfficiency || 0;
    const avgSteps = oura.metrics?.dailyAvgSteps || 0;
    const avgHrv = oura.hrv?.avg30Days || 0;

    // Check each goal for suggestion opportunities
    Object.entries(goals).forEach(([metric, goal]) => {
      if (!goal) return;

      // Suggestion type 1: If avg << target, suggest more realistic goal
      if (goal.enabled && goal.target) {
        let currentAvg = null;
        let unit = goal.unit || '';

        switch (metric) {
          case 'deepSleepMinutes':
            currentAvg = avgDeep;
            break;
          case 'remSleepMinutes':
            currentAvg = avgRem;
            break;
          case 'sleepEfficiency':
            currentAvg = avgEfficiency;
            break;
          case 'dailySteps':
            currentAvg = avgSteps;
            break;
          case 'hrvBaseline':
            currentAvg = avgHrv;
            break;
        }

        if (currentAvg && currentAvg > 0) {
          const percentOfTarget = (currentAvg / goal.target) * 100;

          // If performing at < 80% of target, suggest 15% above current
          if (percentOfTarget < 80 && percentOfTarget > 30) {
            const suggestedTarget = Math.round(currentAvg * 1.15);

            // Only suggest if meaningfully different from current target
            if (suggestedTarget < goal.target * 0.9) {
              suggestions.push({
                metric,
                action: 'update',
                text: `Your ${goal.label.toLowerCase()} averages ${Math.round(currentAvg)}${unit === 'minutes' ? ' min' : unit === '%' ? '%' : ''}. Try targeting ${suggestedTarget}${unit === 'minutes' ? ' min' : unit === '%' ? '%' : ''} first.`,
                currentTarget: goal.target,
                newTarget: suggestedTarget,
                priority: percentOfTarget < 60 ? 1 : 2
              });
            }
          }

          // If exceeding target, suggest stretch goal (10% increase)
          if (percentOfTarget >= 100 && !goal.inverted) {
            const stretchTarget = Math.round(goal.target * 1.1);
            suggestions.push({
              metric,
              action: 'update',
              text: `You're consistently hitting your ${goal.label.toLowerCase()} goal. Consider raising it to ${stretchTarget}${unit === 'minutes' ? ' min' : unit === '%' ? '%' : ''}.`,
              currentTarget: goal.target,
              newTarget: stretchTarget,
              priority: 3
            });
          }
        }
      }

      // Suggestion type 2: Enable disabled goals when data is available
      if (!goal.enabled && goal.target) {
        let hasData = false;
        let avgValue = null;

        switch (metric) {
          case 'remSleepMinutes':
            hasData = avgRem > 0;
            avgValue = avgRem;
            break;
          case 'maxStressMinutes':
            hasData = oura.stress?.available;
            break;
          case 'minRecoveryMinutes':
            hasData = oura.stress?.available;
            break;
        }

        if (hasData) {
          const avgText = avgValue ? ` (avg ${Math.round(avgValue)} min)` : '';
          suggestions.push({
            metric,
            action: 'enable',
            text: `You have ${goal.label} data available${avgText}. Enable this goal?`,
            priority: 2
          });
        }
      }
    });

    // Sort by priority and return top 3
    return suggestions
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoalsManager;
}
