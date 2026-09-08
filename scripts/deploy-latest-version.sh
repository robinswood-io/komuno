#!/bin/bash
set -e

# ============================================================================
# Script de déploiement de la dernière version sur le serveur
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
# FONCTIONS
# ============================================================================

get_latest_version() {
    # Récupérer le dernier commit de origin/main
    git fetch origin main 2>/dev/null || true
    LATEST_COMMIT=$(git rev-parse origin/main 2>/dev/null || git rev-parse HEAD)
    LATEST_SHORT=$(git rev-parse --short origin/main 2>/dev/null || git rev-parse --short HEAD)
    
    LATEST_IMAGE="ghcr.io/aoleon/cjd80:main-${LATEST_SHORT}"
    echo "$LATEST_IMAGE"
    echo "$LATEST_SHORT" > /tmp/latest_commit.txt
}

check_image_exists() {
    local IMAGE=$1
    print_info "Vérification de l'existence de l'image: $IMAGE"
    
    # Vérifier si l'image existe localement sur le serveur
    IMAGE_EXISTS=$(ssh_exec "docker images $IMAGE --format '{{.Repository}}:{{.Tag}}' 2>/dev/null || echo ''")
    
    if [ -n "$IMAGE_EXISTS" ]; then
        print_success "Image présente localement"
        return 0
    fi
    
    # Essayer de pull l'image (sans l'exécuter)
    print_info "Tentative de pull de l'image depuis GHCR..."
    PULL_RESULT=$(ssh_exec "docker pull $IMAGE 2>&1" || echo "FAILED")
    
    if echo "$PULL_RESULT" | grep -q "Downloaded\|Image is up to date"; then
        print_success "Image disponible dans GHCR et téléchargée"
        return 0
    else
        print_error "Image non disponible dans GHCR"
        echo "$PULL_RESULT"
        return 1
    fi
}

backup_current_version() {
    print_header "📦 Sauvegarde de la version actuelle"
    
    CURRENT_IMAGE=$(ssh_exec "cd $DEPLOY_DIR && docker compose ps --format json 2>/dev/null | jq -r '.[] | select(.Service==\"cjd-app\") | .Image' 2>/dev/null || docker compose ps | grep cjd-app | awk '{print \$2}'")
    
    if [ -n "$CURRENT_IMAGE" ] && [ "$CURRENT_IMAGE" != "unknown" ]; then
        BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"
        print_info "Création d'un tag de backup: $BACKUP_TAG"
        
        ssh_exec "docker tag $CURRENT_IMAGE ghcr.io/aoleon/cjd80:${BACKUP_TAG}" || {
            print_warning "Impossible de créer le tag de backup (peut-être déjà taggé)"
        }
        
        print_success "Backup créé: ghcr.io/aoleon/cjd80:${BACKUP_TAG}"
        echo "$BACKUP_TAG" > /tmp/backup_tag.txt
    else
        print_warning "Impossible de déterminer l'image actuelle pour le backup"
    fi
}

update_repository() {
    print_header "🔄 Mise à jour du repository Git"
    
    print_info "Vérification de l'état du repository..."
    SERVER_STATUS=$(ssh_exec "cd $DEPLOY_DIR && git status --short 2>/dev/null || echo ''")
    
    if [ -n "$SERVER_STATUS" ]; then
        print_warning "Modifications non commitées détectées:"
        echo "$SERVER_STATUS"
        read -p "Continuer malgré les modifications non commitées? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Déploiement annulé"
            exit 1
        fi
    fi
    
    print_info "Récupération des dernières modifications..."
    ssh_exec "cd $DEPLOY_DIR && git fetch origin main 2>&1" || {
        print_warning "Impossible de fetch origin/main, utilisation de la version locale"
    }
    
    print_info "Mise à jour vers origin/main..."
    ssh_exec "cd $DEPLOY_DIR && git pull --ff-only origin main 2>&1" || {
        print_warning "Fast-forward impossible, tentative de merge..."
        ssh_exec "cd $DEPLOY_DIR && git pull origin main 2>&1" || {
            print_error "Impossible de mettre à jour le repository"
            return 1
        }
    }
    
    print_success "Repository mis à jour"
}

deploy_new_version() {
    local IMAGE=$1
    print_header "🚀 Déploiement de la nouvelle version"
    
    print_info "Image à déployer: $IMAGE"
    
    # Exporter la variable d'environnement pour docker-compose
    ssh_exec "cd $DEPLOY_DIR && export DOCKER_IMAGE=\"$IMAGE\" && echo \"DOCKER_IMAGE=$IMAGE\" > .env.docker"
    
    # Exécuter le script de déploiement
    print_info "Exécution du script de déploiement..."
    ssh_exec "cd $DEPLOY_DIR && export DOCKER_IMAGE=\"$IMAGE\" && bash scripts/vps-deploy.sh" || {
        print_error "Échec du déploiement"
        return 1
    }
    
    print_success "Déploiement terminé"
}

verify_deployment() {
    print_header "✅ Vérification du déploiement"
    
    print_info "Attente du démarrage (15s)..."
    sleep 15
    
    # Vérifier que le conteneur est démarré
    CONTAINER_STATUS=$(ssh_exec "cd $DEPLOY_DIR && docker compose ps --format json 2>/dev/null | jq -r '.[] | select(.Service==\"cjd-app\") | .State' 2>/dev/null || docker compose ps | grep cjd-app | awk '{print \$1}'")
    
    if [ -z "$CONTAINER_STATUS" ]; then
        print_error "Le conteneur n'est pas démarré"
        ssh_exec "cd $DEPLOY_DIR && docker compose ps"
        ssh_exec "cd $DEPLOY_DIR && docker compose logs --tail=50 cjd-app"
        return 1
    fi
    
    print_success "Conteneur démarré"
    
    # Health check
    print_info "Vérification du health check..."
    MAX_ATTEMPTS=10
    ATTEMPT=0
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        ATTEMPT=$((ATTEMPT + 1))
        HEALTH=$(ssh_exec "cd $DEPLOY_DIR && docker compose exec -T cjd-app wget -q -O- http://localhost:5000/api/health 2>/dev/null || echo 'FAILED'")
        
        if echo "$HEALTH" | grep -q "healthy"; then
            print_success "Health check réussi !"
            echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"
            return 0
        fi
        
        print_info "Tentative $ATTEMPT/$MAX_ATTEMPTS..."
        sleep 3
    done
    
    print_error "Health check échoué après $MAX_ATTEMPTS tentatives"
    ssh_exec "cd $DEPLOY_DIR && docker compose logs --tail=50 cjd-app"
    return 1
}

rollback() {
    print_header "🔄 Rollback vers la version précédente"
    
    BACKUP_TAG=$(cat /tmp/backup_tag.txt 2>/dev/null || echo "")
    
    if [ -z "$BACKUP_TAG" ]; then
        print_error "Aucun tag de backup trouvé"
        return 1
    fi
    
    ROLLBACK_IMAGE="ghcr.io/aoleon/cjd80:${BACKUP_TAG}"
    print_info "Rollback vers: $ROLLBACK_IMAGE"
    
    ssh_exec "cd $DEPLOY_DIR && export DOCKER_IMAGE=\"$ROLLBACK_IMAGE\" && docker compose down && docker compose up -d"
    
    print_success "Rollback effectué"
}

# ============================================================================
# SCRIPT PRINCIPAL
# ============================================================================

main() {
    if ! command -v sshpass &> /dev/null; then
        print_error "sshpass n'est pas installé"
        exit 1
    fi
    
    print_header "🚀 Déploiement de la dernière version"
    
    # Récupérer la dernière version
    LATEST_IMAGE=$(get_latest_version)
    LATEST_SHORT=$(cat /tmp/latest_commit.txt)
    
    print_info "Dernière version: $LATEST_IMAGE"
    
    # Vérifier si l'image existe
    if ! check_image_exists "$LATEST_IMAGE"; then
        print_error "L'image $LATEST_IMAGE n'est pas disponible"
        print_info "Vérifiez que le workflow GitHub Actions a bien buildé et poussé l'image"
        print_info "Ou attendez que le workflow se termine"
        exit 1
    fi
    
    # Demander confirmation
    echo ""
    print_warning "Vous êtes sur le point de déployer la version $LATEST_SHORT"
    read -p "Continuer? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Déploiement annulé"
        exit 0
    fi
    
    # Sauvegarder la version actuelle
    backup_current_version
    
    # Mettre à jour le repository
    update_repository || {
        print_error "Échec de la mise à jour du repository"
        exit 1
    }
    
    # Déployer la nouvelle version
    if deploy_new_version "$LATEST_IMAGE"; then
        # Vérifier le déploiement
        if verify_deployment; then
            print_header "✅ Déploiement réussi !"
            print_success "La version $LATEST_SHORT est maintenant déployée"
            print_info "URL: https://cjd80.fr"
            print_info "Health check: https://cjd80.fr/api/health"
        else
            print_error "Le déploiement a réussi mais la vérification a échoué"
            echo ""
            read -p "Voulez-vous effectuer un rollback? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rollback
            fi
            exit 1
        fi
    else
        print_error "Échec du déploiement"
        echo ""
        read -p "Voulez-vous effectuer un rollback? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rollback
        fi
        exit 1
    fi
}

main "$@"
