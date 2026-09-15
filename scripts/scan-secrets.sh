#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PATTERN='-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}'
if git grep -IEn -e "$PATTERN" -- . ':!test/**' ':!docs/legacy/**' ':!scripts/scan-secrets.sh'; then
  echo 'Secret probable détecté dans un fichier suivi' >&2
  exit 1
fi
printf 'SECRET_SCAN_OK\n'
