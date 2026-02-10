#!/bin/sh
set -e

echo "🔄 Running database migrations..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set, skipping migrations"
  exit 0
fi

# Installer psql si nécessaire (Alpine)
if ! command -v psql >/dev/null 2>&1; then
  echo "📦 Installing postgresql-client..."
  apk add --no-cache postgresql-client || {
    echo "⚠️  Could not install psql, skipping migrations"
    exit 0
  }
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
