#!/bin/bash
set -e

# ============================================================================
# Script de build local et copie sur VPS
# Évite les problèmes de mémoire sur le VPS
# ============================================================================

VPS_HOST="${VPS_HOST:-141.94.31.162}"
VPS_USER="${VPS_USER:-thibault}"
VPS_PORT="${VPS_PORT:-22}"
VPS_PASS="${VPS_PASS:-}"

require_vps_password() {
    if [ -z "${VPS_PASS:-}" ]; then
        echo "VPS_PASS doit être fourni via l’environnement" >&2
        exit 1
    fi
}
DEPLOY_DIR="${DEPLOY_DIR:-/docker/cjd80}"

echo "=================================================="
echo "🚀 Build Local et Déploiement sur VPS"
echo "=================================================="

# 1. Build local
echo "🏗️  Build local de l'application..."
npm run check && npm run build || {
    echo "❌ ERREUR: Build local échoué"
    exit 1
}
echo "✅ Build local terminé"

# 2. Créer l'archive
echo "📦 Création de l'archive..."
tar -czf /tmp/cjd80-dist.tar.gz dist/ || {
    echo "❌ ERREUR: Impossible de créer l'archive"
    exit 1
}
echo "✅ Archive créée: /tmp/cjd80-dist.tar.gz"

# 3. Copier sur le VPS
echo "📤 Copie sur le VPS..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=accept-new -P "$VPS_PORT" \
    /tmp/cjd80-dist.tar.gz \
    Dockerfile.production \
    "$VPS_USER@$VPS_HOST:/tmp/" || {
    echo "❌ ERREUR: Impossible de copier sur le VPS"
    exit 1
}
echo "✅ Fichiers copiés sur le VPS"

# 4. Déployer sur le VPS
echo "🚀 Déploiement sur le VPS..."
require_vps_password
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=accept-new -p "$VPS_PORT" \
    "$VPS_USER@$VPS_HOST" << 'ENDSSH'
cd /docker/cjd80

# Arrêter l'application
docker compose down --remove-orphans 2>/dev/null || true

# Extraire les nouveaux fichiers
tar -xzf /tmp/cjd80-dist.tar.gz -C . || {
    echo "❌ ERREUR: Impossible d'extraire l'archive"
    exit 1
}

# Vérifier que dist/ existe
if [ ! -d "dist" ]; then
    echo "❌ ERREUR: dist/ n'existe pas après extraction"
    ls -la
    exit 1
fi
echo "✅ dist/ trouvé: $(du -sh dist | cut -f1)"

# Copier Dockerfile.production
cp /tmp/Dockerfile.production . || {
    echo "❌ ERREUR: Impossible de copier Dockerfile.production"
    exit 1
}

# Sauvegarder et remplacer temporairement .dockerignore pour inclure dist/
if [ -f .dockerignore ]; then
    mv .dockerignore .dockerignore.bak
fi

# Créer un .dockerignore temporaire qui n'exclut PAS dist/
cat > .dockerignore << 'EOF'
# Git
.git
.github
.gitignore

# Node
node_modules
npm-debug.log
# Note: package-lock.json est nécessaire pour npm ci, donc on ne l'exclut PAS

# Environment
.env
.env.*
!.env.example

# Development
.cursor
.cursor-config
.cursorrules*
.vscode
.replit

# Testing
test-results
playwright-report
tests

# OS
.DS_Store
._*

# Misc
*.md
!README.md
docs
scripts
assets
attached_assets
client
server
*.bak
logs
nhost
# Note: dist/ n'est PAS exclu ici pour permettre le build production
EOF

# Copier les fichiers nécessaires pour le build (s'ils n'existent pas déjà)
[ -f package.json ] || cp package*.json . 2>/dev/null || true
[ -f drizzle.config.ts ] || cp drizzle.config.ts . 2>/dev/null || true
[ -d shared ] || cp -r shared . 2>/dev/null || true

# Build avec Dockerfile.production (qui utilise dist/ existant)
echo "🏗️  Build de l'image Docker (sans cache pour forcer réinstallation npm)..."
docker build --no-cache -f Dockerfile.production -t cjd80:latest . || {
    echo "❌ ERREUR: Build runner échoué"
    echo "Contenu du répertoire:"
    ls -la
    echo "Contenu de dist/:"
    ls -la dist/ 2>/dev/null || echo "dist/ n'existe pas"
    # Restaurer .dockerignore
    [ -f .dockerignore.bak ] && mv .dockerignore.bak .dockerignore
    exit 1
}

# Restaurer .dockerignore
[ -f .dockerignore.bak ] && mv .dockerignore.bak .dockerignore

# Migrations
docker run --rm --env-file .env --network proxy cjd80:latest \
    sh -c "cd /app && npx drizzle-kit push" 2>&1 | tail -3 || echo "⚠️  Migrations: voir logs"

# Démarrer
export DOCKER_IMAGE=cjd80:latest
docker compose up -d

# Attendre
sleep 15

# Vérifier
if docker compose ps | grep -q "cjd-app.*Up"; then
    echo "✅ Application démarrée"
    docker network connect proxy cjd-app 2>/dev/null || true
    docker compose ps
else
    echo "❌ ERREUR: Le conteneur ne démarre pas"
    docker compose logs --tail=20 cjd-app
    exit 1
fi
ENDSSH

echo ""
echo "✅ Déploiement terminé!"
echo "🔗 URL: https://cjd80.fr"

# Nettoyer
rm -f /tmp/cjd80-dist.tar.gz

exit 0

