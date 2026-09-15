#!/usr/bin/env bash
set -euo pipefail
COMMIT="${GIT_REVISION:?GIT_REVISION requis}"
DIGEST="${IMAGE_DIGEST:?IMAGE_DIGEST requis}"
INSTANCE="${INSTANCE:?INSTANCE requis}"
IMAGE="${IMAGE_REFERENCE:?IMAGE_REFERENCE requis}"
OUT="${1:-release-manifest.json}"
[[ "$COMMIT" =~ ^[0-9a-f]{40}$ ]]
[[ "$DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]
printf '{"schemaVersion":1,"createdAt":"%s","commit":"%s","image":"%s","digest":"%s","instance":"%s"}\n' "$(date -u +%FT%TZ)" "$COMMIT" "$IMAGE" "$DIGEST" "$INSTANCE" > "$OUT"
sha256sum "$OUT" > "${OUT}.sha256"
printf 'RELEASE_MANIFEST_OK %s\n' "$OUT"
