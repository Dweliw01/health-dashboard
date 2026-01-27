#!/bin/bash
# Update health dashboard with latest Oura data

echo "🔄 Updating health dashboard with latest Oura data..."

# Process Oura data
node process-oura-data.js

echo ""
echo "✅ Dashboard updated!"
echo "📊 View at: health-dashboard-deploy/index.html"
echo ""
echo "💡 To deploy to Vercel, run: vercel --prod"
