#!/usr/bin/env bash
set -euo pipefail
umask 077

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/komuno}"
OFFSITE_DIR="${OFFSITE_DIR:?OFFSITE_DIR requis}"
AGE_RECIPIENT="${AGE_RECIPIENT:?AGE_RECIPIENT requis}"
RETENTION_DAYS="${RETENTION_DAYS:-35}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
MINIO_SERVICE="${MINIO_SERVICE:-minio}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="komuno-${STAMP}"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/${NAME}.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$BACKUP_ROOT/encrypted" "$OFFSITE_DIR"
command -v age >/dev/null
command -v docker >/dev/null

docker compose ps --status running "$POSTGRES_SERVICE" "$MINIO_SERVICE" >/dev/null
docker compose exec -T "$POSTGRES_SERVICE" sh -lc 'pg_dump --username="${POSTGRES_USER:-postgres}" --dbname="${POSTGRES_DB:-postgres}" --format=custom' > "$STAGE/postgres.dump"
docker compose exec -T "$MINIO_SERVICE" sh -lc 'tar -C /data -cf - .' > "$STAGE/minio.tar"
printf '{"createdAt":"%s","gitRevision":"%s","postgresService":"%s","minioService":"%s"}\n' \
  "$(date -u +%FT%TZ)" "${GIT_REVISION:-unknown}" "$POSTGRES_SERVICE" "$MINIO_SERVICE" > "$STAGE/manifest.json"
( cd "$STAGE" && sha256sum postgres.dump minio.tar manifest.json > SHA256SUMS )
tar -C "$STAGE" -czf "$BACKUP_ROOT/${NAME}.tar.gz" postgres.dump minio.tar manifest.json SHA256SUMS
age -r "$AGE_RECIPIENT" -o "$BACKUP_ROOT/encrypted/${NAME}.tar.gz.age" "$BACKUP_ROOT/${NAME}.tar.gz"
sha256sum "$BACKUP_ROOT/encrypted/${NAME}.tar.gz.age" > "$BACKUP_ROOT/encrypted/${NAME}.tar.gz.age.sha256"
cp --preserve=timestamps "$BACKUP_ROOT/encrypted/${NAME}.tar.gz.age" "$BACKUP_ROOT/encrypted/${NAME}.tar.gz.age.sha256" "$OFFSITE_DIR/"
rm -f "$BACKUP_ROOT/${NAME}.tar.gz"
find "$BACKUP_ROOT/encrypted" -maxdepth 1 -type f -name 'komuno-*.age*' -mtime "+$RETENTION_DAYS" -delete
printf '{"status":"ok","archive":"%s","offsite":"%s","rpoMinutes":0}\n' "$BACKUP_ROOT/encrypted/${NAME}.tar.gz.age" "$OFFSITE_DIR/${NAME}.tar.gz.age"
