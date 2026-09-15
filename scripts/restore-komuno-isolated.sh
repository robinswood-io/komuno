#!/usr/bin/env bash
set -euo pipefail
umask 077
ARCHIVE="${1:?archive .age requise}"
AGE_IDENTITY="${AGE_IDENTITY:?AGE_IDENTITY requis}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:16-alpine}"
NAME="komuno-restore-$RANDOM-$$"
WORK="$(mktemp -d)"
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
command -v age >/dev/null
sha256sum -c "${ARCHIVE}.sha256" >/dev/null
age -d -i "$AGE_IDENTITY" -o "$WORK/archive.tar.gz" "$ARCHIVE"
tar -xzf "$WORK/archive.tar.gz" -C "$WORK"
( cd "$WORK" && sha256sum -c SHA256SUMS >/dev/null )
tar -tf "$WORK/minio.tar" >/dev/null
START="$(date +%s)"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=restore -e POSTGRES_DB=restore "$POSTGRES_IMAGE" >/dev/null
for _ in $(seq 1 30); do docker exec "$NAME" pg_isready -U postgres -d restore >/dev/null 2>&1 && break; sleep 1; done
docker exec -i "$NAME" pg_restore -U postgres -d restore --clean --if-exists < "$WORK/postgres.dump"
TABLES="$(docker exec "$NAME" psql -U postgres -d restore -Atc "select count(*) from pg_tables where schemaname='public'")"
[ "$TABLES" -gt 0 ]
SECONDS_USED="$(( $(date +%s) - START ))"
printf '{"status":"ok","target":"isolated","postgresTables":%s,"restoreSeconds":%s,"minioArchiveReadable":true}\n' "$TABLES" "$SECONDS_USED"
