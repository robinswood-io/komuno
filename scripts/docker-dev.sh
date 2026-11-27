#!/bin/bash

# Script pour faciliter le développement avec Docker
# Commandes utiles pour le développement quotidien

set -e

# Fonction d'aide
show_help() {
  cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Commandes de développement Docker.

Commands:
  init                Initialiser un nouveau projet Docker
  dev                 Démarrer l'environnement de développement
  test                Exécuter les tests dans Docker
  lint                Linter le code dans Docker
  build               Construire pour le développement
  rebuild             Reconstruire complètement
  reset               Réinitialiser l'environnement (supprime tout)
  logs-follow         Suivre les logs en temps réel
  db-connect          Se connecter à la base de données
  db-migrate          Exécuter les migrations
  db-seed             Peupler la base de données
  shell               Ouvrir un shell dans le conteneur principal

Options:
  -h, --help          Afficher cette aide
  -f, --file FILE     Fichier docker-compose
  -s, --service NAME  Service spécifique

Exemples:
  $0 dev
  $0 test
  $0 db-connect
  $0 rebuild
EOF
}

# Détecter docker-compose
detect_compose() {
  if command -v docker-compose &> /dev/null; then
    echo "docker-compose"
  elif docker compose version &> /dev/null; then
    echo "docker compose"
  else
    echo ""
  fi
}

COMPOSE_CMD=$(detect_compose)

# Initialiser un projet
init_project() {
  echo "🚀 Initialisation d'un nouveau projet Docker..."
  
  if [ -f "docker-compose.yml" ]; then
    echo "⚠️  docker-compose.yml existe déjà"
    read -p "Continuer? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
      exit 0
    fi
  fi
  
  # Créer un docker-compose.yml de base
  cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app
    environment:
      - NODE_ENV=development
    depends_on:
      - db

  db:
    image: postgres:18.7-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql

volumes:
  postgres_data:
EOF
  
  echo "✅ docker-compose.yml créé"
  echo "💡 Modifiez-le selon vos besoins"
}

# Démarrer l'environnement de développement
start_dev() {
  local compose_file="${1:-docker-compose.yml}"
  
  if [ -z "$COMPOSE_CMD" ]; then
    echo "❌ Docker Compose non disponible"
    exit 1
  fi
  
  echo "🔧 Démarrage de l'environnement de développement..."
  $COMPOSE_CMD -f $compose_file up -d --build
  
  echo ""
  echo "✅ Environnement démarré"
  echo "💡 Logs: $0 logs-follow"
  echo "💡 Shell: $0 shell"
}

# Exécuter les tests
run_tests() {
  local compose_file="${1:-docker-compose.yml}"
  local service="${2:-app}"
  
  if [ -z "$COMPOSE_CMD" ]; then
    echo "❌ Docker Compose non disponible"
    exit 1
  fi
  
  echo "🧪 Exécution des tests..."
  $COMPOSE_CMD -f $compose_file exec "$service" npm test || \
  $COMPOSE_CMD -f $compose_file exec "$service" npm run test || \
  $COMPOSE_CMD -f $compose_file exec "$service" yarn test
}

# Linter le code
run_lint() {
  local compose_file="${1:-docker-compose.yml}"
  local service="${2:-app}"
  
  if [ -z "$COMPOSE_CMD" ]; then
    echo "❌ Docker Compose non disponible"
    exit 1
  fi
  
  echo "🔍 Linting du code..."
  $COMPOSE_CMD -f $compose_file exec "$service" npm run lint || \
  $COMPOSE_CMD -f $compose_file exec "$service" npm run check || \
  $COMPOSE_CMD -f $compose_file exec "$service" yarn lint
}

# Construire pour le développement
build_dev() {
  local compose_file="${1:-docker-compose.yml}"
  
  if [ -z "$COMPOSE_CMD" ]; then
    echo "❌ Docker Compose non disponible"
    exit 1
  fi
  
  echo "🔨 Construction pour le développement..."
  $COMPOSE_CMD -f $compose_file build --no-cache
}

# Reconstruire complètement
rebuild_all() {
  local compose_file="${1:-docker-compose.yml}"
  
  if [ -z "$COMPOSE_CMD" ]; then
    echo "❌ Docker Compose non disponible"
    exit 1
  fi
  
  echo "🔄 Reconstruction complète..."
  echo ""
  
  echo "1️⃣ Arrêt des conteneurs..."
  $COMPOSE_CMD -f $compose_file down
  
  echo ""
  echo "2️⃣ Suppression des images..."
  $COMPOSE_CMD -f $compose_file down --rmi all
  
  echo ""
  echo "3️⃣ Reconstruction..."
  $COMPOSE_CMD -f $compose_file build --no-cache
  
  echo ""
  echo "4️⃣ Démarrage..."
  $COMPOSE_CMD -f $compose_file up -d
  
  echo ""
  echo "✅ Reconstruction terminée"
}

# Réinitialiser complètement
reset_env() {
  local compose_file="${1:-docker-compose.yml}"
  
  if [ -z "$COMPOSE_CMD" ]; then
    echo "❌ Docker Compose non disponible"
    exit 1
  fi
  
  echo "⚠️  RÉINITIALISATION COMPLÈTE"
  echo "   Cela va supprimer:"
  echo "   - Tous les conteneurs"
  echo "   - Toutes les images"
  echo "   - Tous les volumes"
  echo ""
  read -p "Confirmer? (tapez 'RESET'): " confirm
  
  if [ "$confirm" != "RESET" ]; then
    echo "❌ Annulé"
    exit 0
  fi
  
  echo ""
  echo "🧹 Nettoyage..."
  
  $COMPOSE_CMD -f $compose_file down -v --rmi all
  
  echo ""
  echo "✅ Environnement réinitialisé"
}

# Suivre les logs
follow_logs() {
  local compose_file="${1:-docker-compose.yml}"
  local service="${2:-}"
  
  if [ -z "$COMPOSE_CMD" ]; then
    echo "❌ Docker Compose non disponible"
    exit 1
  fi
  
  local cmd="$COMPOSE_CMD -f $compose_file logs --follow"
  
  if [ -n "$service" ]; then
    cmd="$cmd $service"
  fi
  
  eval $cmd
}

# Se connecter à la base de données
connect_db() {
  local compose_file="${1:-docker-compose.yml}"
  local db_service="${2:-db}"
  
  if [ -z "$COMPOSE_CMD" ]; then
    echo "❌ Docker Compose non disponible"
    exit 1
  fi
  
  echo "🗄️  Connexion à la base de données ($db_service)..."
  
  # Essayer différentes commandes selon le type de DB
  $COMPOSE_CMD -f $compose_file exec "$db_service" psql -U postgres 2>/dev/null || \
  $COMPOSE_CMD -f $compose_file exec "$db_service" mysql -u root -p 2>/dev/null || \
  $COMPOSE_CMD -f $compose_file exec "$db_service" mongosh 2>/dev/null || \
  $COMPOSE_CMD -f $compose_file exec "$db_service" /bin/sh
}

# Exécuter les migrations
run_migrations() {
  local compose_file="${1:-docker-compose.yml}"
  local service="${2:-app}"
  
  if [ -z "$COMPOSE_CMD" ]; then
    echo "❌ Docker Compose non disponible"
    exit 1
  fi
  
  echo "🔄 Exécution des migrations..."
  
  $COMPOSE_CMD -f $compose_file exec "$service" npm run db:migrate || \
  $COMPOSE_CMD -f $compose_file exec "$service" npm run migrate || \
  $COMPOSE_CMD -f $compose_file exec "$service" yarn migrate || \
  $COMPOSE_CMD -f $compose_file exec "$service" alembic upgrade head
}

# Peupler la base de données
seed_db() {
  local compose_file="${1:-docker-compose.yml}"
  local service="${2:-app}"
  
  if [ -z "$COMPOSE_CMD" ]; then
    echo "❌ Docker Compose non disponible"
    exit 1
  fi
  
  echo "🌱 Peuplement de la base de données..."
  
  $COMPOSE_CMD -f $compose_file exec "$service" npm run db:seed || \
  $COMPOSE_CMD -f $compose_file exec "$service" npm run seed || \
  $COMPOSE_CMD -f $compose_file exec "$service" yarn seed
}

# Ouvrir un shell
open_shell() {
  local compose_file="${1:-docker-compose.yml}"
  local service="${2:-app}"
  
  if [ -z "$COMPOSE_CMD" ]; then
    echo "❌ Docker Compose non disponible"
    exit 1
  fi
  
  echo "🐚 Ouverture d'un shell dans $service..."
  
  # Détecter le shell disponible
  $COMPOSE_CMD -f $compose_file exec "$service" /bin/bash || \
  $COMPOSE_CMD -f $compose_file exec "$service" /bin/sh
}

# Main
COMMAND="${1:-help}"
shift || true

COMPOSE_FILE="docker-compose.yml"
SERVICE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--file)
      COMPOSE_FILE="$2"
      shift 2
      ;;
    -s|--service)
      SERVICE="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

case "$COMMAND" in
  init)
    init_project
    ;;
  dev)
    start_dev "$COMPOSE_FILE"
    ;;
  test)
    run_tests "$COMPOSE_FILE" "$SERVICE"
    ;;
  lint)
    run_lint "$COMPOSE_FILE" "$SERVICE"
    ;;
  build)
    build_dev "$COMPOSE_FILE"
    ;;
  rebuild)
    rebuild_all "$COMPOSE_FILE"
    ;;
  reset)
    reset_env "$COMPOSE_FILE"
    ;;
  logs-follow)
    follow_logs "$COMPOSE_FILE" "$SERVICE"
    ;;
  db-connect)
    connect_db "$COMPOSE_FILE" "${SERVICE:-db}"
    ;;
  db-migrate)
    run_migrations "$COMPOSE_FILE" "$SERVICE"
    ;;
  db-seed)
    seed_db "$COMPOSE_FILE" "$SERVICE"
    ;;
  shell)
    open_shell "$COMPOSE_FILE" "$SERVICE"
    ;;
  -h|--help|help)
    show_help
    ;;
  *)
    echo "❌ Commande inconnue: $COMMAND"
    show_help
    exit 1
    ;;
esac

