#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-komuno-demo}"
RESETTER_NAME="${KOMUNO_DEMO_RESETTER_NAME:-komuno-demo-resetter}"
UPDATER_NAME="${KOMUNO_DEMO_UPDATER_NAME:-komuno-demo-updater}"
RESET_INTERVAL_SECONDS="${KOMUNO_DEMO_RESET_INTERVAL_SECONDS:-3600}"
UPDATE_CHECK_INTERVAL_SECONDS="${KOMUNO_DEMO_UPDATE_CHECK_INTERVAL_SECONDS:-3600}"
MIN_UPDATE_INTERVAL_SECONDS="${KOMUNO_DEMO_MIN_INTERVAL_SECONDS:-86400}"

start_or_replace() {
  name="$1"
  shift
  if docker ps -a --format '{{.Names}}' | grep -Fxq "$name"; then
    docker rm -f "$name" >/dev/null
  fi
  docker run -d --name "$name" --restart unless-stopped "$@" >/dev/null
  echo "started $name"
}

# External scheduler: intentionally NOT part of docker-compose.demo.yml because
# reset-demo.sh runs `docker compose down -v` on the demo project. If the scheduler
# were in the same Compose project, it would kill itself mid-reset.
start_or_replace "$RESETTER_NAME" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$SCRIPT_DIR":/workspace \
  -e COMPOSE_PROJECT_NAME="$PROJECT_NAME" \
  docker:27-cli \
  sh -lc "while true; do now=\$(date +%s); next=\$(( (now / $RESET_INTERVAL_SECONDS + 1) * $RESET_INTERVAL_SECONDS )); sleep \$(( next - now )); COMPOSE_PROJECT_NAME=$PROJECT_NAME /workspace/reset-demo.sh || true; done"

# External updater: checks periodically, but auto-update-demo.sh itself enforces
# the 24h deployment/build rate limit.
start_or_replace "$UPDATER_NAME" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$SCRIPT_DIR":/workspace \
  -e COMPOSE_PROJECT_NAME="$PROJECT_NAME" \
  -e KOMUNO_DEMO_MIN_INTERVAL_SECONDS="$MIN_UPDATE_INTERVAL_SECONDS" \
  docker:27-cli \
  sh -lc "apk add --no-cache git >/dev/null 2>&1 || true; while true; do COMPOSE_PROJECT_NAME=$PROJECT_NAME /workspace/auto-update-demo.sh || true; sleep $UPDATE_CHECK_INTERVAL_SECONDS; done"
