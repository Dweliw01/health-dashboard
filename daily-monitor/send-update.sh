#!/bin/bash
# Daily Health Check-In - Send update to Dushan via WhatsApp
# Run via: ./send-update.sh

set -e

cd "$(dirname "$0")"

echo "🔄 Running daily health check..."

# Run the health check analysis
node health-check.js

EXIT_CODE=$?

# Load the report
REPORT_PATH="latest-report.json"

if [ ! -f "$REPORT_PATH" ]; then
    echo "❌ Report not found"
    exit 1
fi

# Extract key metrics
HEALTH_SCORE=$(cat "$REPORT_PATH" | grep -o '"healthScore":[0-9]*' | grep -o '[0-9]*')
SLEEP_SCORE=$(cat "$REPORT_PATH" | jq -r '.metrics.sleepScore // 0')
READINESS=$(cat "$REPORT_PATH" | jq -r '.metrics.readinessScore // 0')
AVG_STEPS=$(cat "$REPORT_PATH" | jq -r '.metrics.dailyAvgSteps // 0')
WORKOUTS=$(cat "$REPORT_PATH" | jq -r '.metrics.totalWorkouts // 0')

# Determine status emoji
if [ "$HEALTH_SCORE" -ge 80 ]; then
    STATUS="🟢 EXCELLENT"
elif [ "$HEALTH_SCORE" -ge 60 ]; then
    STATUS="🟡 GOOD"
else
    STATUS="🔴 NEEDS ATTENTION"
fi

# Build message
MESSAGE="📊 Daily Health Check-In - $(date +%B\ %d)

🏆 Health Score: ${HEALTH_SCORE}/100 ${STATUS}

📈 Today's Metrics:
• Sleep: ${SLEEP_SCORE}%
• Readiness: ${READINESS}%
• Avg Steps: ${AVG_STEPS}/day
• Workouts: ${WORKOUTS}

"

# Add alerts if any
ALERT_COUNT=$(cat "$REPORT_PATH" | jq '.alerts | length')
if [ "$ALERT_COUNT" -gt 0 ]; then
    MESSAGE="${MESSAGE}⚠️ Alerts:
"
    ALERTS=$(cat "$REPORT_PATH" | jq -r '.alerts[]')
    while IFS= read -r alert; do
        MESSAGE="${MESSAGE}• ${alert}
"
    done <<< "$ALERTS"
    MESSAGE="${MESSAGE}
"
fi

# Add recommendations
REC_COUNT=$(cat "$REPORT_PATH" | jq '.recommendations | length')
if [ "$REC_COUNT" -gt 0 ]; then
    MESSAGE="${MESSAGE}💡 Recommendations:
"
    RECS=$(cat "$REPORT_PATH" | jq -r '.recommendations[]')
    while IFS= read -r rec; do
        MESSAGE="${MESSAGE}• ${rec}
"
    done <<< "$RECS"
fi

MESSAGE="${MESSAGE}
Dashboard: https://health-dashboard-gray-kappa.vercel.app/"

echo "📤 Sending update to Dushan..."
echo "$MESSAGE"

# Note: This would be sent via Clawdbot messaging
# For now, output to console and save to file
echo "$MESSAGE" > daily-update.txt
echo "✅ Update saved to daily-update.txt"

# TODO: Integrate with Clawdbot message API
# clawdbot message send --to "+13472057319" --text "$MESSAGE"

exit 0
