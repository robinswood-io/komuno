# Guide de Déploiement Local vers VPS - CJD Amiens

Ce guide explique comment déployer l'application CJD Amiens sur votre VPS en utilisant un build Docker local, sans dépendre de GitHub Actions ou GHCR.

## Vue d'ensemble

Le déploiement utilise une approche simple et directe :

1. **Script local** (`scripts/deploy-vps-local.sh`) se connecte en SSH au VPS
2. **Sur le VPS** : Git pull, build Docker local, sauvegarde des images
3. **Déploiement** via docker-compose avec l'image locale `cjd80:latest`
4. **Health check** automatique et rollback si échec
5. **Nettoyage** automatique des anciennes images (garde les 5 dernières)

## Avantages

- ✅ Pas de dépendance à GitHub Actions
- ✅ Pas besoin de GHCR ou token GitHub
- ✅ Build visible directement sur le VPS
- ✅ Débogage plus simple
- ✅ Contrôle total du processus
- ✅ Versioning via Git (commits)

## Prérequis

### Local (machine de développement)

- Accès SSH au VPS configuré
- Clé SSH configurée (par défaut: `~/.ssh/id_rsa`)
- Git installé

### VPS

- Ubuntu 20.04+ ou Debian 11+
- Docker et Docker Compose installés
- Git installé
- Accès SSH avec clé
- Base de données PostgreSQL accessible
- Traefik configuré (pour le routage)

## Installation Initiale sur le VPS

### 1. Préparer le répertoire de déploiement

```bash
# Se connecter au VPS
ssh thibault@141.94.31.162

# Créer la structure de répertoires
sudo mkdir -p /docker/cjd80/scripts
sudo chown -R $USER:$USER /docker/cjd80
cd /docker/cjd80

# Cloner le repository
git clone https://github.com/Aoleon/cjd80.git .
```

### 2. Configurer les variables d'environnement

```bash
# Copier le fichier exemple
cp .env.example .env

# Éditer avec vos vraies valeurs
nano .env
```

**Variables critiques à configurer :**

| Variable | Description | Comment l'obtenir |
|----------|-------------|-------------------|
| `DATABASE_URL` | Connexion PostgreSQL | `postgresql://user:pass@host:5432/dbname` |
| `SESSION_SECRET` | Clé de session | `openssl rand -base64 32` |

### 3. Vérifier Docker

```bash
# Vérifier que Docker est installé
docker --version
docker compose version

# Vérifier que l'utilisateur est dans le groupe docker
groups | grep docker

# Si pas dans le groupe docker :
sudo usermod -aG docker $USER
newgrp docker
```

## Utilisation

### Déploiement standard

Depuis votre machine locale, dans le répertoire du projet :

```bash
# Rendre le script exécutable (première fois)
chmod +x scripts/deploy-vps-local.sh

# Lancer le déploiement
./scripts/deploy-vps-local.sh
```

Le script va :
1. Vérifier la connexion SSH
2. Vérifier les prérequis sur le VPS
3. Demander confirmation
4. Exécuter le build et déploiement sur le VPS

### Configuration personnalisée

Vous pouvez personnaliser la configuration via des variables d'environnement :

```bash
# Exemple avec configuration personnalisée
VPS_HOST=192.168.1.100 \
VPS_USER=admin \
VPS_PORT=2222 \
SSH_KEY=~/.ssh/my_key \
./scripts/deploy-vps-local.sh
```

**Variables disponibles :**

- `VPS_HOST` : Adresse du VPS (défaut: `141.94.31.162`)
- `VPS_USER` : Utilisateur SSH (défaut: `thibault`)
- `VPS_PORT` : Port SSH (défaut: `22`)
- `DEPLOY_DIR` : Répertoire de déploiement (défaut: `/docker/cjd80`)
- `SSH_KEY` : Chemin vers la clé SSH (défaut: `~/.ssh/id_rsa`)

### Déploiement manuel sur le VPS

Si vous préférez vous connecter manuellement au VPS :

```bash
# Se connecter au VPS
ssh thibault@141.94.31.162

# Aller dans le répertoire de déploiement
cd /docker/cjd80

# Exécuter le script de build et déploiement
bash scripts/vps-build-and-deploy.sh
```

## Gestion des Images

### Images créées

- **`cjd80:latest`** : Image actuellement déployée
- **`cjd80:backup-YYYYMMDD-HHMMSS`** : Images de backup pour rollback

### Nettoyage automatique

Le script garde automatiquement les **5 dernières images backup** et supprime les plus anciennes.

### Rollback manuel

Si vous devez revenir à une version précédente :

```bash
# Se connecter au VPS
ssh thibault@141.94.31.162
cd /docker/cjd80

# Lister les images backup disponibles
docker images cjd80 --format "table {{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | grep backup

# Rollback vers une image spécifique
docker tag cjd80:backup-20250129-143000 cjd80:latest
export DOCKER_IMAGE=cjd80:latest
docker compose down
docker compose up -d
```

## Dépannage

### Erreur de connexion SSH

```bash
# Vérifier que la clé SSH est configurée
ls -la ~/.ssh/id_rsa

# Tester la connexion manuellement
ssh -p 22 thibault@141.94.31.162

# Si nécessaire, configurer la clé SSH
ssh-copy-id -i ~/.ssh/id_rsa.pub thibault@141.94.31.162
```

### Erreur de build Docker

```bash
# Se connecter au VPS et vérifier les logs
ssh thibault@141.94.31.162
cd /docker/cjd80

# Vérifier que Dockerfile existe
ls -la Dockerfile

# Tester le build manuellement
docker build -t cjd80:latest .

# Vérifier les logs d'erreur
docker build -t cjd80:latest . 2>&1 | tee build.log
```

### Erreur de déploiement

```bash
# Vérifier les logs du conteneur
docker compose logs --tail=100 cjd-app

# Vérifier le statut
docker compose ps

# Vérifier les réseaux Docker
docker network ls
docker network inspect proxy
```

### Health check échoue

```bash
# Vérifier que le conteneur est démarré
docker compose ps

# Tester le health check manuellement
docker compose exec cjd-app wget --spider -q http://localhost:5000/api/health

# Vérifier les logs
docker compose logs --tail=50 cjd-app

# Vérifier la connexion à la base de données
docker compose exec cjd-app env | grep DATABASE_URL
```

### Problème avec Traefik

```bash
# Vérifier que Traefik est démarré
docker ps | grep traefik

# Vérifier que le conteneur est sur le réseau proxy
docker network inspect proxy | grep cjd-app

# Si nécessaire, reconnecter le conteneur au réseau
docker network connect proxy cjd-app

# Redémarrer Traefik pour forcer la détection
docker restart traefik
```

## Workflow Complet

### 1. Développement local

```bash
# Faire vos modifications
git add .
git commit -m "Ma modification"
git push origin main
```

### 2. Déploiement

```bash
# Depuis votre machine locale
./scripts/deploy-vps-local.sh
```

### 3. Vérification

```bash
# Vérifier que l'application est en ligne
curl https://cjd80.fr/api/health

# Ou ouvrir dans le navigateur
open https://cjd80.fr
```

## Comparaison avec GitHub Actions

| Aspect | GitHub Actions | Déploiement Local |
|--------|----------------|-------------------|
| Build | Sur GitHub | Sur le VPS |
| Images | GHCR | Locales sur VPS |
| Dépendances | GitHub Actions, GHCR, tokens | SSH uniquement |
| Visibilité | Logs GitHub | Logs directs sur VPS |
| Débogage | Via GitHub UI | Direct sur VPS |
| Vitesse | Dépend de GitHub | Dépend du VPS |

## Sécurité

- ✅ Utilise les clés SSH existantes (pas de mot de passe en clair)
- ✅ Vérifie que `.env` existe avant déploiement
- ✅ Valide les fichiers critiques avant build
- ✅ Rollback automatique en cas d'échec

## Maintenance

### Nettoyage manuel des images

```bash
# Supprimer toutes les images backup sauf les 5 dernières
docker images cjd80 --format "{{.Tag}}" | grep backup | sort -r | tail -n +6 | xargs -I {} docker rmi cjd80:{}

# Supprimer les images non utilisées
docker image prune -f
```

### Mise à jour du script

Les scripts sont versionnés dans Git. Pour mettre à jour :

```bash
# Sur le VPS
cd /docker/cjd80
git pull origin main
```

## Support

En cas de problème :

1. Vérifier les logs : `docker compose logs cjd-app`
2. Vérifier le statut : `docker compose ps`
3. Tester manuellement : `bash scripts/vps-build-and-deploy.sh`
4. Consulter la documentation : `docs/deployment/`

## Notes

- Le script garde les 5 dernières images backup pour permettre le rollback
- Les images sont taggées avec `backup-YYYYMMDD-HHMMSS` pour faciliter l'identification
- Le build peut prendre plusieurs minutes selon la taille du projet
- Le health check attend jusqu'à 60 secondes avant de considérer un échec

