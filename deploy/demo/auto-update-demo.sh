#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-komuno-demo}"
COMPOSE="docker compose -p $PROJECT_NAME -f docker-compose.demo.yml --env-file .env.demo"
REPO_URL="${KOMUNO_DEMO_REPO_URL:-https://github.com/robinswood-io/komuno.git}"
BRANCH="${KOMUNO_DEMO_BRANCH:-main}"
MIN_INTERVAL_SECONDS="${KOMUNO_DEMO_MIN_INTERVAL_SECONDS:-86400}"
FORCE_UPDATE="${KOMUNO_DEMO_FORCE_UPDATE:-false}"
LOG_FILE="${KOMUNO_DEMO_UPDATE_LOG:-$SCRIPT_DIR/auto-update-demo.log}"
STATE_DIR="${KOMUNO_DEMO_UPDATE_STATE_DIR:-$SCRIPT_DIR/.auto-update}"
LOCK_DIR="/tmp/komuno-demo-auto-update.lock"
LAST_ATTEMPT_FILE="$STATE_DIR/last-attempt-epoch"
DEPLOYED_SHA_FILE="$STATE_DIR/deployed-sha"

log() {
  echo "$(date -Is) auto-update $*" >> "$LOG_FILE"
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  log "skipped: update already running"
  exit 0
fi
trap 'rmdir "$LOCK_DIR"' EXIT INT TERM

mkdir -p "$STATE_DIR"

if ! command -v git >/dev/null 2>&1; then
  log "failed: git is required"
  exit 1
fi

REMOTE_SHA=$(git ls-remote "$REPO_URL" "refs/heads/$BRANCH" | awk '{print $1}' | head -1)
if [ -z "$REMOTE_SHA" ]; then
  log "failed: unable to resolve $REPO_URL refs/heads/$BRANCH"
  exit 1
fi

DEPLOYED_SHA=""
if [ -s "$DEPLOYED_SHA_FILE" ]; then
  DEPLOYED_SHA=$(cat "$DEPLOYED_SHA_FILE")
fi

if [ "$FORCE_UPDATE" != "true" ] && [ "$REMOTE_SHA" = "$DEPLOYED_SHA" ]; then
  log "skipped: already deployed $REMOTE_SHA"
  exit 0
fi

NOW=$(date +%s)
LAST_ATTEMPT=0
if [ -s "$LAST_ATTEMPT_FILE" ]; then
  LAST_ATTEMPT=$(cat "$LAST_ATTEMPT_FILE" 2>/dev/null || echo 0)
fi
AGE=$((NOW - LAST_ATTEMPT))

if [ "$FORCE_UPDATE" != "true" ] && [ "$LAST_ATTEMPT" -gt 0 ] && [ "$AGE" -lt "$MIN_INTERVAL_SECONDS" ]; then
  REMAINING=$((MIN_INTERVAL_SECONDS - AGE))
  log "skipped: rate limit active (${REMAINING}s remaining), remote=$REMOTE_SHA deployed=${DEPLOYED_SHA:-none}"
  exit 0
fi

printf '%s\n' "$NOW" > "$LAST_ATTEMPT_FILE"

log "start: remote=$REMOTE_SHA deployed=${DEPLOYED_SHA:-none} branch=$BRANCH"

# Build on the server. Dockerfile.demo repulls the latest published Komuno image
# from GHCR and creates the local demo image used by docker-compose.demo.yml.
$COMPOSE build --pull app >> "$LOG_FILE" 2>&1

# Reset the isolated demo volumes and start the app on the freshly built image.
COMPOSE_PROJECT_NAME="$PROJECT_NAME" "$SCRIPT_DIR/reset-demo.sh" >> "$LOG_FILE" 2>&1

for i in $(seq 1 60); do
  STATUS=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' komuno-demo-app 2>/dev/null || true)
  if [ "$STATUS" = "healthy" ]; then
    printf '%s\n' "$REMOTE_SHA" > "$DEPLOYED_SHA_FILE"
    log "done: deployed $REMOTE_SHA"
    exit 0
  fi
  sleep 5
  if [ "$i" = "60" ]; then
    log "failed: app did not become healthy after deploy, last_status=${STATUS:-unknown}"
    exit 1
  fi
done
