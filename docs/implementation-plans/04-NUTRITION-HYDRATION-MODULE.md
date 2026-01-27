# Phase 4: Nutrition & Hydration Module

## Overview

**Objective:** Track the fuel side of the performance equation - water intake, protein consumption, and overall food quality.

**Problem Statement:** You can't out-train a bad diet. The dashboard tracks activity and sleep but ignores nutrition - a critical pillar for peak performance. Without nutrition data, recommendations are incomplete.

**Solution:** A simple nutrition tracking module that focuses on the highest-impact metrics (protein, hydration, food quality) without the burden of calorie counting.

---

## Design Philosophy

### What We're NOT Building
- Full calorie counter (unsustainable, inaccurate)
- Detailed macro tracker (too much friction)
- Meal planning system (scope creep)

### What We ARE Building
- **Water tracker**: Simple tap counter
- **Protein tracker**: Low/Medium/High or estimated grams
- **Food quality**: Whole foods vs processed rating
- **Optional photo logging**: For AI analysis when desired
- **Correlation insights**: Connect nutrition to sleep/energy

---

## User Stories

### US-4.1: Track Water Intake
> As a user, I want to track my daily water intake so I stay properly hydrated.

**Acceptance Criteria:**
- Tap to add water (glass/bottle increments)
- Visual progress toward daily goal (e.g., 8 glasses)
- Quick add: +1, +2, custom amount
- Reset at midnight
- History viewable

### US-4.2: Track Protein Intake
> As a user, I want to track if I'm hitting my protein goals so I support muscle recovery.

**Acceptance Criteria:**
- Simple rating: Low (<100g) / Medium (100-140g) / High (140g+)
- OR estimated grams input
- Default goal based on body weight (if provided)
- Historical tracking

### US-4.3: Rate Food Quality
> As a user, I want to rate my overall food quality so I can see patterns.

**Acceptance Criteria:**
- 1-5 scale: 1 = all junk, 5 = all whole foods
- Simple tap selection
- Correlate with energy/sleep over time

### US-4.4: Photo Meal Logging (Optional)
> As a user, I want to photograph meals for AI analysis when I'm curious about nutrition.

**Acceptance Criteria:**
- Camera/upload interface
- AI analyzes photo for: foods identified, estimated macros, quality rating
- User can confirm/edit AI suggestions
- Photos stored with meal entry

### US-4.5: See Nutrition Trends
> As a user, I want to see my nutrition patterns over time.

**Acceptance Criteria:**
- Weekly average water intake
- Protein consistency chart
- Food quality trend line
- Correlation with sleep/energy

---

## Technical Specification

### Data Model

```javascript
// nutrition.json
{
  "version": 1,
  "goals": {
    "waterGlasses": 8,           // glasses per day
    "proteinGrams": 150,         // grams per day (or null if using simple rating)
    "useSimpleProtein": true     // true = Low/Med/High, false = grams
  },

  "entries": [
    {
      "date": "2025-01-27",
      "water": {
        "glasses": 7,
        "logs": [
          { "time": "08:30", "amount": 1 },
          { "time": "10:00", "amount": 2 },
          { "time": "12:30", "amount": 1 },
          { "time": "15:00", "amount": 1 },
          { "time": "18:00", "amount": 2 }
        ]
      },
      "protein": {
        "rating": "high",        // low, medium, high (if useSimpleProtein)
        "grams": 165,            // estimated grams (if not using simple)
        "confidence": "estimated" // exact, estimated, guess
      },
      "foodQuality": 4,          // 1-5 scale
      "meals": [
        {
          "id": "meal-1",
          "time": "12:30",
          "type": "lunch",
          "photo": "data:image/jpeg;base64,...",  // or URL
          "aiAnalysis": {
            "foods": [
              { "name": "Grilled chicken breast", "portion": "6 oz", "protein": 42 },
              { "name": "Brown rice", "portion": "1 cup", "protein": 5 },
              { "name": "Steamed broccoli", "portion": "1 cup", "protein": 3 }
            ],
            "totals": {
              "calories": 520,
              "protein": 50,
              "carbs": 45,
              "fat": 12
            },
            "qualityRating": 5,
            "confidence": 0.85
          },
          "userConfirmed": true,
          "userNotes": "Post-workout meal"
        }
      ],
      "notes": "Felt good about eating today"
    }
  ],

  "stats": {
    "avgWater7Days": 6.5,
    "avgProtein7Days": "medium",
    "avgFoodQuality7Days": 3.8,
    "daysTracked": 14
  }
}
```

### Water Tracking Logic

```javascript
// water-tracker.js

const WaterTracker = {
  STORAGE_KEY: 'health_dashboard_nutrition',

  getToday() {
    const data = this.load();
    const today = this.getDateString(new Date());
    return data.entries.find(e => e.date === today)?.water || { glasses: 0, logs: [] };
  },

  addWater(amount = 1) {
    const data = this.load();
    const today = this.getDateString(new Date());

    let entry = data.entries.find(e => e.date === today);
    if (!entry) {
      entry = { date: today, water: { glasses: 0, logs: [] } };
      data.entries.push(entry);
    }

    entry.water.glasses += amount;
    entry.water.logs.push({
      time: new Date().toTimeString().slice(0, 5),
      amount
    });

    this.save(data);
    this.updateUI();
    return entry.water;
  },

  removeWater(amount = 1) {
    const data = this.load();
    const today = this.getDateString(new Date());
    const entry = data.entries.find(e => e.date === today);

    if (entry && entry.water.glasses > 0) {
      entry.water.glasses = Math.max(0, entry.water.glasses - amount);
      this.save(data);
      this.updateUI();
    }
  },

  getProgress() {
    const today = this.getToday();
    const goal = this.getGoal();
    return {
      current: today.glasses,
      goal: goal,
      percentage: Math.round((today.glasses / goal) * 100),
      remaining: Math.max(0, goal - today.glasses)
    };
  }
};
```

### AI Food Analysis Integration

```javascript
// food-analyzer.js

const FoodAnalyzer = {
  API_ENDPOINT: '/api/analyze-food',

  async analyzePhoto(imageData) {
    // Option 1: Call Claude Vision API directly
    // Option 2: Call custom endpoint that uses Claude

    const response = await fetch(this.API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageData,
        prompt: `Analyze this meal photo. Identify each food item, estimate portions, and calculate approximate macros. Return JSON:
        {
          "foods": [{ "name": "", "portion": "", "protein": 0, "carbs": 0, "fat": 0, "calories": 0 }],
          "totals": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
          "qualityRating": 1-5,
          "confidence": 0-1
        }`
      })
    });

    return response.json();
  },

  async quickEstimate(description) {
    // Text-based estimation for quick logging
    const response = await fetch(this.API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        type: 'text_estimate'
      })
    });

    return response.json();
  }
};
```

### API Endpoint (Vercel Serverless)

```javascript
// api/analyze-food.js

import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, description, type } = req.body;

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  try {
    let content;

    if (type === 'text_estimate') {
      // Text-based food estimation
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Estimate the nutritional content of this meal: "${description}". Return JSON with foods array and totals for calories, protein, carbs, fat. Include a quality rating 1-5.`
        }]
      });
      content = response.content[0].text;
    } else {
      // Image-based analysis
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image.replace(/^data:image\/\w+;base64,/, '')
              }
            },
            {
              type: 'text',
              text: `Analyze this meal photo. Identify each food item, estimate portions, and calculate approximate macros. Return JSON only:
              {
                "foods": [{ "name": "", "portion": "", "protein": 0, "carbs": 0, "fat": 0, "calories": 0 }],
                "totals": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
                "qualityRating": 1-5,
                "confidence": 0-1
              }`
            }
          ]
        }]
      });
      content = response.content[0].text;
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return res.status(200).json(JSON.parse(jsonMatch[0]));
    }

    return res.status(500).json({ error: 'Failed to parse response' });

  } catch (error) {
    console.error('Food analysis error:', error);
    return res.status(500).json({ error: 'Analysis failed' });
  }
}
```

---

## UI/UX Specification

### Water Tracker Widget

```
┌─────────────────────────────────────────────────────────────┐
│  💧 WATER TODAY                              Goal: 8 glasses│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│           ┌─────────────────────────────────┐               │
│           │ ████████████████░░░░░░░░        │  6/8          │
│           └─────────────────────────────────┘               │
│                                                              │
│           2 glasses to go                                    │
│                                                              │
│     ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│     │   -1    │  │   +1    │  │   +2    │                  │
│     └─────────┘  └─────────┘  └─────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Compact Water Widget (Dashboard Card)

```
┌─────────────────────────┐
│ 💧                75%   │
│ 6/8 glasses             │
│                         │
│ ████████████░░░░        │
│                         │
│    [-]   [+1]   [+2]    │
└─────────────────────────┘
```

### Protein Tracker (Simple Mode)

```
┌─────────────────────────────────────────────────────────────┐
│  🥩 PROTEIN TODAY                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  How was your protein intake today?                          │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │              │ │              │ │              │        │
│  │     LOW      │ │    MEDIUM    │ │     HIGH     │        │
│  │   <100g      │ │   100-140g   │ │    140g+     │        │
│  │              │ │      ✓       │ │              │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                              │
│  Examples:                                                   │
│  Low: No meat/fish, minimal dairy                           │
│  Medium: 1-2 protein sources                                 │
│  High: Protein at every meal + snacks                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Food Quality Rating

```
┌─────────────────────────────────────────────────────────────┐
│  🥗 FOOD QUALITY TODAY                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  How clean was your eating today?                            │
│                                                              │
│     1        2        3        4        5                    │
│    🍔       🍕       🥪       🥗       🥦                   │
│   [ ]      [ ]      [ ]      [●]      [ ]                   │
│                                                              │
│   Mostly    Mixed    Balanced  Mostly   All                  │
│   junk              50/50     whole    whole                 │
│                               foods    foods                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Photo Meal Logger

```
┌─────────────────────────────────────────────────────────────┐
│  📸 LOG MEAL                                       [Cancel] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │                                                      │   │
│  │            [Photo Preview Area]                      │   │
│  │                                                      │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌───────────────┐      ┌───────────────┐                  │
│  │  📷 Camera    │      │  📁 Upload    │                  │
│  └───────────────┘      └───────────────┘                  │
│                                                              │
│  OR describe your meal:                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Chicken breast with rice and vegetables             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              🔍 ANALYZE MEAL                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### AI Analysis Results

```
┌─────────────────────────────────────────────────────────────┐
│  📊 MEAL ANALYSIS                              [Edit] [Save]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  DETECTED FOODS                            │
│  │   [Photo]   │  ─────────────────                         │
│  │             │  • Grilled chicken breast (6 oz)           │
│  │             │  • Brown rice (1 cup)                      │
│  └─────────────┘  • Steamed broccoli (1 cup)               │
│                   • Side salad with olive oil               │
│                                                              │
│  ─────────────────────────────────────────────────────      │
│                                                              │
│  ESTIMATED NUTRITION                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │  520    │ │   50g   │ │   45g   │ │   14g   │          │
│  │  cals   │ │ protein │ │  carbs  │ │   fat   │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                              │
│  Quality: ⭐⭐⭐⭐⭐ Excellent                               │
│  Confidence: 85%                                             │
│                                                              │
│  ─────────────────────────────────────────────────────      │
│                                                              │
│  ⚠️ AI estimates may vary ±20%. Adjust if needed.           │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                ✓ SAVE TO TODAY                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Nutrition Dashboard Section

```
┌─────────────────────────────────────────────────────────────────────────┐
│  NUTRITION TODAY                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ 💧 Water        │  │ 🥩 Protein      │  │ 🥗 Food Quality │         │
│  │                 │  │                 │  │                 │         │
│  │    6/8          │  │    MEDIUM       │  │      4/5        │         │
│  │   ████████░░    │  │    ~120g        │  │    ⭐⭐⭐⭐     │         │
│  │                 │  │                 │  │                 │         │
│  │  [+1] [+2]      │  │    [Update]     │  │    [Update]     │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  📸 Log a meal with photo                                    [+]  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  TODAY'S MEALS                                                           │
│  ─────────────                                                          │
│  12:30 - Lunch: Chicken, rice, vegetables (50g protein) ✓              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Weekly Nutrition Trends

```
┌─────────────────────────────────────────────────────────────────────────┐
│  NUTRITION TRENDS                                          [This Week] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  WATER INTAKE (glasses/day)                                              │
│  Target: 8 │▓▓▓▓▓▓▓░│▓▓▓▓▓▓░░│▓▓▓▓▓▓▓▓│▓▓▓▓▓░░░│▓▓▓▓▓▓░░│▓▓▓▓▓▓▓░│     │
│            │   7   │   6   │   8   │   5   │   6   │   7   │     │
│            │  Mon  │  Tue  │  Wed  │  Thu  │  Fri  │  Sat  │     │
│                                                                          │
│  Avg: 6.5 glasses (81% of goal)                                         │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────      │
│                                                                          │
│  PROTEIN CONSISTENCY                                                     │
│  │ H │  ●       ●           ●                                           │
│  │ M │      ●       ●   ●                                               │
│  │ L │                          ●                                       │
│  │   └─────────────────────────────                                     │
│      Mon  Tue  Wed  Thu  Fri  Sat                                       │
│                                                                          │
│  This week: 2 High, 3 Medium, 1 Low                                     │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────      │
│                                                                          │
│  FOOD QUALITY TREND                                                      │
│  │ 5 │           ●                                                      │
│  │ 4 │  ●   ●       ●   ●                                               │
│  │ 3 │                      ●   ●                                       │
│  │ 2 │                                                                  │
│  │   └─────────────────────────────                                     │
│                                                                          │
│  Avg: 3.9/5 (Good)                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Data Layer
- Create `nutrition-manager.js`
- Implement water tracking CRUD
- Implement protein tracking
- Implement food quality rating
- localStorage persistence

### Step 2: Water Tracker Widget
- Add water tracking card to dashboard
- Implement +/- buttons
- Progress bar visualization
- Goal setting in settings panel

### Step 3: Protein & Food Quality
- Add protein rating selector
- Add food quality scale
- Connect to daily entry
- Add to daily check-in flow (Phase 3)

### Step 4: Photo Logging UI
- Camera/upload interface
- Photo preview
- Text description fallback
- Loading state for AI analysis

### Step 5: AI Analysis Endpoint
- Create `/api/analyze-food` endpoint
- Integrate Claude Vision API
- Response parsing and validation
- Error handling

### Step 6: Nutrition Trends
- Weekly aggregation logic
- Trend charts (reuse Chart.js)
- Correlation with sleep/energy

### Step 7: Integration
- Add nutrition to Morning Coach recommendations
- Include in daily check-in
- Feed to AI insights (Phase 6)

---

## File Changes Required

| File | Change Type | Description |
|------|-------------|-------------|
| `index.html` | Modify | Add nutrition dashboard section |
| `nutrition-manager.js` | Create | Nutrition data management |
| `water-tracker.js` | Create | Water-specific tracking |
| `food-analyzer.js` | Create | AI photo analysis client |
| `api/analyze-food.js` | Create | Vercel serverless function |
| `nutrition.json` | Create | Nutrition data storage |

---

## Testing Checklist

- [ ] Water increments/decrements correctly
- [ ] Water resets at midnight
- [ ] Protein rating saves correctly
- [ ] Food quality rating saves correctly
- [ ] Photo capture works on mobile
- [ ] Photo upload works on desktop
- [ ] AI analysis returns valid JSON
- [ ] AI analysis handles errors gracefully
- [ ] Nutrition data persists across reloads
- [ ] Weekly trends calculate correctly
- [ ] Charts render properly

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Water Tracking Usage | 70%+ of active days | Entries with water data |
| Protein Tracking | 60%+ of active days | Entries with protein data |
| Photo Logging | 10+ meals/month | Photo entries |
| AI Analysis Accuracy | User confirms 80%+ | Confirmation rate |

---

## Correlations with Oura Data (Enhanced)

With expanded Oura data, we can provide powerful nutrition ↔ health correlations:

### Key Correlations to Track

| Nutrition Factor | Oura Metric | Expected Correlation |
|-----------------|-------------|---------------------|
| **Protein intake** | HRV next day | Higher protein → better HRV recovery |
| **Water intake** | HRV, Readiness | Hydration → improved HRV and readiness |
| **Late eating** | Deep sleep | Eating after 8pm → less deep sleep |
| **Food quality** | Sleep efficiency | Whole foods → better sleep efficiency |
| **Alcohol** | HRV, REM sleep | Alcohol → HRV crash, REM reduction |
| **Caffeine timing** | Sleep latency | Late caffeine → longer time to fall asleep |

### Correlation Analysis Logic

```javascript
// nutrition-correlations.js

const NutritionCorrelations = {
  analyze(nutritionData, ouraData, days = 30) {
    const correlations = [];

    // Protein vs next-day HRV
    const proteinHrvPairs = this.alignDataWithNextDay(
      nutritionData, 'protein',
      ouraData, 'hrv'
    );
    if (proteinHrvPairs.length >= 14) {
      const r = this.pearsonCorrelation(proteinHrvPairs);
      if (Math.abs(r) > 0.3) {
        correlations.push({
          factor1: 'Protein intake',
          factor2: 'Next-day HRV',
          correlation: r,
          insight: r > 0 ?
            `Higher protein days are followed by ${Math.round(r*100)}% better HRV` :
            `Your protein intake doesn't seem to affect HRV`,
          recommendation: r > 0 ?
            'Keep hitting your protein target for better recovery' :
            null
        });
      }
    }

    // Water vs same-day readiness
    const waterReadinessPairs = this.alignData(
      nutritionData, 'water',
      ouraData, 'readinessScore'
    );
    if (waterReadinessPairs.length >= 14) {
      const avgReadinessHighWater = this.avgWhen(waterReadinessPairs, w => w.water >= 8, 'readiness');
      const avgReadinessLowWater = this.avgWhen(waterReadinessPairs, w => w.water < 6, 'readiness');
      if (avgReadinessHighWater && avgReadinessLowWater) {
        const diff = avgReadinessHighWater - avgReadinessLowWater;
        if (diff > 5) {
          correlations.push({
            factor1: 'Water intake (8+ glasses)',
            factor2: 'Readiness score',
            impact: diff,
            insight: `Days with 8+ glasses of water: ${Math.round(avgReadinessHighWater)} readiness vs ${Math.round(avgReadinessLowWater)} on low water days`,
            recommendation: 'Prioritize hydration to boost your readiness score'
          });
        }
      }
    }

    // Food quality vs deep sleep
    const qualitySleepPairs = this.alignDataWithNextDay(
      nutritionData, 'foodQuality',
      ouraData, 'deepSleep'
    );
    // ... similar analysis

    return correlations;
  }
};
```

### Insights Display

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔗 NUTRITION INSIGHTS (from your data)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  💧 HYDRATION → RECOVERY                                                │
│  Days with 8+ glasses: 76 avg readiness                                 │
│  Days with <6 glasses: 64 avg readiness                                 │
│  → Drinking enough water boosts your readiness by 12 points!            │
│                                                                          │
│  🥩 PROTEIN → HRV                                                       │
│  High protein days: 46ms avg HRV next day                               │
│  Low protein days: 38ms avg HRV next day                                │
│  → Hitting protein goals improves your HRV by 21%                       │
│                                                                          │
│  🌙 LATE EATING → DEEP SLEEP                                            │
│  Dinner before 7pm: 92 min avg deep sleep                               │
│  Dinner after 9pm: 68 min avg deep sleep                                │
│  → Earlier dinner could add 24 min to your deep sleep                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Dependencies

- **Phase 3 (Check-in)**: Nutrition can be part of daily check-in
- **Phase 7 (Oura Data Expansion)**: Requires HRV, sleep stages for correlations
- **Anthropic API Key**: Required for AI food analysis
- **Vercel**: For serverless API endpoint

---

## Cost Considerations

AI food analysis uses Claude API:
- Estimated cost per photo: ~$0.01-0.02
- Budget for 100 analyses/month: ~$2
- Consider caching common foods
- Offer text-based estimation as free alternative

---

## Definition of Done

- [ ] Water tracking works with visual progress
- [ ] Protein tracking (simple or grams) works
- [ ] Food quality rating works
- [ ] Photo logging captures and displays images
- [ ] AI analysis returns nutritional estimates
- [ ] Data persists in localStorage
- [ ] Weekly trends are visible
- [ ] Mobile experience is smooth

---

*Phase 4 Document Version: 2.0*
*Updated: January 27, 2025 - Added nutrition ↔ Oura correlations (protein→HRV, water→readiness, etc.)*
