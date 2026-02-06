#!/bin/bash

# Script pour générer des relations de test via l'API

echo "🔐 Connexion..."

# Login pour obtenir un cookie de session
COOKIE_JAR="/tmp/cjd80-cookie-$(date +%s).txt"

curl -s -c "$COOKIE_JAR" -X POST https://cjd80.rbw.ovh/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.local","password":"any-password"}' > /dev/null

echo "📊 Génération des relations de test..."

# Appeler l'endpoint de génération
RESPONSE=$(curl -s -b "$COOKIE_JAR" -X POST \
  https://cjd80.rbw.ovh/api/admin/test-data/generate-relations)

echo "$RESPONSE" | jq .

# Nettoyer
rm -f "$COOKIE_JAR"

echo "✅ Terminé"
