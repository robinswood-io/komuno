# Déploiement en Production

## Architecture

```
GitHub Actions (Build)
        │
        ▼
   ghcr.io/robinswood-io/komuno:latest
        │
        ├──────────────────┐
        ▼                  ▼
   CJD80 Server       REP Server
   141.94.31.162      92.222.101.25
   cjd80.fr           repicardie.fr
```

## Prérequis

### Sur les serveurs de production

1. **Docker** et **Docker Compose** installés
2. **Traefik** configuré avec Let's Encrypt
3. Réseau Docker `traefik_public` créé:
   ```bash
   docker network create traefik_public
   ```

### Secrets GitHub à configurer

Allez dans **Settings > Secrets and variables > Actions** du repository.

#### Secrets pour CJD80 (141.94.31.162)

| Secret | Description |
|--------|-------------|
| `CJD80_HOST` | `141.94.31.162` |
| `CJD80_SSH_USER` | Utilisateur SSH (ex: `ubuntu`) |
| `CJD80_SSH_KEY` | Clé SSH privée pour connexion |
| `GHCR_TOKEN` | Token GitHub avec `read:packages` |

#### Secrets pour REP (92.222.101.25)

| Secret | Description |
|--------|-------------|
| `REP_HOST` | `92.222.101.25` |
| `REP_SSH_USER` | Utilisateur SSH (ex: `ubuntu`) |
| `REP_SSH_KEY` | Clé SSH privée pour connexion |

### Générer un token GHCR

1. Aller sur https://github.com/settings/tokens
2. Créer un token avec les permissions:
   - `read:packages`
   - `write:packages` (optionnel)
3. Ajouter le token comme secret `GHCR_TOKEN`

### Générer une clé SSH

```bash
# Générer une nouvelle clé
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# Afficher la clé publique (à ajouter sur le serveur)
cat ~/.ssh/github_deploy.pub

# Afficher la clé privée (à ajouter dans les secrets GitHub)
cat ~/.ssh/github_deploy
```

Sur le serveur:
```bash
# Ajouter la clé publique
echo "ssh-ed25519 AAAA..." >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Déploiement

### Automatique (Push sur main)

Chaque push sur `main` déclenche:
1. Build de l'image Docker
2. Push sur ghcr.io
3. Déploiement sur CJD80

### Manuel (Workflow Dispatch)

1. Aller sur **Actions > Build and Deploy**
2. Cliquer **Run workflow**
3. Choisir l'environnement:
   - `cjd80` - Déploie uniquement sur CJD80
   - `rep` - Déploie uniquement sur REP
   - `both` - Déploie sur les deux

## Première installation REP

### Option 1: Script automatique

```bash
export DOMAIN=repicardie.fr
export APP_NAME=rep
export GHCR_TOKEN=ghp_xxx
export GHCR_USER=votre-username

curl -sSL https://raw.githubusercontent.com/robinswood-io/komuno/main/deploy/install.sh | bash
```

### Option 2: Installation manuelle

```bash
# Créer le répertoire
mkdir -p /srv/workspace/rep
cd /srv/workspace/rep

# Télécharger les fichiers
curl -O https://raw.githubusercontent.com/robinswood-io/komuno/main/deploy/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/robinswood-io/komuno/main/deploy/.env.example

# Configurer
cp .env.example .env
nano .env  # Modifier les valeurs

# Login au registry
echo $GHCR_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Démarrer
docker compose -f docker-compose.prod.yml up -d
```

## Mise à jour manuelle

```bash
cd /srv/workspace/rep  # ou /srv/workspace (CJD80)

# Pull nouvelle image
docker pull ghcr.io/robinswood-io/komuno:latest

# Redémarrer
docker compose down
docker compose up -d

# Vérifier
docker compose ps
docker compose logs -f
```

## Rollback

```bash
# Lister les images disponibles
docker images | grep cjd80

# Utiliser une image spécifique
docker compose down
# Modifier docker-compose.yml pour utiliser le tag spécifique
docker compose up -d
```

## Monitoring

### Logs
```bash
docker compose logs -f app
```

### Santé
```bash
docker compose ps
docker stats
curl -f https://cjd80.fr/api/health  # ou https://repicardie.fr/api/health
```

### Base de données
```bash
docker compose exec postgres psql -U appuser -d app_db
```

## Troubleshooting

### Container ne démarre pas
```bash
docker compose logs app
docker inspect $(docker compose ps -q app)
```

### Problème de mémoire
```bash
docker stats
# Si OOM, augmenter la limite dans docker-compose.yml
```

### Problème de certificat SSL
```bash
docker logs traefik 2>&1 | grep -i cert
```
