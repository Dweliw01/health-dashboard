# 🍎 Super Simple Apple Health Upload

## 🚀 3-Step Process (5 minutes)

### Step 1: Get GitHub Token (One-time, 2 minutes)

1. Go to: https://github.com/settings/tokens/new?scopes=repo&description=Health+Dashboard+Upload
2. Click **"Generate token"**
3. **Copy the token** (starts with `ghp_...`)
4. Save it somewhere safe!

### Step 2: Export from iPhone (5-10 minutes)

1. Open **Health** app
2. Tap **profile picture** (top right)
3. Scroll down → **"Export All Health Data"**
4. Wait for export to complete
5. AirDrop or email **export.zip** to yourself

### Step 3: Upload (30 seconds)

1. Go to: **https://your-vercel-url.vercel.app/upload.html**
2. Paste your GitHub token
3. Drag & drop **export.zip**
4. Click **"Upload to Dashboard"**
5. Done! Dashboard updates in ~1-2 minutes

---

## 📊 What Gets Extracted

From your export.zip:
- ✅ Step count (last 7 days average)
- ✅ Workouts (type, duration, calories)
- ✅ Exercise minutes
- ✅ Active calories burned

Merged with Oura data:
- Sleep, Readiness, Recovery from Oura
- Activity, Workouts from Apple Health
- Complete health picture!

---

## 🔄 How Often to Upload

**Recommended:** Once per week

- **Oura syncs automatically** every 6 hours (already set up)
- **Apple Health:** Upload weekly via this simple upload page

**Why weekly?**
- Apple Health exports are large (can take 10 min)
- Most data doesn't change dramatically day-to-day
- Weekly gives you trend insights without the hassle

---

## 🔐 Is My Data Safe?

- ✅ GitHub token stored in your browser only (localStorage)
- ✅ Export.zip uploaded directly to your private GitHub repo
- ✅ No third-party services involved
- ✅ You control all the data

---

## ❓ Troubleshooting

**Upload fails?**
- Check GitHub token is valid (not expired)
- Make sure token has `repo` scope
- Try generating a new token

**Dashboard not updating?**
- Wait 1-2 minutes for processing
- Check GitHub Actions: https://github.com/Dweliw01/health-dashboard/actions
- Hard refresh your dashboard (Ctrl+Shift+R)

**Export.zip too big?**
- Large exports (100MB+) work fine, just take longer to upload
- WiFi recommended for uploads over 50MB

---

## 🎯 Summary

**Setup once:** Get GitHub token, save it
**Weekly routine:** 
1. Export from Health app
2. Upload export.zip to dashboard
3. Done!

**Total time:** ~2 minutes per week (after initial 10min export)

---

That's it! Way simpler than complex iOS Shortcuts! 🔥
