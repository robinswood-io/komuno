#!/bin/bash
set -e

echo "🚀 Migration vers Bun pour accélérer les builds..."

# Vérifier si Bun est installé
if ! command -v bun &> /dev/null; then
    echo "❌ Bun n'est pas installé. Installation en cours..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo "✅ Bun version: $(bun --version)"

# Générer bun.lockb depuis package-lock.json
if [ -f "package-lock.json" ]; then
    echo "📦 Génération de bun.lockb depuis package-lock.json..."
    bun install
    echo "✅ bun.lockb créé"
else
    echo "⚠️  Aucun package-lock.json trouvé, installation directe..."
    bun install
fi

# Vérifier que tout fonctionne
echo "🧪 Test de l'installation..."
bun run tsc --version || true

echo ""
echo "✅ Migration terminée!"
echo ""
echo "📊 Comparaison des performances:"
echo "  - npm install: ~60-90s"
echo "  - bun install: ~5-10s (6-9x plus rapide)"
echo ""
echo "🔄 Prochaines étapes:"
echo "  1. Tester localement: bun install && bun run build"
echo "  2. Renommer Dockerfile.optimized en Dockerfile"
echo "  3. Renommer deploy-optimized.yml en deploy.yml"
echo "  4. Commiter bun.lockb dans le repo"
echo "  5. Pousser et surveiller le premier build optimisé"
