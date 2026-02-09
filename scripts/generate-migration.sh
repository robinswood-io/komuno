#!/bin/bash
set -e

echo "🔄 Generating database migration..."

# Vérifier que DATABASE_URL est configuré
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  echo "Set it with: export DATABASE_URL='postgresql://user:pass@host:port/dbname'"
  exit 1
fi

# Demander le nom de la migration
read -p "📝 Migration name (e.g., add_user_roles): " migration_name

if [ -z "$migration_name" ]; then
  echo "❌ Migration name is required"
  exit 1
fi

echo ""
echo "Generating migration for schema changes..."
npx drizzle-kit generate --name "$migration_name"

echo ""
echo "✅ Migration generated successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Review the generated SQL file in migrations/"
echo "   2. Test the migration locally"
echo "   3. Commit the migration file"
echo "   4. Deploy - migrations will run automatically on container start"
echo ""
