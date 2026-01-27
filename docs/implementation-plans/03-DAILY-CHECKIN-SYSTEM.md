# Phase 3: Daily Check-in System

## Overview

**Objective:** Capture user context that automated data collection can't provide - workouts, energy levels, notes, and tags.

**Problem Statement:** Oura tracks sleep and activity automatically, but it doesn't know:
- Did you actually do a workout (vs. just moving around)?
- How did you feel today?
- Were there extenuating circumstances (sick, travel, stress)?
- Any personal notes about the day?

This context is critical for understanding patterns and making better recommendations.

**Solution:** A quick daily check-in (target: 30 seconds) that captures subjective data to complement objective metrics.

---

## User Stories

### US-3.1: Log Workouts Manually
> As a user, I want to log my workouts so I have accurate workout tracking beyond step counting.

**Acceptance Criteria:**
- Can log workout: yes/no
- Can specify type (strength, cardio, HIIT, yoga, sport, other)
- Can specify duration (minutes)
- Can rate intensity (1-5 or low/medium/high)
- Optional: add notes

### US-3.2: Rate Daily Energy/Mood
> As a user, I want to rate how I felt today so I can correlate subjective feelings with objective data.

**Acceptance Criteria:**
- Simple 1-5 scale for energy
- Optional: mood rating
- Quick tap interface (not typing)
- Historical tracking

### US-3.3: Tag Days with Context
> As a user, I want to tag special circumstances so I can explain anomalies in my data.

**Acceptance Criteria:**
- Pre-defined tags: sick, travel, stress, rest day, alcohol, poor sleep, great day
- Can select multiple tags
- Custom tag option
- Tags visible in history

### US-3.4: Add Notes
> As a user, I want to add optional notes so I can remember context later.

**Acceptance Criteria:**
- Free-text field (optional)
- Character limit (280 chars - tweet-length)
- Searchable in history

### US-3.5: Check-in Reminder
> As a user, I want to be reminded to check in so I don't forget.

**Acceptance Criteria:**
- Visual indicator if not checked in today
- Optional: browser notification (with permission)
- Streak tracking for check-ins

---

## Technical Specification

### Data Model

```javascript
// checkins.json - Array of daily check-ins
{
  "checkins": [
    {
      "id": "2025-01-27",
      "date": "2025-01-27",
      "timestamp": "2025-01-27T21:30:00Z",

      "workout": {
        "completed": true,
        "type": "strength",      // strength, cardio, hiit, yoga, sport, other
        "duration": 45,          // minutes
        "intensity": "high",     // low, medium, high
        "notes": "Leg day, felt strong"
      },

      "energy": 4,               // 1-5 scale
      "mood": 4,                 // 1-5 scale (optional)

      "tags": ["good_sleep", "productive"],

      "notes": "Great day overall, hit all my goals",

      "metadata": {
        "source": "manual",      // manual, auto, ios_shortcut
        "version": 1
      }
    }
  ],

  "streaks": {
    "current": 7,
    "longest": 21,
    "lastCheckin": "2025-01-27"
  },

  "customTags": ["meditation", "cold_plunge"]  // User-defined tags
}
```

### Predefined Tags

```javascript
const TAGS = {
  // Positive
  great_day: { label: 'Great Day', icon: '✨', color: 'green' },
  good_sleep: { label: 'Good Sleep', icon: '😴', color: 'green' },
  productive: { label: 'Productive', icon: '💪', color: 'green' },

  // Neutral
  rest_day: { label: 'Rest Day', icon: '🛋️', color: 'gray' },
  travel: { label: 'Travel', icon: '✈️', color: 'gray' },
  busy: { label: 'Busy Day', icon: '📅', color: 'gray' },

  // Negative/Explanatory
  sick: { label: 'Sick', icon: '🤒', color: 'red' },
  poor_sleep: { label: 'Poor Sleep', icon: '😫', color: 'red' },
  stress: { label: 'High Stress', icon: '😰', color: 'orange' },
  alcohol: { label: 'Alcohol', icon: '🍷', color: 'orange' },

  // Custom (user can add)
  custom: { label: 'Custom', icon: '🏷️', color: 'purple' }
};
```

### Storage Strategy

```
Primary: localStorage (instant, offline)
Backup: JSON file in repo (synced daily via GitHub Action)
Sync: On page load, merge localStorage with server if available
```

### Check-in Manager

```javascript
// checkin-manager.js

const CheckinManager = {
  STORAGE_KEY: 'health_dashboard_checkins',

  getTodayCheckin() {
    const today = this.getDateString(new Date());
    const data = this.load();
    return data.checkins.find(c => c.date === today) || null;
  },

  hasCheckedInToday() {
    return this.getTodayCheckin() !== null;
  },

  saveCheckin(checkin) {
    const data = this.load();
    const today = this.getDateString(new Date());

    // Remove existing checkin for today if exists
    data.checkins = data.checkins.filter(c => c.date !== today);

    // Add new checkin
    data.checkins.push({
      id: today,
      date: today,
      timestamp: new Date().toISOString(),
      ...checkin,
      metadata: { source: 'manual', version: 1 }
    });

    // Update streaks
    this.updateStreaks(data);

    this.save(data);
    return data;
  },

  updateStreaks(data) {
    const sorted = data.checkins.sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    let streak = 0;
    let checkDate = new Date();

    for (const checkin of sorted) {
      const checkinDate = new Date(checkin.date);
      const diffDays = Math.floor(
        (checkDate - checkinDate) / (1000 * 60 * 60 * 24)
      );

      if (diffDays <= 1) {
        streak++;
        checkDate = checkinDate;
      } else {
        break;
      }
    }

    data.streaks = {
      current: streak,
      longest: Math.max(streak, data.streaks?.longest || 0),
      lastCheckin: sorted[0]?.date
    };
  },

  getCheckinHistory(days = 30) {
    const data = this.load();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return data.checkins.filter(c =>
      new Date(c.date) >= cutoff
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  getWorkoutStats(days = 30) {
    const history = this.getCheckinHistory(days);
    const workouts = history.filter(c => c.workout?.completed);

    return {
      total: workouts.length,
      byType: this.groupBy(workouts, c => c.workout.type),
      avgDuration: this.average(workouts, c => c.workout.duration),
      avgIntensity: this.modeIntensity(workouts)
    };
  }
};
```

---

## UI/UX Specification

### Check-in Entry Points

1. **Floating Action Button (Mobile)**
   - Bottom-right corner
   - Pulsing animation if not checked in
   - Opens check-in modal

2. **Header Indicator (Desktop)**
   - "Check in" button in header
   - Badge if not checked in today

3. **Morning Coach Prompt**
   - "Log yesterday" prompt in morning
   - "Check in" prompt in evening

### Check-in Modal (Primary UI)

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Daily Check-in                              [X] Close       │
│  Monday, January 27                                          │
│                                                              │
│  ═══════════════════════════════════════════════════════    │
│                                                              │
│  DID YOU WORK OUT TODAY?                                     │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐                         │
│  │             │    │             │                         │
│  │     YES     │    │     NO      │                         │
│  │             │    │             │                         │
│  └─────────────┘    └─────────────┘                         │
│                                                              │
│  ─────────────────────────────────────────────────────      │
│                                                              │
│  WORKOUT DETAILS (if yes)                                    │
│                                                              │
│  Type:                                                       │
│  ┌────────┐┌────────┐┌────────┐┌────────┐                  │
│  │Strength││ Cardio ││  HIIT  ││  Yoga  │                  │
│  └────────┘└────────┘└────────┘└────────┘                  │
│  ┌────────┐┌────────┐                                       │
│  │ Sport  ││ Other  │                                       │
│  └────────┘└────────┘                                       │
│                                                              │
│  Duration: [  45  ] min                                      │
│                                                              │
│  Intensity:                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │  Light  │ │ Medium  │ │  Hard   │                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
│                                                              │
│  ═══════════════════════════════════════════════════════    │
│                                                              │
│  HOW'S YOUR ENERGY?                                          │
│                                                              │
│     1        2        3        4        5                    │
│    😫       😕       😐       🙂       😄                   │
│   [ ]      [ ]      [ ]      [●]      [ ]                   │
│   Low                               High                     │
│                                                              │
│  ═══════════════════════════════════════════════════════    │
│                                                              │
│  ANY TAGS FOR TODAY? (optional)                              │
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ ✨ Great│ │ 😴 Good │ │ 🤒 Sick │ │ ✈️ Travel│          │
│  │   Day   │ │  Sleep  │ │         │ │         │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ 😰Stress│ │ 🛋️ Rest │ │ 🍷Alcohol│ │ + Add   │          │
│  │         │ │   Day   │ │         │ │  Tag    │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                              │
│  ═══════════════════════════════════════════════════════    │
│                                                              │
│  NOTES (optional)                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Felt great after the workout, energy stayed high    │   │
│  │ all day...                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                              142/280 chars   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   SAVE CHECK-IN                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  🔥 Streak: 7 days                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Mobile-Optimized Check-in (Swipe Cards)

```
┌─────────────────────────────┐
│ Daily Check-in       [Skip] │
│ Monday, Jan 27              │
├─────────────────────────────┤
│                             │
│  STEP 1 OF 3                │
│  ───────────                │
│                             │
│  Did you work out today?    │
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │        YES          │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │         NO          │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│            ● ○ ○            │
│                             │
└─────────────────────────────┘

       ↓ (swipe/tap next)

┌─────────────────────────────┐
│ Daily Check-in       [Back] │
│ Monday, Jan 27              │
├─────────────────────────────┤
│                             │
│  STEP 2 OF 3                │
│  ───────────                │
│                             │
│  How's your energy?         │
│                             │
│     😫  😕  😐  🙂  😄      │
│                             │
│  ┌───┐┌───┐┌───┐┌───┐┌───┐ │
│  │ 1 ││ 2 ││ 3 ││ 4 ││ 5 │ │
│  └───┘└───┘└───┘└───┘└───┘ │
│                             │
│            ○ ● ○            │
│                             │
└─────────────────────────────┘

       ↓ (swipe/tap next)

┌─────────────────────────────┐
│ Daily Check-in       [Back] │
│ Monday, Jan 27              │
├─────────────────────────────┤
│                             │
│  STEP 3 OF 3 (optional)     │
│  ────────────────────       │
│                             │
│  Any tags for today?        │
│                             │
│  ┌──────┐ ┌──────┐ ┌──────┐│
│  │ ✨   │ │ 🤒   │ │ ✈️   ││
│  │Great │ │ Sick │ │Travel││
│  └──────┘ └──────┘ └──────┘│
│  ┌──────┐ ┌──────┐ ┌──────┐│
│  │ 😰   │ │ 🛋️   │ │ 🍷   ││
│  │Stress│ │ Rest │ │Alcohol│
│  └──────┘ └──────┘ └──────┘│
│                             │
│  ┌─────────────────────┐    │
│  │     SAVE CHECK-IN   │    │
│  └─────────────────────┘    │
│                             │
│  🔥 7 day streak!           │
│            ○ ○ ●            │
│                             │
└─────────────────────────────┘
```

### Floating Action Button (FAB)

```css
.checkin-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
}

.checkin-fab.not-checked-in {
  animation: pulse 2s infinite;
}

.checkin-fab::after {
  content: '✓';
  font-size: 24px;
  color: white;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
```

### Check-in History View

```
┌─────────────────────────────────────────────────────────────┐
│  CHECK-IN HISTORY                           [This Month ▼]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TODAY - Monday, Jan 27                              [Edit] │
│  ├─ 🏋️ Strength workout • 45 min • Hard                    │
│  ├─ ⚡ Energy: 4/5                                          │
│  ├─ 🏷️ Tags: productive                                    │
│  └─ 📝 "Felt great after the workout..."                   │
│                                                              │
│  ───────────────────────────────────────────────────────    │
│                                                              │
│  YESTERDAY - Sunday, Jan 26                          [Edit] │
│  ├─ 🛋️ Rest day                                            │
│  ├─ ⚡ Energy: 3/5                                          │
│  └─ 🏷️ Tags: rest_day                                      │
│                                                              │
│  ───────────────────────────────────────────────────────    │
│                                                              │
│  Saturday, Jan 25                                    [Edit] │
│  ├─ 🏃 Cardio workout • 30 min • Medium                    │
│  ├─ ⚡ Energy: 4/5                                          │
│  └─ 🏷️ Tags: good_sleep, productive                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Data Layer
- Create `checkin-manager.js`
- Implement CRUD operations for check-ins
- Implement streak calculation
- Add localStorage persistence

### Step 2: Check-in Modal
- Create modal HTML structure
- Implement step-by-step flow (mobile) or single form (desktop)
- Add workout type selection
- Add energy rating selector
- Add tag selection grid
- Add notes textarea

### Step 3: FAB Component
- Add floating action button
- Implement pulse animation for not-checked-in state
- Connect to modal open

### Step 4: Header Integration
- Add check-in indicator to header
- Show streak count
- Visual indicator if not checked in

### Step 5: Check-in History
- Create history view component
- Implement date filtering
- Add edit capability for past check-ins

### Step 6: Integration with Other Phases
- Connect workout data to Phase 1 goals
- Feed check-in data to Phase 2 recommendations
- Store for Phase 6 AI analysis

---

## File Changes Required

| File | Change Type | Description |
|------|-------------|-------------|
| `index.html` | Modify | Add modal, FAB, header indicator |
| `checkin-manager.js` | Create | Check-in data management |
| `checkin-ui.js` | Create | Modal and UI components |
| `checkins.json` | Create | Check-in data storage |

---

## Testing Checklist

- [ ] Check-in saves correctly to localStorage
- [ ] Streak increments on consecutive days
- [ ] Streak resets when day is missed
- [ ] Modal opens and closes properly
- [ ] All workout types selectable
- [ ] Energy rating is required before save
- [ ] Tags are multi-selectable
- [ ] Notes character limit enforced
- [ ] FAB pulse animation works
- [ ] Edit existing check-in works
- [ ] Mobile swipe flow works smoothly
- [ ] Check-in data persists across page reloads

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Check-in Completion | 80%+ of days | Check-ins / Active days |
| Time to Complete | <30 seconds | Timer in session |
| Workout Logging | 90%+ accuracy | Manual audit |
| Streak Retention | 7+ day avg streak | Streak data |

---

## Dependencies

- None (can be built in parallel with Phase 1)

---

## Definition of Done

- [ ] Users can log daily check-ins
- [ ] Workout tracking works with type/duration/intensity
- [ ] Energy rating is captured
- [ ] Tags can be selected
- [ ] Notes can be added
- [ ] Streaks are tracked correctly
- [ ] Mobile experience is smooth (<30 sec)
- [ ] History view shows past check-ins
- [ ] Data persists in localStorage

---

*Phase 3 Document Version: 1.0*
