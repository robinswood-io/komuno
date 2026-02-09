#!/bin/bash
# Benchmark CI/CD - Compare npm vs Bun

set -e

echo "🏁 Benchmark CI/CD: npm vs Bun"
echo "======================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour mesurer le temps
time_command() {
    local name=$1
    local cmd=$2
    
    echo -e "${BLUE}📊 Test: $name${NC}"
    START=$(date +%s.%N)
    eval $cmd > /dev/null 2>&1
    END=$(date +%s.%N)
    DURATION=$(echo "$END - $START" | bc)
    echo -e "${GREEN}✅ Temps: ${DURATION}s${NC}"
    echo ""
}

# Nettoyer
echo "🧹 Nettoyage initial..."
rm -rf node_modules bun.lockb

# Test 1: Installation npm
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Installation des dépendances"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v npm &> /dev/null; then
    time_command "npm ci" "npm ci --silent"
    NPM_INSTALL_TIME=$DURATION
    rm -rf node_modules
fi

# Test 2: Installation Bun
if command -v bun &> /dev/null; then
    time_command "bun install" "bun install"
    BUN_INSTALL_TIME=$DURATION
else
    echo -e "${YELLOW}⚠️  Bun non installé, skip test Bun${NC}"
    BUN_INSTALL_TIME=0
fi

# Test 3: Build npm
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Build de l'application"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$NPM_INSTALL_TIME" != "0" ]; then
    npm ci --silent > /dev/null 2>&1
    time_command "npm run build" "npm run build"
    NPM_BUILD_TIME=$DURATION
    rm -rf dist .next
    rm -rf node_modules
fi

# Test 4: Build Bun
if [ "$BUN_INSTALL_TIME" != "0" ]; then
    bun install > /dev/null 2>&1
    time_command "bun run build" "bun run build"
    BUN_BUILD_TIME=$DURATION
fi

# Résumé
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RÉSULTATS DU BENCHMARK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$BUN_INSTALL_TIME" != "0" ] && [ "$NPM_INSTALL_TIME" != "0" ]; then
    # Installation
    echo "Installation des dépendances:"
    printf "  npm ci:       %.2fs\n" $NPM_INSTALL_TIME
    printf "  bun install:  %.2fs\n" $BUN_INSTALL_TIME
    INSTALL_SPEEDUP=$(echo "scale=2; $NPM_INSTALL_TIME / $BUN_INSTALL_TIME" | bc)
    echo -e "  ${GREEN}Gain Bun: ${INSTALL_SPEEDUP}x plus rapide${NC}"
    echo ""

    # Build
    echo "Build de l'application:"
    printf "  npm build:    %.2fs\n" $NPM_BUILD_TIME
    printf "  bun build:    %.2fs\n" $BUN_BUILD_TIME
    BUILD_SPEEDUP=$(echo "scale=2; $NPM_BUILD_TIME / $BUN_BUILD_TIME" | bc)
    echo -e "  ${GREEN}Gain Bun: ${BUILD_SPEEDUP}x plus rapide${NC}"
    echo ""

    # Total
    NPM_TOTAL=$(echo "$NPM_INSTALL_TIME + $NPM_BUILD_TIME" | bc)
    BUN_TOTAL=$(echo "$BUN_INSTALL_TIME + $BUN_BUILD_TIME" | bc)
    TOTAL_SPEEDUP=$(echo "scale=2; $NPM_TOTAL / $BUN_TOTAL" | bc)
    TIME_SAVED=$(echo "$NPM_TOTAL - $BUN_TOTAL" | bc)
    
    echo "Temps total (install + build):"
    printf "  npm:          %.2fs\n" $NPM_TOTAL
    printf "  bun:          %.2fs\n" $BUN_TOTAL
    echo -e "  ${GREEN}Gain Bun: ${TOTAL_SPEEDUP}x plus rapide${NC}"
    printf "  ${GREEN}Temps économisé: %.2fs${NC}\n" $TIME_SAVED
    echo ""

    # Projection CI/CD
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 PROJECTION CI/CD GITHUB ACTIONS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Temps CI estimés (avec overhead GitHub Actions)
    CI_OVERHEAD=30  # Setup, checkout, etc.
    DOCKER_BUILD=120  # 2 minutes Docker build
    DEPLOY_TIME=45   # 45s déploiement
    
    NPM_CI_TOTAL=$(echo "$NPM_TOTAL + $CI_OVERHEAD + $DOCKER_BUILD + $DEPLOY_TIME" | bc)
    BUN_CI_TOTAL=$(echo "$BUN_TOTAL + $CI_OVERHEAD + $DOCKER_BUILD + $DEPLOY_TIME" | bc)
    
    # Avec cache Docker optimisé (50% plus rapide)
    DOCKER_BUILD_CACHED=60
    BUN_CI_CACHED=$(echo "$BUN_TOTAL + $CI_OVERHEAD + $DOCKER_BUILD_CACHED + $DEPLOY_TIME" | bc)
    
    echo "Build CI/CD complet (estimé):"
    printf "  npm (actuel):           %.0fs (~%.0f min)\n" $NPM_CI_TOTAL $(echo "$NPM_CI_TOTAL / 60" | bc)
    printf "  bun (premier build):    %.0fs (~%.0f min)\n" $BUN_CI_TOTAL $(echo "$BUN_CI_TOTAL / 60" | bc)
    printf "  bun (avec cache):       %.0fs (~%.0f min)\n" $BUN_CI_CACHED $(echo "$BUN_CI_CACHED / 60" | bc)
    echo ""
    
    FIRST_BUILD_SAVING=$(echo "$NPM_CI_TOTAL - $BUN_CI_TOTAL" | bc)
    CACHED_BUILD_SAVING=$(echo "$NPM_CI_TOTAL - $BUN_CI_CACHED" | bc)
    PERCENT_SAVING=$(echo "scale=0; ($CACHED_BUILD_SAVING / $NPM_CI_TOTAL) * 100" | bc)
    
    echo "Économies de temps:"
    printf "  Premier build: %.0fs économisés\n" $FIRST_BUILD_SAVING
    printf "  Avec cache:    %.0fs économisés (${PERCENT_SAVING}%%)\n" $CACHED_BUILD_SAVING
    echo ""
    
    # Projection mensuelle
    BUILDS_PER_DAY=5
    WORKING_DAYS=20
    MONTHLY_BUILDS=$(echo "$BUILDS_PER_DAY * $WORKING_DAYS" | bc)
    MONTHLY_SAVING=$(echo "$CACHED_BUILD_SAVING * $MONTHLY_BUILDS" | bc)
    MONTHLY_SAVING_MIN=$(echo "$MONTHLY_SAVING / 60" | bc)
    MONTHLY_SAVING_HR=$(echo "scale=1; $MONTHLY_SAVING / 3600" | bc)
    
    echo "📅 Projection mensuelle ($MONTHLY_BUILDS builds):"
    printf "  Temps économisé: %.0f minutes (~%.1f heures)\n" $MONTHLY_SAVING_MIN $MONTHLY_SAVING_HR
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Benchmark terminé"
