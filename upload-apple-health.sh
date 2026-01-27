#!/bin/bash
# Upload Apple Health data endpoint
# This script receives Apple Health JSON and commits it to the repo

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <path-to-apple-health.json>"
  exit 1
fi

INPUT_FILE="$1"

if [ ! -f "$INPUT_FILE" ]; then
  echo "Error: File not found: $INPUT_FILE"
  exit 1
fi

# Copy to fitness-data directory
TIMESTAMP=$(date +%Y-%m-%d)
OUTPUT_FILE="fitness-data/apple_health_${TIMESTAMP}.json"

mkdir -p fitness-data
cp "$INPUT_FILE" "$OUTPUT_FILE"

echo "✅ Copied to: $OUTPUT_FILE"

# Process the data
node process-apple-health.js

# Commit and push
git add "$OUTPUT_FILE" data.json
git commit -m "📱 Apple Health data synced: $TIMESTAMP"
git push

echo "🚀 Apple Health data uploaded and deployed!"
