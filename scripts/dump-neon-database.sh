#!/bin/bash
set -e

# ============================================================================
# Script de dump de la base de données Neon vers fichier SQL
# Usage: ./scripts/dump-neon-database.sh [DATABASE_URL]
# ============================================================================

echo "=================================================="
echo "📦 Dump Base de Données Neon"
echo "=================================================="

# Variables
DATABASE_URL="${1:-${DATABASE_URL}}"
BACKUP_DIR="/docker/cjd80/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP_FILE="${BACKUP_DIR}/neon-dump-${TIMESTAMP}.sql"

# Vérifier que DATABASE_URL est fournie
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERREUR: DATABASE_URL non fournie"
    echo "   Usage: $0 [DATABASE_URL]"
    echo "   Ou définir la variable d'environnement DATABASE_URL"
    exit 1
fi

# Créer le répertoire de backup si nécessaire
echo "📁 Création du répertoire de backup..."
mkdir -p "$BACKUP_DIR"

# Utiliser Docker pour pg_dump si pg_dump n'est pas disponible localement
USE_DOCKER=false
if ! command -v pg_dump &> /dev/null; then
    echo "⚠️  pg_dump non trouvé localement, utilisation de Docker..."
    if command -v docker &> /dev/null; then
        USE_DOCKER=true
        echo "✅ Docker disponible, utilisation du conteneur postgres:19.0-alpine"
    else
        echo "❌ ERREUR: pg_dump et Docker ne sont pas disponibles"
        echo "   Veuillez installer postgresql-client ou Docker"
        exit 1
    fi
fi

# Extraire les informations de connexion depuis DATABASE_URL
# Format: postgresql://user:password@host:port/database?sslmode=require
# Utiliser Python pour parser l'URL correctement
DB_INFO=$(python3 -c "
import urllib.parse
import sys
url = sys.argv[1]
parsed = urllib.parse.urlparse(url)
user = parsed.username or ''
password = parsed.password or ''
host = parsed.hostname or ''
port = str(parsed.port) if parsed.port else '5432'
database = parsed.path.lstrip('/').split('?')[0] if parsed.path else ''
print(f'{user}|{password}|{host}|{port}|{database}')
" "$DATABASE_URL" 2>/dev/null)

if [ -z "$DB_INFO" ]; then
    # Fallback: extraction manuelle si Python n'est pas disponible
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
else
    IFS='|' read -r DB_USER DB_PASS DB_HOST DB_PORT DB_NAME <<< "$DB_INFO"
fi

# Vérifier que toutes les variables sont extraites
if [ -z "$DB_USER" ] || [ -z "$DB_PASS" ] || [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ]; then
    echo "❌ ERREUR: Impossible d'extraire les informations de connexion depuis DATABASE_URL"
    echo "   Format attendu: postgresql://user:password@host:port/database?sslmode=require"
    exit 1
fi

# Port par défaut si non spécifié
DB_PORT="${DB_PORT:-5432}"

echo "🔍 Informations de connexion:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Exécuter le dump
echo "📥 Début du dump de la base de données..."
echo "   Fichier de sortie: $DUMP_FILE"
echo ""

# Exporter le mot de passe pour pg_dump
export PGPASSWORD="$DB_PASS"

# Exécuter pg_dump avec options optimisées
if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Utilisation de Docker pour pg_dump..."
    docker run --rm -i \
        -e PGPASSWORD="$DB_PASS" \
        -e PGSSLMODE=require \
        postgres:19.0-alpine \
        pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --verbose \
        > "$DUMP_FILE"
else
    export PGSSLMODE=require
    pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --dbname="$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --verbose \
        --file="$DUMP_FILE"
fi

# Vérifier le succès du dump
if [ $? -eq 0 ] && [ -f "$DUMP_FILE" ]; then
    DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
    echo ""
    echo "✅ Dump réussi!"
    echo "   Fichier: $DUMP_FILE"
    echo "   Taille: $DUMP_SIZE"
    echo ""
    
    # Afficher quelques statistiques
    echo "📊 Statistiques du dump:"
    echo "   Lignes: $(wc -l < "$DUMP_FILE")"
    echo ""
    
    # Créer un lien symbolique vers le dernier dump
    LATEST_DUMP="${BACKUP_DIR}/neon-dump-latest.sql"
    ln -sf "$(basename "$DUMP_FILE")" "$LATEST_DUMP"
    echo "🔗 Lien symbolique créé: $LATEST_DUMP -> $(basename "$DUMP_FILE")"
    echo ""
    
    echo "✅ Dump terminé avec succès!"
    exit 0
else
    echo ""
    echo "❌ ERREUR: Le dump a échoué"
    exit 1
fi

