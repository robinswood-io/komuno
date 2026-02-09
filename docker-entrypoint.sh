#!/bin/sh
set -e

echo "🚀 Starting application..."

# Exécuter les migrations de base de données
if [ -f "/app/scripts/run-migrations.sh" ]; then
  sh /app/scripts/run-migrations.sh || {
    echo "⚠️  Migrations failed or already applied, continuing startup..."
  }
else
  echo "⚠️  Migration script not found, skipping migrations"
fi

# Démarrer NestJS en background
echo "📡 Starting NestJS backend on port 5000..."
node --experimental-specifier-resolution=node --experimental-loader=./server/esm-loader.js dist/server/src/main.js &
BACKEND_PID=$!

# Attendre que le backend démarre
sleep 5

# Démarrer NextJS en background
echo "🌐 Starting NextJS frontend on port 3000..."
HOSTNAME=0.0.0.0 PORT=3000 node server.js &
FRONTEND_PID=$!

echo "✅ Application started!"
echo "   - Frontend (NextJS): http://localhost:3000"
echo "   - Backend (NestJS): http://localhost:5000"

# Fonction pour gérer l'arrêt propre
cleanup() {
    echo "🛑 Shutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGTERM SIGINT

# Attendre que l'un des processus se termine
wait -n

# Si l'un se termine, arrêter l'autre
cleanup
