# 🔄 Auto-Sync Setup Guide

Your dashboard will automatically sync with Oura Ring data **every 6 hours** (4 times per day).

## Quick Setup (2 minutes)

### Step 1: Get Your Oura API Token

1. Go to: **https://cloud.ouraring.com/personal-access-tokens**
2. Log in with your Oura account
3. Click **"Create New Personal Access Token"**
4. Give it a name like "Health Dashboard"
5. **Copy the token** (you'll only see it once!)

### Step 2: Add Token to GitHub

1. Go to your GitHub repo: **https://github.com/Dweliw01/health-dashboard**
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**
5. Name: `OURA_ACCESS_TOKEN`
6. Value: Paste your Oura token
7. Click **Add secret**

### Step 3: Push the Automation Files

```bash
git add .github/workflows/sync-oura-data.yml
git add health-dashboard-deploy/fetch-oura-data.js
git add health-dashboard-deploy/process-oura-data.js
git commit -m "Add automatic Oura data sync (every 6 hours)"
git push
```

### Step 4: Test It (Optional)

1. Go to **Actions** tab in GitHub
2. Click **"Sync Oura Data & Update Dashboard"** workflow
3. Click **"Run workflow"** → **"Run workflow"** button
4. Watch it sync in real-time!

---

## ✅ That's It!

Your dashboard will now auto-update:
- **12:00 AM UTC** (8pm ET / 5pm PT)
- **6:00 AM UTC** (2am ET / 11pm PT)
- **12:00 PM UTC** (8am ET / 5am PT)
- **6:00 PM UTC** (2pm ET / 11am PT)

---

## 📊 How It Works

```
Every 6 hours:
  1. GitHub Actions triggers
  2. fetch-oura-data.js pulls latest Oura data via API
  3. process-oura-data.js calculates metrics
  4. Commits data.json to repo
  5. Vercel auto-deploys updated dashboard
  6. Your site shows fresh data (within 1 minute)
```

---

## 🔍 Monitoring

**Check sync status:**
- GitHub repo → **Actions** tab
- See green checkmarks ✅ = successful syncs
- Red X ❌ = check logs for errors

**Manual sync anytime:**
- Actions tab → "Sync Oura Data" → "Run workflow"

---

## 🛠️ Troubleshooting

**Sync failing?**
- Check that `OURA_ACCESS_TOKEN` secret is set correctly
- Verify your Oura token is still valid
- Check Actions logs for specific error

**Data not updating on site?**
- Wait ~30 seconds after GitHub Actions completes
- Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
- Check that data.json was actually updated in repo

**Want different schedule?**
Edit `.github/workflows/sync-oura-data.yml`:
```yaml
# Every 4 hours (6x/day):
- cron: '0 */4 * * *'

# Every 12 hours (2x/day):
- cron: '0 */12 * * *'

# Once per day at 8am UTC:
- cron: '0 8 * * *'
```

---

## 🔐 Security

- Your Oura token is stored as a GitHub Secret (encrypted)
- Never committed to the repository
- Only accessible by GitHub Actions
- Rotatable anytime from Oura dashboard

---

## 📝 Files Added

- `.github/workflows/sync-oura-data.yml` - Automation schedule
- `health-dashboard-deploy/fetch-oura-data.js` - Oura API client
- `health-dashboard-deploy/process-oura-data.js` - Updated to use latest data
- `health-dashboard-deploy/SETUP-AUTO-SYNC.md` - This file

---

**Questions?** Check the GitHub Actions logs or open an issue!
