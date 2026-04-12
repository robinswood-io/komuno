# Déploiement Manuel Simplifié

Si le script automatique ne fonctionne pas, voici la procédure manuelle simple :

## Sur le VPS (via SSH)

```bash
# 1. Se connecter au VPS
ssh thibault@141.94.31.162

# 2. Aller dans le répertoire
cd /docker/cjd80

# 3. Mettre à jour le code
git pull origin main

# 4. Arrêter l'application
docker compose down

# 5. Rebuild l'image (peut prendre 2-5 minutes)
docker build -t cjd80:latest .

# 6. Migrations (optionnel, seulement si schéma DB changé)
docker run --rm --env-file .env --network proxy cjd80:latest sh -c "cd /app && npx drizzle-kit push"

# 7. Redémarrer
export DOCKER_IMAGE=cjd80:latest
docker compose up -d

# 8. Vérifier
docker compose ps
docker compose logs --tail=20 cjd-app
```

## Vérification rapide

```bash
# Vérifier que l'application répond
curl http://localhost:5000/api/health

# Voir les logs en temps réel
docker compose logs -f cjd-app
```

## En cas de problème

```bash
# Voir les logs d'erreur
docker compose logs --tail=50 cjd-app

# Redémarrer proprement
docker compose restart cjd-app

# Rollback vers la dernière image backup
docker images | grep backup
docker tag cjd80:backup-YYYYMMDD-HHMMSS cjd80:latest
export DOCKER_IMAGE=cjd80:latest
docker compose up -d
```


