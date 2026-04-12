# Guide de Déploiement - CJD Amiens (cjd80.fr)

Ce guide explique comment déployer automatiquement l'application CJD Amiens sur votre VPS avec le domaine cjd80.fr via GitHub Actions.

## 📋 Vue d'ensemble

Le déploiement utilise une approche moderne avec **GitHub Container Registry (GHCR)** :

1. **GitHub Actions** build l'image Docker et la push vers GHCR
2. Le workflow **SSH sur le VPS** pour déclencher le déploiement
3. Le VPS **pull l'image**, exécute les **migrations** et redémarre l'app
4. Un **health check automatique** valide le déploiement
5. En cas d'échec, un **rollback automatique** restaure la version précédente

---

## 🚀 Installation Initiale sur le VPS

### 1. Prérequis VPS

- Ubuntu 20.04+ ou Debian 11+
- Docker et Docker Compose installés
- Nginx installé
- Accès SSH avec clé
- Base de données PostgreSQL accessible

### 2. Installation Docker (si nécessaire)

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo apt install docker-compose-plugin -y

# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER
newgrp docker

# Vérifier l'installation
docker --version
docker compose version
```

### 3. Préparer le répertoire de déploiement

```bash
# Se connecter au VPS
ssh user@cjd80.fr

# Créer la structure de répertoires
sudo mkdir -p /docker/cjd80/scripts
sudo chown -R $USER:$USER /docker/cjd80
cd /docker/cjd80

# Cloner le repository
git clone https://github.com/Aoleon/cjd80.git .
```

### 4. Configurer les variables d'environnement

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
| `SMTP_USER` | Email SMTP | Votre email |
| `SMTP_PASS` | Mot de passe SMTP | Mot de passe ou app password |
| `VAPID_PUBLIC_KEY` | Clé publique push | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Clé privée push | Même commande |
| `GITHUB_TOKEN` | Token GitHub API | Settings > Developer > Personal tokens |

### 5. Se connecter à GitHub Container Registry

```bash
# Créer un Personal Access Token sur GitHub
# https://github.com/settings/tokens
# Permissions requises: read:packages

# Se connecter à GHCR
echo "VOTRE_TOKEN" | docker login ghcr.io -u VOTRE_USERNAME --password-stdin

# Vérifier la connexion
docker pull ghcr.io/aoleon/cjd80:latest || echo "Pas encore d'image (c'est normal au premier déploiement)"
```

### 6. Configurer Nginx

```bash
# Copier la configuration
sudo cp nginx.conf.example /etc/nginx/sites-available/cjd80.fr

# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/cjd80.fr /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 7. Obtenir un certificat SSL

```bash
# Installer certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtenir le certificat (interactive)
sudo certbot --nginx -d cjd80.fr -d www.cjd80.fr

# Vérifier le renouvellement automatique
sudo certbot renew --dry-run
```

---

## 🔧 Configuration GitHub Actions

### 1. Créer les secrets GitHub

Dans votre repository GitHub : `Settings > Secrets and variables > Actions > New repository secret`

**Secrets requis :**

| Secret | Description | Exemple |
|--------|-------------|---------|
| `VPS_SSH_KEY` | Clé privée SSH (tout le contenu de `~/.ssh/id_rsa`) | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `VPS_HOST` | Adresse du VPS | `cjd80.fr` ou `123.45.67.89` |
| `VPS_PORT` | Port SSH | `22` (ou votre port custom) |
| `VPS_USER` | Utilisateur SSH | `ubuntu`, `root`, etc. |

### 2. Générer une clé SSH (si nécessaire)

```bash
# Sur votre machine locale
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github-deploy

# Copier la clé publique sur le VPS
ssh-copy-id -i ~/.ssh/github-deploy.pub user@cjd80.fr

# Afficher la clé privée à copier dans GitHub Secrets
cat ~/.ssh/github-deploy
```

### 3. Tester la connexion SSH

```bash
# Depuis votre machine locale
ssh -i ~/.ssh/github-deploy -p 22 user@cjd80.fr "echo 'SSH OK'"
```

---

## 🚀 Déploiement Automatique

### Workflow de déploiement

Chaque **push sur la branche `main`** déclenche automatiquement :

1. ✅ Build de l'image Docker
2. ✅ Push vers GitHub Container Registry
3. ✅ SSH sur le VPS
4. ✅ Pull de la nouvelle image
5. ✅ Exécution des migrations de base de données
6. ✅ Redémarrage de l'application
7. ✅ Validation avec health check
8. ✅ Rollback automatique en cas d'échec

### Déclencher un déploiement

```bash
# Méthode 1: Push sur main (automatique)
git add .
git commit -m "Nouvelle fonctionnalité"
git push origin main

# Méthode 2: Déploiement manuel via GitHub
# Allez sur: Actions > Deploy to VPS > Run workflow
```

### Suivre le déploiement

1. Allez sur `https://github.com/Aoleon/cjd80/actions`
2. Cliquez sur le workflow en cours
3. Suivez les logs en temps réel

---

## 🔍 Vérification Post-Déploiement

### Health Checks

```bash
# Vérifier que l'application répond
curl https://cjd80.fr/api/health

# Réponse attendue
{
  "status": "healthy",
  "timestamp": "2024-10-18T10:00:00.000Z",
  "uptime": 123,
  "version": "1.0.0",
  "database": "connected"
}
```

### Vérifier les logs

```bash
# SSH sur le VPS
ssh user@cjd80.fr

# Aller dans le répertoire
cd /docker/cjd80

# Voir les logs en temps réel
docker compose logs -f

# Dernières 100 lignes
docker compose logs --tail=100

# Statut des conteneurs
docker compose ps
```

### Tests fonctionnels

| Test | URL | Attendu |
|------|-----|---------|
| Frontend | https://cjd80.fr | Page d'accueil |
| Admin | https://cjd80.fr/admin | Page de login admin |
| API Health | https://cjd80.fr/api/health | JSON avec status "healthy" |
| API Events | https://cjd80.fr/api/events | JSON avec liste d'événements |

---

## 🛠️ Opérations Courantes

### Redémarrer l'application

```bash
cd /docker/cjd80
docker compose restart
```

### Voir les logs d'erreur

```bash
docker compose logs --tail=200 cjd-app | grep -i error
```

### Mettre à jour manuellement

```bash
cd /docker/cjd80

# Exporter l'image tag (ou utiliser :latest)
export DOCKER_IMAGE="ghcr.io/aoleon/cjd80:latest"

# Lancer le script de déploiement
bash scripts/vps-deploy.sh
```

### Rollback manuel vers une version précédente

```bash
cd /docker/cjd80

# Lister les images disponibles
docker images | grep cjd80

# Exporter l'image souhaitée
export DOCKER_IMAGE="ghcr.io/aoleon/cjd80:backup-20241018-120000"

# Redéployer
docker compose down
docker compose up -d
```

### Accéder au conteneur

```bash
# Shell interactif
docker compose exec cjd-app sh

# Exécuter une commande
docker compose exec cjd-app npm run db:push
```

---

## 🐛 Dépannage

### Le déploiement échoue au health check

**Diagnostic :**
```bash
# Vérifier les logs
docker compose logs --tail=100 cjd-app

# Vérifier le health check en local
docker compose exec cjd-app wget --spider http://localhost:5000/api/health
```

**Solutions :**
- Vérifier que le fichier `.env` est correct
- Vérifier que la base de données est accessible
- Vérifier que tous les secrets sont définis

### L'image ne se pull pas depuis GHCR

**Diagnostic :**
```bash
# Vérifier la connexion à GHCR
docker login ghcr.io

# Tester manuellement
docker pull ghcr.io/aoleon/cjd80:latest
```

**Solutions :**
- Reconnecter à GHCR : `docker login ghcr.io`
- Vérifier les permissions du token GitHub
- Vérifier que l'image existe : `https://github.com/Aoleon/cjd80/pkgs/container/cjd80`

### Nginx retourne 502 Bad Gateway

**Diagnostic :**
```bash
# Vérifier que l'app tourne
docker compose ps

# Vérifier les logs nginx
sudo tail -f /var/log/nginx/cjd80.fr.error.log

# Tester en local
curl http://localhost:5000/api/health
```

**Solutions :**
- Vérifier que le conteneur écoute sur le port 5000
- Redémarrer nginx : `sudo systemctl restart nginx`
- Vérifier la config nginx : `sudo nginx -t`

### Les migrations échouent

**Diagnostic :**
```bash
# Exécuter manuellement
docker compose run --rm cjd-app npx drizzle-kit push --force
```

**Solutions :**
- Vérifier `DATABASE_URL` dans `.env`
- Vérifier que PostgreSQL est accessible
- Utiliser `--force` si les changements sont intentionnels

---

## 📊 Monitoring

### Endpoints de santé disponibles

| Endpoint | Description | Usage |
|----------|-------------|-------|
| `/api/health` | Health check global | Monitoring automatique |
| `/api/health/db` | Santé de la base de données | Debug DB |
| `/api/health/ready` | Readiness check | Kubernetes/orchestrateurs |
| `/api/health/live` | Liveness check | Toujours 200 OK |

### Configuration d'alertes (recommandé)

Services gratuits pour monitoring :
- **UptimeRobot** (https://uptimerobot.com)
- **StatusCake** (https://www.statuscake.com)
- **Better Uptime** (https://betteruptime.com)

Configuration recommandée :
- URL : `https://cjd80.fr/api/health`
- Intervalle : 5 minutes
- Alerte si : temps de réponse > 3s OU status ≠ 200

---

## 🔒 Sécurité

### Checklist de sécurité

- [ ] Firewall configuré (ports 80, 443, SSH uniquement)
- [ ] SSH par clé uniquement (pas de mot de passe)
- [ ] Certificat SSL actif et auto-renouvelé
- [ ] PostgreSQL non exposé publiquement
- [ ] Fichier `.env` jamais commité dans Git
- [ ] Secrets GitHub Actions correctement configurés
- [ ] Mises à jour système régulières

### Durcissement SSH

```bash
# Éditer la config SSH
sudo nano /etc/ssh/sshd_config

# Désactiver l'authentification par mot de passe
PasswordAuthentication no
PubkeyAuthentication yes

# Changer le port SSH (optionnel)
Port 2222

# Redémarrer SSH
sudo systemctl restart sshd
```

### Backup automatique de la base de données

```bash
# Créer le script de backup
cat > /docker/cjd80/scripts/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/cjd80"
mkdir -p $BACKUP_DIR
pg_dump $DATABASE_URL > $BACKUP_DIR/cjd-$(date +\%Y\%m\%d-\%H\%M\%S).sql
# Garder seulement les 7 derniers backups
ls -t $BACKUP_DIR/cjd-*.sql | tail -n +8 | xargs rm -f
EOF

chmod +x /docker/cjd80/scripts/backup-db.sh

# Ajouter au crontab (quotidien à 2h)
crontab -e
# Ajouter la ligne:
0 2 * * * cd /docker/cjd80 && bash scripts/backup-db.sh
```

---

## 📞 Support & Ressources

### En cas de problème

1. **Vérifier les logs** : `docker compose logs --tail=100`
2. **Vérifier le health check** : `curl http://localhost:5000/api/health`
3. **Consulter ce guide** de déploiement
4. **Vérifier les GitHub Actions** : logs disponibles dans l'onglet Actions

### Ressources utiles

- Repository : https://github.com/Aoleon/cjd80
- GitHub Actions : https://github.com/Aoleon/cjd80/actions
- Container Registry : https://github.com/Aoleon/cjd80/pkgs/container/cjd80

---

## ✅ Checklist de Déploiement Initial

- [ ] VPS configuré avec Docker et Docker Compose
- [ ] Nginx installé et configuré
- [ ] Certificat SSL Let's Encrypt obtenu
- [ ] Répertoire `/docker/cjd80` créé
- [ ] Repository cloné sur le VPS
- [ ] Fichier `.env` créé avec toutes les variables
- [ ] Connexion à GHCR configurée (`docker login ghcr.io`)
- [ ] Secrets GitHub Actions configurés
- [ ] Clé SSH autorisée sur le VPS
- [ ] Test de connexion SSH réussi
- [ ] Premier déploiement manuel réussi
- [ ] Health check répond sur https://cjd80.fr/api/health
- [ ] Frontend accessible sur https://cjd80.fr
- [ ] Workflow GitHub Actions activé
- [ ] Monitoring/alertes configurés (optionnel)
- [ ] Backup automatique configuré (optionnel)

---

## 🎉 Félicitations !

Votre application CJD Amiens est maintenant déployée automatiquement sur https://cjd80.fr ! 

Chaque fois que vous pushez sur `main`, l'application se déploie automatiquement avec validation et rollback en cas de problème.
