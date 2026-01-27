# 💪 Health Analytics Dashboard

A real-time health analytics dashboard powered by your Oura Ring data.

## Features

✨ **8 Advanced Intelligence Features:**

1. **📊 Performance Trends** - Week-over-week comparison
2. **💤 Recovery Metrics** - Sleep, readiness, and overtraining detection
3. **💪 Workout Effectiveness** - Activity type analysis
4. **⏰ Time Analysis** - Best hours for peak performance
5. **🔥 Streaks & Consistency** - Track active day streaks
6. **⚠️ Health Warnings** - HR spikes, low activity alerts
7. **🔮 Predictive Analytics** - 30-day projections
8. **📈 Comparisons** - Multi-week performance tracking

## Setup

### Prerequisites
- Node.js installed
- Oura Ring data synced to `../fitness-data/oura_sync_*.json`

### Installation
```bash
cd health-dashboard-deploy
npm install # If you add dependencies later
```

## Usage

### Update Dashboard with Latest Data
```bash
./update.sh
```

This will:
1. Process your latest Oura data
2. Generate `data.json` with calculated metrics
3. Update the dashboard automatically

### View Locally
Simply open `index.html` in your browser, or run:
```bash
python3 -m http.server 8000
# Then visit: http://localhost:8000
```

### Deploy to Vercel
```bash
vercel --prod
```

## Data Flow

```
fitness-data/oura_sync_*.json
         ↓
  process-oura-data.js
         ↓
      data.json
         ↓
     index.html (dashboard)
```

## Metrics Tracked

- **Daily Steps** - Average and trends
- **Heart Rate** - Resting and activity patterns
- **Active Days** - Days hitting 10k+ steps
- **Sleep Score** - Oura sleep quality metrics
- **Readiness Score** - Recovery and fitness readiness
- **Calories** - Active calorie burn
- **Streaks** - Consecutive active days
- **Activity Distribution** - Time-of-day patterns

## Customization

### Update Goals
Edit `process-oura-data.js` to adjust:
- Step targets (default: 10,000)
- Activity thresholds
- Projection algorithms

### Styling
Modify CSS variables in `index.html`:
```css
:root {
    --bg: #0a0a0f;
    --accent: #00f5ff;
    --accent2: #ff00ff;
    /* ... */
}
```

## Files

- `index.html` - Main dashboard UI
- `process-oura-data.js` - Data processor
- `data.json` - Generated metrics (auto-updated)
- `update.sh` - Quick update script
- `vercel.json` - Deployment config

## Troubleshooting

**Charts not showing?**
- Make sure `data.json` exists
- Check browser console for errors
- Verify Oura data path in `process-oura-data.js`

**Data looks wrong?**
- Re-run `./update.sh`
- Check that `../fitness-data/oura_sync_*.json` is up-to-date

**Deployment issues?**
- Ensure `vercel.json` is present
- Run `vercel login` first
- Use `vercel --prod` for production deploys

## Next Steps

- [ ] Set up automatic Oura data sync
- [ ] Add workout type detection
- [ ] Integrate with other health APIs
- [ ] Build mobile-responsive view
- [ ] Add export/PDF report feature

---

Built with ❤️ for peak performance tracking 🔥
