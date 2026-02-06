#!/bin/bash
# =============================================================================
# Script d'installation pour nouveau serveur de production
# Usage: curl -sSL https://raw.githubusercontent.com/robinswood-io/komuno/main/deploy/install.sh | bash
# =============================================================================

set -e

echo "🚀 Installation de l'application Komuno..."

# Variables
APP_DIR="/srv/workspace/app"
DOMAIN="${DOMAIN:-app.example.com}"
APP_NAME="${APP_NAME:-app}"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Vérifications
check_requirements() {
    log_info "Vérification des prérequis..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi
    
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    if ! docker network ls | grep -q traefik_public; then
        log_warn "Réseau traefik_public non trouvé, création..."
        docker network create traefik_public
    fi
    
    log_info "✅ Prérequis OK"
}

# Création des répertoires
setup_directories() {
    log_info "Création des répertoires..."
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"
    log_info "✅ Répertoires créés"
}

# Téléchargement des fichiers
download_files() {
    log_info "Téléchargement des fichiers de configuration..."
    
    # Docker Compose
    curl -sSL https://raw.githubusercontent.com/robinswood-io/komuno/main/deploy/docker-compose.prod.yml -o docker-compose.yml
    
    # Env example
    curl -sSL https://raw.githubusercontent.com/robinswood-io/komuno/main/deploy/.env.example -o .env.example
    
    log_info "✅ Fichiers téléchargés"
}

# Configuration
configure() {
    log_info "Configuration de l'application..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        log_warn "Fichier .env créé depuis .env.example"
        log_warn "⚠️  IMPORTANT: Modifiez le fichier .env avec vos valeurs"
        
        # Générer des mots de passe aléatoires
        DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
        MINIO_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
        SESSION_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
        
        sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
        sed -i "s/MINIO_ROOT_PASSWORD=.*/MINIO_ROOT_PASSWORD=$MINIO_PASSWORD/" .env
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
        sed -i "s/DOMAIN=.*/DOMAIN=$DOMAIN/" .env
        sed -i "s/APP_NAME=.*/APP_NAME=$APP_NAME/" .env
        
        log_info "Mots de passe générés automatiquement"
    fi
    
    log_info "✅ Configuration terminée"
}

# Login au registry
docker_login() {
    log_info "Connexion au registry GitHub Container..."
    
    if [ -z "$GHCR_TOKEN" ]; then
        log_warn "Variable GHCR_TOKEN non définie"
        log_warn "Exécutez: export GHCR_TOKEN=votre_token"
        log_warn "Puis: echo \$GHCR_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
    else
        echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
        log_info "✅ Connecté au registry"
    fi
}

# Démarrage
start_services() {
    log_info "Démarrage des services..."
    
    docker compose pull
    docker compose up -d
    
    log_info "⏳ Attente du démarrage..."
    sleep 30
    
    docker compose ps
    
    log_info "✅ Services démarrés"
}

# Main
main() {
    echo "=================================================="
    echo "   Installation Application Komuno"
    echo "=================================================="
    echo ""
    
    check_requirements
    setup_directories
    download_files
    configure
    docker_login
    start_services
    
    echo ""
    echo "=================================================="
    echo "   ✅ Installation terminée!"
    echo "=================================================="
    echo ""
    echo "Prochaines étapes:"
    echo "1. Vérifiez le fichier .env: nano $APP_DIR/.env"
    echo "2. Configurez votre DNS pour pointer vers ce serveur"
    echo "3. Vérifiez les logs: docker compose logs -f"
    echo "4. Accédez à: https://$DOMAIN"
    echo ""
}

main "$@"
