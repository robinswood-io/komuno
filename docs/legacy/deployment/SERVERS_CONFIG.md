# 🖥️ Configuration des Serveurs

Ce document décrit la configuration des serveurs de déploiement pour l'application CJD Amiens.

## 📋 Serveurs Configurés

### 🟢 Server 1 : CJD Amiens (cjd80.fr)

**Informations :**
- **Nom** : CJD Amiens - Boîte à Kiffs
- **Domaine** : https://cjd80.fr
- **Environnement** : Production
- **Secrets GitHub** : Utilise les secrets existants `VPS_*`
- **Status** : ✅ **Clé SSH déjà configurée**

**Configuration :**
- **Host** : `141.94.31.162` (via secret `VPS_HOST`)
- **Port SSH** : `22` (via secret `VPS_PORT`, optionnel)
- **User SSH** : `thibault` (via secret `VPS_USER`)
- **Clé SSH** : Via secret `VPS_SSH_KEY`
- **Deploy Key GitHub** : ✅ Déjà configurée (SHA256: `UMJdQzyAYkw15m9LVCwOGmcjB9vNf0AYJNYuSRQkoVo`)

**Accès SSH :**
```bash
ssh -p 22 thibault@141.94.31.162
```

**Vérification de la clé SSH :**
```bash
# Vérifier la clé sur le serveur
ssh-keygen -lf ~/.ssh/authorized_keys | grep UMJdQzyAYkw15m9LVCwOGmcjB9vNf0AYJNYuSRQkoVo
```

**Dossier de déploiement :**
```bash
/docker/cjd80
```

**Docker Compose :**
- Fichier : `/docker/cjd80/docker-compose.yml`
- Réseau Traefik : `proxy`
- Réseau Nhost : `nhost_nhost-network-prod`

---

### 🟡 Server 2 : Réseau Entreprendre Picardie

**Informations :**
- **Nom** : Réseau Entreprendre Picardie
- **Environnement** : Production
- **Secrets GitHub** : `SERVER2_*`
- **Status** : ⚠️ **À configurer dans GitHub Secrets**

**Configuration :**
- **Host** : `vps-d198bc07.vps.ovh.net` (secret `SERVER2_HOST`)
- **Port SSH** : `22` (secret `SERVER2_PORT`, optionnel)
- **User SSH** : `debian` (secret `SERVER2_USER`)
- **Clé SSH** : À configurer (secret `SERVER2_SSH_KEY`)
- **Dossier d'installation** : `/home/debian/docker/apps/rep` (différent de server1)

**Accès SSH :**
```bash
ssh -p 22 debian@vps-d198bc07.vps.ovh.net
```

**Dossier de déploiement :**
```bash
/home/debian/docker/apps/rep
```

**Note** : Le dossier d'installation est différent de server1 (`/docker/cjd80` vs `/home/debian/docker/apps/rep`). Le workflow doit être adapté pour gérer ce chemin différent.


---

## 🔐 Gestion des Secrets

### Secrets existants (Server 1 - CJD Amiens)

Ces secrets sont déjà configurés et utilisés pour le serveur cjd80 :

| Secret | Description | Valeur | Status |
|--------|-------------|--------|--------|
| `VPS_HOST` | Adresse du serveur | `141.94.31.162` | ✅ Configuré |
| `VPS_PORT` | Port SSH | `22` (optionnel) | ✅ Configuré |
| `VPS_USER` | Utilisateur SSH | `thibault` | ✅ Configuré |
| `VPS_SSH_KEY` | Clé privée SSH | [Clé privée complète] | ✅ Configuré |

**Deploy Key GitHub :**
- ✅ **Déjà configurée** dans les paramètres du repository
- **Fingerprint** : `SHA256:UMJdQzyAYkw15m9LVCwOGmcjB9vNf0AYJNYuSRQkoVo`
- **Accès** : Lecture seule sur le repository
- **Utilisation** : Permet au serveur de cloner/pull le repository sans authentification

**Note** : La deploy key est différente de la clé SSH utilisée pour la connexion. La clé SSH (`VPS_SSH_KEY`) est utilisée par GitHub Actions pour se connecter au serveur, tandis que la deploy key est utilisée par le serveur pour accéder au repository GitHub.

### Secrets à créer (Server 2 - REP)

Pour le serveur "Réseau Entreprendre Picardie", créez les secrets suivants dans **Settings** → **Secrets and variables** → **Actions** :

| Secret | Description | Valeur à configurer |
|--------|-------------|---------------------|
| `SERVER2_HOST` | Adresse IP ou hostname du serveur | `vps-d198bc07.vps.ovh.net` |
| `SERVER2_PORT` | Port SSH (optionnel, défaut: 22) | `22` |
| `SERVER2_USER` | Utilisateur SSH | `debian` |
| `SERVER2_SSH_KEY` | Clé privée SSH complète | [À générer - voir ci-dessous] |

**⚠️ Important** : 
- Le mot de passe ne doit **PAS** être stocké dans les secrets GitHub
- Utilisez une **clé SSH** pour l'authentification (meilleure pratique de sécurité)
- Le mot de passe fourni (`@SesameOuvreToi`) peut être utilisé temporairement pour configurer la clé SSH

**Génération de la clé SSH :**

1. **Générer une clé SSH dédiée** (sur votre machine locale) :
```bash
ssh-keygen -t ed25519 -C "github-actions-rep" -f ~/.ssh/github-actions-rep
```

2. **Copier la clé publique sur le serveur** :
```bash
# Option 1 : Utiliser ssh-copy-id avec le mot de passe
ssh-copy-id -i ~/.ssh/github-actions-rep.pub debian@vps-d198bc07.vps.ovh.net
# Mot de passe : @SesameOuvreToi

# Option 2 : Manuellement
cat ~/.ssh/github-actions-rep.pub | ssh debian@vps-d198bc07.vps.ovh.net "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

3. **Tester la connexion** :
```bash
ssh -i ~/.ssh/github-actions-rep debian@vps-d198bc07.vps.ovh.net
```

4. **Ajouter la clé privée dans GitHub Secrets** :
   - Copiez le contenu de `~/.ssh/github-actions-rep` (clé privée complète)
   - Allez dans **Settings** → **Secrets and variables** → **Actions**
   - Créez le secret `SERVER2_SSH_KEY` avec le contenu de la clé privée

**📋 Guide complet** : Voir [SERVER2_SETUP.md](./SERVER2_SETUP.md) pour les instructions détaillées.

### Comment ajouter les secrets

1. Allez dans **Settings** → **Secrets and variables** → **Actions**
2. Cliquez sur **New repository secret**
3. Ajoutez chaque secret avec son nom et sa valeur
4. Répétez pour tous les secrets nécessaires

---

## 🌍 Environnements GitHub

Les environnements GitHub permettent de gérer les déploiements et les règles de protection.

### Environnements configurés

1. **production-cjd80** : Pour le serveur CJD Amiens
2. **production-rep** : Pour le serveur Réseau Entreprendre Picardie

### Créer un environnement

1. Allez dans **Settings** → **Environments**
2. Cliquez sur **New environment**
3. Nommez-le selon le serveur :
   - `production-cjd80` pour server1
   - `production-rep` pour server2
4. Optionnel : Configurez des règles de protection (approbations, restrictions)

---

## 🚀 Déploiement

### Déploiement automatique

Le workflow se déclenche automatiquement lors d'un push sur `main` et déploie sur tous les serveurs configurés.

### Déploiement manuel

1. Allez dans **Actions** → **🚀 Deploy Multi-Servers**
2. Cliquez sur **Run workflow**
3. Choisissez :
   - **all** : Déploie sur tous les serveurs
   - **server1** : Déploie uniquement sur CJD Amiens
   - **server2** : Déploie uniquement sur Réseau Entreprendre Picardie

### Déploiement via CLI

```bash
# Déployer sur tous les serveurs
gh workflow run deploy.yml

# Déployer uniquement sur CJD Amiens
gh workflow run deploy.yml -f server=server1

# Déployer uniquement sur REP
gh workflow run deploy.yml -f server=server2
```

---

## 🔍 Vérification des Accès

### Tester l'accès SSH

**Server 1 (CJD Amiens) :**
```bash
ssh -p 22 thibault@141.94.31.162
```

**Server 2 (REP) :**
```bash
ssh -p ${SERVER2_PORT:-22} ${SERVER2_USER}@${SERVER2_HOST}
```

### Vérifier Docker

Sur chaque serveur, vérifiez que Docker est installé :

```bash
docker --version
docker compose version
```

### Vérifier les permissions

Assurez-vous que l'utilisateur SSH peut :
- Accéder au dossier `/docker/cjd80`
- Exécuter `docker` et `docker compose`
- Se connecter aux réseaux Docker nécessaires

---

## 📝 Notes pour l'Agent Cursor

En tant qu'agent Cursor, vous avez accès aux deux serveurs :

### Server 1 (CJD Amiens)
- **Secrets** : Utilise `VPS_*` (✅ déjà configurés)
- **Accès** : Via les secrets GitHub existants
- **Deploy Key** : ✅ Déjà configurée (SHA256: `UMJdQzyAYkw15m9LVCwOGmcjB9vNf0AYJNYuSRQkoVo`)
- **Domaine** : https://cjd80.fr
- **Status** : ✅ Prêt pour déploiement

### Server 2 (Réseau Entreprendre Picardie)
- **Secrets** : Utilise `SERVER2_*` (⚠️ à configurer)
- **Accès** : Via les nouveaux secrets GitHub
- **Configuration** : À compléter selon les informations fournies
- **Status** : ⚠️ En attente de configuration

### Commandes utiles

```bash
# Vérifier les secrets GitHub
gh secret list

# Tester la connexion SSH (depuis GitHub Actions)
# Le workflow gère automatiquement la connexion SSH

# Vérifier le déploiement
gh run list --workflow=deploy.yml
gh run view [RUN_ID] --log
```

---

## 🔄 Migration depuis l'ancien workflow

L'ancien workflow utilisait uniquement les secrets `VPS_*` pour un seul serveur. Le nouveau workflow :

1. ✅ **Conserve la compatibilité** : Server 1 utilise toujours `VPS_*`
2. ✅ **Ajoute la flexibilité** : Server 2 utilise `SERVER2_*`
3. ✅ **Permet l'extension** : Facile d'ajouter server3, server4, etc.

**Aucune action requise** pour le serveur 1, les secrets existants continuent de fonctionner.

---

## 📚 Ressources

- [Guide de configuration GitHub Actions](./GITHUB_ACTIONS_SETUP.md)
- [Documentation des environnements GitHub](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Gestion des secrets GitHub](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

