# Phase 5: Long-term Trends & Analytics

## Overview

**Objective:** Extend visibility beyond 7-30 days to show meaningful long-term progress and patterns.

**Problem Statement:** Health is a long game. The current dashboard only shows recent data, making it impossible to see if you're actually improving over months or years. Without long-term visibility, users can't see the impact of sustained effort.

**Solution:** Add extended time ranges (3 months, 6 months, 1 year), rolling averages, trend analysis, personal records, and period comparisons.

---

## User Stories

### US-5.1: View Extended Time Ranges
> As a user, I want to see my data over 3, 6, and 12 months so I can track long-term progress.

**Acceptance Criteria:**
- Time range selector: 7d, 30d, 90d, 180d, 1y, All
- All charts update based on selection
- Data aggregated appropriately (daily → weekly → monthly)
- Smooth transitions between ranges

### US-5.2: See Rolling Averages
> As a user, I want to see rolling averages so I can distinguish signal from noise.

**Acceptance Criteria:**
- 7-day, 30-day rolling averages
- Overlay on charts as trend line
- Clear visual distinction from daily data
- Helps identify true trends vs fluctuations

### US-5.3: Compare Time Periods
> As a user, I want to compare this month vs last month so I can see if I'm improving.

**Acceptance Criteria:**
- Side-by-side comparison: This week vs last week, This month vs last month
- Key metrics delta with +/- indicators
- Visual comparison charts
- "Best month ever" / "Personal records" callouts

### US-5.4: Track Personal Records
> As a user, I want to see my personal bests so I feel motivated by achievements.

**Acceptance Criteria:**
- Track PRs: Most steps in a day, longest streak, highest sleep score, **highest HRV**, **best deep sleep**, etc.
- Display when PR is achieved
- Historical PR timeline
- "You're X away from your PR" motivation

### US-5.7: See HRV & Recovery Trends
> As a user, I want to see my HRV trending over months so I can track nervous system adaptation.

**Acceptance Criteria:**
- HRV trend chart with rolling average (7-day, 30-day)
- HRV baseline shift over time (improving = fitness gains)
- Correlation between training load and HRV
- "Your baseline HRV has improved 15% since June"

### US-5.8: See Sleep Quality Trends
> As a user, I want to see sleep stage trends over time so I can track sleep optimization.

**Acceptance Criteria:**
- Deep sleep % trend over months
- REM sleep % trend
- Sleep efficiency trend
- "You're getting 20% more deep sleep than 3 months ago"

### US-5.9: See Stress Adaptation
> As a user, I want to see my stress/recovery balance trending so I can track resilience.

**Acceptance Criteria:**
- Weekly stress vs recovery hours
- Trend of stress load over time
- Days in "restored" vs "stressful" state
- Resilience improvement tracking

### US-5.5: See Milestone Progress
> As a user, I want to see progress toward milestones so I have long-term goals.

**Acceptance Criteria:**
- Total steps milestones (100k, 500k, 1M)
- Total workouts milestones (50, 100, 500)
- Consistency milestones (30-day streak, 90-day streak)
- Visual progress toward next milestone

### US-5.6: Export Reports
> As a user, I want to export my health data so I can share with doctors or keep records.

**Acceptance Criteria:**
- Export as PDF or CSV
- Selectable date range
- Include charts and summaries
- Print-friendly format

---

## Technical Specification

### Data Aggregation Strategy

```javascript
// Data granularity by time range
const AGGREGATION_STRATEGY = {
  '7d':   { granularity: 'day',   dataPoints: 7 },
  '30d':  { granularity: 'day',   dataPoints: 30 },
  '90d':  { granularity: 'week',  dataPoints: 13 },  // ~13 weeks
  '180d': { granularity: 'week',  dataPoints: 26 },  // ~26 weeks
  '1y':   { granularity: 'month', dataPoints: 12 },
  'all':  { granularity: 'month', dataPoints: null } // dynamic
};
```

### Analytics Engine

```javascript
// analytics-engine.js

const AnalyticsEngine = {

  // Calculate rolling average
  rollingAverage(data, windowSize) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = data.slice(start, i + 1);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      result.push(Math.round(avg * 10) / 10);
    }
    return result;
  },

  // Aggregate daily data to weekly
  aggregateToWeekly(dailyData) {
    const weeks = {};
    dailyData.forEach(entry => {
      const weekStart = this.getWeekStart(new Date(entry.date));
      if (!weeks[weekStart]) {
        weeks[weekStart] = { values: [], dates: [] };
      }
      weeks[weekStart].values.push(entry.value);
      weeks[weekStart].dates.push(entry.date);
    });

    return Object.entries(weeks).map(([weekStart, data]) => ({
      date: weekStart,
      value: Math.round(data.values.reduce((a, b) => a + b, 0) / data.values.length),
      count: data.values.length
    }));
  },

  // Aggregate to monthly
  aggregateToMonthly(dailyData) {
    const months = {};
    dailyData.forEach(entry => {
      const monthKey = entry.date.slice(0, 7); // YYYY-MM
      if (!months[monthKey]) {
        months[monthKey] = { values: [], dates: [] };
      }
      months[monthKey].values.push(entry.value);
    });

    return Object.entries(months).map(([month, data]) => ({
      date: month,
      value: Math.round(data.values.reduce((a, b) => a + b, 0) / data.values.length),
      total: data.values.reduce((a, b) => a + b, 0),
      count: data.values.length
    }));
  },

  // Compare two periods
  comparePeriods(currentPeriod, previousPeriod, metrics) {
    const comparison = {};

    metrics.forEach(metric => {
      const current = this.calculateAverage(currentPeriod, metric);
      const previous = this.calculateAverage(previousPeriod, metric);
      const delta = current - previous;
      const percentChange = previous > 0 ? ((delta / previous) * 100) : 0;

      comparison[metric] = {
        current,
        previous,
        delta,
        percentChange: Math.round(percentChange * 10) / 10,
        improved: this.isImprovement(metric, delta)
      };
    });

    return comparison;
  },

  // Determine if change is improvement (depends on metric)
  isImprovement(metric, delta) {
    const higherIsBetter = ['steps', 'sleepScore', 'readinessScore', 'workouts', 'hrv'];
    const lowerIsBetter = ['restingHR'];

    if (higherIsBetter.includes(metric)) return delta > 0;
    if (lowerIsBetter.includes(metric)) return delta < 0;
    return delta > 0; // default
  },

  // Calculate trend direction
  calculateTrend(data, windowSize = 7) {
    if (data.length < windowSize * 2) return 'insufficient_data';

    const recentAvg = this.average(data.slice(-windowSize));
    const previousAvg = this.average(data.slice(-windowSize * 2, -windowSize));

    const percentChange = ((recentAvg - previousAvg) / previousAvg) * 100;

    if (percentChange > 5) return 'improving';
    if (percentChange < -5) return 'declining';
    return 'stable';
  },

  // Find personal records
  findPersonalRecords(allData) {
    return {
      // Activity PRs
      maxSteps: {
        value: Math.max(...allData.map(d => d.steps || 0)),
        date: allData.find(d => d.steps === Math.max(...allData.map(d => d.steps || 0)))?.date
      },
      longestStreak: this.calculateLongestStreak(allData),
      totalSteps: allData.reduce((sum, d) => sum + (d.steps || 0), 0),
      totalWorkouts: allData.filter(d => d.workout).length,

      // Recovery PRs
      maxSleepScore: {
        value: Math.max(...allData.map(d => d.sleepScore || 0)),
        date: allData.find(d => d.sleepScore === Math.max(...allData.map(d => d.sleepScore || 0)))?.date
      },
      maxReadiness: {
        value: Math.max(...allData.map(d => d.readinessScore || 0)),
        date: allData.find(d => d.readinessScore === Math.max(...allData.map(d => d.readinessScore || 0)))?.date
      },

      // HRV PRs (NEW)
      maxHrv: {
        value: Math.max(...allData.filter(d => d.hrv).map(d => d.hrv || 0)),
        date: allData.find(d => d.hrv === Math.max(...allData.filter(x => x.hrv).map(x => x.hrv || 0)))?.date,
        label: 'Highest HRV'
      },
      hrvBaselineHigh: {
        value: this.calculateMaxRollingAvg(allData, 'hrv', 30), // Best 30-day HRV average
        period: 'Best 30-day average',
        label: 'Peak HRV Baseline'
      },

      // Sleep Stage PRs (NEW)
      maxDeepSleep: {
        value: Math.max(...allData.filter(d => d.deepSleep).map(d => d.deepSleep || 0)),
        date: allData.find(d => d.deepSleep === Math.max(...allData.filter(x => x.deepSleep).map(x => x.deepSleep || 0)))?.date,
        label: 'Most Deep Sleep'
      },
      maxRemSleep: {
        value: Math.max(...allData.filter(d => d.remSleep).map(d => d.remSleep || 0)),
        date: allData.find(d => d.remSleep === Math.max(...allData.filter(x => x.remSleep).map(x => x.remSleep || 0)))?.date,
        label: 'Most REM Sleep'
      },
      maxSleepEfficiency: {
        value: Math.max(...allData.filter(d => d.sleepEfficiency).map(d => d.sleepEfficiency || 0)),
        date: allData.find(d => d.sleepEfficiency === Math.max(...allData.filter(x => x.sleepEfficiency).map(x => x.sleepEfficiency || 0)))?.date,
        label: 'Best Sleep Efficiency'
      },

      // Lowest Resting HR (lower is better for fitness)
      lowestRestingHR: {
        value: Math.min(...allData.filter(d => d.restingHR && d.restingHR > 30).map(d => d.restingHR)),
        date: allData.find(d => d.restingHR === Math.min(...allData.filter(x => x.restingHR && x.restingHR > 30).map(x => x.restingHR)))?.date,
        label: 'Lowest Resting HR'
      }
    };
  },

  // Calculate max rolling average for baseline tracking
  calculateMaxRollingAvg(data, metric, windowSize) {
    let maxAvg = 0;
    for (let i = windowSize - 1; i < data.length; i++) {
      const window = data.slice(i - windowSize + 1, i + 1);
      const values = window.map(d => d[metric]).filter(v => v);
      if (values.length >= windowSize * 0.8) { // Need 80% of days with data
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        maxAvg = Math.max(maxAvg, avg);
      }
    }
    return Math.round(maxAvg * 10) / 10;
  },

  // Calculate longest streak
  calculateLongestStreak(data) {
    let longest = 0;
    let current = 0;
    let longestStart = null;
    let currentStart = null;

    data.sort((a, b) => new Date(a.date) - new Date(b.date));

    for (let i = 0; i < data.length; i++) {
      const meetsGoal = data[i].steps >= 10000; // or configurable goal

      if (meetsGoal) {
        if (current === 0) currentStart = data[i].date;
        current++;
        if (current > longest) {
          longest = current;
          longestStart = currentStart;
        }
      } else {
        current = 0;
      }
    }

    return { days: longest, startDate: longestStart };
  },

  // Milestone tracking
  calculateMilestones(totalSteps, totalWorkouts, currentStreak) {
    const stepMilestones = [100000, 500000, 1000000, 5000000, 10000000];
    const workoutMilestones = [10, 50, 100, 250, 500, 1000];
    const streakMilestones = [7, 30, 60, 90, 180, 365];

    return {
      steps: {
        achieved: stepMilestones.filter(m => totalSteps >= m),
        next: stepMilestones.find(m => totalSteps < m),
        progress: totalSteps / (stepMilestones.find(m => totalSteps < m) || totalSteps) * 100
      },
      workouts: {
        achieved: workoutMilestones.filter(m => totalWorkouts >= m),
        next: workoutMilestones.find(m => totalWorkouts < m),
        progress: totalWorkouts / (workoutMilestones.find(m => totalWorkouts < m) || totalWorkouts) * 100
      },
      streak: {
        achieved: streakMilestones.filter(m => currentStreak >= m),
        next: streakMilestones.find(m => currentStreak < m),
        progress: currentStreak / (streakMilestones.find(m => currentStreak < m) || currentStreak) * 100
      }
    };
  }
};
```

### Data Storage for Long-term

```javascript
// Historical data structure
{
  "dailyData": [
    // Full daily records - keep all of them
    {
      "date": "2025-01-27",
      "steps": 8500,
      "sleepScore": 78,
      "readinessScore": 74,
      "restingHR": 52,
      "hrv": 45,
      "workout": true,
      "workoutType": "strength"
    }
  ],

  "weeklyAggregates": [
    // Pre-calculated for performance
    {
      "weekStart": "2025-01-20",
      "avgSteps": 7800,
      "avgSleep": 72,
      "avgReadiness": 68,
      "workouts": 3
    }
  ],

  "monthlyAggregates": [
    {
      "month": "2025-01",
      "avgSteps": 7500,
      "totalSteps": 232500,
      "avgSleep": 71,
      "avgReadiness": 69,
      "workouts": 14,
      "daysTracked": 27
    }
  ],

  "personalRecords": {
    "maxSteps": { "value": 18500, "date": "2024-09-15" },
    "maxSleepScore": { "value": 94, "date": "2024-11-22" },
    "longestStreak": { "days": 21, "startDate": "2024-10-01" }
  },

  "milestones": {
    "totalSteps": 2450000,
    "totalWorkouts": 156,
    "achievedMilestones": ["100k_steps", "500k_steps", "1M_steps", "50_workouts", "100_workouts"]
  }
}
```

---

## UI/UX Specification

### Time Range Selector

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                      │
│   │ 7D  │ │ 30D │ │ 90D │ │ 6M  │ │ 1Y  │ │ ALL │                      │
│   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                      │
│      ▲                                                                   │
│   selected                                                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Long-term Trends Chart

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP TRENDS                                      [7D ▼] [30D] [90D]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  12k │                    ╭─╮                                           │
│  10k │─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─│─ ─ ─ ─ ─ ─ ─ ─ ─ Goal: 10k              │
│   8k │      ╭──────╮  ╭──╯ ╰──╮     ╭────╮                             │
│   6k │  ╭───╯      ╰──╯       ╰─────╯    ╰───╮                         │
│   4k │──╯                                     ╰──                       │
│   2k │                                                                  │
│    0 │──────────────────────────────────────────────                   │
│      Oct    Nov    Dec    Jan    Feb    Mar                            │
│                                                                          │
│  ───── Daily    ───── 7-day avg    ─ ─ ─ 30-day avg                    │
│                                                                          │
│  📈 Trend: Improving (+12% vs last month)                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Period Comparison

```
┌─────────────────────────────────────────────────────────────────────────┐
│  COMPARE: This Month vs Last Month                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │         JANUARY 2025              DECEMBER 2024                    │  │
│  │                                                                    │  │
│  │  Steps     7,845/day    ▲ +12%     6,985/day                      │  │
│  │  Sleep       73 avg     ▲ +4       69 avg                         │  │
│  │  Readiness   71 avg     ▲ +3       68 avg                         │  │
│  │  Workouts    12         ▲ +3       9                              │  │
│  │  Resting HR  52 bpm     ▼ -2       54 bpm                         │  │
│  │                                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │  🎉 YOUR BEST MONTH FOR STEPS IN 6 MONTHS!                  │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Personal Records Section

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏆 PERSONAL RECORDS                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ACTIVITY                                                                │
│  ┌─────────────────────┐  ┌─────────────────────┐                       │
│  │ 🚶 Most Steps       │  │ 🔥 Longest Streak   │                       │
│  │    18,547           │  │    21 days          │                       │
│  │    Sep 15, 2024     │  │    Oct 1-21, 2024   │                       │
│  │ Today: 8,500 (46%)  │  │ Current: 7 days     │                       │
│  └─────────────────────┘  └─────────────────────┘                       │
│                                                                          │
│  RECOVERY & HRV                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐                       │
│  │ 💚 Highest HRV      │  │ 💚 Peak HRV Baseline│                       │
│  │    62ms             │  │    48ms (30-day)    │                       │
│  │    Aug 12, 2024     │  │    July 2024        │                       │
│  │ Today: 45ms (73%)   │  │ Current: 43ms       │                       │
│  └─────────────────────┘  └─────────────────────┘                       │
│                                                                          │
│  SLEEP QUALITY                                                           │
│  ┌─────────────────────┐  ┌─────────────────────┐                       │
│  │ 😴 Best Sleep Score │  │ 🌙 Most Deep Sleep  │                       │
│  │    94               │  │    142 min          │                       │
│  │    Nov 22, 2024     │  │    Oct 8, 2024      │                       │
│  │ Today: 78 (83%)     │  │ Last night: 85 min  │                       │
│  └─────────────────────┘  └─────────────────────┘                       │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐                       │
│  │ 💤 Best Efficiency  │  │ ❤️ Lowest Rest HR   │                       │
│  │    96%              │  │    42 bpm           │                       │
│  │    Dec 1, 2024      │  │    Nov 15, 2024     │                       │
│  │ Last: 88%           │  │ Current: 46 bpm     │                       │
│  └─────────────────────┘  └─────────────────────┘                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Milestones Progress

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🎯 MILESTONES                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TOTAL STEPS                                                             │
│  ────────────                                                            │
│  ✓ 100,000   ✓ 500,000   ✓ 1,000,000   ○ 5,000,000                     │
│                                                                          │
│  Current: 2,450,000 steps                                                │
│  ████████████████████████░░░░░░░░░░░░░░░░░░ 49% to 5M                   │
│  2,550,000 steps to go!                                                  │
│                                                                          │
│  ─────────────────────────────────────────────────────                  │
│                                                                          │
│  TOTAL WORKOUTS                                                          │
│  ──────────────                                                          │
│  ✓ 10   ✓ 50   ✓ 100   ○ 250                                           │
│                                                                          │
│  Current: 156 workouts                                                   │
│  ████████████████████████████░░░░░░░░░░░░░░ 62% to 250                  │
│  94 workouts to go!                                                      │
│                                                                          │
│  ─────────────────────────────────────────────────────                  │
│                                                                          │
│  CONSISTENCY STREAKS                                                     │
│  ───────────────────                                                     │
│  ✓ 7 days   ○ 30 days   ○ 60 days   ○ 90 days                          │
│                                                                          │
│  Current streak: 7 days                                                  │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 23% to 30                   │
│  23 more days for 30-day badge!                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Export/Report Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 EXPORT HEALTH REPORT                                       [Close] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Date Range                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  From: [Jan 1, 2025 ▼]    To: [Jan 27, 2025 ▼]                    ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  Quick Select: [Last 7 days] [Last 30 days] [Last 90 days] [Year]       │
│                                                                          │
│  Include:                                                                │
│  [✓] Daily metrics (steps, sleep, readiness)                            │
│  [✓] Charts and visualizations                                          │
│  [✓] Personal records                                                   │
│  [✓] Goal achievement summary                                           │
│  [ ] Detailed workout log                                               │
│  [ ] Nutrition data                                                     │
│                                                                          │
│  Format:                                                                 │
│  ┌─────────────┐  ┌─────────────┐                                       │
│  │   📄 PDF    │  │   📊 CSV    │                                       │
│  │  (Report)   │  │   (Data)    │                                       │
│  └─────────────┘  └─────────────┘                                       │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │                    ⬇️ GENERATE REPORT                              ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Analytics Engine
- Create `analytics-engine.js`
- Implement rolling average calculations
- Implement data aggregation (daily → weekly → monthly)
- Implement period comparison
- Implement trend detection

### Step 2: Time Range Selector
- Add UI component for time range selection
- Store selected range in state
- Trigger data re-fetch/re-render on change

### Step 3: Chart Updates
- Modify existing charts to support multiple time ranges
- Add rolling average overlay lines
- Handle data aggregation for longer periods
- Smooth transitions between ranges

### Step 4: Period Comparison
- Create comparison component
- Calculate deltas between periods
- Design side-by-side view
- Highlight improvements/declines

### Step 5: Personal Records
- Create PR tracking system
- Detect new PRs on data load
- Display PR cards on dashboard
- Celebration modal for new PRs

### Step 6: Milestones
- Define milestone thresholds
- Track cumulative progress
- Create milestone display component
- Achievement notifications

### Step 7: Export System
- Create export modal
- Implement PDF generation (html2canvas + jsPDF)
- Implement CSV export
- Design print-friendly layout

---

## File Changes Required

| File | Change Type | Description |
|------|-------------|-------------|
| `index.html` | Modify | Add time selector, PR section, milestones |
| `analytics-engine.js` | Create | All analytics calculations |
| `trends-ui.js` | Create | Trend visualization components |
| `export.js` | Create | Export/report generation |
| `historical-data.json` | Create | Long-term data storage |

---

## Performance Considerations

- Pre-calculate weekly/monthly aggregates during data processing
- Lazy load older data (only fetch when needed)
- Cache calculated analytics in localStorage
- Use Web Workers for heavy calculations on large datasets

---

## Testing Checklist

- [ ] Time range selector updates all charts
- [ ] Rolling averages calculate correctly
- [ ] Data aggregates correctly (day→week→month)
- [ ] Period comparison shows accurate deltas
- [ ] Trend direction is correctly identified
- [ ] Personal records are detected and displayed
- [ ] Milestones track cumulative progress
- [ ] PDF export generates correctly
- [ ] CSV export includes all data
- [ ] Performance is acceptable with 1 year of data

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Long-range Engagement | 30%+ view 90d+ ranges | UI interactions |
| Export Usage | 10% use export monthly | Export count |
| PR Motivation | Users return after PR | Return visit rate |

---

## Dependencies

- **Phases 1-4**: Need historical data to analyze
- **Phase 7 (Oura Data Expansion)**: Requires HRV, sleep stages, stress for enhanced trends
- **Chart.js**: Already in use, extend for trends

---

## Definition of Done

- [ ] Time ranges work: 7d, 30d, 90d, 180d, 1y
- [ ] Rolling averages display on charts
- [ ] Period comparison is functional
- [ ] Personal records are tracked and displayed
- [ ] Milestones show progress
- [ ] Export to PDF works
- [ ] Export to CSV works
- [ ] Performance is acceptable

---

*Phase 5 Document Version: 2.0*
*Updated: January 27, 2025 - Added HRV trends, sleep stage trends, stress trends, expanded PRs*
