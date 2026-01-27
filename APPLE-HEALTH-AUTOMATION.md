# 🍎 Apple Health Automation Setup

Since Apple Health doesn't have a public API, we'll use **iOS Shortcuts** to auto-export and sync your data.

## 🚀 Quick Setup (10 minutes)

### Option 1: iOS Shortcut with GitHub API (Recommended)

This shortcut will:
- Export your Health data daily
- Upload it to GitHub automatically  
- Trigger dashboard update

#### Step 1: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Name: "Apple Health Upload"
3. Expiration: No expiration
4. Scopes: Check **`repo`** (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (save it somewhere safe!)

#### Step 2: Install the iOS Shortcut

1. **Download this shortcut:** [Apple Health to GitHub Shortcut](shortcut link will be here)

2. **Configure the shortcut:**
   - GitHub Username: `Dweliw01`
   - Repository: `health-dashboard`
   - Branch: `main`
   - GitHub Token: Paste your token from Step 1

3. **Test it:**
   - Run the shortcut manually
   - Check GitHub to see if the file was uploaded

#### Step 3: Automate Daily Sync

1. Open **Shortcuts** app
2. Go to **Automation** tab
3. Create new **Personal Automation**
4. Trigger: **Time of Day** (e.g., 11:00 PM daily)
5. Action: **Run Shortcut** → Select "Apple Health to GitHub"
6. Turn off "Ask Before Running"

**Done!** Your Apple Health data will now sync daily at 11 PM! 🎉

---

## Option 2: Manual Weekly Export (Simple)

If you prefer manual control:

### Export from iPhone:

1. Open **Health** app
2. Tap your **profile picture** (top right)
3. Scroll down → **Export All Health Data**
4. Wait for export (can take 5-10 minutes)
5. Share `export.zip` to yourself (AirDrop, iCloud, email)

### Upload to Dashboard:

**Via command line:**
```bash
# Unzip the export
unzip export.zip

# Process and upload
cd health-dashboard-deploy
./upload-apple-health.sh /path/to/export.xml
```

**Via GitHub web:**
1. Go to: https://github.com/Dweliw01/health-dashboard/upload/main
2. Navigate to `fitness-data/` folder
3. Upload `export.xml` as `apple_health_YYYY-MM-DD.json`
4. Commit changes

---

## Option 3: iOS Shortcut with iCloud Upload (Alternative)

If you don't want to use GitHub tokens:

1. Export Health data to iCloud Drive
2. Use a cron job on your computer to:
   - Fetch from iCloud
   - Process and upload to GitHub
   - Trigger dashboard update

---

## 📊 What Gets Synced

From Apple Health:
- ✅ Step count
- ✅ Active energy burned
- ✅ Exercise minutes  
- ✅ Workouts (type, duration, calories)
- ✅ Heart rate data
- ✅ Stand hours
- ✅ Distance walked/run

Merged with Oura:
- Sleep quality from Oura
- Readiness score from Oura
- Steps + workouts from Apple Health

---

## 🔍 Troubleshooting

**Shortcut not working?**
- Check GitHub token has `repo` scope
- Verify repository name is correct
- Make sure token hasn't expired

**Data not showing on dashboard?**
- Wait ~1 minute for Vercel deploy
- Hard refresh browser (Ctrl+Shift+R)
- Check GitHub Actions for errors

**Want to sync more frequently?**
- Add multiple time-based automations (e.g., every 6 hours)
- iOS allows multiple automations for the same shortcut

---

## 🎯 Recommended Setup

**Best workflow:**
1. ✅ Oura syncs automatically every 6 hours (already set up!)
2. ✅ Apple Health syncs once daily at 11 PM (via iOS Shortcut)
3. ✅ Dashboard always shows combined data from both sources

**Result:** Complete health picture with minimal effort! 🔥

---

## Next Steps

1. Create GitHub token
2. Install iOS Shortcut
3. Set up automation
4. Test it once manually
5. Let it run automatically!

Need help? The iOS Shortcut is super simple - I'll create it for you next!
