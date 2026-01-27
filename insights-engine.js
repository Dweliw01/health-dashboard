/**
 * AI Insights Engine - Analyzes health data and generates personalized insights
 * Combines data collection, pattern finding, and caching
 */

const InsightsEngine = {
  STORAGE_KEY: 'health_dashboard_insights',
  MAX_CACHED: 30,

  // Detect if running locally and use local API server
  get API_ENDPOINT() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:3001/api/generate-insight' : '/api/generate-insight';
  },

  // ==================== DATA COLLECTION ====================

  /**
   * Collect all available data for analysis
   */
  collectAllData() {
    return {
      oura: this.getOuraData(),
      checkins: this.getCheckinData(),
      nutrition: this.getNutritionData(),
      goals: this.getGoalsData(),
      context: this.getUserContext()
    };
  },

  /**
   * Get Oura data from localStorage/data.json
   */
  getOuraData() {
    // Get from window.dashboardData if available (loaded from data.json)
    const data = window.dashboardData || {};

    return {
      today: data.today || {},
      metrics: data.metrics || {},
      hrv: data.hrv || {},
      sleepStages: data.sleepStages || {},
      stress: data.stress || {},
      readiness: data.readinessBreakdown || {},
      heartRateTrends: data.heartRateTrends || {},
      last7Days: data.last7Days || {},
      weeklyComparison: data.weeklyComparison || {}
    };
  },

  /**
   * Get check-in data
   */
  getCheckinData() {
    if (typeof CheckinManager !== 'undefined') {
      const streaks = CheckinManager.getStreaks ? CheckinManager.getStreaks() : { current: 0 };
      return {
        today: CheckinManager.getTodayCheckin ? CheckinManager.getTodayCheckin() : null,
        history: CheckinManager.getHistory ? CheckinManager.getHistory(90) : [],
        streak: streaks.current || 0
      };
    }
    return { today: null, history: [], streak: 0 };
  },

  /**
   * Get nutrition data
   */
  getNutritionData() {
    if (typeof NutritionManager !== 'undefined') {
      return {
        today: NutritionManager.getTodaySummary(),
        history: NutritionManager.getHistory(90),
        goals: NutritionManager.getGoals()
      };
    }
    return { today: null, history: [], goals: {} };
  },

  /**
   * Get goals data
   */
  getGoalsData() {
    if (typeof GoalsManager !== 'undefined') {
      return {
        current: GoalsManager.getGoalsByCategory ? GoalsManager.getGoalsByCategory() : {},
        todayProgress: GoalsManager.getAllProgress ? GoalsManager.getAllProgress({}) : {}
      };
    }
    return { current: {}, todayProgress: {} };
  },

  /**
   * Get user context
   */
  getUserContext() {
    const data = window.dashboardData || {};
    return {
      daysTracked: data.metrics?.daysTracked || 0,
      currentStreak: data.metrics?.currentStreak || 0,
      longestStreak: data.metrics?.longestStreak || 0,
      fitnessScore: data.metrics?.fitnessScore || 0
    };
  },

  /**
   * Prepare data summary for AI prompts
   */
  prepareDataSummary(data) {
    const oura = data.oura;
    const nutrition = data.nutrition;
    const checkins = data.checkins;

    return {
      today: {
        steps: oura.today?.steps || 0,
        calories: oura.today?.calories || 0,
        avgHeartRate: oura.today?.avgHeartRate || 0,
        readinessScore: oura.readiness?.overall || 0,
        hrvCurrent: oura.hrv?.current || 0,
        hrvBaseline: oura.hrv?.baseline || 0,
        sleepTotal: oura.sleepStages?.lastNight?.total || 0,
        deepSleep: oura.sleepStages?.lastNight?.deep || 0,
        remSleep: oura.sleepStages?.lastNight?.rem || 0,
        sleepEfficiency: oura.sleepStages?.lastNight?.efficiency || 0,
        stressMinutes: oura.stress?.today?.stressMinutes || 0,
        recoveryMinutes: oura.stress?.today?.recoveryMinutes || 0,
        water: nutrition.today?.water?.current || 0,
        protein: nutrition.today?.protein?.rating || null,
        foodQuality: nutrition.today?.foodQuality || null,
        mood: checkins.today?.mood || null,
        energy: checkins.today?.energy || null
      },
      metrics: oura.metrics || {},
      hrv: {
        current: oura.hrv?.current || 0,
        baseline: oura.hrv?.baseline || 0,
        avg7Days: oura.hrv?.avg7Days || 0,
        avg30Days: oura.hrv?.avg30Days || 0,
        status: oura.hrv?.status || 'unknown',
        trend: oura.hrv?.trend7Days || []
      },
      sleep: {
        avgDeep: oura.sleepStages?.avgDeep || 0,
        avgRem: oura.sleepStages?.avgRem || 0,
        avgEfficiency: oura.sleepStages?.avgEfficiency || 0,
        avgTotal: oura.sleepStages?.avgTotal || 0,
        avgBreathRate: oura.sleepStages?.avgBreathRate || 0
      },
      stress: {
        dayScore: oura.stress?.dayScore || 0,
        recoveryRatio: oura.stress?.recoveryRatio || 0,
        avg7Days: oura.stress?.avg7Days || {}
      },
      readiness: oura.readiness || {},
      context: data.context,
      goals: data.goals?.current || {}
    };
  },

  // ==================== PATTERN FINDING ====================

  /**
   * Find correlations in the data
   */
  findCorrelations(data) {
    const correlations = [];
    const oura = data.oura;
    const nutrition = data.nutrition;

    // HRV vs Baseline comparison
    if (oura.hrv?.current && oura.hrv?.baseline) {
      const diff = oura.hrv.current - oura.hrv.baseline;
      const percentDiff = Math.round((diff / oura.hrv.baseline) * 100);

      if (Math.abs(percentDiff) >= 10) {
        correlations.push({
          type: 'hrv_baseline',
          factor1: 'Current HRV',
          factor2: 'Your Baseline',
          current: oura.hrv.current,
          baseline: oura.hrv.baseline,
          diff: diff,
          percentDiff: percentDiff,
          interpretation: diff > 0
            ? `Your HRV is ${percentDiff}% above your baseline - excellent recovery`
            : `Your HRV is ${Math.abs(percentDiff)}% below baseline - recovery may be compromised`,
          priority: Math.abs(percentDiff) >= 20 ? 'high' : 'medium'
        });
      }
    }

    // Sleep efficiency vs readiness
    if (oura.sleepStages?.lastNight?.efficiency && oura.readiness?.overall) {
      const efficiency = oura.sleepStages.lastNight.efficiency;
      const readiness = oura.readiness.overall;

      if (efficiency >= 85 && readiness >= 75) {
        correlations.push({
          type: 'sleep_readiness',
          factor1: 'Sleep Efficiency',
          factor2: 'Readiness',
          values: { efficiency, readiness },
          interpretation: `High sleep efficiency (${efficiency}%) is contributing to your good readiness (${readiness})`,
          priority: 'medium'
        });
      } else if (efficiency < 80 && readiness < 70) {
        correlations.push({
          type: 'sleep_readiness',
          factor1: 'Sleep Efficiency',
          factor2: 'Readiness',
          values: { efficiency, readiness },
          interpretation: `Low sleep efficiency (${efficiency}%) may be impacting your readiness (${readiness})`,
          recommendation: 'Focus on sleep quality tonight',
          priority: 'high'
        });
      }
    }

    // Deep sleep analysis
    if (oura.sleepStages?.lastNight?.deep && oura.sleepStages?.avgDeep) {
      const lastNight = oura.sleepStages.lastNight.deep;
      const avg = oura.sleepStages.avgDeep;
      const diff = lastNight - avg;

      if (Math.abs(diff) >= 15) {
        correlations.push({
          type: 'deep_sleep',
          factor1: 'Last Night Deep Sleep',
          factor2: '7-Day Average',
          lastNight: lastNight,
          average: avg,
          diff: diff,
          interpretation: diff > 0
            ? `Deep sleep (${lastNight} min) was ${diff} min above your average - great recovery night`
            : `Deep sleep (${lastNight} min) was ${Math.abs(diff)} min below average - may impact recovery`,
          priority: diff < -15 ? 'high' : 'low'
        });
      }
    }

    // Stress vs recovery balance
    if (oura.stress?.today) {
      const stressMin = oura.stress.today.stressMinutes;
      const recoveryMin = oura.stress.today.recoveryMinutes;
      const ratio = recoveryMin / (stressMin + 1);

      if (ratio < 2 && stressMin > 120) {
        correlations.push({
          type: 'stress_recovery',
          factor1: 'Stress Minutes',
          factor2: 'Recovery Minutes',
          stress: stressMin,
          recovery: recoveryMin,
          ratio: Math.round(ratio * 10) / 10,
          interpretation: `High stress (${Math.round(stressMin/60)}h) with limited recovery time`,
          recommendation: 'Prioritize relaxation activities today',
          priority: 'high'
        });
      }
    }

    // Steps vs activity goals
    const steps = oura.today?.steps || 0;
    const stepsGoal = data.goals?.current?.steps || 10000;
    const stepsPercent = Math.round((steps / stepsGoal) * 100);

    if (stepsPercent < 50) {
      correlations.push({
        type: 'activity_low',
        factor1: 'Current Steps',
        factor2: 'Daily Goal',
        current: steps,
        goal: stepsGoal,
        percent: stepsPercent,
        interpretation: `Only ${stepsPercent}% of step goal reached`,
        recommendation: 'Add movement to hit your target',
        priority: 'medium'
      });
    }

    // Water intake correlation
    const waterCurrent = nutrition.today?.water?.current || 0;
    const waterGoal = nutrition.goals?.waterGlasses || 8;
    const waterPercent = Math.round((waterCurrent / waterGoal) * 100);

    if (waterPercent < 50 && new Date().getHours() > 14) {
      correlations.push({
        type: 'hydration_low',
        factor1: 'Water Intake',
        factor2: 'Daily Goal',
        current: waterCurrent,
        goal: waterGoal,
        percent: waterPercent,
        interpretation: `Hydration at ${waterPercent}% with afternoon already here`,
        recommendation: 'Increase water intake - hydration affects HRV and recovery',
        priority: 'medium'
      });
    }

    return correlations.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] || 2) - (order[b.priority] || 2);
    });
  },

  /**
   * Find day-of-week patterns
   */
  findDayOfWeekPatterns(data) {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    const todayName = weekdays[today];

    // Use weekly comparison data if available
    const comparison = data.oura.weeklyComparison || {};

    return {
      todayName,
      patterns: []
    };
  },

  /**
   * Detect anomalies in recent data
   */
  detectAnomalies(data) {
    const anomalies = [];
    const oura = data.oura;

    // High HR spike detection
    if (oura.heartRateTrends?.max) {
      const maxHR = Math.max(...oura.heartRateTrends.max);
      if (maxHR > 150) {
        anomalies.push({
          type: 'hr_spike',
          value: maxHR,
          message: `High HR spike detected: ${maxHR} bpm`,
          severity: maxHR > 170 ? 'high' : 'medium'
        });
      }
    }

    // Low HRV warning
    if (oura.hrv?.current && oura.hrv?.baseline) {
      if (oura.hrv.current < oura.hrv.baseline * 0.7) {
        anomalies.push({
          type: 'hrv_low',
          value: oura.hrv.current,
          baseline: oura.hrv.baseline,
          message: `HRV significantly below baseline`,
          severity: 'high'
        });
      }
    }

    // Poor sleep efficiency
    if (oura.sleepStages?.lastNight?.efficiency < 75) {
      anomalies.push({
        type: 'sleep_poor',
        value: oura.sleepStages.lastNight.efficiency,
        message: `Sleep efficiency was only ${oura.sleepStages.lastNight.efficiency}%`,
        severity: 'medium'
      });
    }

    return anomalies;
  },

  // ==================== INSIGHT CACHING ====================

  /**
   * Get cached insights
   */
  getCachedInsights() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      return [];
    }
  },

  /**
   * Cache an insight
   */
  cacheInsight(insight) {
    const cached = this.getCachedInsights();
    cached.unshift({
      ...insight,
      cachedAt: new Date().toISOString()
    });

    const trimmed = cached.slice(0, this.MAX_CACHED);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
  },

  /**
   * Get today's cached insight
   */
  getTodaysInsight() {
    const cached = this.getCachedInsights();
    const today = new Date().toISOString().split('T')[0];
    return cached.find(c => c.cachedAt && c.cachedAt.startsWith(today));
  },

  /**
   * Check if similar insight was recently generated
   */
  hasRecentSimilar(insight, days = 3) {
    const cached = this.getCachedInsights();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return cached.some(c =>
      new Date(c.cachedAt) > cutoff &&
      c.category === insight.category
    );
  },

  // ==================== AI GENERATION ====================

  /**
   * Generate daily insight via API
   */
  async generateDailyInsight(forceRefresh = false) {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.getTodaysInsight();
      if (cached) {
        return cached;
      }
    }

    const data = this.collectAllData();
    const summary = this.prepareDataSummary(data);
    const correlations = this.findCorrelations(data);
    const anomalies = this.detectAnomalies(data);

    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'daily',
          data: {
            summary,
            correlations,
            anomalies
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const insight = await response.json();

      // Cache the insight
      this.cacheInsight(insight);

      return insight;
    } catch (error) {
      console.error('Failed to generate insight:', error);
      // Return a fallback insight based on local analysis
      return this.generateLocalInsight(summary, correlations, anomalies);
    }
  },

  /**
   * Generate local insight without API (fallback)
   */
  generateLocalInsight(summary, correlations, anomalies) {
    // Find the most important correlation or anomaly
    if (anomalies.length > 0 && anomalies[0].severity === 'high') {
      const anomaly = anomalies[0];
      return {
        insight: anomaly.message,
        action: 'Focus on recovery today',
        dataPoint: `${anomaly.type}: ${anomaly.value}`,
        category: 'recovery',
        isLocal: true
      };
    }

    if (correlations.length > 0) {
      const corr = correlations[0];
      return {
        insight: corr.interpretation,
        action: corr.recommendation || 'Keep monitoring your data',
        dataPoint: `${corr.factor1} vs ${corr.factor2}`,
        category: corr.type.includes('sleep') ? 'sleep' :
                  corr.type.includes('hrv') ? 'recovery' :
                  corr.type.includes('stress') ? 'recovery' : 'activity',
        isLocal: true
      };
    }

    // Default insight
    return {
      insight: `Your readiness is ${summary.today.readinessScore}. ${summary.today.readinessScore >= 75 ? 'Good day for challenging activities.' : 'Consider taking it easy today.'}`,
      action: summary.today.readinessScore >= 75 ? 'Push your workout today' : 'Prioritize recovery',
      dataPoint: `Readiness: ${summary.today.readinessScore}`,
      category: 'recovery',
      isLocal: true
    };
  },

  /**
   * Generate weekly analysis
   */
  async generateWeeklyAnalysis() {
    const data = this.collectAllData();
    const summary = this.prepareDataSummary(data);

    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'weekly',
          data: { summary }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to generate weekly analysis:', error);
      return this.generateLocalWeeklyAnalysis(summary);
    }
  },

  /**
   * Local weekly analysis fallback
   */
  generateLocalWeeklyAnalysis(summary) {
    const wins = [];
    const issues = [];

    if (summary.metrics.activeDays >= 5) {
      wins.push(`Active ${summary.metrics.activeDays} days this week`);
    }
    if (summary.hrv.current >= summary.hrv.baseline) {
      wins.push('HRV at or above baseline');
    }
    if (summary.sleep.avgEfficiency >= 85) {
      wins.push(`Sleep efficiency averaging ${summary.sleep.avgEfficiency}%`);
    }

    if (summary.metrics.activeDays < 3) {
      issues.push('Activity level below target');
    }
    if (summary.hrv.current < summary.hrv.baseline * 0.85) {
      issues.push('HRV trending below baseline');
    }

    return {
      wins: wins.length > 0 ? wins : ['Keep tracking your data'],
      needsAttention: issues.length > 0 ? issues[0] : 'Maintain current habits',
      overallScore: wins.length >= 2 ? 'B+' : wins.length >= 1 ? 'B' : 'B-',
      nextWeekGoals: ['Maintain consistency', 'Focus on sleep quality'],
      isLocal: true
    };
  },

  /**
   * Answer a user question
   */
  async askQuestion(question) {
    const data = this.collectAllData();
    const summary = this.prepareDataSummary(data);

    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'question',
          data: {
            question,
            summary
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to answer question:', error);
      return {
        text: 'Unable to analyze your data at the moment. Please check your API configuration or try again later.',
        isError: true
      };
    }
  },

  /**
   * Generate tomorrow prediction
   */
  async generatePrediction() {
    const data = this.collectAllData();
    const summary = this.prepareDataSummary(data);
    const correlations = this.findCorrelations(data);

    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'predict',
          data: {
            summary,
            correlations
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to generate prediction:', error);
      return this.generateLocalPrediction(summary);
    }
  },

  /**
   * Local prediction fallback
   */
  generateLocalPrediction(summary) {
    const readiness = summary.today.readinessScore || 70;
    const hrv = summary.hrv.current || 40;
    const hrvBaseline = summary.hrv.baseline || 45;
    const sleepEff = summary.sleep.avgEfficiency || 80;

    // Simple prediction based on current metrics
    let predictedReadiness = readiness;
    let confidence = 'medium';
    let recommendation = 'Moderate activity recommended';
    let warning = null;

    if (hrv < hrvBaseline * 0.8) {
      predictedReadiness -= 10;
      warning = 'Low HRV suggests recovery may be needed';
      recommendation = 'Light activity only';
    } else if (hrv > hrvBaseline * 1.1) {
      predictedReadiness += 5;
      recommendation = 'Good day for challenging workouts';
    }

    if (sleepEff < 80) {
      predictedReadiness -= 5;
      if (!warning) warning = 'Sleep quality may impact tomorrow';
    }

    return {
      predictedReadiness: Math.max(40, Math.min(100, predictedReadiness)),
      confidence,
      recommendation,
      warning,
      tip: 'Get to bed on time tonight for optimal recovery',
      isLocal: true
    };
  },

  // ==================== UTILITY ====================

  /**
   * Get insight icon based on category
   */
  getInsightIcon(category) {
    const icons = {
      sleep: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
      activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
      recovery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
      nutrition: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
      consistency: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'
    };
    return icons[category] || icons.activity;
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InsightsEngine;
}
