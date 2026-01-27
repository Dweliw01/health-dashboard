# 🔗 Connect Oura to Apple Health

## Why Connect Them?

When you connect Oura to Apple Health, Oura will:
- ✅ Pull your Apple Health workouts automatically
- ✅ Sync step data from iPhone
- ✅ Get exercise minutes
- ✅ Combine with Oura's sleep/readiness data

**Result:** ONE data source for EVERYTHING - no manual uploads needed! 🔥

---

## 📱 How to Connect (2 minutes)

### Step 1: Open Oura App on iPhone

1. Open the **Oura** app
2. Tap **Menu** (bottom right) → **Settings**

### Step 2: Connect to Apple Health

1. Scroll down to **"Integrations"** or **"Apple Health"**
2. Tap **"Apple Health"**
3. Toggle **ON** for:
   - ✅ **Read** - Allows Oura to read Apple Health data
   - ✅ **Workouts** - Syncs your workouts to Oura
   - ✅ **Steps** - Syncs step count
   - ✅ **Active Energy** - Syncs calories burned
   - ✅ **Exercise Minutes**

4. Tap **"Allow"** in Apple Health permission dialog

### Step 3: Verify Connection

1. Go back to Oura app
2. Check that Apple Health shows as **"Connected"**
3. Wait a few minutes for initial sync

---

## 🔄 What Gets Synced

**From Apple Health → Oura → Your Dashboard:**
- 🏃 All workouts (type, duration, calories)
- 👟 Step count (iPhone + Apple Watch)
- 🔥 Active energy burned
- ⏱️ Exercise minutes
- 💪 Activity data

**From Oura Ring → Your Dashboard:**
- 😴 Sleep quality & stages
- ⚡ Readiness score
- 🫀 Heart rate & HRV
- 🌡️ Body temperature
- 💤 Recovery metrics

**Combined:** Complete health picture! 📊

---

## ✅ Test the Connection

After connecting, test it:

1. Log a workout in Apple Health (or use Apple Fitness+)
2. Wait 10-15 minutes
3. Open Oura app → Check if workout appears
4. Wait for next auto-sync (every 6 hours)
5. Check your dashboard - workout should appear!

**Or trigger manual sync:**
```bash
# Go to GitHub Actions
https://github.com/Dweliw01/health-dashboard/actions

# Run "Sync Oura Data & Update Dashboard" manually
# Wait ~1 minute
# Check dashboard
```

---

## 🎯 Once Connected

**You'll NEVER need to:**
- ❌ Manually export Apple Health
- ❌ Upload export.zip files
- ❌ Use iOS Shortcuts
- ❌ Do anything manual!

**Auto-syncs 4 times per day:**
- 12:00 AM UTC (8pm ET)
- 6:00 AM UTC (2am ET)  
- 12:00 PM UTC (8am ET)
- 6:00 PM UTC (2pm ET)

---

## 📊 What Data Comes From Where

| Metric | Source | Notes |
|--------|--------|-------|
| Sleep | Oura Ring | Most accurate |
| Readiness | Oura Ring | Unique to Oura |
| Workouts | Apple Health via Oura | All workout apps |
| Steps | Apple Health via Oura | iPhone + Watch |
| Heart Rate | Oura Ring | Continuous tracking |
| HRV | Oura Ring | Sleep-time only |
| Calories | Apple Health via Oura | Activity-based |

---

## 🔧 Troubleshooting

**Workouts not showing up?**
- Make sure Oura app is open occasionally (syncs in background)
- Check Oura app → Settings → Apple Health is "Connected"
- Re-toggle Apple Health permissions off/on

**Old data not syncing?**
- Oura typically syncs last 30 days when first connected
- Historical data may take 24 hours to fully sync

**Still having issues?**
- Disconnect and reconnect Apple Health in Oura app
- Restart iPhone
- Make sure both apps are updated to latest versions

---

## 🚀 Next Step

After connecting Oura to Apple Health:

**Delete the complex upload stuff:**
- No need for `upload.html`
- No need for iOS Shortcuts
- No need for manual exports

**Just enjoy your dashboard:**
- Auto-updates 4x/day
- Shows complete health picture
- Zero maintenance! 🎉

---

**Go connect it now!** Takes 2 minutes, saves you hours of manual work! 🔥
