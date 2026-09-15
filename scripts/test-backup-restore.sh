#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash -n "$ROOT/scripts/backup-komuno.sh" "$ROOT/scripts/restore-komuno-isolated.sh"
for needle in pg_dump minio.tar AGE_RECIPIENT SHA256SUMS OFFSITE_DIR RETENTION_DAYS; do grep -q "$needle" "$ROOT/scripts/backup-komuno.sh"; done
for needle in pg_restore AGE_IDENTITY sha256sum isolated postgresTables minioArchiveReadable; do grep -q "$needle" "$ROOT/scripts/restore-komuno-isolated.sh"; done
if [ "${RUN_BACKUP_RESTORE_INTEGRATION:-0}" = 1 ]; then
  : "${RESTORE_ARCHIVE:?RESTORE_ARCHIVE requis}"
  AGE_IDENTITY="${AGE_IDENTITY:?AGE_IDENTITY requis}" "$ROOT/scripts/restore-komuno-isolated.sh" "$RESTORE_ARCHIVE"
fi
printf 'BACKUP_RESTORE_CONTRACT_OK\n'
