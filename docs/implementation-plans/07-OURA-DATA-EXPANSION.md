# Oura Data Expansion Analysis

## Overview

This document analyzes the current Oura data usage vs. what's available, and recommends additional data points to enhance the Health Dashboard for peak performance tracking.

---

## Current State Analysis

### What You're Currently FETCHING (fetch-oura-data.js)

| Endpoint | Status | Records |
|----------|--------|---------|
| `daily_activity` | ✅ Fetching | 30 days |
| `daily_sleep` | ✅ Fetching | 30 days |
| `daily_readiness` | ✅ Fetching | 30 days |
| `heartrate` | ✅ Fetching | 30 days |
| `sleep` (detailed) | ✅ Fetching | 30 days |
| `workout` | ✅ Fetching | 30 days |
| `session` | ✅ Fetching | **NOT USED** |
| `tag` | ✅ Fetching | **NOT USED** |

### What You're Currently USING (process-oura-data.js)

| Data Point | Source | Used For |
|------------|--------|----------|
| Steps | daily_activity | Main metric, charts, streaks |
| Active Calories | daily_activity | Calorie tracking |
| Activity Score | daily_activity | Fitness score calculation |
| MET data | daily_activity | Time-of-day activity |
| Sleep Score | daily_sleep | Fitness score, display |
| Readiness Score | daily_readiness | Fitness score, display |
| Resting HR (contributor) | daily_readiness | Display only |
| Heart Rate (raw) | heartrate | HR trends, min/max/avg |
| Workout count/type | workout | Workout distribution |

### What You're FETCHING but NOT USING

| Data Point | Source | Potential Value |
|------------|--------|-----------------|
| Sleep contributors | daily_sleep | Deep sleep %, REM %, efficiency |
| Readiness contributors | daily_readiness | HRV balance, body temp, recovery index |
| Temperature deviation | daily_readiness | Illness detection, cycle tracking |
| Detailed sleep data | sleep | HRV during sleep, breath rate, sleep stages |
| Sessions | session | Meditation, naps, relaxation |
| Tags | tag | User-added context from Oura app |

---

## What You're NOT Fetching (Available in Oura API v2)

### High-Value Missing Endpoints

| Endpoint | Data Available | Why It Matters |
|----------|---------------|----------------|
| `daily_spo2` | Blood oxygen % | Recovery, altitude adaptation, illness |
| `daily_stress` | Stress/recovery time | Stress management, recovery tracking |
| `daily_resilience` | Resilience score | Long-term stress adaptation |
| `daily_cardiovascular_age` | CV age estimate | Heart health trending |
| `vo2_max` | VO2 max estimate | Cardio fitness level |
| `sleep_time` | Optimal bedtime | Sleep optimization |
| `rest_mode_period` | Rest mode data | Recovery periods |

---

## Recommended Data Expansion

### Tier 1: HIGH VALUE - Add Immediately

#### 1. HRV (Heart Rate Variability)
**Source:** `sleep` endpoint → `average_hrv` and `hrv.items[]`

**Why it matters for peak performance:**
- Best single metric for recovery status
- Predicts readiness better than subjective feeling
- Tracks nervous system balance (sympathetic vs parasympathetic)
- Early warning for overtraining

**Data available:**
```javascript
{
  "average_hrv": 45,           // Nightly average
  "hrv": {
    "interval": 300,           // 5-minute intervals
    "items": [42, 44, 48, ...]  // HRV throughout night
  }
}
```

**Dashboard use:**
- HRV trend chart (7/30/90 days)
- "Your HRV is 15% below baseline - consider recovery day"
- Correlation with training load
- Morning readiness prediction

---

#### 2. Sleep Stages (Detailed)
**Source:** `sleep` endpoint

**Data available:**
```javascript
{
  "deep_sleep_duration": 5400,    // seconds
  "light_sleep_duration": 14400,
  "rem_sleep_duration": 7200,
  "awake_time": 1800,
  "time_in_bed": 28800,
  "efficiency": 85,
  "latency": 600,                  // time to fall asleep
  "sleep_phase_5_min": "4433322211144433..."  // Sleep stage timeline
}
```

**Dashboard use:**
- Sleep stage breakdown pie chart
- "You're getting 15% less deep sleep than optimal"
- Sleep efficiency trending
- Latency tracking (are you falling asleep faster?)

---

#### 3. Daily Stress
**Source:** `daily_stress` endpoint (NEW - not currently fetched)

**Data available:**
```javascript
{
  "day": "2025-01-27",
  "stress_high": 180,        // Minutes in high stress
  "recovery_high": 240,      // Minutes in recovery
  "day_summary": "restored"  // normal, stressful, restored
}
```

**Dashboard use:**
- Stress vs recovery balance chart
- "You spent 3 hours in high stress yesterday"
- Correlate stress with sleep quality
- Weekly stress patterns

---

#### 4. SpO2 (Blood Oxygen)
**Source:** `daily_spo2` endpoint (NEW - not currently fetched)

**Data available:**
```javascript
{
  "day": "2025-01-27",
  "spo2_percentage": {
    "average": 96.5
  }
}
```

**Dashboard use:**
- Track baseline SpO2
- Alert if drops below normal (illness indicator)
- Altitude adaptation tracking
- Sleep apnea indicators

---

#### 5. Readiness Contributors (Full Breakdown)
**Source:** `daily_readiness` endpoint (already fetched, not fully used)

**Data available:**
```javascript
{
  "contributors": {
    "activity_balance": 85,
    "body_temperature": 90,
    "hrv_balance": 78,
    "previous_day_activity": 82,
    "previous_night": 75,
    "recovery_index": 88,
    "resting_heart_rate": 92,
    "sleep_balance": 80
  },
  "temperature_deviation": 0.2,
  "temperature_trend_deviation": -0.1
}
```

**Dashboard use:**
- "Your readiness is low because HRV balance dropped"
- Temperature deviation alerts (illness early warning)
- Identify weak links in recovery
- Track which factors most affect YOUR readiness

---

### Tier 2: MEDIUM VALUE - Add in Phase 2

#### 6. Respiratory Rate
**Source:** `sleep` endpoint → `average_breath`

```javascript
{
  "average_breath": 14.5  // breaths per minute during sleep
}
```

**Use:** Baseline tracking, illness detection, fitness improvement indicator

---

#### 7. VO2 Max Estimate
**Source:** `vo2_max` endpoint (NEW)

**Use:** Cardio fitness level, track improvement over months

---

#### 8. Cardiovascular Age
**Source:** `daily_cardiovascular_age` endpoint (NEW)

**Use:** Long-term heart health metric, motivation for lifestyle changes

---

#### 9. Daily Resilience
**Source:** `daily_resilience` endpoint (NEW)

**Use:** Long-term stress adaptation, mental toughness tracking

---

#### 10. Sleep Time Recommendations
**Source:** `sleep_time` endpoint (NEW)

```javascript
{
  "optimal_bedtime": {
    "start": "22:00",
    "end": "23:00"
  },
  "recommendation": "earlier"
}
```

**Use:** Personalized bedtime recommendations in Morning Coach

---

### Tier 3: NICE TO HAVE

#### 11. Sessions (Meditation, Naps)
**Source:** `session` endpoint (already fetched, not used)

**Use:** Track meditation practice, nap quality, relaxation sessions

---

#### 12. Tags from Oura App
**Source:** `tag` endpoint (already fetched, not used)

**Use:** Import user tags from Oura app, correlate with metrics

---

## Implementation Plan

### Step 1: Update fetch-oura-data.js

Add new endpoints:

```javascript
const endpoints = {
  // Existing
  daily_activity: `...`,
  daily_sleep: `...`,
  daily_readiness: `...`,
  heartrate: `...`,
  sleep: `...`,
  workout: `...`,
  session: `...`,
  tag: `...`,

  // NEW - Add these
  daily_spo2: `https://api.ouraring.com/v2/usercollection/daily_spo2?start_date=${start}&end_date=${end}`,
  daily_stress: `https://api.ouraring.com/v2/usercollection/daily_stress?start_date=${start}&end_date=${end}`,
  daily_resilience: `https://api.ouraring.com/v2/usercollection/daily_resilience?start_date=${start}&end_date=${end}`,
  daily_cardiovascular_age: `https://api.ouraring.com/v2/usercollection/daily_cardiovascular_age?start_date=${start}&end_date=${end}`,
  vo2_max: `https://api.ouraring.com/v2/usercollection/vo2_max?start_date=${start}&end_date=${end}`,
  sleep_time: `https://api.ouraring.com/v2/usercollection/sleep_time?start_date=${start}&end_date=${end}`
};
```

### Step 2: Update process-oura-data.js

Extract and process new data:

```javascript
// HRV from detailed sleep
const sleepData = ouraData.data.sleep.data || [];
const hrvData = sleepData.map(s => ({
  day: s.day,
  avgHrv: s.average_hrv,
  deepSleep: s.deep_sleep_duration,
  remSleep: s.rem_sleep_duration,
  lightSleep: s.light_sleep_duration,
  efficiency: s.efficiency,
  latency: s.latency,
  breathRate: s.average_breath,
  lowestHR: s.lowest_heart_rate
}));

// Stress data
const stressData = ouraData.data.daily_stress?.data || [];

// SpO2 data
const spo2Data = ouraData.data.daily_spo2?.data || [];

// Readiness contributors (full)
const readinessContributors = dailyReadiness.map(r => ({
  day: r.day,
  score: r.score,
  hrvBalance: r.contributors?.hrv_balance,
  bodyTemp: r.contributors?.body_temperature,
  activityBalance: r.contributors?.activity_balance,
  recoveryIndex: r.contributors?.recovery_index,
  tempDeviation: r.temperature_deviation,
  tempTrend: r.temperature_trend_deviation
}));
```

### Step 3: Update data.json Structure

```javascript
{
  // Existing...

  // NEW sections
  "hrv": {
    "current": 45,
    "trend7Days": [42, 44, 45, 43, 46, 44, 45],
    "avg7Days": 44.1,
    "avg30Days": 43.5,
    "baseline": 44,
    "status": "normal"  // low, normal, high
  },

  "sleepStages": {
    "last7Days": [
      {
        "day": "2025-01-27",
        "deep": 90,      // minutes
        "rem": 120,
        "light": 240,
        "awake": 30,
        "efficiency": 85
      }
    ],
    "avgDeep": 85,
    "avgRem": 110,
    "avgEfficiency": 83
  },

  "stress": {
    "today": {
      "stressMinutes": 180,
      "recoveryMinutes": 240,
      "summary": "restored"
    },
    "trend7Days": ["normal", "stressful", "normal", "restored", ...]
  },

  "spo2": {
    "current": 96.5,
    "trend7Days": [96, 97, 96, 95, 96, 97, 96.5],
    "baseline": 96.2
  },

  "readinessBreakdown": {
    "hrvBalance": 78,
    "bodyTemperature": 90,
    "activityBalance": 85,
    "recoveryIndex": 88,
    "tempDeviation": 0.2
  }
}
```

### Step 4: Update Dashboard UI

Add new sections to index.html:

1. **HRV Card** - Current HRV, trend, baseline comparison
2. **Sleep Stages Chart** - Stacked bar or pie showing deep/REM/light
3. **Stress/Recovery Balance** - Visual balance indicator
4. **Readiness Breakdown** - Show which contributors are low
5. **SpO2 Indicator** - Simple display with alert if abnormal

---

## New Dashboard Metrics Summary

| Metric | Current | After Expansion |
|--------|---------|-----------------|
| Steps | ✅ | ✅ |
| Calories | ✅ | ✅ |
| Heart Rate | ✅ | ✅ |
| Sleep Score | ✅ | ✅ |
| Readiness Score | ✅ | ✅ |
| Workout Count | ✅ | ✅ |
| **HRV** | ❌ | ✅ |
| **Sleep Stages** | ❌ | ✅ |
| **Sleep Efficiency** | ❌ | ✅ |
| **Stress Level** | ❌ | ✅ |
| **Recovery Time** | ❌ | ✅ |
| **SpO2** | ❌ | ✅ |
| **Body Temperature** | ❌ | ✅ |
| **Respiratory Rate** | ❌ | ✅ |
| **Readiness Contributors** | Partial | ✅ Full |
| **VO2 Max** | ❌ | ✅ |
| **Cardiovascular Age** | ❌ | ✅ |

---

## Priority Implementation Order

### Phase 1A (Immediate - High Impact)
1. **HRV tracking** - Single most valuable metric for recovery
2. **Sleep stages** - Deep sleep is critical for recovery
3. **Readiness contributors** - Explain WHY readiness is what it is

### Phase 1B (Quick Wins)
4. **Daily stress** - New endpoint, easy to add
5. **SpO2** - Simple metric, health safety value
6. **Respiratory rate** - Already in sleep data, just extract

### Phase 2 (After Core Features)
7. **VO2 Max** - Fitness tracking
8. **Cardiovascular age** - Long-term health
9. **Resilience** - Mental/stress adaptation
10. **Sleep time recommendations** - Optimize bedtime

---

## Impact on Other Phases

### Morning Coach (Phase 2)
With expanded data, Morning Coach can say:
- "HRV is 20% below baseline - recovery day recommended"
- "Deep sleep was only 45 min (need 90+) - go to bed earlier"
- "Stress was high yesterday, recovery time was low - light activity only"

### AI Insights (Phase 6)
More data = better correlations:
- "Your HRV drops 15% on days after alcohol"
- "Deep sleep increases 20% when you stop eating by 7pm"
- "Your stress patterns show Tuesday is your hardest day"

---

## API Access Notes

Some endpoints may require specific Oura subscription or API scopes:
- SpO2 requires Oura membership
- Some metrics are Gen3/Ring4 only
- Check API response for 401/403 errors and handle gracefully

```javascript
// Graceful handling for optional endpoints
try {
  const spo2 = await fetchOuraData(endpoints.daily_spo2);
  results.data.daily_spo2 = spo2;
} catch (err) {
  console.warn('SpO2 not available:', err.message);
  results.data.daily_spo2 = { data: [], unavailable: true };
}
```

---

## Sources

- [Oura API Documentation](https://cloud.ouraring.com/v2/docs)
- [Oura Help - API Guide](https://support.ouraring.com/hc/en-us/articles/4415266939155-The-Oura-API)
- [oura-ring Python Library](https://github.com/hedgertronic/oura-ring)
- [Oura Readiness Contributors](https://support.ouraring.com/hc/en-us/articles/360057791533-Readiness-Contributors)

---

*Document Version: 1.0*
*Created: January 27, 2025*
