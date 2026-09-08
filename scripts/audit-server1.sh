#!/bin/bash
set -e

# ============================================================================
# Script d'audit du serveur server1 (CJD Amiens - cjd80.fr)
# ============================================================================

# Configuration
VPS_HOST="141.94.31.162"
VPS_PORT="22"
VPS_USER="thibault"
DEPLOY_DIR="/docker/cjd80"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}==================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Fonction pour exécuter une commande SSH
ssh_exec() {
    ssh -p "$VPS_PORT" \
        -o StrictHostKeyChecking=accept-new \
        -o ConnectTimeout=10 \
        "$VPS_USER@$VPS_HOST" "$@"
}

# ============================================================================
# AUDIT
# ============================================================================

print_header "🔍 AUDIT SERVEUR SERVER1 (CJD Amiens - cjd80.fr)"

# 1. Vérification de la connexion SSH
print_header "1. Vérification de la connexion SSH"
if ssh_exec "echo 'Connexion OK'" > /dev/null 2>&1; then
    print_success "Connexion SSH établie"
    print_info "Host: $VPS_HOST"
    print_info "Port: $VPS_PORT"
    print_info "User: $VPS_USER"
else
    print_error "Impossible de se connecter au serveur"
    exit 1
fi

# 2. Vérification Docker et Docker Compose
print_header "2. Vérification Docker et Docker Compose"
DOCKER_VERSION=$(ssh_exec "docker --version" 2>/dev/null || echo "")
DOCKER_COMPOSE_VERSION=$(ssh_exec "docker compose version" 2>/dev/null || echo "")

if [ -n "$DOCKER_VERSION" ]; then
    print_success "Docker installé: $DOCKER_VERSION"
else
    print_error "Docker non installé ou non accessible"
fi

if [ -n "$DOCKER_COMPOSE_VERSION" ]; then
    print_success "Docker Compose installé: $DOCKER_COMPOSE_VERSION"
else
    print_error "Docker Compose non installé ou non accessible"
fi

# Vérifier les permissions Docker
if ssh_exec "docker ps" > /dev/null 2>&1; then
    print_success "Utilisateur $VPS_USER peut exécuter Docker"
else
    print_warning "Utilisateur $VPS_USER ne peut pas exécuter Docker (peut nécessiter sudo ou groupe docker)"
fi

# 3. Vérification de la structure du répertoire de déploiement
print_header "3. Vérification de la structure du répertoire de déploiement"
if ssh_exec "test -d $DEPLOY_DIR" 2>/dev/null; then
    print_success "Répertoire de déploiement existe: $DEPLOY_DIR"
    
    # Vérifier les permissions
    PERMS=$(ssh_exec "stat -c '%a' $DEPLOY_DIR" 2>/dev/null || ssh_exec "stat -f '%A' $DEPLOY_DIR" 2>/dev/null || echo "unknown")
    print_info "Permissions: $PERMS"
    
    # Vérifier le propriétaire
    OWNER=$(ssh_exec "stat -c '%U:%G' $DEPLOY_DIR" 2>/dev/null || ssh_exec "stat -f '%Su:%Sg' $DEPLOY_DIR" 2>/dev/null || echo "unknown")
    print_info "Propriétaire: $OWNER"
else
    print_error "Répertoire de déploiement n'existe pas: $DEPLOY_DIR"
fi

# 4. Vérification des fichiers critiques
print_header "4. Vérification des fichiers critiques"

# .env
if ssh_exec "test -f $DEPLOY_DIR/.env" 2>/dev/null; then
    print_success "Fichier .env existe"
    ENV_SIZE=$(ssh_exec "stat -c '%s' $DEPLOY_DIR/.env" 2>/dev/null || ssh_exec "stat -f '%z' $DEPLOY_DIR/.env" 2>/dev/null || echo "0")
    if [ "$ENV_SIZE" -gt 0 ]; then
        print_success "Fichier .env n'est pas vide ($ENV_SIZE bytes)"
    else
        print_warning "Fichier .env est vide"
    fi
else
    print_warning "Fichier .env n'existe pas (peut être normal si non encore configuré)"
fi

# docker-compose.yml
if ssh_exec "test -f $DEPLOY_DIR/docker-compose.yml" 2>/dev/null; then
    print_success "Fichier docker-compose.yml existe"
    COMPOSE_SIZE=$(ssh_exec "stat -c '%s' $DEPLOY_DIR/docker-compose.yml" 2>/dev/null || ssh_exec "stat -f '%z' $DEPLOY_DIR/docker-compose.yml" 2>/dev/null || echo "0")
    if [ "$COMPOSE_SIZE" -gt 0 ]; then
        print_success "Fichier docker-compose.yml n'est pas vide ($COMPOSE_SIZE bytes)"
    else
        print_error "Fichier docker-compose.yml est vide"
    fi
else
    print_error "Fichier docker-compose.yml n'existe pas"
fi

# Scripts
if ssh_exec "test -d $DEPLOY_DIR/scripts" 2>/dev/null; then
    print_success "Répertoire scripts existe"
    SCRIPT_COUNT=$(ssh_exec "find $DEPLOY_DIR/scripts -name '*.sh' -type f | wc -l" 2>/dev/null || echo "0")
    print_info "Nombre de scripts shell: $SCRIPT_COUNT"
    
    # Vérifier vps-deploy.sh
    if ssh_exec "test -f $DEPLOY_DIR/scripts/vps-deploy.sh" 2>/dev/null; then
        print_success "Script vps-deploy.sh existe"
        if ssh_exec "test -x $DEPLOY_DIR/scripts/vps-deploy.sh" 2>/dev/null; then
            print_success "Script vps-deploy.sh est exécutable"
        else
            print_warning "Script vps-deploy.sh n'est pas exécutable"
        fi
    else
        print_warning "Script vps-deploy.sh n'existe pas"
    fi
else
    print_warning "Répertoire scripts n'existe pas"
fi

# 5. Vérification des réseaux Docker
print_header "5. Vérification des réseaux Docker"
NETWORKS=$(ssh_exec "docker network ls --format '{{.Name}}'" 2>/dev/null || echo "")

if echo "$NETWORKS" | grep -q "proxy"; then
    print_success "Réseau 'proxy' existe"
else
    print_warning "Réseau 'proxy' n'existe pas (nécessaire pour Traefik)"
fi

if echo "$NETWORKS" | grep -q "cjd-network"; then
    print_success "Réseau 'cjd-network' existe"
else
    print_info "Réseau 'cjd-network' n'existe pas (sera créé par docker-compose)"
fi

if echo "$NETWORKS" | grep -q "nhost_nhost-network-prod"; then
    print_success "Réseau 'nhost_nhost-network-prod' existe"
else
    print_warning "Réseau 'nhost_nhost-network-prod' n'existe pas (nécessaire pour PostgreSQL)"
fi

# 6. Vérification de l'accès à GHCR
print_header "6. Vérification de l'accès à GHCR"
GHCR_AUTH=$(ssh_exec "cat ~/.docker/config.json 2>/dev/null | grep -q 'ghcr.io' && echo 'yes' || echo 'no'" 2>/dev/null || echo "no")

if [ "$GHCR_AUTH" = "yes" ]; then
    print_success "Authentification GHCR configurée"
    
    # Tester le pull d'une image
    if ssh_exec "docker pull ghcr.io/aoleon/cjd80:latest > /dev/null 2>&1" 2>/dev/null; then
        print_success "Pull depuis GHCR fonctionne"
    else
        print_warning "Pull depuis GHCR échoue (peut être normal si l'image n'existe pas encore)"
    fi
else
    print_warning "Authentification GHCR non configurée (sera gérée par GitHub Actions)"
fi

# 7. Vérification des permissions utilisateur
print_header "7. Vérification des permissions utilisateur"

# Groupe docker
if ssh_exec "groups | grep -q docker" 2>/dev/null; then
    print_success "Utilisateur $VPS_USER est dans le groupe docker"
else
    print_warning "Utilisateur $VPS_USER n'est pas dans le groupe docker"
fi

# Permissions sur le répertoire de déploiement
if ssh_exec "test -w $DEPLOY_DIR" 2>/dev/null; then
    print_success "Utilisateur $VPS_USER peut écrire dans $DEPLOY_DIR"
else
    print_error "Utilisateur $VPS_USER ne peut pas écrire dans $DEPLOY_DIR"
fi

# Permissions sur les scripts
if ssh_exec "test -x $DEPLOY_DIR/scripts/vps-deploy.sh" 2>/dev/null; then
    print_success "Scripts sont exécutables"
else
    print_warning "Certains scripts ne sont pas exécutables"
fi

# 8. Vérification de l'état actuel de l'application
print_header "8. Vérification de l'état actuel de l'application"

# Conteneurs
CONTAINERS=$(ssh_exec "cd $DEPLOY_DIR && docker compose ps --format json 2>/dev/null || docker compose ps 2>/dev/null || echo ''" 2>/dev/null || echo "")

if [ -n "$CONTAINERS" ]; then
    print_success "Docker Compose peut lister les conteneurs"
    
    # Vérifier si cjd-app est en cours d'exécution
    if ssh_exec "cd $DEPLOY_DIR && docker compose ps 2>/dev/null | grep -q 'cjd-app.*Up'" 2>/dev/null; then
        print_success "Conteneur cjd-app est en cours d'exécution"
        
        # Health check
        if ssh_exec "cd $DEPLOY_DIR && docker compose exec -T cjd-app wget --spider -q http://localhost:5000/api/health 2>/dev/null" 2>/dev/null; then
            print_success "Health check de l'application réussi"
        else
            print_warning "Health check de l'application échoue"
        fi
    else
        print_info "Conteneur cjd-app n'est pas en cours d'exécution"
    fi
else
    print_info "Aucun conteneur Docker Compose trouvé"
fi

# Images Docker
IMAGE_COUNT=$(ssh_exec "docker images | grep -c 'cjd80\|ghcr.io/aoleon/cjd80' || echo '0'" 2>/dev/null || echo "0")
print_info "Nombre d'images cjd80 trouvées: $IMAGE_COUNT"

# ============================================================================
# RÉSUMÉ
# ============================================================================

print_header "📊 RÉSUMÉ DE L'AUDIT"

echo "✅ Points vérifiés:"
echo "   - Connexion SSH"
echo "   - Docker et Docker Compose"
echo "   - Structure du répertoire de déploiement"
echo "   - Fichiers critiques (.env, docker-compose.yml, scripts)"
echo "   - Réseaux Docker"
echo "   - Accès GHCR"
echo "   - Permissions utilisateur"
echo "   - État de l'application"
echo ""
echo "📋 Prochaines étapes:"
echo "   1. Vérifier les secrets GitHub Actions"
echo "   2. Configurer le workflow pour les tags Git"
echo "   3. Tester le déploiement avec un tag"

print_success "Audit terminé"



