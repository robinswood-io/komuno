# Solution pour le téléchargement de l'image Authentik

## Problème

Erreur `denied` lors du téléchargement de l'image depuis `ghcr.io/goauthentik/authentik`.

## Solutions

### Solution 1 : Attendre et réessayer (Rate Limiting)

GitHub Container Registry peut limiter les requêtes. Attendez 5-10 minutes puis :

```bash
docker pull ghcr.io/goauthentik/authentik:2024.10.1
docker compose -f docker-compose.services.yml up -d authentik-server authentik-worker
```

### Solution 2 : S'authentifier avec GitHub

1. **Créer un Personal Access Token GitHub** :
   - Allez sur https://github.com/settings/tokens
   - Cliquez sur "Generate new token (classic)"
   - Cochez la permission `read:packages`
   - Générez et copiez le token

2. **S'authentifier avec Docker** :
   ```bash
   echo $GITHUB_TOKEN | docker login ghcr.io -u VOTRE_USERNAME --password-stdin
   ```

3. **Télécharger l'image** :
   ```bash
   docker pull ghcr.io/goauthentik/authentik:2024.10.1
   ```

### Solution 3 : Utiliser une version antérieure stable

Modifier `docker-compose.services.yml` :

```yaml
image: ghcr.io/goauthentik/authentik:2024.8.1  # Version antérieure
```

Puis :
```bash
docker compose -f docker-compose.services.yml pull
docker compose -f docker-compose.services.yml up -d authentik-server authentik-worker
```

### Solution 4 : Téléchargement manuel (si disponible)

1. Aller sur https://github.com/goauthentik/authentik/pkgs/container/authentik
2. Télécharger l'image manuellement si disponible
3. Charger dans Docker :
   ```bash
   docker load < authentik-image.tar
   ```

### Solution 5 : Utiliser Docker Compose pull avec retry

```bash
# Essayer plusieurs fois avec retry
for i in {1..5}; do
  echo "Tentative $i..."
  docker compose -f docker-compose.services.yml pull authentik-server authentik-worker && break
  sleep 30
done
```

### Solution 6 : Vérifier la connectivité

```bash
# Tester la connectivité à ghcr.io
curl -I https://ghcr.io/v2/

# Vérifier les DNS
nslookup ghcr.io
```

## Vérification

Une fois l'image téléchargée :

```bash
# Vérifier que l'image est présente
docker images | grep authentik

# Démarrer les services
docker compose -f docker-compose.services.yml up -d authentik-server authentik-worker

# Vérifier les logs
docker compose -f docker-compose.services.yml logs -f authentik-server
```

## Note

La dernière version disponible est `2025.10.2`, mais nous utilisons `2024.10.1` pour la stabilité. Vous pouvez essayer la dernière version si nécessaire :

```yaml
image: ghcr.io/goauthentik/authentik:2025.10.2
```


