#!/bin/sh
set -e

echo "🔄 Running database migrations..."

# -------------------------------------------------------
# Variables configurables via env
# MIGRATIONS_DIR : chemin vers les fichiers SQL
#   → /app/migrations en production (Docker)
#   → ./migrations en CI (checkout local)
# SKIP_HISTORICAL_SEED : si "true", ne pas pré-marquer 0000-0006
#   → false en prod (tables déjà créées via drizzle-kit push)
#   → true en CI (DB vierge, on veut exécuter toutes les migrations)
# -------------------------------------------------------
MIGRATIONS_DIR="${MIGRATIONS_DIR:-/app/migrations}"
SKIP_HISTORICAL_SEED="${SKIP_HISTORICAL_SEED:-false}"

# Vérification obligatoire de DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ FATAL: DATABASE_URL non défini — impossible d'exécuter les migrations"
  exit 1
fi

# Sélection de la connexion : superuser pour DDL (ALTER TABLE), sinon appuser
if [ -n "$DATABASE_URL_SUPERUSER" ]; then
  MIGRATION_URL="$DATABASE_URL_SUPERUSER"
  echo "🔑 Using superuser connection for migrations"
else
  MIGRATION_URL="$DATABASE_URL"
fi

# Vérification que psql est disponible
if ! command -v psql >/dev/null 2>&1; then
  echo "❌ CRITICAL: psql (postgresql-client) is not installed!"
  exit 1
fi

# Vérifier que le répertoire de migrations existe
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ FATAL: répertoire de migrations introuvable : $MIGRATIONS_DIR"
  exit 1
fi

# Créer la table de tracking idempotente
echo "📋 Initializing migrations tracking..."
psql "$MIGRATION_URL" -c "
  CREATE TABLE IF NOT EXISTS _drizzle_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
" || {
  echo "❌ FATAL: Impossible de créer la table de tracking"
  exit 1
}

# Seed des migrations historiques (0000-0006)
# En prod : ces tables ont été créées via drizzle-kit push avant l'existence du tracking.
# On les marque appliquées pour éviter "relation already exists".
# En CI (SKIP_HISTORICAL_SEED=true) : DB vierge → on exécute tout.
if [ "$SKIP_HISTORICAL_SEED" != "true" ]; then
  echo "📋 Seeding historical migrations (0000-0006)..."
  HISTORICAL_MIGRATIONS="
    0000_fearless_stepford_cuckoos.sql
    0001_melted_rockslide.sql
    0002_add_location_and_sector_fields.sql
    0003_subscription_types.sql
    0004_add_crm_prospection_fields.sql
    0005_unify_member_status_and_patron_contacts.sql
    0006_add_customizable_member_statuses.sql
  "
  for hist_migration in $HISTORICAL_MIGRATIONS; do
    hist_migration=$(echo "$hist_migration" | tr -d ' ')
    [ -z "$hist_migration" ] && continue
    if [ -f "$MIGRATIONS_DIR/$hist_migration" ]; then
      psql "$MIGRATION_URL" -c "
        INSERT INTO _drizzle_migrations (filename)
        VALUES ('$hist_migration')
        ON CONFLICT (filename) DO NOTHING;
      " 2>/dev/null || true
    fi
  done
fi

# Exécuter les migrations en ordre numérique garanti (sort -V = version sort)
MIGRATION_COUNT=0
SKIPPED_COUNT=0
FAILED=0

# ls + sort -V garantit l'ordre 0000 < 0001 < ... < 0009 < 0010
# quelle que soit l'implémentation du glob shell
MIGRATION_FILES=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort -V)

if [ -z "$MIGRATION_FILES" ]; then
  echo "⚠️  Aucun fichier .sql trouvé dans $MIGRATIONS_DIR"
  exit 0
fi

for migration in $MIGRATION_FILES; do
  filename=$(basename "$migration")

  # Vérifier si déjà appliquée
  ALREADY_APPLIED=$(psql "$MIGRATION_URL" -t -c \
    "SELECT COUNT(*) FROM _drizzle_migrations WHERE filename = '$filename';" \
    2>/dev/null | tr -d ' \n' || echo "0")

  if [ "$ALREADY_APPLIED" -gt 0 ] 2>/dev/null; then
    echo "  ⏭️  Skipping (already applied): $filename"
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
  else
    echo "  ▶️  Applying: $filename"
    if psql "$MIGRATION_URL" -f "$migration" -v ON_ERROR_STOP=1; then
      psql "$MIGRATION_URL" -c \
        "INSERT INTO _drizzle_migrations (filename) VALUES ('$filename');" \
        || true
      MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
      echo "  ✅ Applied: $filename"
    else
      echo "  ❌ Failed: $filename"
      FAILED=1
      break
    fi
  fi
done

if [ $FAILED -eq 1 ]; then
  echo "❌ Migrations failed! Check the error above."
  exit 1
fi

echo "✅ Migrations completed successfully"
echo "   - Applied:  $MIGRATION_COUNT"
echo "   - Skipped:  $SKIPPED_COUNT"
