#!/usr/bin/env bash
set -euo pipefail
: "${CURRENT_IMAGE_ID:?CURRENT_IMAGE_ID requis}"
: "${ROLLBACK_IMAGE_ID:?ROLLBACK_IMAGE_ID requis}"
: "${CANDIDATE_IMAGE_IDS:?CANDIDATE_IMAGE_IDS requis}"
running="$(docker ps -q | xargs -r docker inspect --format '{{.Image}}' | sort -u)"
for id in $CANDIDATE_IMAGE_IDS; do
  [ "$id" != "$CURRENT_IMAGE_ID" ]
  [ "$id" != "$ROLLBACK_IMAGE_ID" ]
  if grep -qx "$id" <<<"$running"; then echo "refus: image utilisée $id" >&2; exit 1; fi
  docker image inspect "$id" >/dev/null
  docker image rm "$id"
done
printf 'BOUNDED_IMAGE_CLEANUP_OK\n'
