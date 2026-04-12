# Guide de Résolution des Échecs GitHub Actions

## 🔍 Problèmes Identifiés

### ❌ Problème 1 : Authentification GHCR Manquante sur le VPS

**Symptôme :**
```
Error response from daemon: unauthorized: authentication required
```

**Cause :**
Le VPS n'est pas authentifié auprès de GitHub Container Registry (GHCR), donc il ne peut pas pull les images Docker.

**Solution :**

1. **Créer un token GitHub :**
   - Aller sur : https://github.com/settings/tokens
   - Cliquer sur "Generate new token (classic)"
   - Nom : `GHCR-VPS-Access`
   - Permissions : `read:packages` et `write:packages`
   - Générer et copier le token

2. **Authentifier le VPS :**
   ```bash
   ssh thibault@141.94.31.162
   docker login ghcr.io -u USERNAME -p TOKEN
   ```
   Remplacez `USERNAME` par votre nom d'utilisateur GitHub et `TOKEN` par le token généré.

3. **Vérifier l'authentification :**
   ```bash
   cat ~/.docker/config.json | grep ghcr.io
   ```

### ❌ Problème 2 : Secrets GitHub Non Configurés

**Symptôme :**
```
::error::Missing secret: VPS_SSH_KEY
```

**Solution :**

1. **Aller dans les paramètres du repository :**
   - https://github.com/Aoleon/cjd80/settings/secrets/actions

2. **Ajouter les secrets suivants :**
   - `VPS_SSH_KEY` : Clé SSH privée pour se connecter au VPS
   - `VPS_HOST` : `141.94.31.162`
   - `VPS_PORT` : `22`
   - `VPS_USER` : `thibault`

3. **Générer une clé SSH si nécessaire :**
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github-deploy
   ssh-copy-id -i ~/.ssh/github-deploy.pub thibault@141.94.31.162
   cat ~/.ssh/github-deploy  # Copier cette clé dans VPS_SSH_KEY
   ```

### ❌ Problème 3 : Repository Non Synchronisé

**Symptôme :**
Le workflow échoue car le repository sur le VPS n'est pas à jour.

**Solution :**

```bash
ssh thibault@141.94.31.162
cd /docker/cjd80
git fetch origin main
git reset --hard origin/main
```

### ❌ Problème 4 : package-lock.json Non Synchronisé

**Symptôme :**
```
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync.
```

**Solution :**

```bash
# Localement
npm install
git add package-lock.json
git commit -m "fix: Synchronize package-lock.json"
git push origin main
```

### ❌ Problème 5 : Réseau Docker 'proxy' Manquant

**Symptôme :**
```
Error response from daemon: network proxy not found
```

**Solution :**

```bash
ssh thibault@141.94.31.162
docker network create proxy
```

### ❌ Problème 6 : Scripts Non Exécutables

**Symptôme :**
```
Permission denied: scripts/vps-deploy.sh
```

**Solution :**

```bash
ssh thibault@141.94.31.162
cd /docker/cjd80
chmod +x scripts/*.sh
```

---

## 🔧 Corrections Automatiques

### Script de Correction Complète

Exécutez ce script pour corriger automatiquement les problèmes courants :

```bash
ssh thibault@141.94.31.162 << 'EOF'
cd /docker/cjd80

# Mettre à jour le repository
git fetch origin main
git reset --hard origin/main

# Rendre les scripts exécutables
chmod +x scripts/*.sh

# Créer le réseau proxy si nécessaire
docker network create proxy 2>/dev/null || echo "Réseau proxy existe déjà"

# Vérifier que .env existe
if [ ! -f .env ]; then
    echo "⚠️  ATTENTION: .env manquant, créez-le à partir de .env.example"
fi

echo "✅ Corrections appliquées"
EOF
```

---

## 📋 Checklist de Vérification

Avant de déclencher le workflow, vérifiez :

- [ ] Secrets GitHub configurés (VPS_SSH_KEY, VPS_HOST, VPS_PORT, VPS_USER)
- [ ] VPS authentifié à GHCR (`docker login ghcr.io`)
- [ ] Repository VPS synchronisé avec origin/main
- [ ] package-lock.json synchronisé avec package.json
- [ ] Réseau Docker 'proxy' existe
- [ ] Scripts exécutables (chmod +x)
- [ ] Fichier .env présent sur le VPS
- [ ] docker-compose.yml présent et valide

---

## 🚀 Déclenchement du Workflow

Une fois tous les problèmes corrigés :

1. **Vérifier localement :**
   ```bash
   ./scripts/diagnose-github-actions.sh
   ```

2. **Pousser sur main pour déclencher le workflow :**
   ```bash
   git push origin main
   ```

3. **Surveiller le workflow :**
   - https://github.com/Aoleon/cjd80/actions

4. **Vérifier les logs en cas d'échec :**
   - Cliquer sur le workflow qui a échoué
   - Cliquer sur le job qui a échoué
   - Examiner les logs pour identifier l'erreur exacte

---

## 🔍 Diagnostic des Erreurs Spécifiques

### Erreur : "Build failed"

**Causes possibles :**
- package-lock.json non synchronisé
- Erreur de syntaxe dans le code
- Erreur lors du build (`npm run build`)

**Solution :**
1. Vérifier les logs du job "Build & Push Docker Image"
2. Tester localement : `npm ci && npm run check && npm run build`
3. Corriger les erreurs et recommitter

### Erreur : "Deployment failed"

**Causes possibles :**
- Connexion SSH échouée (secrets incorrects)
- Script vps-deploy.sh échoue
- Health check échoue

**Solution :**
1. Vérifier les secrets GitHub
2. Tester la connexion SSH manuellement
3. Vérifier les logs du conteneur sur le VPS

### Erreur : "Health check failed"

**Causes possibles :**
- Application ne démarre pas
- Base de données non accessible
- Port 5000 non accessible

**Solution :**
1. Vérifier les logs : `docker compose logs cjd-app`
2. Vérifier le health check manuellement : `curl http://localhost:5000/api/health`
3. Vérifier la configuration .env

---

## 📞 Support

Si le problème persiste :

1. **Exécuter le diagnostic complet :**
   ```bash
   ./scripts/diagnose-github-actions.sh
   ```

2. **Vérifier les logs GitHub Actions :**
   - https://github.com/Aoleon/cjd80/actions

3. **Vérifier les logs sur le VPS :**
   ```bash
   ssh thibault@141.94.31.162
   cd /docker/cjd80
   docker compose logs --tail=100 cjd-app
   ```

4. **Consulter la documentation :**
   - `docs/deployment/ANALYSE_GITHUB_ACTIONS.md`
   - `docs/deployment/DEPLOYMENT.md`
