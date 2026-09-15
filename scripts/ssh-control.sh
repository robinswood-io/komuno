#!/bin/bash
set -e

# ============================================================================
# Script de contrôle SSH pour CJD80 - Vérification et pilotage du serveur
# ============================================================================

# Configuration SSH
VPS_HOST="141.94.31.162"
VPS_USER="thibault"
VPS_PORT="22"
VPS_PASS="${VPS_PASS:-}"
DEPLOY_DIR="/docker/cjd80"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

require_vps_password() {
    if [ -z "${VPS_PASS:-}" ]; then
        print_error "VPS_PASS doit être fourni via l’environnement ou utilisez SSH_KEY quand le script le supporte"
        exit 1
    fi
}

# Fonction d'affichage
print_header() {
    echo -e "${BLUE}==================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==================================================${NC}"
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
    require_vps_password
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=accept-new -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "$@"
}

# Fonction pour exécuter une commande SSH avec sortie interactive
ssh_exec_interactive() {
    require_vps_password
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=accept-new -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" "$@"
}

# ============================================================================
# FONCTIONS DE VÉRIFICATION
# ============================================================================

check_connection() {
    print_header "🔌 Vérification de la connexion SSH"
    
    if ssh_exec "echo 'Connexion OK'" > /dev/null 2>&1; then
        print_success "Connexion SSH établie"
        return 0
    else
        print_error "Impossible de se connecter au serveur"
        return 1
    fi
}

check_docker() {
    print_header "🐳 Vérification de Docker"
    
    DOCKER_VERSION=$(ssh_exec "docker --version 2>/dev/null || echo 'Docker non installé'")
    if echo "$DOCKER_VERSION" | grep -q "version"; then
        print_success "Docker installé: $DOCKER_VERSION"
    else
        print_error "Docker non installé ou non accessible"
        return 1
    fi
    
    DOCKER_COMPOSE_VERSION=$(ssh_exec "docker compose version 2>/dev/null || echo 'Docker Compose non installé'")
    if echo "$DOCKER_COMPOSE_VERSION" | grep -q "version"; then
        print_success "Docker Compose installé: $DOCKER_COMPOSE_VERSION"
    else
        print_warning "Docker Compose non installé"
    fi
    
    return 0
}

check_application_status() {
    print_header "📊 État de l'application"
    
    ssh_exec "cd $DEPLOY_DIR && docker compose ps" || {
        print_error "Impossible d'exécuter docker compose ps"
        return 1
    }
    
    # Vérifier si le conteneur est en cours d'exécution
    CONTAINER_STATUS=$(ssh_exec "cd $DEPLOY_DIR && docker compose ps --format json 2>/dev/null | jq -r '.[] | select(.Service==\"cjd-app\") | .State' 2>/dev/null || docker compose ps | grep cjd-app | awk '{print \$1}'")
    
    if [ -n "$CONTAINER_STATUS" ]; then
        print_success "Conteneur trouvé"
    else
        print_warning "Conteneur non trouvé ou non démarré"
    fi
}

check_health() {
    print_header "💚 Health Check"
    
    # Essayer depuis le conteneur (méthode recommandée)
    HEALTH_RESPONSE=$(ssh_exec "cd $DEPLOY_DIR && docker compose exec -T cjd-app wget -q -O- http://localhost:5000/api/health 2>/dev/null || echo 'FAILED'")
    
    if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
        print_success "Application en bonne santé"
        echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
        return 0
    fi
    
    # Fallback: vérifier via Traefik (si accessible)
    HEALTH_RESPONSE=$(ssh_exec "curl -s https://cjd80.fr/api/health 2>/dev/null || echo 'FAILED'")
    
    if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
        print_success "Application en bonne santé (via Traefik)"
        echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
        return 0
    fi
    
    print_error "Health check échoué"
    echo "$HEALTH_RESPONSE"
    return 1
}

check_logs() {
    print_header "📋 Derniers logs de l'application"
    
    ssh_exec "cd $DEPLOY_DIR && docker compose logs --tail=50 cjd-app"
}

check_resources() {
    print_header "💻 Utilisation des ressources"
    
    ssh_exec "cd $DEPLOY_DIR && docker stats --no-stream cjd-app 2>/dev/null || echo 'Impossible de récupérer les stats'"
}

check_networks() {
    print_header "🌐 Réseaux Docker"
    
    ssh_exec "docker network ls"
    echo ""
    print_info "Vérification de la connexion au réseau proxy..."
    ssh_exec "docker network inspect proxy 2>/dev/null | grep -A 5 cjd-app || echo 'Conteneur non connecté au réseau proxy'"
}

# ============================================================================
# FONCTIONS DE PILOTAGE
# ============================================================================

read_agent_file() {
    print_header "📄 Lecture du fichier agent.md"
    
    AGENT_PATH=$(ssh_exec "find / -maxdepth 6 -type f -name 'agent.md' 2>/dev/null | head -1")
    
    if [ -n "$AGENT_PATH" ]; then
        print_success "Fichier agent.md trouvé: $AGENT_PATH"
        echo ""
        ssh_exec "cat '$AGENT_PATH'"
    else
        print_warning "Fichier agent.md non trouvé"
        print_info "Recherche dans le répertoire de déploiement..."
        ssh_exec "cd $DEPLOY_DIR && find . -name 'agent.md' 2>/dev/null || echo 'Non trouvé dans $DEPLOY_DIR'"
    fi
}

restart_application() {
    print_header "🔄 Redémarrage de l'application"
    
    print_info "Arrêt de l'application..."
    ssh_exec "cd $DEPLOY_DIR && docker compose down"
    
    print_info "Démarrage de l'application..."
    ssh_exec "cd $DEPLOY_DIR && docker compose up -d"
    
    print_info "Attente du démarrage (10s)..."
    sleep 10
    
    check_application_status
}

pull_latest_image() {
    print_header "⬇️  Téléchargement de la dernière image"
    
    ssh_exec "cd $DEPLOY_DIR && docker pull ghcr.io/aoleon/cjd80:latest"
    print_success "Image téléchargée"
}

run_migrations() {
    print_header "🗄️  Exécution des migrations"
    
    ssh_exec "cd $DEPLOY_DIR && docker compose exec -T cjd-app npx drizzle-kit push || docker compose run --rm cjd-app npx drizzle-kit push"
    print_success "Migrations exécutées"
}

full_deployment_check() {
    print_header "🔍 Vérification complète du déploiement"
    
    check_connection || exit 1
    check_docker || exit 1
    check_application_status
    check_health
    check_resources
    check_networks
    check_logs
}

# ============================================================================
# MENU INTERACTIF
# ============================================================================

show_menu() {
    echo ""
    print_header "🎛️  Menu de contrôle CJD80"
    echo ""
    echo "1. 🔌 Vérifier la connexion SSH"
    echo "2. 🐳 Vérifier Docker"
    echo "3. 📊 État de l'application"
    echo "4. 💚 Health Check"
    echo "5. 📋 Voir les logs"
    echo "6. 💻 Utilisation des ressources"
    echo "7. 🌐 Réseaux Docker"
    echo "8. 📄 Lire agent.md"
    echo "9. 🔄 Redémarrer l'application"
    echo "10. ⬇️  Télécharger la dernière image"
    echo "11. 🗄️  Exécuter les migrations"
    echo "12. 🔍 Vérification complète"
    echo "13. 🚪 Quitter"
    echo ""
    read -p "Choisissez une option (1-13): " choice
}

# ============================================================================
# SCRIPT PRINCIPAL
# ============================================================================

main() {
    # Vérifier si sshpass est installé
    if ! command -v sshpass &> /dev/null; then
        print_error "sshpass n'est pas installé"
        print_info "Installation: brew install hudochenkov/sshpass/sshpass (Mac) ou apt-get install sshpass (Linux)"
        exit 1
    fi
    
    # Si un argument est fourni, exécuter la commande directement
    case "${1:-}" in
        "check")
            full_deployment_check
            ;;
        "status")
            check_application_status
            ;;
        "health")
            check_health
            ;;
        "logs")
            check_logs
            ;;
        "restart")
            restart_application
            ;;
        "agent")
            read_agent_file
            ;;
        "menu"|"")
            while true; do
                show_menu
                case $choice in
                    1) check_connection ;;
                    2) check_docker ;;
                    3) check_application_status ;;
                    4) check_health ;;
                    5) check_logs ;;
                    6) check_resources ;;
                    7) check_networks ;;
                    8) read_agent_file ;;
                    9) restart_application ;;
                    10) pull_latest_image ;;
                    11) run_migrations ;;
                    12) full_deployment_check ;;
                    13) print_info "Au revoir!"; exit 0 ;;
                    *) print_error "Option invalide" ;;
                esac
                echo ""
                read -p "Appuyez sur Entrée pour continuer..."
            done
            ;;
        *)
            echo "Usage: $0 [check|status|health|logs|restart|agent|menu]"
            echo ""
            echo "Commandes:"
            echo "  check    - Vérification complète"
            echo "  status   - État de l'application"
            echo "  health   - Health check"
            echo "  logs     - Derniers logs"
            echo "  restart  - Redémarrer l'application"
            echo "  agent    - Lire agent.md"
            echo "  menu     - Menu interactif (par défaut)"
            exit 1
            ;;
    esac
}

main "$@"
