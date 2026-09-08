#!/bin/bash
set -e

# ============================================================================
# Script de vérification et test de la dernière version sur le serveur
# ============================================================================

# Configuration SSH
VPS_HOST="141.94.31.162"
VPS_USER="thibault"
VPS_PORT="22"
VPS_PASS="${VPS_PASS:-}"

require_vps_password() {
    if [ -z "${VPS_PASS:-}" ]; then
        echo "VPS_PASS doit être fourni via l’environnement" >&2
        exit 1
    fi
}
DEPLOY_DIR="/docker/cjd80"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}==================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==================================================${NC}"
}

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

ssh_exec() {
    require_vps_password
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=accept-new -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "$@"
}

# ============================================================================
# VÉRIFICATIONS
# ============================================================================

check_current_version() {
    print_header "📦 Version actuellement installée"
    
    CURRENT_IMAGE=$(ssh_exec "cd $DEPLOY_DIR && docker compose ps --format json 2>/dev/null | jq -r '.[] | select(.Service==\"cjd-app\") | .Image' 2>/dev/null || docker compose ps | grep cjd-app | awk '{print \$2}'")
    
    if [ -n "$CURRENT_IMAGE" ]; then
        print_info "Image Docker: $CURRENT_IMAGE"
        
        # Extraire le commit SHA de l'image
        CURRENT_SHA=$(echo "$CURRENT_IMAGE" | sed -n 's/.*main-\([0-9a-f]\{7\}\).*/\1/p' || echo "unknown")
        if [ "$CURRENT_SHA" = "unknown" ]; then
            CURRENT_SHA=$(echo "$CURRENT_IMAGE" | sed -E 's/.*main-([0-9a-f]+).*/\1/' | head -c 7)
        fi
        print_info "Commit SHA: $CURRENT_SHA"
        
        # Vérifier le commit Git sur le serveur
        SERVER_COMMIT=$(ssh_exec "cd $DEPLOY_DIR && git rev-parse HEAD 2>/dev/null || echo 'unknown'")
        print_info "Commit Git serveur: ${SERVER_COMMIT:0:7}"
        
        echo "$CURRENT_IMAGE" > /tmp/current_image.txt
        echo "$CURRENT_SHA" > /tmp/current_sha.txt
    else
        print_error "Impossible de déterminer la version actuelle"
        return 1
    fi
}

check_latest_version() {
    print_header "🔍 Vérification de la dernière version"
    
    # Vérifier la dernière version locale
    LOCAL_COMMIT=$(git rev-parse HEAD)
    LOCAL_SHORT=$(git rev-parse --short HEAD)
    print_info "Dernier commit local: $LOCAL_SHORT"
    
    # Vérifier la dernière version sur origin/main
    print_info "Vérification de origin/main..."
    git fetch origin main 2>/dev/null || true
    REMOTE_COMMIT=$(git rev-parse origin/main 2>/dev/null || echo "$LOCAL_COMMIT")
    REMOTE_SHORT=$(git rev-parse --short origin/main 2>/dev/null || echo "$LOCAL_SHORT")
    print_info "Dernier commit origin/main: $REMOTE_SHORT"
    
    # Vérifier si une image existe dans GHCR pour ce commit
    LATEST_IMAGE="ghcr.io/aoleon/cjd80:main-${REMOTE_SHORT}"
    print_info "Image attendue: $LATEST_IMAGE"
    
    echo "$LATEST_IMAGE" > /tmp/latest_image.txt
    echo "$REMOTE_SHORT" > /tmp/latest_sha.txt
}

compare_versions() {
    print_header "📊 Comparaison des versions"
    
    if [ ! -f /tmp/current_sha.txt ] || [ ! -f /tmp/latest_sha.txt ]; then
        print_error "Impossible de comparer les versions"
        return 1
    fi
    
    CURRENT_SHA=$(cat /tmp/current_sha.txt)
    LATEST_SHA=$(cat /tmp/latest_sha.txt)
    
    print_info "Version actuelle: $CURRENT_SHA"
    print_info "Dernière version: $LATEST_SHA"
    
    if [ "$CURRENT_SHA" = "$LATEST_SHA" ]; then
        print_success "Le serveur est à jour !"
        return 0
    else
        print_warning "Le serveur n'est pas à jour"
        COMMIT_COUNT=$(git log --oneline ${CURRENT_SHA}..${LATEST_SHA} 2>/dev/null | wc -l | tr -d ' ')
        print_info "Différence: $COMMIT_COUNT commits"
        return 0  # Ne pas faire échouer le script, juste informer
    fi
}

check_image_availability() {
    print_header "🔍 Vérification disponibilité image Docker"
    
    LATEST_IMAGE=$(cat /tmp/latest_image.txt 2>/dev/null || echo "")
    
    if [ -z "$LATEST_IMAGE" ]; then
        print_error "Image non définie"
        return 1
    fi
    
    print_info "Vérification de l'image: $LATEST_IMAGE"
    
    # Vérifier si l'image existe localement sur le serveur
    IMAGE_EXISTS=$(ssh_exec "docker images $LATEST_IMAGE --format '{{.Repository}}:{{.Tag}}' 2>/dev/null || echo ''")
    
    if [ -n "$IMAGE_EXISTS" ]; then
        print_success "Image présente localement sur le serveur"
        return 0
    else
        print_warning "Image non présente localement"
        print_info "L'image sera téléchargée depuis GHCR lors du déploiement"
        return 0  # Ne pas faire échouer, juste informer
    fi
}

test_current_installation() {
    print_header "🧪 Test de l'installation actuelle"
    
    # Health check
    print_info "Health check..."
    HEALTH=$(ssh_exec "cd $DEPLOY_DIR && docker compose exec -T cjd-app wget -q -O- http://localhost:5000/api/health 2>/dev/null || echo 'FAILED'")
    
    if echo "$HEALTH" | grep -q "healthy"; then
        print_success "Application en bonne santé"
        echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"
    else
        print_error "Health check échoué"
        return 1
    fi
    
    # Vérifier les logs récents
    print_info "Vérification des logs récents..."
    ERROR_COUNT=$(ssh_exec "cd $DEPLOY_DIR && docker compose logs --tail=100 cjd-app 2>&1 | grep -i 'error\|fatal\|exception' | wc -l")
    
    if [ "$ERROR_COUNT" -eq 0 ]; then
        print_success "Aucune erreur dans les logs récents"
    else
        print_warning "$ERROR_COUNT erreur(s) trouvée(s) dans les logs"
    fi
    
    # Vérifier les ressources
    print_info "Vérification des ressources..."
    RESOURCES=$(ssh_exec "cd $DEPLOY_DIR && docker stats --no-stream cjd-app --format 'CPU: {{.CPUPerc}}, Memory: {{.MemUsage}}' 2>/dev/null || echo 'N/A'")
    print_info "$RESOURCES"
}

check_repository_sync() {
    print_header "🔄 Vérification synchronisation repository"
    
    SERVER_BRANCH=$(ssh_exec "cd $DEPLOY_DIR && git branch --show-current 2>/dev/null || echo 'unknown'")
    SERVER_COMMIT=$(ssh_exec "cd $DEPLOY_DIR && git rev-parse HEAD 2>/dev/null || echo 'unknown'")
    SERVER_STATUS=$(ssh_exec "cd $DEPLOY_DIR && git status --short 2>/dev/null || echo ''")
    
    print_info "Branche serveur: $SERVER_BRANCH"
    print_info "Commit serveur: ${SERVER_COMMIT:0:7}"
    
    if [ -n "$SERVER_STATUS" ]; then
        print_warning "Modifications non commitées sur le serveur:"
        echo "$SERVER_STATUS"
    else
        print_success "Repository propre"
    fi
    
    # Vérifier si le serveur est en avance/retard
    SERVER_AHEAD=$(ssh_exec "cd $DEPLOY_DIR && git rev-list --count origin/master..HEAD 2>/dev/null || echo '0'")
    SERVER_BEHIND=$(ssh_exec "cd $DEPLOY_DIR && git rev-list --count HEAD..origin/master 2>/dev/null || echo '0'")
    
    if [ "$SERVER_AHEAD" -gt 0 ]; then
        print_warning "Le serveur est en avance de $SERVER_AHEAD commit(s) sur origin/master"
    fi
    
    if [ "$SERVER_BEHIND" -gt 0 ]; then
        print_warning "Le serveur est en retard de $SERVER_BEHIND commit(s) sur origin/master"
    fi
}

# ============================================================================
# SCRIPT PRINCIPAL
# ============================================================================

main() {
    if ! command -v sshpass &> /dev/null; then
        print_error "sshpass n'est pas installé"
        exit 1
    fi
    
    print_header "🔍 Vérification et test de l'installation"
    
    check_current_version
    check_latest_version
    compare_versions
    check_image_availability
    check_repository_sync
    test_current_installation
    
    print_header "📋 Résumé"
    
    CURRENT_IMAGE=$(cat /tmp/current_image.txt 2>/dev/null || echo "unknown")
    LATEST_IMAGE=$(cat /tmp/latest_image.txt 2>/dev/null || echo "unknown")
    
    echo "Version actuelle: $CURRENT_IMAGE"
    echo "Dernière version: $LATEST_IMAGE"
    
    if [ "$CURRENT_IMAGE" != "$LATEST_IMAGE" ]; then
        echo ""
        print_warning "Une mise à jour est disponible"
        print_info "Pour déployer la dernière version, exécutez:"
        echo "  ./scripts/ssh-control.sh restart"
        echo "  ou"
        echo "  git push origin main  # pour déclencher le déploiement automatique"
    else
        print_success "Le serveur est à jour et opérationnel"
    fi
}

main "$@"
