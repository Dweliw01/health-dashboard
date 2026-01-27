# 📊 Daily Health Monitoring Setup

Dubz will check in on you daily with personalized health insights from your Oura Ring data!

## 🎯 What You'll Get

**Every morning at 8:00 AM UTC (4am ET / 1am PT):**
- 📊 Daily health score (0-100)
- 😴 Sleep & readiness analysis
- 👟 Activity summary
- ⚠️ Health alerts (if any issues)
- 💡 Personalized recommendations
- 📈 Trend analysis

**Example Morning Check-In:**
```
📊 Daily Health Check-In - January 27

🏆 Health Score: 78/100 🟡 GOOD

📈 Today's Metrics:
• Sleep: 66%
• Readiness: 74%
• Avg Steps: 4,325/day
• Workouts: 4

⚠️ Alerts:
• 🟡 Low step count (below 5k/day)
• 🟡 Only 2/7 days active

💡 Recommendations:
• Try to walk 10-15 minutes extra today
• Aim for at least 5 active days per week

Dashboard: https://health-dashboard-gray-kappa.vercel.app/
```

---

## 🚀 Setup (2 Options)

### Option 1: Via GitHub Actions (Automated, Recommended)

**Already set up!** The workflow runs daily at 8:00 AM UTC.

**What it does:**
1. Analyzes your latest Oura data
2. Generates health report
3. Saves to repository
4. (Soon) Sends WhatsApp message via Clawdbot

**To test it now:**
1. Go to: https://github.com/Dweliw01/health-dashboard/actions
2. Click "Daily Health Check-In"
3. Click "Run workflow"
4. Check the results!

---

### Option 2: Via Clawdbot Cron (Direct Messaging)

**Set up Dubz to message you directly:**

1. **Create the cron job:**
```bash
# This command creates a daily check-in at 8am UTC
clawdbot cron add \
  --schedule "0 8 * * *" \
  --text "Check my Oura health data and send me a daily update with my health score, any alerts, and recommendations based on today's metrics"
```

2. **Or via Clawdbot chat:**
Just tell me:
```
"Set up a daily health check-in at 8am that reviews my Oura data and messages me with insights"
```

3. **Dubz will:**
- Pull your latest data.json
- Analyze all metrics
- Send personalized check-in message
- Alert you if anything needs attention

---

## 📋 What Gets Monitored

### 1. Sleep & Recovery
- Sleep quality (target: 70%+)
- Readiness score (target: 70%+)
- Resting heart rate (target: <75 bpm)

### 2. Activity
- Daily step average (target: 10,000)
- Active days per week (target: 5/7)
- Workout frequency (target: 3+/week)

### 3. Trends
- Week-over-week changes
- Consistency rate
- Current streaks

### 4. Health Alerts
- 🔴 Critical: Sleep <60%, HR >80, activity drop >20%
- 🟡 Warning: Sleep <70%, low activity, no workouts
- 🟢 Excellent: High scores, good consistency

---

## 💡 Smart Recommendations

Based on your data, Dubz will suggest:
- **Sleep:** "Prioritize 7-9 hours tonight" (if sleep score low)
- **Activity:** "Try a 10-min walk today" (if steps low)
- **Recovery:** "Take it easy - your body needs rest" (if readiness low)
- **Workouts:** "Schedule 2-3 workouts this week" (if none logged)
- **Motivation:** "Keep it up! You're crushing it!" (when doing well)

---

## 🎯 Health Score Breakdown

**Score = 100 points, deductions for:**
- Sleep < 60%: -15 points
- Readiness < 50%: -15 points
- Steps < 5k: -10 points
- HR > 80 bpm: -10 points
- Consistency < 50%: -10 points
- Active days < 5: -10 points

**Status:**
- 80-100: 🟢 EXCELLENT
- 60-79: 🟡 GOOD
- 0-59: 🔴 NEEDS ATTENTION

---

## 📅 Schedule Options

Want different timing? Easy!

**Morning person (8am UTC = 4am ET):**
```
Already set! Default schedule.
```

**Later morning (12pm UTC = 8am ET):**
```bash
clawdbot cron add --schedule "0 12 * * *" --text "Daily health check-in"
```

**Evening check-in (20:00 UTC = 4pm ET):**
```bash
clawdbot cron add --schedule "0 20 * * *" --text "Daily health check-in"
```

**Multiple times per day:**
```bash
# Morning + Evening
clawdbot cron add --schedule "0 8,20 * * *" --text "Health check-in"
```

---

## 🔔 Alert Thresholds

You'll get proactive alerts when:
- Sleep quality drops below 60%
- Readiness drops below 50%
- Steps drop below 5k/day
- Resting HR goes above 80 bpm
- No workouts for 7+ days
- Activity drops >20% week-over-week
- Consistency falls below 50%

---

## 📊 View Reports

**Daily reports saved to:**
- `daily-monitor/latest-report.json` (most recent)
- `daily-monitor/report-YYYY-MM-DD.json` (historical)

**View in GitHub:**
https://github.com/Dweliw01/health-dashboard/tree/main/daily-monitor

---

## 🛠️ Customization

### Change Alert Thresholds

Edit `health-check.js`:
```javascript
// Line ~28: Sleep threshold
if (m.sleepScore < 60) { // Change 60 to your preferred threshold

// Line ~50: Step threshold  
if (m.dailyAvgSteps < 5000) { // Change 5000 to your preferred threshold
```

### Add Custom Metrics

Add new checks in `health-check.js`:
```javascript
// Example: Monitor HRV
if (m.hrv < 30) {
  alerts.push('🔴 Low HRV detected');
  recommendations.push('Consider stress reduction techniques');
}
```

---

## 🎉 Benefits

✅ **Accountability:** Daily check-ins keep you on track
✅ **Awareness:** Know your health status every day
✅ **Proactive:** Catch issues before they become problems
✅ **Personalized:** Recommendations based on YOUR data
✅ **Automated:** Zero manual work once set up
✅ **Motivating:** Celebrate wins, address concerns

---

## 🚀 Next Steps

1. ✅ Test the GitHub Action workflow (already set up!)
2. 🔄 Set up Clawdbot cron for direct messaging
3. 📊 Review your first daily report
4. 🎯 Adjust schedule/thresholds as needed
5. 💪 Use insights to optimize your health!

---

**Ready to start?** Just say:
```
"Dubz, set up my daily health check-in"
```

And I'll configure everything! 🔥
