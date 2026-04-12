# Guide de Test et Suivi du Workflow GitHub Actions

## 📋 État Actuel

Le workflow GitHub Actions a été corrigé et optimisé avec les améliorations suivantes :

### ✅ Corrections Appliquées

1. **Workflow `.github/workflows/deploy.yml`** :
   - ✅ Ajout de l'output `image_latest` dans le job `build-and-push`
   - ✅ Ajout explicite du paramètre `file: ./Dockerfile`
   - ✅ Amélioration du message de résumé avec le tag `latest`

2. **Script de déploiement `scripts/vps-deploy.sh`** :
   - ✅ Gestion d'erreurs améliorée lors du pull d'image Docker
   - ✅ Correction de l'exécution des migrations avec `docker run`
   - ✅ Simplification de la commande de migration

### 📦 Commits Récentes

- `127ce48` - Simplification script migrations
- `a77937f` - Amélioration script de déploiement et workflow
- `b64165f` - Ajout output image_latest
- `7fe42ff` - Correction workflow GitHub Actions

## 🚀 Comment Tester et Suivre le Workflow

### Option 1 : Déclencher Manuellement (Recommandé)

1. **Via l'interface GitHub** :
   - Allez sur : `https://github.com/Aoleon/cjd80/actions`
   - Cliquez sur le workflow "Deploy to VPS (cjd80.fr)"
   - Cliquez sur "Run workflow" (bouton en haut à droite)
   - Sélectionnez la branche `main`
   - Cliquez sur "Run workflow"

2. **Via GitHub CLI** (si installé) :
   ```bash
   gh workflow run deploy.yml
   ```

### Option 2 : Déclencher Automatiquement

Le workflow se déclenche automatiquement lors d'un push sur `main`. 
Un push a déjà été effectué, donc le workflow devrait être en cours d'exécution.

### 📊 Suivre l'Exécution

1. **Sur GitHub** :
   - Allez sur : `https://github.com/Aoleon/cjd80/actions`
   - Cliquez sur la dernière exécution du workflow
   - Suivez les logs en temps réel

2. **Étapes du Workflow** :

   **Job 1: Build & Push Docker Image**
   - ✅ Checkout code
   - ✅ Set up Node.js
   - ✅ Install dependencies (`npm ci`)
   - ✅ Run type checks (`npm run check`)
   - ✅ Run production build (`npm run build`)
   - ✅ Set up Docker Buildx
   - ✅ Log in to GitHub Container Registry
   - ✅ Generate image tag
   - ✅ Build and push Docker image

   **Job 2: Deploy to VPS**
   - ✅ Precheck secrets
   - ✅ Checkout deployment scripts
   - ✅ Setup SSH
   - ✅ Prepare VPS directories and repository
   - ✅ Deploy to VPS (exécute `scripts/vps-deploy.sh`)
   - ✅ Verify deployment health
   - ✅ Cleanup old images on VPS
   - ✅ Deployment summary

### 🔍 Points de Vérification

#### 1. Build & Push
- [ ] Les dépendances s'installent correctement (`npm ci`)
- [ ] Les vérifications de types passent (`npm run check`)
- [ ] Le build de production réussit (`npm run build`)
- [ ] L'image Docker est construite et poussée vers GHCR

#### 2. Déploiement
- [ ] Les secrets SSH sont configurés
- [ ] La connexion SSH au VPS fonctionne
- [ ] Le repository est mis à jour sur le VPS
- [ ] L'image Docker est pullée depuis GHCR
- [ ] Les migrations de base de données s'exécutent
- [ ] Le conteneur démarre correctement
- [ ] Le health check passe (`/api/health`)

#### 3. Vérification Post-Déploiement
- [ ] L'application est accessible sur `https://cjd80.fr`
- [ ] Le health check répond : `https://cjd80.fr/api/health`
- [ ] Les anciennes images sont nettoyées

### ⚠️ Problèmes Potentiels et Solutions

#### Problème : Échec du build
**Symptômes** :
- Erreur lors de `npm ci`
- Erreur lors de `npm run check`
- Erreur lors de `npm run build`

**Solutions** :
- Vérifier que `package-lock.json` est synchronisé avec `package.json`
- Vérifier que tous les fichiers nécessaires sont commités
- Vérifier les logs d'erreur pour plus de détails

#### Problème : Échec du déploiement
**Symptômes** :
- Erreur de connexion SSH
- Erreur lors du pull d'image
- Échec des migrations
- Échec du health check

**Solutions** :
- Vérifier que les secrets GitHub sont configurés correctement
- Vérifier que l'image existe dans GHCR
- Vérifier que le fichier `.env` existe sur le VPS
- Vérifier les logs du conteneur : `docker compose logs cjd-app`

#### Problème : Health check échoue
**Symptômes** :
- Le conteneur démarre mais le health check échoue
- L'application n'est pas accessible

**Solutions** :
- Vérifier les logs : `docker compose logs cjd-app`
- Vérifier que le port 5000 est exposé
- Vérifier que Traefik est configuré correctement
- Vérifier la connexion à la base de données

### 📝 Logs Utiles

Pour déboguer sur le VPS :
```bash
# Voir les logs du conteneur
docker compose logs cjd-app

# Voir le statut du conteneur
docker compose ps

# Vérifier le health check manuellement
docker compose exec cjd-app wget --spider -q http://localhost:5000/api/health

# Vérifier les réseaux Docker
docker network ls
docker network inspect proxy
```

### ✅ Checklist de Validation

Avant de considérer le déploiement comme réussi :

- [ ] Le workflow GitHub Actions passe tous les jobs
- [ ] L'image Docker est disponible dans GHCR
- [ ] Le conteneur est en cours d'exécution sur le VPS
- [ ] Le health check répond avec un statut 200
- [ ] L'application est accessible sur `https://cjd80.fr`
- [ ] Les migrations de base de données sont appliquées
- [ ] Aucune erreur dans les logs du conteneur

### 🔗 Liens Utiles

- **GitHub Actions** : `https://github.com/Aoleon/cjd80/actions`
- **GitHub Container Registry** : `https://github.com/Aoleon/cjd80/pkgs/container/cjd80`
- **Application** : `https://cjd80.fr`
- **Health Check** : `https://cjd80.fr/api/health`

---

**Dernière mise à jour** : Après corrections du workflow (commits `127ce48`, `a77937f`, `b64165f`, `7fe42ff`)

