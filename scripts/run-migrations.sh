#!/bin/sh
set -e

echo "🔄 Running database migrations..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set, skipping migrations"
  exit 0
fi

# Vérifier que psql est disponible
if ! command -v psql >/dev/null 2>&1; then
  echo "❌ CRITICAL: psql (postgresql-client) is not installed!"
  echo "   Migrations cannot run without psql."
  echo "   Please ensure postgresql-client is installed in the Docker image."
  exit 1
fi

# Créer la table de tracking des migrations si elle n'existe pas
echo "📋 Initializing migrations tracking..."
psql "$DATABASE_URL" -c "
  CREATE TABLE IF NOT EXISTS _drizzle_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
" || {
  echo "⚠️  Could not create migrations table, continuing anyway..."
}

# Seed: marquer les migrations historiques comme appliquées
# Ces migrations 0000-0006 existaient avant le tracking et leurs tables
# sont déjà présentes en prod (via drizzle-kit push). On les marque appliquées
# pour éviter de les ré-exécuter (erreur "relation already exists").
echo "📋 Seeding historical migrations..."
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
  if [ -f "/app/migrations/$hist_migration" ]; then
    psql "$DATABASE_URL" -c "
      INSERT INTO _drizzle_migrations (filename)
      VALUES ('$hist_migration')
      ON CONFLICT (filename) DO NOTHING;
    " 2>/dev/null || true
  fi
done

# Exécuter chaque fichier de migration dans l'ordre
MIGRATION_COUNT=0
SKIPPED_COUNT=0
FAILED=0

for migration in /app/migrations/*.sql; do
  if [ -f "$migration" ]; then
    filename=$(basename "$migration")

    # Vérifier si la migration a déjà été appliquée
    ALREADY_APPLIED=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM _drizzle_migrations WHERE filename = '$filename';" 2>/dev/null || echo "0")

    if [ "$ALREADY_APPLIED" -gt 0 ]; then
      echo "  ⏭️  Skipping (already applied): $filename"
      SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    else
      echo "  ▶️  Applying: $filename"

      # Exécuter la migration
      if psql "$DATABASE_URL" -f "$migration" -v ON_ERROR_STOP=1; then
        # Enregistrer la migration comme appliquée
        psql "$DATABASE_URL" -c "INSERT INTO _drizzle_migrations (filename) VALUES ('$filename');" || true
        MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
        echo "  ✅ Applied: $filename"
      else
        echo "  ❌ Failed: $filename"
        FAILED=1
        break
      fi
    fi
  fi
done

if [ $FAILED -eq 1 ]; then
  echo "❌ Migrations failed! Please check the error above."
  exit 1
fi

echo "✅ Migrations completed successfully"
echo "   - Applied: $MIGRATION_COUNT"
echo "   - Skipped: $SKIPPED_COUNT"
