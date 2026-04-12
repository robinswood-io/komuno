# État de la configuration Authentik

## ✅ Étapes complétées

### 1. Code et dépendances
- ✅ Dépendances npm installées (`passport-oauth2`, `@types/passport-oauth2`)
- ✅ Code backend migré vers OAuth2
- ✅ Code frontend adapté pour Authentik
- ✅ Services Authentik ajoutés dans `docker-compose.services.yml`
- ✅ Variables d'environnement configurées dans `config/shared-env.defaults`

### 2. Base de données
- ✅ Base de données `authentik` créée dans PostgreSQL
- ✅ Migration de la base de données exécutée avec succès
- ✅ Champ `password` rendu nullable dans la table `admins`

### 3. Documentation
- ✅ Guide de démarrage rapide créé (`AUTHENTIK_QUICKSTART.md`)
- ✅ Guide de configuration détaillé disponible (`AUTHENTIK_SETUP.md`)
- ✅ Guide de migration des utilisateurs disponible (`AUTHENTIK_MIGRATION.md`)

## ⚠️ Problèmes identifiés

### 1. Conflit de port Redis (6380)

**Problème** : Le port 6380 est déjà utilisé par un autre processus Docker.

**Solution** :

Option A - Identifier et arrêter le processus :
```bash
# Identifier le conteneur qui utilise le port
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep 6380

# Arrêter le conteneur si nécessaire
docker stop <container-name>
```

Option B - Modifier le port dans docker-compose :
```yaml
# Dans docker-compose.services.yml, modifier :
ports:
  - "6381:6379"  # Utiliser 6381 au lieu de 6380
```

Puis redémarrer Redis :
```bash
docker compose -f docker-compose.services.yml up -d redis
```

### 2. Erreur de téléchargement de l'image Authentik

**Problème** : Erreur `denied` lors du téléchargement de l'image depuis `ghcr.io`.

**Cause** : GitHub Container Registry nécessite une authentification pour télécharger certaines images.

**Solution recommandée** : S'authentifier avec GitHub Container Registry

**Étapes détaillées** :

1. **Créer un Personal Access Token GitHub** :
   - Allez sur https://github.com/settings/tokens
   - Cliquez sur "Generate new token (classic)"
   - Donnez un nom au token (ex: "Docker Authentik")
   - Cochez la permission `read:packages`
   - Cliquez sur "Generate token"
   - **Copiez le token** (il ne sera affiché qu'une seule fois)

2. **S'authentifier avec Docker** :
   ```bash
   export GITHUB_TOKEN="votre_token_ici"
   echo $GITHUB_TOKEN | docker login ghcr.io -u VOTRE_USERNAME --password-stdin
   ```

3. **Télécharger l'image** :
   ```bash
   docker pull ghcr.io/goauthentik/authentik:2024.10.1
   docker compose -f docker-compose.services.yml up -d authentik-server authentik-worker
   ```

**Autres solutions** : Voir `AUTHENTIK_IMAGE_FIX.md` pour toutes les alternatives.

## 📋 Prochaines étapes

Une fois les problèmes résolus :

1. **Démarrer Authentik** :
   ```bash
   docker compose -f docker-compose.services.yml up -d authentik-server authentik-worker
   ```

2. **Vérifier les logs** :
   ```bash
   docker compose -f docker-compose.services.yml logs -f authentik-server
   ```

3. **Récupérer les identifiants admin** :
   ```bash
   docker compose -f docker-compose.services.yml logs authentik-server | grep -i "password\|admin"
   ```

4. **Configurer Authentik** (voir `AUTHENTIK_QUICKSTART.md`) :
   - Créer l'application OAuth2/OIDC
   - Créer les groupes
   - Créer un token API
   - Créer les utilisateurs

5. **Configurer les variables d'environnement** :
   - Remplir `AUTHENTIK_CLIENT_ID`
   - Remplir `AUTHENTIK_CLIENT_SECRET`
   - Remplir `AUTHENTIK_TOKEN`
   - Générer `AUTHENTIK_SECRET_KEY`

6. **Tester l'authentification** :
   ```bash
   npm run dev
   # Accéder à http://localhost:5000/auth
   ```

## 🔍 Vérifications

### Vérifier l'état des services
```bash
docker ps --filter "name=authentik"
docker ps --filter "name=cjd-redis"
```

### Vérifier les logs
```bash
docker compose -f docker-compose.services.yml logs authentik-server
docker compose -f docker-compose.services.yml logs authentik-worker
```

### Vérifier la base de données
```bash
# Vérifier que la base authentik existe
docker exec -it cjd-postgres psql -U postgres -c "\l" | grep authentik

# Vérifier que password est nullable
docker exec -it cjd-postgres psql -U postgres -d cjd80 -c "\d admins" | grep password
```

## 📚 Documentation

- `AUTHENTIK_QUICKSTART.md` - Guide de démarrage rapide
- `AUTHENTIK_SETUP.md` - Guide de configuration détaillé
- `AUTHENTIK_MIGRATION.md` - Guide de migration des utilisateurs

