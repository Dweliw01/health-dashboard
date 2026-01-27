# Phase 6: AI Coach & Insights Engine

## Overview

**Objective:** Transform raw data into personalized, actionable insights using AI to connect dots humans can't easily see.

**Problem Statement:** Users have data from Oura, check-ins, nutrition, and goals - but connecting these data points to find meaningful patterns requires analysis most people won't do. The current insights are rule-based and generic.

**Solution:** An AI-powered insights engine that analyzes all available data, finds correlations, generates personalized recommendations, and delivers them in natural language.

---

## What AI Can Do That Rules Can't

| Rule-Based | AI-Powered |
|------------|------------|
| "Your sleep score is below 70" | "Your sleep score drops 15% on days after you eat dinner after 8pm. Try eating earlier tonight." |
| "You haven't worked out in 3 days" | "You tend to skip workouts on Wednesdays. Your calendar shows a free slot at 6pm - perfect for a quick session." |
| "Drink more water" | "On days you hit 8+ glasses of water, your readiness score averages 12 points higher. You're at 4 glasses - keep going." |
| Generic advice | "Your best sleep happens when you have 8k+ steps AND low stress AND no alcohol. Today you have 2/3 - skip the drink tonight." |
| **"HRV is low"** | **"Your HRV drops 23% the day after alcohol. Last night you had drinks and your HRV is 34ms (vs 44ms baseline). Go easy today."** |
| **"Get more deep sleep"** | **"Your deep sleep averages 95 min on days you stop eating by 7pm vs 62 min on late eating days. Tonight, finish dinner early."** |
| **"Stress is high"** | **"Your stress hours are highest on Tuesdays (avg 5.2h). You have back-to-back meetings scheduled - block 30 min for a walk."** |
| **"Recovery needed"** | **"Your HRV has been declining for 5 days (48→38ms). Combined with only 52 min avg deep sleep, you're overreaching. Take 2 easy days."** |

---

## User Stories

### US-6.1: See AI-Generated Daily Insight
> As a user, I want one personalized insight each day so I learn something new about my health.

**Acceptance Criteria:**
- Single "insight of the day" on dashboard
- Based on my actual data patterns
- Specific and actionable
- Changes daily, doesn't repeat recent insights

### US-6.2: Understand My Correlations
> As a user, I want to know how my behaviors affect my health outcomes.

**Acceptance Criteria:**
- AI identifies correlations (sleep ↔ steps, alcohol ↔ HRV, etc.)
- Presented in plain language
- Statistical significance noted
- Visualization of correlation

### US-6.3: Get Predictive Insights
> As a user, I want predictions about tomorrow so I can prepare.

**Acceptance Criteria:**
- "Based on today, tomorrow you'll likely feel..." predictions
- "You're at risk of..." warnings
- "At current trajectory, you'll reach..." projections

### US-6.4: Receive Weekly AI Summary
> As a user, I want a comprehensive weekly analysis so I can reflect on my progress.

**Acceptance Criteria:**
- Weekly email/in-app summary
- Key wins and areas for improvement
- Comparison to previous weeks
- Specific recommendations for next week

### US-6.5: Ask Questions About My Data
> As a user, I want to ask questions about my health data and get AI-powered answers.

**Acceptance Criteria:**
- Natural language question input
- AI analyzes relevant data to answer
- Examples: "Why was my sleep bad last week?" "When do I perform best?"
- Sources/data points cited in answer

---

## Technical Specification

### AI Insights Engine Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AI INSIGHTS ENGINE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────┐                                                     │
│  │ Data Collector │  Aggregates all user data into analysis-ready format│
│  └───────┬────────┘                                                     │
│          │                                                               │
│          ▼                                                               │
│  ┌────────────────┐                                                     │
│  │ Pattern Finder │  Calculates correlations, identifies anomalies      │
│  └───────┬────────┘                                                     │
│          │                                                               │
│          ▼                                                               │
│  ┌────────────────┐                                                     │
│  │ Context Builder│  Builds prompt with relevant data + patterns        │
│  └───────┬────────┘                                                     │
│          │                                                               │
│          ▼                                                               │
│  ┌────────────────┐                                                     │
│  │  Claude API    │  Generates natural language insights                │
│  └───────┬────────┘                                                     │
│          │                                                               │
│          ▼                                                               │
│  ┌────────────────┐                                                     │
│  │ Insight Cache  │  Stores insights, prevents repetition               │
│  └───────┬────────┘                                                     │
│          │                                                               │
│          ▼                                                               │
│  ┌────────────────┐                                                     │
│  │   Display UI   │  Renders insights in dashboard                      │
│  └────────────────┘                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Collector

```javascript
// insights-data-collector.js

const InsightsDataCollector = {

  collectAllData() {
    return {
      // Oura data (last 90 days)
      oura: this.getOuraData(90),

      // Check-ins (last 90 days)
      checkins: this.getCheckinData(90),

      // Nutrition (last 90 days)
      nutrition: this.getNutritionData(90),

      // Goals
      goals: this.getGoals(),

      // Goal history
      goalHistory: this.getGoalHistory(90),

      // User context
      context: {
        daysTracked: this.getDaysTracked(),
        primaryGoal: this.getPrimaryGoal(),
        recentPRs: this.getRecentPRs(30)
      }
    };
  },

  // Prepare data summary for prompt
  prepareDataSummary(data) {
    return {
      // Recent averages
      last7Days: {
        avgSteps: this.avg(data.oura.slice(-7), 'steps'),
        avgSleep: this.avg(data.oura.slice(-7), 'sleepScore'),
        avgReadiness: this.avg(data.oura.slice(-7), 'readinessScore'),
        workouts: data.checkins.slice(-7).filter(c => c.workout?.completed).length,
        avgWater: this.avg(data.nutrition.slice(-7), 'water.glasses'),
        avgProtein: this.mode(data.nutrition.slice(-7), 'protein.rating')
      },

      // Previous 7 days for comparison
      previous7Days: { /* same structure */ },

      // Trends
      trends: {
        steps: this.calculateTrend(data.oura, 'steps'),
        sleep: this.calculateTrend(data.oura, 'sleepScore'),
        readiness: this.calculateTrend(data.oura, 'readinessScore')
      },

      // Notable patterns
      patterns: this.findPatterns(data),

      // Anomalies
      anomalies: this.findAnomalies(data)
    };
  }
};
```

### Pattern Finder (Correlation Analysis)

```javascript
// pattern-finder.js

const PatternFinder = {

  // Find correlations between metrics
  findCorrelations(data) {
    const correlations = [];

    // ==========================================
    // HRV CORRELATIONS (Primary Recovery Metric)
    // ==========================================

    // Training load vs HRV (next day)
    const workoutHrv = this.compareGroups(
      data.filter(d => d.workout),
      data.filter(d => !d.workout),
      'nextDayHrv'
    );
    if (workoutHrv.significant) {
      correlations.push({
        factor1: 'Workout days',
        factor2: 'Next-day HRV',
        impact: workoutHrv.diff,
        interpretation: `HRV is ${Math.abs(workoutHrv.diff)}ms ${workoutHrv.diff > 0 ? 'higher' : 'lower'} the day after workouts`,
        recommendation: workoutHrv.diff < -5 ? 'You may need more recovery between workouts' : null
      });
    }

    // Alcohol vs HRV (next day) - HIGH IMPACT
    const alcoholDays = data.filter(d => d.tags?.includes('alcohol'));
    const nonAlcoholDays = data.filter(d => !d.tags?.includes('alcohol'));
    if (alcoholDays.length >= 5) {
      const avgHRVAlcohol = this.avg(alcoholDays.map(d => d.nextDayHrv));
      const avgHRVClean = this.avg(nonAlcoholDays.map(d => d.nextDayHrv));
      const diff = avgHRVAlcohol - avgHRVClean;
      correlations.push({
        factor1: 'Alcohol',
        factor2: 'Next-day HRV',
        impact: diff,
        percentImpact: Math.round((diff / avgHRVClean) * 100),
        interpretation: `Alcohol drops your HRV by ${Math.abs(Math.round(diff))}ms (${Math.abs(Math.round((diff / avgHRVClean) * 100))}%)`,
        recommendation: 'Skip alcohol on nights before important days',
        priority: 'high'
      });
    }

    // Steps vs HRV
    const stepsHrv = this.pearsonCorrelation(
      data.map(d => d.steps),
      data.map(d => d.nextDayHrv)
    );
    if (Math.abs(stepsHrv) > 0.3) {
      correlations.push({
        factor1: 'Daily steps',
        factor2: 'Next-day HRV',
        correlation: stepsHrv,
        interpretation: stepsHrv > 0
          ? 'More steps → better HRV recovery'
          : 'High step days may be taxing your recovery'
      });
    }

    // ==========================================
    // SLEEP STAGE CORRELATIONS
    // ==========================================

    // Late eating vs Deep Sleep
    const lateEatingDays = data.filter(d => d.lastMealTime && d.lastMealTime > '20:00');
    const earlyEatingDays = data.filter(d => d.lastMealTime && d.lastMealTime <= '19:00');
    if (lateEatingDays.length >= 5 && earlyEatingDays.length >= 5) {
      const avgDeepLate = this.avg(lateEatingDays.map(d => d.deepSleep));
      const avgDeepEarly = this.avg(earlyEatingDays.map(d => d.deepSleep));
      const diff = avgDeepEarly - avgDeepLate;
      if (diff > 10) {
        correlations.push({
          factor1: 'Dinner timing',
          factor2: 'Deep sleep',
          impact: diff,
          interpretation: `Early dinner (before 7pm): ${Math.round(avgDeepEarly)} min deep sleep vs ${Math.round(avgDeepLate)} min with late dinner`,
          recommendation: `Finish eating by 7pm for ${Math.round(diff)} more minutes of deep sleep`,
          priority: 'high'
        });
      }
    }

    // Protein vs Deep Sleep (nutrition correlation)
    const highProteinDays = data.filter(d => d.protein === 'high');
    const lowProteinDays = data.filter(d => d.protein === 'low');
    if (highProteinDays.length >= 5 && lowProteinDays.length >= 5) {
      const avgDeepHigh = this.avg(highProteinDays.map(d => d.deepSleep));
      const avgDeepLow = this.avg(lowProteinDays.map(d => d.deepSleep));
      const diff = avgDeepHigh - avgDeepLow;
      if (Math.abs(diff) > 10) {
        correlations.push({
          factor1: 'Protein intake',
          factor2: 'Deep sleep',
          impact: diff,
          interpretation: `High protein days: ${Math.round(avgDeepHigh)} min deep sleep vs ${Math.round(avgDeepLow)} min on low protein days`
        });
      }
    }

    // Sleep efficiency vs next-day readiness
    const sleepEffReadiness = this.pearsonCorrelation(
      data.filter(d => d.sleepEfficiency).map(d => d.sleepEfficiency),
      data.filter(d => d.sleepEfficiency).map(d => d.nextDayReadiness)
    );
    if (Math.abs(sleepEffReadiness) > 0.4) {
      correlations.push({
        factor1: 'Sleep efficiency',
        factor2: 'Next-day readiness',
        correlation: sleepEffReadiness,
        interpretation: 'Higher sleep efficiency strongly predicts better next-day readiness'
      });
    }

    // ==========================================
    // STRESS CORRELATIONS
    // ==========================================

    // High stress days vs sleep quality
    const highStressDays = data.filter(d => d.stressMinutes > 300);
    const lowStressDays = data.filter(d => d.stressMinutes && d.stressMinutes < 180);
    if (highStressDays.length >= 5 && lowStressDays.length >= 5) {
      const avgSleepHigh = this.avg(highStressDays.map(d => d.nextDaySleep));
      const avgSleepLow = this.avg(lowStressDays.map(d => d.nextDaySleep));
      correlations.push({
        factor1: 'Daily stress (>5h)',
        factor2: 'Sleep score',
        impact: avgSleepHigh - avgSleepLow,
        interpretation: `High stress days: ${Math.round(avgSleepHigh)} sleep score vs ${Math.round(avgSleepLow)} on calm days`
      });
    }

    // Day of week stress patterns
    const stressByDay = this.groupByDayOfWeek(data, 'stressMinutes');
    const maxStressDay = Object.entries(stressByDay).sort((a, b) => b[1] - a[1])[0];
    const minStressDay = Object.entries(stressByDay).sort((a, b) => a[1] - b[1])[0];
    if (maxStressDay[1] > minStressDay[1] * 1.3) {
      correlations.push({
        factor1: 'Day of week',
        factor2: 'Stress level',
        pattern: { highest: maxStressDay[0], lowest: minStressDay[0] },
        interpretation: `${maxStressDay[0]} is your most stressful day (${Math.round(maxStressDay[1]/60)}h avg) vs ${minStressDay[0]} (${Math.round(minStressDay[1]/60)}h)`,
        recommendation: `Plan recovery activities on ${maxStressDay[0]} evenings`
      });
    }

    // ==========================================
    // HYDRATION CORRELATIONS
    // ==========================================

    // Water vs HRV
    const highWaterDays = data.filter(d => d.water >= 8);
    const lowWaterDays = data.filter(d => d.water && d.water < 6);
    if (highWaterDays.length >= 5 && lowWaterDays.length >= 5) {
      const avgHrvHigh = this.avg(highWaterDays.map(d => d.hrv));
      const avgHrvLow = this.avg(lowWaterDays.map(d => d.hrv));
      const diff = avgHrvHigh - avgHrvLow;
      if (diff > 3) {
        correlations.push({
          factor1: 'Water intake (8+ glasses)',
          factor2: 'HRV',
          impact: diff,
          interpretation: `Well-hydrated days: ${Math.round(avgHrvHigh)}ms HRV vs ${Math.round(avgHrvLow)}ms on low water days`,
          recommendation: 'Stay hydrated to maintain optimal HRV',
          priority: 'medium'
        });
      }
    }

    // ==========================================
    // ACTIVITY CORRELATIONS
    // ==========================================

    // Steps vs Sleep (classic)
    const stepsSleep = this.pearsonCorrelation(
      data.map(d => d.steps),
      data.map(d => d.nextDaySleep)
    );
    if (Math.abs(stepsSleep) > 0.3) {
      correlations.push({
        factor1: 'Daily steps',
        factor2: 'Sleep score (next night)',
        correlation: stepsSleep,
        interpretation: stepsSleep > 0
          ? 'More steps → better sleep'
          : 'Very high step days may impact sleep',
        strength: this.interpretStrength(stepsSleep)
      });
    }

    // Return sorted by priority/impact
    return correlations
      .filter(c => c.correlation === undefined || Math.abs(c.correlation) > 0.25)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      });
  },

  // Find anomalies (unusual days)
  findAnomalies(data, windowSize = 30) {
    const anomalies = [];
    const recent = data.slice(-windowSize);

    const metrics = ['steps', 'sleepScore', 'readinessScore', 'restingHR'];

    metrics.forEach(metric => {
      const values = recent.map(d => d[metric]).filter(v => v);
      const mean = this.avg(values);
      const stdDev = this.standardDeviation(values);

      recent.forEach(day => {
        if (day[metric]) {
          const zScore = (day[metric] - mean) / stdDev;
          if (Math.abs(zScore) > 2) {
            anomalies.push({
              date: day.date,
              metric,
              value: day[metric],
              expected: mean,
              deviation: zScore > 0 ? 'high' : 'low',
              zScore
            });
          }
        }
      });
    });

    return anomalies;
  },

  // Find day-of-week patterns
  findDayOfWeekPatterns(data) {
    const byDay = {};
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day, i) => {
      const daysData = data.filter(d => new Date(d.date).getDay() === i);
      byDay[day] = {
        avgSteps: this.avg(daysData, 'steps'),
        avgSleep: this.avg(daysData, 'sleepScore'),
        workoutRate: daysData.filter(d => d.workout).length / daysData.length
      };
    });

    return {
      bestDayForSteps: Object.entries(byDay).sort((a, b) => b[1].avgSteps - a[1].avgSteps)[0][0],
      worstDayForSteps: Object.entries(byDay).sort((a, b) => a[1].avgSteps - b[1].avgSteps)[0][0],
      bestDayForSleep: Object.entries(byDay).sort((a, b) => b[1].avgSleep - a[1].avgSleep)[0][0],
      leastActiveDay: Object.entries(byDay).sort((a, b) => a[1].workoutRate - b[1].workoutRate)[0][0],
      byDay
    };
  },

  // Pearson correlation coefficient
  pearsonCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 10) return null; // Not enough data

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }

    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return den === 0 ? 0 : num / den;
  }
};
```

### Prompt Templates

```javascript
// insight-prompts.js

const InsightPrompts = {

  dailyInsight: (dataSummary) => `
You are a personal health coach analyzing data for a user focused on peak physical performance.

USER DATA SUMMARY:
${JSON.stringify(dataSummary, null, 2)}

Generate ONE specific, actionable insight based on this data. The insight should:
1. Reference specific numbers from their data
2. Identify a pattern or correlation they might not notice
3. Give ONE specific action they can take today
4. Be encouraging but honest

Format:
{
  "insight": "Your main insight in 1-2 sentences",
  "action": "One specific thing to do today",
  "dataPoint": "The key number that supports this",
  "category": "sleep|activity|recovery|nutrition|consistency"
}

Return ONLY valid JSON, no other text.
`,

  weeklyAnalysis: (dataSummary, weekData) => `
You are a personal health coach providing a weekly review.

WEEK DATA:
${JSON.stringify(weekData, null, 2)}

HISTORICAL CONTEXT:
${JSON.stringify(dataSummary, null, 2)}

Provide a comprehensive weekly analysis including:
1. Top 2-3 wins this week
2. One area that needs attention
3. Key correlation discovered
4. Specific goals for next week

Format:
{
  "wins": ["win1", "win2", "win3"],
  "needsAttention": "area and specific recommendation",
  "correlation": "interesting pattern found",
  "nextWeekGoals": ["goal1", "goal2"],
  "overallScore": "A/B/C/D grade for the week",
  "encouragement": "motivational closing"
}

Return ONLY valid JSON.
`,

  answerQuestion: (question, dataSummary) => `
You are a health data analyst. A user asked:
"${question}"

Their data:
${JSON.stringify(dataSummary, null, 2)}

Answer their question based ONLY on their actual data. Be specific with numbers.
If you can't answer from the data, say so.
Keep response under 100 words.
`,

  predictTomorrow: (recentData, patterns) => `
Based on today's data and historical patterns, predict tomorrow's likely state.

TODAY:
${JSON.stringify(recentData.today, null, 2)}

HISTORICAL PATTERNS:
${JSON.stringify(patterns, null, 2)}

Predict:
1. Likely readiness level (1-100)
2. Recommended activity level
3. Any warnings based on patterns
4. One tip to optimize tomorrow

Format:
{
  "predictedReadiness": 75,
  "confidence": "high|medium|low",
  "recommendation": "activity recommendation",
  "warning": "any concerns or null",
  "tip": "optimization tip"
}

Return ONLY valid JSON.
`
};
```

### API Endpoint for Insights

```javascript
// api/generate-insight.js

import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, data } = req.body;

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  try {
    let prompt;

    switch (type) {
      case 'daily':
        prompt = InsightPrompts.dailyInsight(data);
        break;
      case 'weekly':
        prompt = InsightPrompts.weeklyAnalysis(data.summary, data.week);
        break;
      case 'question':
        prompt = InsightPrompts.answerQuestion(data.question, data.summary);
        break;
      case 'predict':
        prompt = InsightPrompts.predictTomorrow(data.recent, data.patterns);
        break;
      default:
        return res.status(400).json({ error: 'Invalid insight type' });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0].text;

    // Parse JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return res.status(200).json(JSON.parse(jsonMatch[0]));
      }
    } catch (e) {
      // Return raw text if not JSON
      return res.status(200).json({ text: content });
    }

    return res.status(200).json({ text: content });

  } catch (error) {
    console.error('Insight generation error:', error);
    return res.status(500).json({ error: 'Failed to generate insight' });
  }
}
```

### Insight Cache (Prevent Repetition)

```javascript
// insight-cache.js

const InsightCache = {
  STORAGE_KEY: 'health_dashboard_insights',
  MAX_CACHED: 30,

  getCachedInsights() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  cacheInsight(insight) {
    const cached = this.getCachedInsights();
    cached.unshift({
      ...insight,
      cachedAt: new Date().toISOString()
    });

    // Keep only last 30
    const trimmed = cached.slice(0, this.MAX_CACHED);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
  },

  hasRecentSimilar(insight, days = 7) {
    const cached = this.getCachedInsights();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return cached.some(c =>
      new Date(c.cachedAt) > cutoff &&
      c.category === insight.category &&
      this.similarity(c.insight, insight.insight) > 0.7
    );
  },

  // Simple similarity check (could use embeddings for better results)
  similarity(a, b) {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = [...wordsA].filter(w => wordsB.has(w));
    return intersection.length / Math.max(wordsA.size, wordsB.size);
  },

  getTodaysInsight() {
    const cached = this.getCachedInsights();
    const today = new Date().toISOString().split('T')[0];
    return cached.find(c => c.cachedAt.startsWith(today));
  }
};
```

---

## UI/UX Specification

### Daily Insight Card

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💡 TODAY'S INSIGHT                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Your sleep score is 18% higher on days when you hit 8,000+ steps.      │
│  Yesterday you had 6,200 steps and your sleep dropped to 68.            │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  👉 ACTION: Aim for 8,000 steps today to improve tonight's sleep  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Based on 45 days of your data                          [Refresh] [📊]  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Correlation Discovery Card

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔗 PATTERN DISCOVERED                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  HIGH WATER INTAKE → BETTER READINESS                                   │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  Days with 8+ glasses:    Readiness avg: 76                       │  │
│  │  Days with <6 glasses:    Readiness avg: 64                       │  │
│  │                                                                    │  │
│  │  Correlation strength: ●●●●○ Strong                               │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  This pattern is consistent across 23 data points.                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Prediction Card

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔮 TOMORROW'S FORECAST                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Based on today's data, tomorrow you'll likely feel:                    │
│                                                                          │
│                    ╭────────────────╮                                   │
│                    │                │                                   │
│                    │   MODERATE     │                                   │
│                    │   Readiness    │                                   │
│                    │     ~68        │                                   │
│                    │                │                                   │
│                    ╰────────────────╯                                   │
│                                                                          │
│  ⚠️ Your low step count today (4,200) typically leads to                │
│  below-average readiness. A 20-minute evening walk could help.          │
│                                                                          │
│  Confidence: Medium (based on 30-day patterns)                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Weekly AI Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 WEEKLY AI ANALYSIS                              Week of Jan 20-26   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  GRADE: B+                                                              │
│  ─────────                                                              │
│  Good week overall with room for improvement in consistency.            │
│                                                                          │
│  ✨ WINS                                                                │
│  • Hit your step goal 5/7 days (best week since December)               │
│  • Sleep score improved 8% vs last week                                 │
│  • Completed 4 workouts, meeting your goal                              │
│                                                                          │
│  ⚠️ NEEDS ATTENTION                                                     │
│  • Water intake dropped to 5.2 glasses avg (goal: 8)                    │
│  • Wednesday continues to be your least active day                      │
│                                                                          │
│  🔗 PATTERN OF THE WEEK                                                 │
│  Your evening workouts (after 5pm) led to 12% better sleep scores       │
│  compared to morning workouts. Consider evening training.               │
│                                                                          │
│  🎯 FOCUS FOR NEXT WEEK                                                 │
│  1. Hit 8 glasses of water daily                                        │
│  2. Add activity on Wednesday (your gap day)                            │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────      │
│  Keep pushing! You're on a 7-day check-in streak.                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Ask AI Feature

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🤖 ASK YOUR DATA                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Why was my sleep so bad last week?                          [Ask] │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Example questions:                                                      │
│  • "What affects my sleep the most?"                                    │
│  • "When do I have the most energy?"                                    │
│  • "How does alcohol affect my HRV?"                                    │
│  • "What's my best day for workouts?"                                   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  💬 ANSWER                                                              │
│                                                                          │
│  Looking at last week (Jan 13-19), your sleep averaged 64 vs your       │
│  usual 72. Three factors stood out:                                     │
│                                                                          │
│  1. You tagged "stress" on 3 days (Mon, Tue, Thu)                       │
│  2. Step count was below 5k on 4 days                                   │
│  3. You had alcohol on Friday and Saturday                              │
│                                                                          │
│  Your best sleep (78) came on Sunday after a rest day with 9k steps     │
│  and no alcohol. Try to replicate those conditions.                     │
│                                                                          │
│  Data sources: Oura sleep scores, daily check-in tags, step data        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Data Collection Layer
- Create `insights-data-collector.js`
- Aggregate data from all sources
- Build summary objects for prompts
- Handle missing data gracefully

### Step 2: Pattern Analysis
- Create `pattern-finder.js`
- Implement correlation calculations
- Implement anomaly detection
- Implement day-of-week analysis

### Step 3: AI Integration
- Create `/api/generate-insight` endpoint
- Build prompt templates
- Handle API responses
- Parse JSON from AI output

### Step 4: Insight Caching
- Create `insight-cache.js`
- Store generated insights
- Prevent repetition
- Track insight history

### Step 5: Daily Insight UI
- Add insight card to dashboard
- Auto-generate on page load (if not cached today)
- Refresh button for new insight
- Category icons

### Step 6: Weekly Analysis
- Create weekly summary generation
- Schedule or trigger on Sunday
- Display in dedicated section
- Email option (future)

### Step 7: Ask AI Feature
- Add question input UI
- Connect to AI endpoint
- Display answers
- Show data sources

### Step 8: Predictions
- Implement prediction prompt
- Display forecast card
- Show confidence level
- Track prediction accuracy (future)

---

## File Changes Required

| File | Change Type | Description |
|------|-------------|-------------|
| `index.html` | Modify | Add insight cards, ask AI section |
| `insights-data-collector.js` | Create | Data aggregation |
| `pattern-finder.js` | Create | Correlation analysis |
| `insight-prompts.js` | Create | Prompt templates |
| `insight-cache.js` | Create | Caching logic |
| `insights-ui.js` | Create | UI components |
| `api/generate-insight.js` | Create | AI endpoint |

---

## Cost Management

AI calls are not free. Strategies to manage costs:

| Strategy | Implementation |
|----------|----------------|
| Cache insights | Don't regenerate if cached today |
| Batch analysis | Generate weekly summary once, not daily |
| Smaller model for simple tasks | Use Haiku for question answering |
| Rate limiting | Max 5 AI calls per day per user |
| Pre-compute patterns | Calculate correlations locally, only use AI for language |

Estimated costs:
- Daily insight: ~$0.01
- Weekly analysis: ~$0.02
- Question answering: ~$0.005
- Monthly budget for heavy user: ~$0.50

---

## Testing Checklist

- [ ] Data collector aggregates all sources correctly
- [ ] Correlation calculations are accurate
- [ ] Prompts generate valid JSON responses
- [ ] Insights are cached and not repeated
- [ ] Daily insight displays on load
- [ ] Weekly analysis generates correctly
- [ ] Ask AI returns relevant answers
- [ ] Predictions show with confidence
- [ ] Graceful handling of API errors
- [ ] Rate limiting works

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Insight Relevance | 80%+ rated useful | User feedback |
| Question Engagement | 10+ questions/month | Usage count |
| Correlation Accuracy | Validated by user | Confirmation rate |
| Prediction Accuracy | 70%+ correct | Outcome tracking |

---

## Dependencies

- **Phase 7 (Oura Data Expansion)**: Critical prerequisite - requires HRV, sleep stages, stress, and recovery data for enhanced correlation analysis
- **Phases 1-5**: Need rich data to analyze (goals, check-ins, nutrition, trends)
- **Anthropic API**: Required for AI generation
- **Sufficient historical data**: Need 30+ days for meaningful patterns, especially HRV baseline calculations

---

## Definition of Done

- [ ] Daily insight generates and displays
- [ ] Correlations are identified and shown
- [ ] Weekly analysis is comprehensive
- [ ] Ask AI feature works
- [ ] Tomorrow predictions display
- [ ] Insights are cached appropriately
- [ ] API costs are managed
- [ ] Error handling is robust

---

*Phase 6 Document Version: 2.0*

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Basic AI insights engine with rule-based correlations |
| 2.0 | Updated | **Major Enhancement**: Complete rewrite of correlation analysis to leverage expanded Oura data. Added HRV-alcohol correlation, HRV-training load analysis, sleep stage correlations (deep sleep vs dinner timing, protein), stress pattern analysis by day-of-week, hydration-HRV correlations. Updated "What AI Can Do" examples to showcase HRV-specific insights. Added Phase 7 as critical dependency. |
