#!/bin/sh
# Wrapper script for Next.js dev server to keep it running
# This prevents the "npm run dev:next exited with code 0" issue on Alpine

MAX_RESTARTS=100
RESTART_COUNT=0

echo "🚀 Starting Next.js dev server wrapper..."

while [ $RESTART_COUNT -lt $MAX_RESTARTS ]; do
  RESTART_COUNT=$((RESTART_COUNT + 1))
  echo "📍 Attempt $RESTART_COUNT of $MAX_RESTARTS"

  # Run Next.js dev server
  npm run dev:next:raw

  EXIT_CODE=$?
  echo "⚠️ Next.js exited with code $EXIT_CODE at $(date)"

  if [ $EXIT_CODE -eq 0 ]; then
    # Successful exit - likely a restart, wait a bit before restarting
    echo "⏳ Waiting 2 seconds before restart..."
    sleep 2
  else
    # Error exit - wait longer
    echo "💥 Error detected, waiting 5 seconds..."
    sleep 5
  fi
done

echo "❌ Maximum restart attempts ($MAX_RESTARTS) reached. Exiting."
exit 1
