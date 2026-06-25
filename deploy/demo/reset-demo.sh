#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

LOG_FILE="${KOMUNO_DEMO_RESET_LOG:-$SCRIPT_DIR/reset-demo.log}"
LOCK_DIR="/tmp/komuno-demo-reset.lock"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "$(date -Is) reset already running" >> "$LOG_FILE"
  exit 0
fi
trap 'rmdir "$LOCK_DIR"' EXIT INT TERM

echo "$(date -Is) reset start" >> "$LOG_FILE"

docker compose -f docker-compose.demo.yml down -v --remove-orphans >> "$LOG_FILE" 2>&1
docker compose -f docker-compose.demo.yml up -d --wait >> "$LOG_FILE" 2>&1

echo "$(date -Is) reset done" >> "$LOG_FILE"
