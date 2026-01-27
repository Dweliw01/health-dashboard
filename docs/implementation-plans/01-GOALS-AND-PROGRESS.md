# Phase 1: Goals & Progress System

## Overview

**Objective:** Transform raw metrics into meaningful progress indicators by adding user-configurable goals and visual progress tracking.

**Problem Statement:** Currently, the dashboard shows "4,325 steps" but the user has no context. Is that good? Bad? On track? Without goals, data is just noise.

**Solution:** Add a goal system that lets users set personal targets and see real-time progress toward those targets.

---

## User Stories

### US-1.1: Set Personal Goals
> As a user, I want to set my own daily/weekly targets so that I know what I'm aiming for.

**Acceptance Criteria:**
- Can set goals for:
  - **Activity:** Steps, Active Calories, Workouts/week, Active days/week
  - **Recovery:** Sleep Score, Readiness Score, HRV baseline (maintain above X)
  - **Sleep Quality:** Deep Sleep (minutes), Sleep Efficiency (%), REM Sleep (minutes)
  - **Stress:** Max stress minutes/day, Min recovery minutes/day
- Goals persist across sessions (localStorage)
- Can modify goals at any time
- Default goals provided for new users (based on Oura recommendations)
- Smart defaults: HRV goal based on user's 30-day baseline

### US-1.2: See Progress at a Glance
> As a user, I want to see how close I am to my goals so that I can adjust my behavior.

**Acceptance Criteria:**
- Each metric shows progress as percentage and visual indicator
- Progress rings/bars fill based on current vs goal
- Color coding: Red (<50%), Yellow (50-80%), Green (>80%)
- "Goal achieved" state is clearly celebrated

### US-1.3: Track Goal Streaks
> As a user, I want to see how many consecutive days I've hit my goals so that I stay motivated.

**Acceptance Criteria:**
- Display current streak for each goal
- Show longest streak achieved
- Streak breaks are logged with context

### US-1.4: View Goal History
> As a user, I want to see my goal achievement history so that I can see patterns.

**Acceptance Criteria:**
- Calendar view showing goal hit/miss per day
- Weekly/monthly achievement percentage
- Trend over time (improving or declining)

---

## Technical Specification

### Data Model

```javascript
// goals.json - User's goal configuration
{
  "version": 2,
  "createdAt": "2025-01-27T00:00:00Z",
  "updatedAt": "2025-01-27T00:00:00Z",
  "goals": {
    // Activity Goals
    "dailySteps": {
      "target": 10000,
      "enabled": true,
      "priority": 1,
      "category": "activity"
    },
    "weeklyWorkouts": {
      "target": 4,
      "enabled": true,
      "priority": 2,
      "category": "activity"
    },
    "activeDays": {
      "target": 5,
      "enabled": true,
      "priority": 3,
      "category": "activity"
    },

    // Recovery Goals
    "readinessScore": {
      "target": 70,
      "enabled": true,
      "priority": 4,
      "category": "recovery"
    },
    "hrvBaseline": {
      "target": 40,           // Maintain HRV above this (personalized)
      "enabled": true,
      "priority": 5,
      "category": "recovery",
      "autoBaseline": true    // Auto-calculate from 30-day average
    },

    // Sleep Goals
    "sleepScore": {
      "target": 75,
      "enabled": true,
      "priority": 6,
      "category": "sleep"
    },
    "deepSleepMinutes": {
      "target": 90,           // 90 minutes of deep sleep
      "enabled": true,
      "priority": 7,
      "category": "sleep"
    },
    "sleepEfficiency": {
      "target": 85,           // 85% efficiency
      "enabled": true,
      "priority": 8,
      "category": "sleep"
    },
    "remSleepMinutes": {
      "target": 90,           // 90 minutes of REM
      "enabled": false,       // Advanced - off by default
      "priority": 9,
      "category": "sleep"
    },

    // Stress/Recovery Goals
    "maxStressMinutes": {
      "target": 240,          // Max 4 hours in high stress
      "enabled": false,       // Advanced - off by default
      "priority": 10,
      "category": "stress",
      "invertedGoal": true    // Lower is better
    },
    "minRecoveryMinutes": {
      "target": 180,          // At least 3 hours recovery
      "enabled": false,       // Advanced - off by default
      "priority": 11,
      "category": "stress"
    }
  },
  "defaults": {
    "dailySteps": 10000,
    "sleepScore": 75,
    "readinessScore": 70,
    "weeklyWorkouts": 4,
    "activeDays": 5,
    "hrvBaseline": "auto",    // Calculate from user's data
    "deepSleepMinutes": 90,
    "sleepEfficiency": 85,
    "remSleepMinutes": 90,
    "maxStressMinutes": 240,
    "minRecoveryMinutes": 180
  },
  "categories": {
    "activity": { "label": "Activity", "icon": "🏃", "color": "#6366f1" },
    "recovery": { "label": "Recovery", "icon": "💚", "color": "#10b981" },
    "sleep": { "label": "Sleep", "icon": "😴", "color": "#8b5cf6" },
    "stress": { "label": "Stress", "icon": "🧘", "color": "#f59e0b" }
  }
}

// goal-history.json - Daily goal achievement tracking
{
  "history": [
    {
      "date": "2025-01-27",
      "achievements": {
        // Activity
        "dailySteps": { "value": 8500, "target": 10000, "achieved": false, "percentage": 85 },

        // Recovery
        "readinessScore": { "value": 72, "target": 70, "achieved": true, "percentage": 103 },
        "hrvBaseline": { "value": 45, "target": 40, "achieved": true, "percentage": 112 },

        // Sleep
        "sleepScore": { "value": 78, "target": 75, "achieved": true, "percentage": 104 },
        "deepSleepMinutes": { "value": 85, "target": 90, "achieved": false, "percentage": 94 },
        "sleepEfficiency": { "value": 88, "target": 85, "achieved": true, "percentage": 104 },

        // Stress (inverted - lower is better)
        "maxStressMinutes": { "value": 200, "target": 240, "achieved": true, "percentage": 83 }
      },
      "byCategory": {
        "activity": { "achieved": 0, "total": 1, "percentage": 0 },
        "recovery": { "achieved": 2, "total": 2, "percentage": 100 },
        "sleep": { "achieved": 2, "total": 3, "percentage": 67 },
        "stress": { "achieved": 1, "total": 1, "percentage": 100 }
      },
      "overallScore": 71 // percentage of enabled goals hit
    }
  ],
  "streaks": {
    "dailySteps": { "current": 3, "longest": 12, "lastAchieved": "2025-01-26" },
    "sleepScore": { "current": 7, "longest": 14, "lastAchieved": "2025-01-27" },
    "hrvBaseline": { "current": 5, "longest": 10, "lastAchieved": "2025-01-27" },
    "deepSleepMinutes": { "current": 0, "longest": 4, "lastAchieved": "2025-01-25" },
    "allGoals": { "current": 2, "longest": 5, "lastAchieved": "2025-01-27" }
  },
  "baselines": {
    "hrv30DayAvg": 43,      // Auto-calculated HRV baseline
    "hrvUpdatedAt": "2025-01-27T00:00:00Z"
  }
}
```

### Storage Strategy

```
Primary: localStorage (instant, offline-capable)
Backup: JSON file in repo (synced via GitHub Actions)
Future: API endpoint for cloud sync
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Goals System                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ GoalsManager    │  │ GoalsSettings   │                   │
│  │ - loadGoals()   │  │ - renderForm()  │                   │
│  │ - saveGoals()   │  │ - validateInput │                   │
│  │ - getProgress() │  │ - saveChanges() │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
│           ▼                    ▼                             │
│  ┌─────────────────────────────────────────┐                │
│  │           GoalsDisplay                   │                │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ │                │
│  │  │ Progress │ │ Progress │ │ Progress │ │                │
│  │  │ Ring     │ │ Ring     │ │ Ring     │ │                │
│  │  │ (Steps)  │ │ (Sleep)  │ │ (Ready)  │ │                │
│  │  └──────────┘ └──────────┘ └──────────┘ │                │
│  └─────────────────────────────────────────┘                │
│                                                              │
│  ┌─────────────────────────────────────────┐                │
│  │           StreakTracker                  │                │
│  │  - calculateStreaks()                    │                │
│  │  - displayCurrentStreak()                │                │
│  │  - celebrateAchievement()                │                │
│  └─────────────────────────────────────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## UI/UX Specification

### Goals Settings Panel

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Your Goals                                    [Save]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🏃 ACTIVITY                                                 │
│  ─────────────────────────────────────────                  │
│  Daily Steps                                                 │
│  ┌────────────────────────────────────────┐                 │
│  │ [    10,000    ]  steps/day            │  [✓] Enabled    │
│  └────────────────────────────────────────┘                 │
│  Your avg: 8,500 | Suggested: 8,000-12,000                  │
│                                                              │
│  Weekly Workouts                                             │
│  ┌────────────────────────────────────────┐                 │
│  │ [       4      ]  per week             │  [✓] Enabled    │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  💚 RECOVERY                                                 │
│  ─────────────────────────────────────────                  │
│  Readiness Score                                             │
│  ┌────────────────────────────────────────┐                 │
│  │ [      70      ]  minimum              │  [✓] Enabled    │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  HRV Baseline                                                │
│  ┌────────────────────────────────────────┐                 │
│  │ [      40      ]  minimum ms           │  [✓] Enabled    │
│  └────────────────────────────────────────┘                 │
│  Your 30-day avg: 43ms | [Auto-set from baseline]           │
│                                                              │
│  😴 SLEEP QUALITY                                            │
│  ─────────────────────────────────────────                  │
│  Sleep Score                                                 │
│  ┌────────────────────────────────────────┐                 │
│  │ [      75      ]  minimum              │  [✓] Enabled    │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  Deep Sleep                                                  │
│  ┌────────────────────────────────────────┐                 │
│  │ [      90      ]  minutes/night        │  [✓] Enabled    │
│  └────────────────────────────────────────┘                 │
│  Your avg: 75 min | Optimal: 90-120 min                     │
│                                                              │
│  Sleep Efficiency                                            │
│  ┌────────────────────────────────────────┐                 │
│  │ [      85      ]  % minimum            │  [✓] Enabled    │
│  └────────────────────────────────────────┘                 │
│  Your avg: 82% | Good: 85%+                                  │
│                                                              │
│  🧘 STRESS (Advanced)                         [Show/Hide]   │
│  ─────────────────────────────────────────                  │
│  Max Stress Time                                             │
│  ┌────────────────────────────────────────┐                 │
│  │ [     240      ]  minutes/day max      │  [ ] Enabled    │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  Min Recovery Time                                           │
│  ┌────────────────────────────────────────┐                 │
│  │ [     180      ]  minutes/day min      │  [ ] Enabled    │
│  └────────────────────────────────────────┘                 │
│                                                              │
│  ─────────────────────────────────────────                  │
│  [Reset to Defaults]              [Cancel]  [Save Goals]    │
└─────────────────────────────────────────────────────────────┘
```

### Progress Ring Enhancement (Existing Metric Cards)

**Before:**
```
┌─────────────────┐
│ 👟              │
│ 4,325           │
│ Avg Daily Steps │
│ +12% vs last wk │
└─────────────────┘
```

**After:**
```
┌─────────────────────────┐
│ 👟           43% ━━━○   │  ← Progress bar
│ 4,325 / 10,000          │  ← Current / Goal
│ Avg Daily Steps         │
│ +12% vs last wk         │
│ 🔥 3 day streak         │  ← Streak indicator
└─────────────────────────┘
```

### Goal Achievement Celebration

When a goal is hit for the first time today:
```
┌─────────────────────────────────────────┐
│                                         │
│        🎉 Step Goal Achieved!           │
│                                         │
│           10,247 / 10,000               │
│                                         │
│     Day 4 of your streak! Keep it up.   │
│                                         │
│              [Awesome!]                 │
│                                         │
└─────────────────────────────────────────┘
```

### Daily Summary Bar (New Component)

Add at top of dashboard, below header:
```
┌─────────────────────────────────────────────────────────────────────┐
│  TODAY'S GOALS    ●●●●●○○ 5/7 achieved                              │
│                                                                      │
│  🏃 Activity      ✓ Steps (102%)    ○ Workout                       │
│  💚 Recovery      ✓ Readiness (103%) ✓ HRV (112%)                   │
│  😴 Sleep         ✓ Score (104%)    ✓ Deep (94%)    ○ Efficiency    │
│                                                                      │
│  Focus: Get 15 more min of deep sleep to hit 6/7 goals              │
└─────────────────────────────────────────────────────────────────────┘
```

### HRV Goal Card (New)

```
┌─────────────────────────┐
│ 💚 HRV        112% ━━●  │
│ 45 / 40 ms baseline     │
│ Heart Rate Variability  │
│ Above baseline ↑        │
│ 🔥 5 day streak         │
└─────────────────────────┘
```

### Sleep Stages Goal Card (New)

```
┌─────────────────────────┐
│ 😴 Deep Sleep   94% ━○  │
│ 85 / 90 min             │
│ Deep Sleep Duration     │
│ 5 min below goal        │
│ Tip: Earlier bedtime    │
└─────────────────────────┘
```

---

## Implementation Steps

### Step 1: Data Layer (goals-manager.js)
```javascript
// New file: goals-manager.js

const GoalsManager = {
  STORAGE_KEY: 'health_dashboard_goals',
  HISTORY_KEY: 'health_dashboard_goal_history',

  defaultGoals: {
    // Activity
    dailySteps: { target: 10000, enabled: true, category: 'activity' },
    weeklyWorkouts: { target: 4, enabled: true, category: 'activity' },
    activeDays: { target: 5, enabled: true, category: 'activity' },

    // Recovery
    readinessScore: { target: 70, enabled: true, category: 'recovery' },
    hrvBaseline: { target: 40, enabled: true, category: 'recovery', autoBaseline: true },

    // Sleep
    sleepScore: { target: 75, enabled: true, category: 'sleep' },
    deepSleepMinutes: { target: 90, enabled: true, category: 'sleep' },
    sleepEfficiency: { target: 85, enabled: true, category: 'sleep' },
    remSleepMinutes: { target: 90, enabled: false, category: 'sleep' },

    // Stress
    maxStressMinutes: { target: 240, enabled: false, category: 'stress', inverted: true },
    minRecoveryMinutes: { target: 180, enabled: false, category: 'stress' }
  },

  categories: {
    activity: { label: 'Activity', icon: '🏃', color: '#6366f1' },
    recovery: { label: 'Recovery', icon: '💚', color: '#10b981' },
    sleep: { label: 'Sleep', icon: '😴', color: '#8b5cf6' },
    stress: { label: 'Stress', icon: '🧘', color: '#f59e0b' }
  },

  load() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return { goals: this.defaultGoals };
  },

  save(goals) {
    const data = {
      goals,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  getProgress(metric, currentValue) {
    const goals = this.load().goals;
    const goal = goals[metric];
    if (!goal || !goal.enabled) return null;

    // Handle inverted goals (lower is better, e.g., stress minutes)
    const isInverted = goal.inverted || false;
    let percentage, achieved;

    if (isInverted) {
      percentage = Math.round((1 - (currentValue / goal.target)) * 100 + 100);
      achieved = currentValue <= goal.target;
    } else {
      percentage = Math.round((currentValue / goal.target) * 100);
      achieved = currentValue >= goal.target;
    }

    return {
      current: currentValue,
      target: goal.target,
      percentage,
      achieved,
      category: goal.category,
      inverted: isInverted
    };
  },

  // Auto-calculate HRV baseline from 30-day average
  calculateHrvBaseline(hrvData) {
    if (!hrvData || hrvData.length < 7) return 40; // Default if insufficient data
    const avg = hrvData.reduce((a, b) => a + b, 0) / hrvData.length;
    return Math.round(avg * 0.9); // Set baseline at 90% of average
  },

  getGoalsByCategory() {
    const goals = this.load().goals;
    const byCategory = {};

    Object.entries(goals).forEach(([key, goal]) => {
      if (!byCategory[goal.category]) {
        byCategory[goal.category] = [];
      }
      byCategory[goal.category].push({ key, ...goal });
    });

    return byCategory;
  },

  recordDailyAchievement(date, achievements) {
    const history = this.loadHistory();

    // Calculate category summaries
    const byCategory = {};
    Object.entries(achievements).forEach(([key, achievement]) => {
      const category = this.defaultGoals[key]?.category || 'other';
      if (!byCategory[category]) {
        byCategory[category] = { achieved: 0, total: 0 };
      }
      byCategory[category].total++;
      if (achievement.achieved) byCategory[category].achieved++;
    });

    Object.keys(byCategory).forEach(cat => {
      byCategory[cat].percentage = Math.round(
        (byCategory[cat].achieved / byCategory[cat].total) * 100
      );
    });

    history.push({
      date,
      achievements,
      byCategory,
      timestamp: new Date().toISOString()
    });

    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    this.updateStreaks(achievements);
  },

  calculateStreak(metric) {
    const history = this.loadHistory();
    let streak = 0;
    // Count backwards from today
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].achievements[metric]?.achieved) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
};
```

### Step 2: Settings UI Component
- Add gear icon to header that opens settings modal
- Form with inputs for each goal type
- Validation (min/max values, numeric only)
- Save/Cancel/Reset buttons

### Step 3: Progress Display Integration
- Modify existing metric cards to show progress bars
- Add percentage indicators
- Color-code based on progress level
- Add streak badges

### Step 4: Daily Summary Component
- New component below header
- Shows today's goal status at a glance
- Calculates which goals are hit/missed
- Suggests next action

### Step 5: Celebration System
- Detect when goal is first achieved today
- Show celebratory modal
- Update streak count
- Optional: confetti animation

### Step 6: History Tracking
- Record daily achievements at end of day (or on page load for previous day)
- Store in localStorage
- Sync to JSON file via GitHub Action (optional)

---

## File Changes Required

| File | Change Type | Description |
|------|-------------|-------------|
| `index.html` | Modify | Add settings modal, goal displays, summary bar |
| `goals-manager.js` | Create | Goal data management logic |
| `goals-ui.js` | Create | UI components for goals |
| `data.json` | Modify | Add goals section (optional, for backup) |
| `process-oura-data.js` | Modify | Calculate goal progress during data processing |

---

## Testing Checklist

- [ ] Goals save to localStorage correctly
- [ ] Goals load on page refresh
- [ ] Progress percentages calculate correctly
- [ ] Streaks increment when goals are hit
- [ ] Streaks reset when goals are missed
- [ ] Settings form validates input
- [ ] Reset to defaults works
- [ ] Progress bars render correctly at 0%, 50%, 100%, >100%
- [ ] Color coding matches progress level
- [ ] Works on mobile (tap targets, form inputs)
- [ ] Celebration modal appears on first achievement
- [ ] Daily summary updates in real-time
- [ ] **HRV baseline auto-calculates from 30-day data**
- [ ] **Inverted goals (stress) calculate correctly (lower is better)**
- [ ] **Deep sleep goal shows minutes correctly**
- [ ] **Sleep efficiency shows as percentage**
- [ ] **Category grouping displays correctly**
- [ ] **Category-level achievement summaries are accurate**

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Goal Configuration | 100% of users set at least 1 goal | Check localStorage on return visits |
| Progress Visibility | Goals visible on main dashboard | Visual inspection |
| Engagement | Users check goal progress daily | Page load frequency |
| Achievement Rate | 50%+ of goals hit | Goal history analysis |

---

## Dependencies

- None (Phase 1 is foundational)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| localStorage cleared | Goals lost | Add export/import feature, optional cloud sync |
| Unrealistic goals set | Demotivation | Provide suggested ranges based on history |
| Too many goals | Overwhelm | Default to 3-5 key goals, allow prioritization |

---

## Definition of Done

- [ ] All user stories implemented and tested
- [ ] Mobile-responsive design verified
- [ ] Performance: No perceptible lag on goal calculations
- [ ] Code reviewed and documented
- [ ] Deployed to Vercel and verified working
- [ ] User can set, view, and track progress toward goals

---

## Dependencies

- **Phase 7 (Oura Data Expansion)**: Requires HRV, sleep stages, stress data from expanded Oura endpoints

---

*Phase 1 Document Version: 2.0*
*Updated: January 27, 2025 - Added HRV, sleep stages, stress goals based on expanded Oura data*
