# 🏋️ Personal Health Dashboard

A beautiful, interactive dashboard for tracking your health and fitness metrics from Apple Health.

![Health Dashboard](https://img.shields.io/badge/Status-Live-success)
![Platform](https://img.shields.io/badge/Platform-Vercel-black)

## ✨ Features

- 📊 **Real-time Stats**: Steps, heart rate, calories, and workouts
- 📈 **Trend Charts**: 7-day visualizations of your progress
- 🎯 **Goal Tracking**: Visual progress bars for daily/weekly targets
- 💾 **Local Storage**: Your data stays in your browser
- 🎨 **Beautiful UI**: Modern, responsive design
- 📱 **Mobile Friendly**: Works great on all devices

## 🚀 Quick Start

1. **Visit the dashboard**: [Your Live URL]
2. **Export your Apple Health data**:
   - Open Apple Health app on iPhone
   - Tap your profile → Export All Health Data
   - Save the export
3. **Process your data**:
   - Use the Python scripts in `/scripts` folder
   - Generate `data.json` from your export
4. **Upload to dashboard**:
   - Click "Upload Health Data"
   - Select your `data.json` file
   - Dashboard updates instantly!

## 📊 Data Format

The dashboard expects a JSON file with this structure:

```json
{
  "today": {
    "steps": 10000,
    "avgHeartRate": 75,
    "calories": 500
  },
  "thisWeek": {
    "workouts": 5
  },
  "last7Days": {
    "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "values": [8000, 10000, 12000, 9500, 11000, 13000, 10500]
  },
  "heartRateTrends": {
    "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "values": [72, 75, 73, 74, 76, 71, 75]
  },
  "workoutDistribution": {
    "labels": ["Strength", "Running", "Cycling", "Yoga"],
    "values": [5, 3, 2, 1]
  }
}
```

## 🛠️ Local Development

```bash
# Clone the repo
git clone https://github.com/Dweliw01/health-dashboard.git

# Open in browser
open index.html

# Or use a local server
python3 -m http.server 8080
```

## 🎯 Goals & Targets

Current default goals:
- **Daily Steps**: 10,000
- **Weekly Workouts**: 5
- **Active Calories**: 500/day

Edit these in the JavaScript section of `index.html`.

## 📱 Privacy

- **100% Client-Side**: All data processing happens in your browser
- **No Server Upload**: Your health data never leaves your device
- **Local Storage**: Data stored only in your browser's localStorage
- **No Tracking**: No analytics or third-party tracking

## 🔄 Updating Your Data

1. Export new Apple Health data
2. Process with Python scripts
3. Upload new JSON file
4. Dashboard auto-updates!

## 💪 Powered By

- [Chart.js](https://www.chartjs.org/) - Beautiful charts
- Vanilla JavaScript - No frameworks needed
- CSS Grid & Flexbox - Responsive layouts
- LocalStorage API - Client-side persistence

## 📝 License

MIT License - Feel free to use and modify!

## 🤝 Contributing

Suggestions and improvements welcome! Open an issue or PR.

---

**Track. Optimize. Achieve.** 💪
