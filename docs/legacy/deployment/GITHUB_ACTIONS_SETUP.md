# 🚀 Configuration GitHub Actions - Déploiement Multi-Serveurs

Ce guide explique comment configurer le workflow GitHub Actions pour déployer sur plusieurs serveurs.

## 📋 Vue d'ensemble

Le workflow `deploy.yml` permet de :
- ✅ Build une seule image Docker et la push vers GHCR
- ✅ Déployer automatiquement sur plusieurs serveurs en parallèle
- ✅ Gérer les secrets et environnements par serveur
- ✅ Vérifier la santé de l'application après déploiement
- ✅ Nettoyer les anciennes images automatiquement

## 🔐 Configuration des Secrets

### Secrets globaux (obligatoires)

Ces secrets sont utilisés pour tous les serveurs :

- `GITHUB_TOKEN` : Automatiquement fourni par GitHub Actions (pas besoin de le créer)

### Secrets par serveur

Pour chaque serveur, vous devez créer les secrets suivants dans GitHub :

#### Serveur 1 (CJD Amiens - cjd80.fr)

**✅ Déjà configuré !** Le serveur 1 utilise les secrets existants `VPS_*` :

| Secret | Description | Valeur actuelle | Status |
|--------|-------------|-----------------|--------|
| `VPS_HOST` | Adresse IP ou hostname du serveur | `141.94.31.162` | ✅ Configuré |
| `VPS_PORT` | Port SSH (optionnel, défaut: 22) | `22` | ✅ Configuré |
| `VPS_USER` | Utilisateur SSH | `thibault` | ✅ Configuré |
| `VPS_SSH_KEY` | Clé privée SSH complète | [Déjà configuré] | ✅ Configuré |

**Deploy Key GitHub :**
- ✅ **Déjà configurée** dans les paramètres du repository
- **Fingerprint** : `SHA256:UMJdQzyAYkw15m9LVCwOGmcjB9vNf0AYJNYuSRQkoVo`
- Permet au serveur de cloner/pull le repository automatiquement

**Aucune action requise** - ces secrets sont déjà configurés et fonctionnent avec le nouveau workflow. Le serveur est prêt pour le déploiement.

#### Serveur 2 (Réseau Entreprendre Picardie)

**⚠️ À configurer** - Créez les secrets suivants dans **Settings** → **Secrets and variables** → **Actions** :

| Secret | Description | Valeur à configurer |
|--------|-------------|---------------------|
| `SERVER2_HOST` | Adresse IP ou hostname du serveur | `vps-d198bc07.vps.ovh.net` |
| `SERVER2_PORT` | Port SSH (optionnel, défaut: 22) | `22` |
| `SERVER2_USER` | Utilisateur SSH | `debian` |
| `SERVER2_SSH_KEY` | Clé privée SSH complète | [À générer - voir instructions ci-dessous] |

**Informations du serveur :**
- **Host** : `vps-d198bc07.vps.ovh.net`
- **User** : `debian`
- **Dossier d'installation** : `/home/debian/docker/apps/rep`
- **Provider** : OVH VPS

**⚠️ Important - Génération de la clé SSH :**

Le serveur nécessite une clé SSH pour l'authentification. Suivez ces étapes :

1. **Générer une clé SSH dédiée** :
```bash
ssh-keygen -t ed25519 -C "github-actions-rep" -f ~/.ssh/github-actions-rep
```

2. **Copier la clé publique sur le serveur** (utilisez le mot de passe temporairement) :
```bash
ssh-copy-id -i ~/.ssh/github-actions-rep.pub debian@vps-d198bc07.vps.ovh.net
# Mot de passe : @SesameOuvreToi
```

3. **Tester la connexion** :
```bash
ssh -i ~/.ssh/github-actions-rep debian@vps-d198bc07.vps.ovh.net
```

4. **Ajouter la clé privée dans GitHub Secrets** :
   - Copiez le contenu complet de `~/.ssh/github-actions-rep`
   - Allez dans **Settings** → **Secrets and variables** → **Actions**
   - Créez le secret `SERVER2_SSH_KEY` avec le contenu de la clé privée

**Note** : Le dossier d'installation (`/home/debian/docker/apps/rep`) est différent de server1. Le workflow gère automatiquement cette différence.

#### Ajouter plus de serveurs

Pour ajouter un serveur 3, 4, etc. :

1. Ajoutez les secrets `SERVER3_HOST`, `SERVER3_PORT`, `SERVER3_USER`, `SERVER3_SSH_KEY`
2. Modifiez le fichier `.github/workflows/deploy.yml` dans la section `matrix.server_name` pour ajouter le nouveau serveur :
   ```yaml
   matrix:
     server_name: [server1, server2, server3]
   ```
3. Ajoutez la condition dans le script `secrets-check` (déjà prévu pour server3)
4. Créez l'environnement GitHub correspondant : `production-server3`

## 🌍 Configuration des Environnements

Les environnements GitHub permettent de :
- Gérer des secrets spécifiques par environnement
- Protéger les déploiements avec des approbations
- Suivre l'historique des déploiements

### Créer un environnement

1. Allez dans **Settings** → **Environments**
2. Cliquez sur **New environment**
3. Nommez-le selon le serveur :
   - `production-cjd80` pour server1 (CJD Amiens)
   - `production-rep` pour server2 (Réseau Entreprendre Picardie)
   - `production-server3` pour server3, etc.
4. Optionnel : Configurez des règles de protection (approbations, restrictions de branches)

### Lier les secrets aux environnements

Si vous voulez des secrets différents par environnement :

1. Dans **Settings** → **Environments**, cliquez sur l'environnement
2. Ajoutez les secrets spécifiques à cet environnement
3. Le workflow utilisera automatiquement ces secrets

## 🔑 Génération d'une clé SSH

Si vous n'avez pas encore de clé SSH pour GitHub Actions :

```bash
# Générer une nouvelle clé SSH dédiée
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github-actions-key

# Afficher la clé privée (à copier dans GitHub Secrets)
cat ~/.ssh/github-actions-key

# Afficher la clé publique (à ajouter sur le serveur)
cat ~/.ssh/github-actions-key.pub
```

### Ajouter la clé publique sur le serveur

```bash
# Sur le serveur
ssh-copy-id -i ~/.ssh/github-actions-key.pub user@server
# OU manuellement
cat ~/.ssh/github-actions-key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 🚀 Utilisation du Workflow

### Déploiement automatique

Le workflow se déclenche automatiquement lors d'un push sur la branche `main` :

```bash
git push origin main
```

### Déploiement manuel

1. Allez dans **Actions** → **🚀 Deploy Multi-Servers**
2. Cliquez sur **Run workflow**
3. Choisissez :
   - **all** : Déploie sur tous les serveurs
   - **server1** : Déploie uniquement sur le serveur 1
   - **server2** : Déploie uniquement sur le serveur 2
   - etc.

### Déploiement sélectif via CLI

```bash
gh workflow run deploy.yml -f server=server1
```

## 📊 Structure du Workflow

### Job 1: Build & Push

- Build l'image Docker une seule fois
- Push vers GitHub Container Registry (GHCR)
- Génère des tags : `main-<sha>` et `latest`

### Job 2: Deploy (Matrix)

- Déploie en parallèle sur tous les serveurs configurés
- Utilise une stratégie matrix pour gérer plusieurs serveurs
- Chaque serveur a son propre environnement GitHub
- Gère la concurrence pour éviter les déploiements simultanés

### Job 3: Summary

- Génère un résumé du déploiement
- Affiche les résultats dans l'interface GitHub

## 🔍 Vérification du Déploiement

Le workflow vérifie automatiquement :

1. ✅ **Health check** : Vérifie que `/api/health` répond
2. ✅ **Statut du conteneur** : Vérifie que le conteneur est en cours d'exécution
3. ✅ **Connexion Traefik** : Vérifie que Traefik peut accéder au conteneur

## 🛠️ Dépannage

### Erreur : "Secret manquant"

Vérifiez que tous les secrets sont configurés dans **Settings** → **Secrets and variables** → **Actions**

### Erreur : "SSH connection failed"

1. Vérifiez que la clé publique est bien sur le serveur
2. Vérifiez que le port SSH est correct
3. Testez la connexion manuellement : `ssh -p PORT user@host`

### Erreur : "Docker pull failed"

1. Vérifiez que le serveur peut accéder à GHCR
2. Vérifiez que l'authentification GHCR fonctionne
3. Testez manuellement : `docker login ghcr.io`

### Erreur : "Health check failed"

1. Vérifiez les logs du conteneur : `docker compose logs cjd-app`
2. Vérifiez que le port 5000 est accessible
3. Vérifiez que Traefik est configuré correctement

## 📝 Personnalisation

### Ajouter un nouveau serveur

1. Ajoutez les secrets dans GitHub
2. Modifiez `.github/workflows/deploy.yml` :

```yaml
- server:
    name: server3
    host: ${{ secrets.SERVER3_HOST }}
    port: ${{ secrets.SERVER3_PORT || '22' }}
    user: ${{ secrets.SERVER3_USER }}
    ssh_key: ${{ secrets.SERVER3_SSH_KEY }}
    environment: production-server3
    url: https://cjd80-dev.fr
```

### Modifier le script de déploiement

Le workflow utilise `scripts/vps-deploy.sh`. Modifiez ce script pour personnaliser le déploiement.

### Désactiver un serveur temporairement

Commentez l'entrée du serveur dans la section `matrix.include` du workflow.

## 🔒 Sécurité

- ✅ Les secrets sont stockés de manière sécurisée dans GitHub
- ✅ Les clés SSH sont utilisées uniquement pour les déploiements
- ✅ Chaque serveur a ses propres secrets
- ✅ Les environnements GitHub permettent des règles de protection supplémentaires

## 📚 Ressources

- [Configuration détaillée des serveurs](./SERVERS_CONFIG.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Docker Buildx](https://docs.docker.com/buildx/working-with-buildx/)

---

## 📝 Notes Importantes

### Serveur 1 (CJD Amiens)
- ✅ **Déjà configuré** avec les secrets `VPS_*` existants
- ✅ **Aucune action requise** - fonctionne immédiatement
- 🌐 **Domaine** : https://cjd80.fr

### Serveur 2 (Réseau Entreprendre Picardie)
- ⚠️ **À configurer** avec les secrets `SERVER2_*`
- 📋 **Voir** : [Configuration des serveurs](./SERVERS_CONFIG.md) pour plus de détails

