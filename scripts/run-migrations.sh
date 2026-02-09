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

# Exécuter chaque fichier de migration dans l'ordre
for migration in /app/migrations/*.sql; do
  if [ -f "$migration" ]; then
    filename=$(basename "$migration")
    echo "  Applying: $filename"
    psql "$DATABASE_URL" -f "$migration" 2>&1 | grep -v "already exists\|duplicate" || true
  fi
done

echo "✅ Migrations completed (errors for existing objects are normal)"
