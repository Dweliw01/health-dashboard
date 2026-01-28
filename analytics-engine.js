/**
 * Analytics Engine - Long-term trends and analytics calculations
 * Handles rolling averages, aggregations, trends, PRs, and milestones
 */

const AnalyticsEngine = {
  // Data granularity by time range
  AGGREGATION_STRATEGY: {
    '7d':   { granularity: 'day',   dataPoints: 7,  label: '7 Days' },
    '30d':  { granularity: 'day',   dataPoints: 30, label: '30 Days' },
    '90d':  { granularity: 'week',  dataPoints: 13, label: '90 Days' },
    '180d': { granularity: 'week',  dataPoints: 26, label: '6 Months' },
    '1y':   { granularity: 'month', dataPoints: 12, label: '1 Year' },
    'all':  { granularity: 'month', dataPoints: null, label: 'All Time' }
  },

  // Milestone definitions
  MILESTONES: {
    steps: [100000, 500000, 1000000, 2500000, 5000000, 10000000],
    workouts: [10, 25, 50, 100, 250, 500, 1000],
    streak: [7, 14, 30, 60, 90, 180, 365]
  },

  /**
   * Calculate rolling average
   */
  rollingAverage(data, windowSize) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = data.slice(start, i + 1).filter(v => v != null);
      if (window.length > 0) {
        const avg = window.reduce((a, b) => a + b, 0) / window.length;
        result.push(Math.round(avg * 10) / 10);
      } else {
        result.push(null);
      }
    }
    return result;
  },

  /**
   * Get week start date (Monday) - uses local time
   */
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  /**
   * Aggregate daily data to weekly
   */
  aggregateToWeekly(dailyData, valueKey = 'value') {
    const weeks = {};

    dailyData.forEach(entry => {
      const weekStart = this.getWeekStart(new Date(entry.date));
      if (!weeks[weekStart]) {
        weeks[weekStart] = { values: [], dates: [] };
      }
      const val = typeof entry === 'object' ? entry[valueKey] : entry;
      if (val != null) {
        weeks[weekStart].values.push(val);
        weeks[weekStart].dates.push(entry.date);
      }
    });

    return Object.entries(weeks)
      .map(([weekStart, data]) => ({
        date: weekStart,
        value: data.values.length > 0
          ? Math.round(data.values.reduce((a, b) => a + b, 0) / data.values.length)
          : null,
        total: data.values.reduce((a, b) => a + b, 0),
        count: data.values.length
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  /**
   * Aggregate to monthly
   */
  aggregateToMonthly(dailyData, valueKey = 'value') {
    const months = {};

    dailyData.forEach(entry => {
      const monthKey = entry.date.slice(0, 7); // YYYY-MM
      if (!months[monthKey]) {
        months[monthKey] = { values: [], dates: [] };
      }
      const val = typeof entry === 'object' ? entry[valueKey] : entry;
      if (val != null) {
        months[monthKey].values.push(val);
      }
    });

    return Object.entries(months)
      .map(([month, data]) => ({
        date: month,
        label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        value: data.values.length > 0
          ? Math.round(data.values.reduce((a, b) => a + b, 0) / data.values.length)
          : null,
        total: data.values.reduce((a, b) => a + b, 0),
        count: data.values.length
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  /**
   * Compare two periods
   */
  comparePeriods(currentData, previousData, metrics) {
    const comparison = {};

    metrics.forEach(metric => {
      const currentValues = currentData.map(d => d[metric]).filter(v => v != null);
      const previousValues = previousData.map(d => d[metric]).filter(v => v != null);

      const current = currentValues.length > 0
        ? currentValues.reduce((a, b) => a + b, 0) / currentValues.length
        : 0;
      const previous = previousValues.length > 0
        ? previousValues.reduce((a, b) => a + b, 0) / previousValues.length
        : 0;

      const delta = current - previous;
      const percentChange = previous > 0 ? ((delta / previous) * 100) : 0;

      comparison[metric] = {
        current: Math.round(current * 10) / 10,
        previous: Math.round(previous * 10) / 10,
        delta: Math.round(delta * 10) / 10,
        percentChange: Math.round(percentChange),
        improved: this.isImprovement(metric, delta)
      };
    });

    return comparison;
  },

  /**
   * Determine if change is improvement (depends on metric)
   */
  isImprovement(metric, delta) {
    const lowerIsBetter = ['restingHR', 'stressMinutes', 'sleepLatency'];
    if (lowerIsBetter.includes(metric)) return delta < 0;
    return delta > 0;
  },

  /**
   * Calculate trend direction
   */
  calculateTrend(data, windowSize = 7) {
    const values = data.filter(v => v != null);
    if (values.length < windowSize * 2) return { direction: 'insufficient', change: 0 };

    const recentAvg = this.average(values.slice(-windowSize));
    const previousAvg = this.average(values.slice(-windowSize * 2, -windowSize));

    if (previousAvg === 0) return { direction: 'stable', change: 0 };

    const percentChange = ((recentAvg - previousAvg) / previousAvg) * 100;

    let direction;
    if (percentChange > 5) direction = 'improving';
    else if (percentChange < -5) direction = 'declining';
    else direction = 'stable';

    return {
      direction,
      change: Math.round(percentChange),
      recentAvg: Math.round(recentAvg * 10) / 10,
      previousAvg: Math.round(previousAvg * 10) / 10
    };
  },

  /**
   * Calculate average of array
   */
  average(arr) {
    const valid = arr.filter(v => v != null && !isNaN(v));
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  },

  /**
   * Find personal records from data
   */
  findPersonalRecords(data) {
    if (!data || data.length === 0) {
      return this.getEmptyPRs();
    }

    const findMax = (arr, key, filter = () => true) => {
      const filtered = arr.filter(d => d[key] != null && filter(d));
      if (filtered.length === 0) return { value: null, date: null };
      const max = Math.max(...filtered.map(d => d[key]));
      const entry = filtered.find(d => d[key] === max);
      return { value: max, date: entry?.date };
    };

    const findMin = (arr, key, minThreshold = 0) => {
      const filtered = arr.filter(d => d[key] != null && d[key] > minThreshold);
      if (filtered.length === 0) return { value: null, date: null };
      const min = Math.min(...filtered.map(d => d[key]));
      const entry = filtered.find(d => d[key] === min);
      return { value: min, date: entry?.date };
    };

    return {
      // Activity PRs
      maxSteps: {
        ...findMax(data, 'steps'),
        label: 'Most Steps',
        icon: 'footprints',
        unit: 'steps'
      },
      longestStreak: {
        ...this.calculateLongestStreak(data),
        label: 'Longest Streak',
        icon: 'flame',
        unit: 'days'
      },

      // Recovery PRs
      maxHrv: {
        ...findMax(data, 'hrv'),
        label: 'Highest HRV',
        icon: 'heart',
        unit: 'ms'
      },
      maxReadiness: {
        ...findMax(data, 'readinessScore'),
        label: 'Best Readiness',
        icon: 'zap',
        unit: ''
      },

      // Sleep PRs
      maxSleepScore: {
        ...findMax(data, 'sleepScore'),
        label: 'Best Sleep Score',
        icon: 'moon',
        unit: ''
      },
      maxDeepSleep: {
        ...findMax(data, 'deepSleep'),
        label: 'Most Deep Sleep',
        icon: 'moon',
        unit: 'min'
      },
      maxSleepEfficiency: {
        ...findMax(data, 'sleepEfficiency'),
        label: 'Best Sleep Efficiency',
        icon: 'moon',
        unit: '%'
      },

      // Fitness PR (lower is better)
      lowestRestingHR: {
        ...findMin(data, 'restingHR', 30),
        label: 'Lowest Resting HR',
        icon: 'heart',
        unit: 'bpm',
        lowerIsBetter: true
      }
    };
  },

  /**
   * Empty PRs structure
   */
  getEmptyPRs() {
    return {
      maxSteps: { value: null, date: null, label: 'Most Steps', icon: 'footprints', unit: 'steps' },
      longestStreak: { value: 0, days: 0, label: 'Longest Streak', icon: 'flame', unit: 'days' },
      maxHrv: { value: null, date: null, label: 'Highest HRV', icon: 'heart', unit: 'ms' },
      maxReadiness: { value: null, date: null, label: 'Best Readiness', icon: 'zap', unit: '' },
      maxSleepScore: { value: null, date: null, label: 'Best Sleep Score', icon: 'moon', unit: '' },
      maxDeepSleep: { value: null, date: null, label: 'Most Deep Sleep', icon: 'moon', unit: 'min' },
      maxSleepEfficiency: { value: null, date: null, label: 'Best Sleep Efficiency', icon: 'moon', unit: '%' },
      lowestRestingHR: { value: null, date: null, label: 'Lowest Resting HR', icon: 'heart', unit: 'bpm', lowerIsBetter: true }
    };
  },

  /**
   * Calculate longest streak from data
   */
  calculateLongestStreak(data, stepGoal = 5000) {
    if (!data || data.length === 0) return { days: 0, value: 0, startDate: null };

    const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    let longest = 0;
    let current = 0;
    let longestStart = null;
    let currentStart = null;

    for (let i = 0; i < sorted.length; i++) {
      const meetsGoal = (sorted[i].steps || 0) >= stepGoal || sorted[i].workout;

      if (meetsGoal) {
        if (current === 0) currentStart = sorted[i].date;
        current++;
        if (current > longest) {
          longest = current;
          longestStart = currentStart;
        }
      } else {
        current = 0;
      }
    }

    return { days: longest, value: longest, startDate: longestStart };
  },

  /**
   * Calculate milestone progress
   */
  calculateMilestones(totalSteps, totalWorkouts, currentStreak) {
    const getProgress = (value, milestones) => {
      const achieved = milestones.filter(m => value >= m);
      const next = milestones.find(m => value < m);
      const progress = next ? Math.round((value / next) * 100) : 100;
      const remaining = next ? next - value : 0;

      return {
        achieved,
        next,
        progress: Math.min(100, progress),
        remaining,
        current: value
      };
    };

    return {
      steps: getProgress(totalSteps, this.MILESTONES.steps),
      workouts: getProgress(totalWorkouts, this.MILESTONES.workouts),
      streak: getProgress(currentStreak, this.MILESTONES.streak)
    };
  },

  /**
   * Format milestone number
   */
  formatMilestone(value) {
    if (value >= 1000000) return (value / 1000000) + 'M';
    if (value >= 1000) return (value / 1000) + 'K';
    return value.toString();
  },

  /**
   * Generate summary stats for a period
   */
  generatePeriodSummary(data) {
    if (!data || data.length === 0) {
      return {
        avgSteps: 0,
        avgSleepScore: 0,
        avgReadiness: 0,
        avgHrv: 0,
        totalWorkouts: 0,
        totalSteps: 0,
        daysTracked: 0
      };
    }

    const avg = (key) => {
      const values = data.map(d => d[key]).filter(v => v != null);
      return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    };

    const sum = (key) => data.reduce((acc, d) => acc + (d[key] || 0), 0);
    const count = (key) => data.filter(d => d[key]).length;

    return {
      avgSteps: avg('steps'),
      avgSleepScore: avg('sleepScore'),
      avgReadiness: avg('readinessScore'),
      avgHrv: avg('hrv'),
      avgDeepSleep: avg('deepSleep'),
      avgRestingHR: avg('restingHR'),
      totalWorkouts: count('workout'),
      totalSteps: sum('steps'),
      daysTracked: data.length
    };
  },

  /**
   * Get comparison label
   */
  getComparisonLabel(range) {
    const labels = {
      '7d': { current: 'This Week', previous: 'Last Week' },
      '30d': { current: 'This Month', previous: 'Last Month' },
      '90d': { current: 'This Quarter', previous: 'Last Quarter' },
      '180d': { current: 'Last 6 Months', previous: 'Previous 6 Months' },
      '1y': { current: 'This Year', previous: 'Last Year' }
    };
    return labels[range] || { current: 'Current', previous: 'Previous' };
  },

  /**
   * Export data to CSV
   */
  exportToCSV(data, filename = 'health_data.csv') {
    if (!data || data.length === 0) return null;

    // Get all unique keys from data
    const allKeys = new Set();
    data.forEach(entry => {
      Object.keys(entry).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys);

    // Build CSV content
    let csv = headers.join(',') + '\n';

    data.forEach(entry => {
      const row = headers.map(header => {
        const value = entry[header];
        if (value == null) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      });
      csv += row.join(',') + '\n';
    });

    // Trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  },

  /**
   * Generate historical data from current data (for demo)
   */
  generateHistoricalData(currentData, days = 90) {
    const history = [];
    const baseDate = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Generate realistic variations based on current data
      const variance = () => 0.8 + Math.random() * 0.4; // 80-120% of base

      history.push({
        date: dateStr,
        steps: Math.round((currentData.metrics?.dailyAvgSteps || 5000) * variance()),
        sleepScore: Math.round((currentData.metrics?.sleepScore || 70) * variance()),
        readinessScore: Math.round((currentData.metrics?.readinessScore || 70) * variance()),
        hrv: Math.round((currentData.hrv?.current || 45) * variance()),
        deepSleep: Math.round((currentData.sleepStages?.lastNight?.deep || 80) * variance()),
        restingHR: Math.round((currentData.metrics?.restingHR || 50) * variance()),
        sleepEfficiency: Math.round(Math.min(100, (currentData.sleepStages?.lastNight?.efficiency || 85) * variance())),
        workout: Math.random() > 0.6 // ~40% chance of workout
      });
    }

    return history;
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsEngine;
}
