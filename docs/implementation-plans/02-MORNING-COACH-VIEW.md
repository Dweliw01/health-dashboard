# Phase 2: Morning Coach View

## Overview

**Objective:** Create a focused "Today" view that tells the user exactly what to do, not just what the data shows.

**Problem Statement:** The current dashboard shows historical data but doesn't answer the most important question: "What should I do TODAY?" Users have to interpret metrics themselves and decide on actions.

**Solution:** Add a Morning Coach component that synthesizes all available data into clear, prioritized, actionable recommendations.

---

## User Stories

### US-2.1: See Today's Readiness Assessment
> As a user, I want to see an immediate assessment of my readiness so I know how hard I can push today.

**Acceptance Criteria:**
- Clear readiness indicator (Good/Moderate/Low)
- Activity recommendation based on readiness
- **HRV-based assessment** (primary recovery indicator)
- **Sleep stage breakdown** (deep sleep, REM quality)
- **Stress/recovery balance** from previous day
- Explanation of WHY with specific contributing factors

### US-2.2: Get One Priority Action
> As a user, I want ONE clear thing to focus on today so I'm not overwhelmed.

**Acceptance Criteria:**
- Single prioritized recommendation
- Based on biggest current deficit
- Specific and actionable (not vague)
- Changes daily based on data

### US-2.3: Quick Yesterday Recap
> As a user, I want to see how yesterday went so I have context for today.

**Acceptance Criteria:**
- Yesterday's goal achievement summary
- Key metrics at a glance
- Trend direction (improving/declining)

### US-2.4: See Training Recommendation
> As a user, I want specific workout guidance based on my recovery status.

**Acceptance Criteria:**
- Suggested workout type (rest, light, moderate, intense)
- Duration recommendation
- Reasoning based on readiness/sleep/recent activity

---

## Technical Specification

### Recommendation Engine Logic

```javascript
// recommendation-engine.js

const RecommendationEngine = {

  // Priority order for deficit detection (updated with HRV/sleep stages/stress)
  priorities: [
    'criticalRecovery',   // HRV < 70% baseline OR Readiness < 50 OR Sleep < 50
    'hrvDropAlert',       // HRV significantly below baseline (early warning)
    'deepSleepDeficit',   // Deep sleep < 60 min for 3+ days
    'highStressAlert',    // High stress, low recovery yesterday
    'workoutDeficit',     // No workout in 3+ days
    'sleepDebt',          // Sleep score < 70 for 3+ days
    'stepDeficit',        // Steps < 50% of goal for 3+ days
    'hydrationReminder',  // If water tracking enabled
    'maintenanceMode'     // Everything is fine, maintain
  ],

  // HRV baseline (calculated from 30-day average, stored in goals)
  getHrvBaseline(goals) {
    return goals?.hrvBaseline?.target || 40;
  },

  analyzeToday(data, goals, history) {
    const analysis = {
      readiness: this.assessReadiness(data, goals),
      priority: this.findTopPriority(data, goals, history),
      workout: this.recommendWorkout(data, goals),
      yesterday: this.summarizeYesterday(history),
      recoveryFactors: this.getRecoveryFactors(data)
    };
    return analysis;
  },

  // Enhanced readiness assessment using HRV, sleep stages, stress
  assessReadiness(data, goals) {
    const readinessScore = data.metrics?.readinessScore || 0;
    const sleepScore = data.metrics?.sleepScore || 0;
    const hrv = data.hrv?.current || 0;
    const hrvBaseline = this.getHrvBaseline(goals);
    const hrvPercentage = hrvBaseline > 0 ? (hrv / hrvBaseline) * 100 : 100;
    const deepSleep = data.sleepStages?.last7Days?.[0]?.deep || 0; // minutes
    const stressSummary = data.stress?.today?.summary || 'normal';

    // Weighted readiness calculation
    // HRV is the most reliable recovery indicator
    const weights = {
      hrv: 0.35,           // HRV is primary
      readiness: 0.25,     // Oura readiness score
      sleep: 0.20,         // Sleep score
      deepSleep: 0.10,     // Deep sleep duration
      stress: 0.10         // Previous day stress
    };

    const hrvScore = Math.min(100, hrvPercentage);
    const deepSleepScore = Math.min(100, (deepSleep / 90) * 100); // 90 min = 100%
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
      { name: 'HRV', score: hrvScore, value: `${hrv}ms (${Math.round(hrvPercentage)}% of baseline)` },
      { name: 'Readiness', score: readinessScore, value: readinessScore },
      { name: 'Sleep', score: sleepScore, value: sleepScore },
      { name: 'Deep Sleep', score: deepSleepScore, value: `${deepSleep} min` },
      { name: 'Stress Recovery', score: stressScore, value: stressSummary }
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
        factors
      };
    } else if (compositeScore >= 60 || (hrvPercentage >= 80 && readinessScore >= 60)) {
      return {
        level: 'moderate',
        label: 'Moderate Capacity',
        color: '#f59e0b',
        description: `Decent recovery, but ${limitingFactor.name} is holding you back. Good for steady-state activity.`,
        compositeScore,
        limitingFactor,
        factors
      };
    } else {
      return {
        level: 'low',
        label: 'Recovery Focus',
        color: '#ef4444',
        description: `${limitingFactor.name} is low (${limitingFactor.value}). Light movement only, prioritize recovery.`,
        compositeScore,
        limitingFactor,
        factors
      };
    }
  },

  // Get detailed recovery factors for display
  getRecoveryFactors(data) {
    return {
      hrv: {
        current: data.hrv?.current || 0,
        baseline: data.hrv?.baseline || 40,
        trend: data.hrv?.status || 'unknown', // low, normal, high
        vsBaseline: data.hrv?.baseline ?
          Math.round(((data.hrv.current - data.hrv.baseline) / data.hrv.baseline) * 100) : 0
      },
      sleepStages: {
        deep: data.sleepStages?.last7Days?.[0]?.deep || 0,
        rem: data.sleepStages?.last7Days?.[0]?.rem || 0,
        efficiency: data.sleepStages?.last7Days?.[0]?.efficiency || 0
      },
      stress: {
        stressMinutes: data.stress?.today?.stressMinutes || 0,
        recoveryMinutes: data.stress?.today?.recoveryMinutes || 0,
        summary: data.stress?.today?.summary || 'unknown'
      },
      temperature: {
        deviation: data.readinessBreakdown?.tempDeviation || 0,
        alert: Math.abs(data.readinessBreakdown?.tempDeviation || 0) > 0.5
      }
    };
  },

  findTopPriority(data, goals, history) {
    const metrics = data.metrics || {};
    const hrv = data.hrv?.current || 0;
    const hrvBaseline = this.getHrvBaseline(goals);
    const hrvPercentage = hrvBaseline > 0 ? (hrv / hrvBaseline) * 100 : 100;
    const recent = this.getLast7Days(history);
    const deepSleep = data.sleepStages?.last7Days?.[0]?.deep || 0;
    const stressData = data.stress?.today || {};

    // CRITICAL: HRV crash or very low scores
    if (hrvPercentage < 70 || metrics.readinessScore < 50 || metrics.sleepScore < 50) {
      const reason = hrvPercentage < 70 ?
        `HRV is ${Math.round(hrvPercentage)}% of your baseline - your body is stressed` :
        `Your ${metrics.sleepScore < 50 ? 'sleep' : 'readiness'} score is critically low`;
      return {
        type: 'critical',
        icon: '🛑',
        title: 'Recovery Day',
        action: 'Skip intense exercise. Prioritize rest, hydration, and early bedtime.',
        reason,
        data: { hrv, hrvBaseline, hrvPercentage }
      };
    }

    // HRV below baseline warning (not critical but notable)
    if (hrvPercentage < 85 && hrvPercentage >= 70) {
      return {
        type: 'hrvWarning',
        icon: '💚',
        title: 'HRV Below Baseline',
        action: 'Moderate activity only. Your nervous system needs lighter stress today.',
        reason: `HRV is ${hrv}ms (${Math.round(hrvPercentage)}% of your ${hrvBaseline}ms baseline).`,
        data: { hrv, hrvBaseline, hrvPercentage }
      };
    }

    // Deep sleep deficit
    const avgDeepSleep = this.averageMetric(
      data.sleepStages?.last7Days || [],
      'deep'
    );
    if (avgDeepSleep < 60 && avgDeepSleep > 0) {
      return {
        type: 'deepSleep',
        icon: '🌙',
        title: 'Deep Sleep Deficit',
        action: 'No alcohol, no late meals, cool bedroom. Consider magnesium before bed.',
        reason: `You're averaging ${Math.round(avgDeepSleep)} min deep sleep (need 90+ for optimal recovery).`,
        data: { avgDeepSleep, lastNight: deepSleep }
      };
    }

    // High stress, low recovery
    if (stressData.stressMinutes > 300 && stressData.recoveryMinutes < 120) {
      return {
        type: 'stress',
        icon: '🧘',
        title: 'High Stress Load',
        action: 'Include 20+ minutes of relaxation today. Walk, breathe, or meditate.',
        reason: `Yesterday: ${Math.round(stressData.stressMinutes/60)}h stress vs ${Math.round(stressData.recoveryMinutes/60)}h recovery.`,
        data: stressData
      };
    }

    // Workout deficit
    const daysSinceWorkout = this.daysSinceLastWorkout(history);
    if (daysSinceWorkout >= 3) {
      return {
        type: 'workout',
        icon: '🏋️',
        title: `${daysSinceWorkout} Days Since Workout`,
        action: this.getWorkoutSuggestion(metrics.readinessScore, hrvPercentage),
        reason: 'Consistency matters more than intensity. Get moving today.'
      };
    }

    // Sleep debt
    const avgSleep = this.averageMetric(recent, 'sleepScore');
    if (avgSleep < 70) {
      return {
        type: 'sleep',
        icon: '😴',
        title: 'Sleep Debt Accumulating',
        action: 'Target 8+ hours tonight. No screens after 9pm.',
        reason: `Your 7-day sleep average is ${avgSleep}. Below 70 impacts HRV and recovery.`
      };
    }

    // Step deficit
    const avgSteps = this.averageMetric(recent, 'steps');
    const stepGoal = goals?.dailySteps?.target || 10000;
    if (avgSteps < stepGoal * 0.5) {
      return {
        type: 'steps',
        icon: '🚶',
        title: 'Movement Deficit',
        action: `Aim for ${stepGoal.toLocaleString()} steps today. Take a walk after each meal.`,
        reason: `You're averaging ${avgSteps.toLocaleString()} steps - well below your goal.`
      };
    }

    // All good - maintenance
    return {
      type: 'maintenance',
      icon: '✨',
      title: 'On Track',
      action: 'Maintain your routine. Your HRV and recovery look solid - consider pushing harder.',
      reason: `HRV at ${Math.round(hrvPercentage)}% of baseline. All systems go.`
    };
  },

  // Enhanced workout recommendation using HRV as primary indicator
  recommendWorkout(data, goals) {
    const readiness = data.metrics?.readinessScore || 50;
    const sleepScore = data.metrics?.sleepScore || 50;
    const hrv = data.hrv?.current || 0;
    const hrvBaseline = this.getHrvBaseline(goals);
    const hrvPercentage = hrvBaseline > 0 ? (hrv / hrvBaseline) * 100 : 100;
    const deepSleep = data.sleepStages?.last7Days?.[0]?.deep || 60;
    const recentWorkouts = data.thisWeek?.workouts || 0;

    // HRV is the primary decision driver
    if (hrvPercentage >= 95 && readiness >= 75 && deepSleep >= 75) {
      return {
        type: 'intense',
        label: 'High Intensity OK',
        suggestions: ['HIIT', 'Heavy lifting', 'Sprint intervals', 'Competitive sports'],
        duration: '45-60 min',
        icon: '🔥',
        reason: `HRV is ${Math.round(hrvPercentage)}% of baseline with ${deepSleep} min deep sleep. Push hard.`
      };
    } else if (hrvPercentage >= 85 && readiness >= 65) {
      return {
        type: 'moderate',
        label: 'Moderate Effort',
        suggestions: ['Steady cardio', 'Moderate lifting', 'Swimming', 'Cycling'],
        duration: '30-45 min',
        icon: '💪',
        reason: `HRV is good but not peak. Solid training day without max efforts.`
      };
    } else if (hrvPercentage >= 70 && readiness >= 50) {
      return {
        type: 'light',
        label: 'Light Activity',
        suggestions: ['Walking', 'Yoga', 'Stretching', 'Light swim'],
        duration: '20-30 min',
        icon: '🚶',
        reason: `HRV is below baseline. Active recovery will help more than pushing.`
      };
    } else {
      return {
        type: 'rest',
        label: 'Active Recovery',
        suggestions: ['Rest day', 'Gentle stretching', 'Short walk', 'Meditation'],
        duration: '0-15 min',
        icon: '🛋️',
        reason: `HRV at ${Math.round(hrvPercentage)}% - your body needs rest to recover.`
      };
    }
  },

  summarizeYesterday(history) {
    // Get yesterday's data from history
    const yesterday = history[history.length - 1];
    if (!yesterday) return null;

    return {
      date: yesterday.date,
      goalsHit: yesterday.achievements ?
        Object.values(yesterday.achievements).filter(a => a.achieved).length : 0,
      totalGoals: yesterday.achievements ?
        Object.keys(yesterday.achievements).length : 0,
      highlights: this.getHighlights(yesterday)
    };
  }
};
```

### Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  data.json  │────▶│ Recommendation   │────▶│ Morning Coach   │
│  (Oura)     │     │ Engine           │     │ Component       │
└─────────────┘     └──────────────────┘     └─────────────────┘
       ▲                    ▲                         │
       │                    │                         ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ goals.json  │────▶│ Priority         │     │    Render       │
│ (Phase 1)   │     │ Analysis         │     │    UI           │
└─────────────┘     └──────────────────┘     └─────────────────┘
       ▲
       │
┌─────────────┐
│ history     │
│ (Phase 1)   │
└─────────────┘
```

---

## UI/UX Specification

### Morning Coach Component (New Hero Section)

Replace or augment the current score-hero section:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Good morning                                          Mon, Jan 27       │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                                                                     │ │
│  │  TODAY'S READINESS                                                  │ │
│  │                                                                     │ │
│  │  ┌──────────────────┐                                              │ │
│  │  │                  │   Ready to Push                              │ │
│  │  │       78         │   ────────────────────                       │ │
│  │  │   composite      │   HRV is strong and recovery looks good.     │ │
│  │  │    ●●●●○        │   Great day for challenging workouts.        │ │
│  │  └──────────────────┘                                              │ │
│  │                                                                     │ │
│  │  RECOVERY FACTORS                                                   │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │ │
│  │  │ 💚 HRV   │ │ 🌙 Deep  │ │ 😴 Sleep │ │ 🧘 Stress │              │ │
│  │  │ 45ms     │ │ 85 min   │ │ Score 78 │ │ Restored │              │ │
│  │  │ +12%     │ │ 94%      │ │ Good     │ │ ✓        │              │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │ │
│  │                                                                     │ │
│  │  WORKOUT SUGGESTION                                                 │ │
│  │  🔥 High Intensity OK • 45-60 min                                  │ │
│  │  HRV at 112% of baseline with 85 min deep sleep. Push hard.        │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  🏋️ YOUR PRIORITY TODAY                                            │ │
│  │  ─────────────────────────────────────────────────────────          │ │
│  │                                                                     │ │
│  │  6 Days Since Last Workout                                          │ │
│  │                                                                     │ │
│  │  → Do a 30-minute strength session today                           │ │
│  │                                                                     │ │
│  │  Consistency matters more than intensity. HRV and recovery          │ │
│  │  support a solid workout - don't waste this high-capacity day.     │ │
│  │                                                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────┐  ┌────────────────────────────────┐   │
│  │  LAST NIGHT                  │  │  THIS WEEK                      │   │
│  │  ────────────                │  │  ─────────                      │   │
│  │  Sleep: 78  HRV: 45ms       │  │  Workouts: 1/4                  │   │
│  │  Deep: 85m  REM: 95m        │  │  Avg HRV: 43ms                  │   │
│  │  Efficiency: 88%            │  │  Avg Deep: 78m                  │   │
│  └─────────────────────────────┘  └────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Recovery Factors Detail Cards

```
HRV ABOVE BASELINE (Good)
┌─────────────────────────────────────┐
│  💚 HRV: 45ms (+12%)               │
│  ████████████████░░░░ 112%          │
│  Above your 40ms baseline           │
│  Nervous system well-recovered      │
└─────────────────────────────────────┘
Border: #10b981

HRV BELOW BASELINE (Warning)
┌─────────────────────────────────────┐
│  💚 HRV: 34ms (-15%)               │
│  ████████████░░░░░░░░ 85%           │
│  Below your 40ms baseline           │
│  Consider lighter activity today    │
└─────────────────────────────────────┘
Border: #f59e0b

DEEP SLEEP LOW
┌─────────────────────────────────────┐
│  🌙 Deep Sleep: 52 min             │
│  ████████░░░░░░░░░░░░ 58%           │
│  Target: 90 min                     │
│  Tip: Earlier bedtime, cool room    │
└─────────────────────────────────────┘
Border: #f59e0b

STRESS/RECOVERY IMBALANCE
┌─────────────────────────────────────┐
│  🧘 High Stress Day                 │
│  Stress: 5h  Recovery: 2h          │
│  ████████████████░░░░ ratio         │
│  Include relaxation today           │
└─────────────────────────────────────┘
Border: #ef4444
```

### Mobile Layout (Priority)

On mobile, stack vertically with larger tap targets:

```
┌───────────────────────────────┐
│ Good morning         Jan 27   │
├───────────────────────────────┤
│                               │
│    ╭───────────────────────╮  │
│    │                       │  │
│    │         74            │  │
│    │    Ready to Push      │  │
│    │                       │  │
│    ╰───────────────────────╯  │
│                               │
│  🔥 High Intensity OK         │
│  45-60 min suggested          │
│                               │
├───────────────────────────────┤
│                               │
│  🏋️ YOUR FOCUS TODAY         │
│                               │
│  6 Days Since Workout         │
│                               │
│  Do a 30-min strength         │
│  session. Don't waste a       │
│  high-capacity day.           │
│                               │
│  ┌─────────────────────────┐  │
│  │   ✓ Mark Workout Done   │  │
│  └─────────────────────────┘  │
│                               │
├───────────────────────────────┤
│ Yesterday    │  This Week     │
│ ●●●○○ 3/5    │  1/4 workouts  │
│ 8.2k steps   │  6.4k avg      │
└───────────────────────────────┘
```

### Readiness Level Indicators

```
GOOD (75-100)
┌─────────────────────────────────────┐
│  ●●●●● Ready to Push               │
│  Background: rgba(16, 185, 129, 0.1)│
│  Border: #10b981                    │
└─────────────────────────────────────┘

MODERATE (60-74)
┌─────────────────────────────────────┐
│  ●●●○○ Moderate Capacity           │
│  Background: rgba(245, 158, 11, 0.1)│
│  Border: #f59e0b                    │
└─────────────────────────────────────┘

LOW (<60)
┌─────────────────────────────────────┐
│  ●○○○○ Recovery Focus              │
│  Background: rgba(239, 68, 68, 0.1) │
│  Border: #ef4444                    │
└─────────────────────────────────────┘
```

### Priority Action Cards (Variants)

```
CRITICAL (Recovery Needed)
┌─────────────────────────────────────┐
│ 🛑 RECOVERY DAY                     │
│                                     │
│ Skip intense exercise today.        │
│ In bed by 9:30pm.                   │
│                                     │
│ Your sleep score is critically low. │
│ One good night can reset you.       │
└─────────────────────────────────────┘
Background: rgba(239, 68, 68, 0.08)

WORKOUT NEEDED
┌─────────────────────────────────────┐
│ 🏋️ 6 DAYS SINCE WORKOUT            │
│                                     │
│ Do a 30-min strength session.       │
│                                     │
│ Consistency > intensity.            │
│ Your readiness supports a workout.  │
└─────────────────────────────────────┘
Background: rgba(99, 102, 241, 0.08)

ALL GOOD
┌─────────────────────────────────────┐
│ ✨ ON TRACK                         │
│                                     │
│ Maintain your routine today.        │
│ Consider pushing a bit harder.      │
│                                     │
│ All metrics look good.              │
└─────────────────────────────────────┘
Background: rgba(16, 185, 129, 0.08)
```

---

## Implementation Steps

### Step 1: Create Recommendation Engine
- New file: `recommendation-engine.js`
- Implement readiness assessment logic
- Implement priority detection logic
- Implement workout recommendation logic
- Unit test each function

### Step 2: Morning Coach Component
- Add HTML structure in `index.html`
- Create CSS for coach card styles
- Implement responsive layout (mobile-first)
- Connect to recommendation engine

### Step 3: Yesterday Summary
- Pull data from goal history (Phase 1)
- Calculate goals hit/missed
- Display in compact card format

### Step 4: This Week Summary
- Aggregate current week's data
- Show workout count, avg steps, avg sleep
- Compare to goals

### Step 5: Quick Action Buttons
- "Mark Workout Done" button
- Links to relevant actions
- Mobile-friendly tap targets

### Step 6: Time-Aware Greetings
- "Good morning" / "Good afternoon" / "Good evening"
- Show relevant metrics for time of day
- Evening: Focus on sleep prep

---

## File Changes Required

| File | Change Type | Description |
|------|-------------|-------------|
| `index.html` | Modify | Add Morning Coach section, restructure hero |
| `recommendation-engine.js` | Create | All recommendation logic |
| `morning-coach.js` | Create | UI rendering for coach component |
| `styles` (in index.html) | Modify | Add coach component styles |

---

## Recommendation Rules Matrix

| Condition | Priority Level | Action | Icon |
|-----------|---------------|--------|------|
| **HRV < 70% baseline** OR Readiness < 50 OR Sleep < 50 | CRITICAL | Rest day, prioritize recovery | 🛑 |
| **HRV 70-85% baseline** | HIGH | Moderate activity only, nervous system stressed | 💚 |
| **Deep sleep < 60 min** (3+ day avg) | HIGH | Sleep optimization focus | 🌙 |
| **High stress + low recovery** (>5h stress, <2h recovery) | HIGH | Include relaxation, light activity | 🧘 |
| **Temperature deviation > 0.5°C** | HIGH | Possible illness brewing, rest | 🌡️ |
| No workout in 3+ days | MEDIUM | Workout suggestion based on HRV | 🏋️ |
| Sleep avg < 70 (7 days) | MEDIUM | Sleep hygiene focus | 😴 |
| Steps < 50% goal (7 days) | MEDIUM | Step increase suggestion | 🚶 |
| Workouts < weekly goal | LOW | Workout reminder | 💪 |
| All metrics good + HRV > 95% baseline | LOW | Push harder, optimize | ✨ |

### Workout Intensity Decision Tree (HRV-Based)

```
HRV >= 95% baseline + Readiness >= 75 + Deep sleep >= 75 min
  → HIGH INTENSITY OK (🔥 HIIT, heavy lifting, sprints)

HRV >= 85% baseline + Readiness >= 65
  → MODERATE EFFORT (💪 Steady cardio, moderate weights)

HRV >= 70% baseline + Readiness >= 50
  → LIGHT ACTIVITY (🚶 Walking, yoga, stretching)

HRV < 70% baseline OR Readiness < 50
  → REST/RECOVERY (🛋️ Rest day, gentle movement only)
```

---

## Testing Checklist

- [ ] Readiness assessment correctly categorizes scores
- [ ] Priority detection follows hierarchy correctly
- [ ] Workout suggestions match readiness level
- [ ] Yesterday summary shows correct data
- [ ] This week aggregations are accurate
- [ ] Mobile layout works on small screens (375px)
- [ ] Time-of-day greeting is correct
- [ ] Colors match readiness levels
- [ ] Recommendation text is clear and actionable
- [ ] Works when historical data is missing
- [ ] **HRV baseline calculation is accurate**
- [ ] **HRV percentage vs baseline displays correctly**
- [ ] **Recovery factors (HRV, deep sleep, stress) show in UI**
- [ ] **Workout intensity scales with HRV correctly**
- [ ] **Deep sleep deficit triggers correct recommendation**
- [ ] **Stress/recovery imbalance detected correctly**
- [ ] **Composite readiness score weights factors correctly**
- [ ] **Limiting factor identified and displayed**
- [ ] **Temperature deviation alerts work**

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Glanceability | <3 seconds to understand | User testing |
| Action Clarity | 100% have specific action | Content audit |
| Relevance | Recommendations match data | Logic validation |
| Engagement | Users scroll past coach section | Scroll depth analytics |

---

## Dependencies

- **Phase 1 (Goals)**: Needs goal data for context, including HRV baseline goal
- **Phase 7 (Oura Data Expansion)**: Requires expanded Oura data:
  - HRV data (from sleep endpoint)
  - Sleep stages (deep, REM, light, efficiency)
  - Daily stress (stress minutes, recovery minutes)
  - Temperature deviation (from readiness contributors)
- **data.json**: Enhanced structure with hrv, sleepStages, stress, readinessBreakdown

---

## Definition of Done

- [ ] Morning Coach displays on dashboard load
- [ ] Readiness assessment is accurate
- [ ] Priority action is specific and actionable
- [ ] Yesterday/This Week summaries show real data
- [ ] Mobile layout is thumb-friendly
- [ ] No performance impact on page load
- [ ] Works with missing data (graceful fallbacks)

---

*Phase 2 Document Version: 2.0*
*Updated: January 27, 2025 - HRV-based recommendations, sleep stages, stress/recovery balance, composite readiness scoring*
