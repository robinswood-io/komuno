#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-komuno-demo}"
COMPOSE="docker compose -p $PROJECT_NAME -f docker-compose.demo.yml --env-file .env.demo"
LOG_FILE="${KOMUNO_DEMO_RESET_LOG:-$SCRIPT_DIR/reset-demo.log}"
LOCK_DIR="/tmp/komuno-demo-reset.lock"
SCHEMA_FILE="${KOMUNO_DEMO_SCHEMA_FILE:-$SCRIPT_DIR/schema.sql}"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "$(date -Is) reset already running" >> "$LOG_FILE"
  exit 0
fi
trap 'rmdir "$LOCK_DIR"' EXIT INT TERM

if [ ! -s "$SCHEMA_FILE" ]; then
  echo "$(date -Is) missing schema file: $SCHEMA_FILE" >> "$LOG_FILE"
  exit 1
fi

echo "$(date -Is) reset start" >> "$LOG_FILE"

$COMPOSE down -v --remove-orphans >> "$LOG_FILE" 2>&1
$COMPOSE up -d postgres redis minio >> "$LOG_FILE" 2>&1

for i in $(seq 1 60); do
  if docker exec komuno-demo-postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [ "$i" = "60" ]; then
    echo "$(date -Is) postgres not ready" >> "$LOG_FILE"
    exit 1
  fi
done

docker exec -i komuno-demo-postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < "$SCHEMA_FILE" >> "$LOG_FILE" 2>&1
$COMPOSE up -d --wait app >> "$LOG_FILE" 2>&1

echo "$(date -Is) reset done" >> "$LOG_FILE"
