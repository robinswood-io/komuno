# 🖥️ Configuration Server 2 - Réseau Entreprendre Picardie

Guide de configuration du serveur 2 pour le déploiement de l'application.

## 📋 Informations du Serveur

| Paramètre | Valeur |
|-----------|--------|
| **Host** | `vps-d198bc07.vps.ovh.net` |
| **User** | `debian` |
| **Port SSH** | `22` |
| **Provider** | OVH VPS |
| **Dossier d'installation** | `/home/debian/docker/apps/rep` |

## 🔐 Configuration SSH

### Étape 1 : Générer une clé SSH

Sur votre machine locale, générez une clé SSH dédiée :

```bash
ssh-keygen -t ed25519 -C "github-actions-rep" -f ~/.ssh/github-actions-rep
```

**Important** : Laissez la passphrase vide pour une utilisation automatisée.

### Étape 2 : Copier la clé publique sur le serveur

```bash
# Méthode 1 : Utiliser ssh-copy-id
ssh-copy-id -i ~/.ssh/github-actions-rep.pub debian@vps-d198bc07.vps.ovh.net

# Lors de la demande de mot de passe, entrez :
# @SesameOuvreToi

# Méthode 2 : Manuellement
cat ~/.ssh/github-actions-rep.pub | ssh debian@vps-d198bc07.vps.ovh.net "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

### Étape 3 : Tester la connexion

```bash
ssh -i ~/.ssh/github-actions-rep debian@vps-d198bc07.vps.ovh.net
```

Si la connexion fonctionne sans mot de passe, c'est bon ! ✅

### Étape 4 : Ajouter la clé dans GitHub Secrets

1. **Afficher la clé privée** :
```bash
cat ~/.ssh/github-actions-rep
```

2. **Copier tout le contenu** (y compris `-----BEGIN OPENSSH PRIVATE KEY-----` et `-----END OPENSSH PRIVATE KEY-----`)

3. **Ajouter dans GitHub** :
   - Allez dans **Settings** → **Secrets and variables** → **Actions**
   - Cliquez sur **New repository secret**
   - **Name** : `SERVER2_SSH_KEY`
   - **Secret** : Collez le contenu de la clé privée
   - Cliquez sur **Add secret**

4. **Ajouter les autres secrets** :
   - `SERVER2_HOST` : `vps-d198bc07.vps.ovh.net`
   - `SERVER2_PORT` : `22` (optionnel)
   - `SERVER2_USER` : `debian`

## 📁 Préparation du Serveur

### Étape 1 : Créer le dossier d'installation

```bash
ssh -i ~/.ssh/github-actions-rep debian@vps-d198bc07.vps.ovh.net

# Créer le dossier
sudo mkdir -p /home/debian/docker/apps/rep
sudo chown -R debian:debian /home/debian/docker/apps/rep
```

### Étape 2 : Installer Docker (si pas déjà installé)

```bash
# Vérifier si Docker est installé
docker --version

# Si non installé, installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker debian

# Installer Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Vérifier l'installation
docker compose version
```

### Étape 3 : Configurer Git

```bash
# Cloner le repository (le workflow le fera automatiquement, mais vous pouvez le faire manuellement)
cd /home/debian/docker/apps/rep
git clone https://github.com/Aoleon/cjd80.git .

# Ou configurer Git pour utiliser SSH (si deploy key configurée)
git remote set-url origin git@github.com:Aoleon/cjd80.git
```

### Étape 4 : Créer le fichier .env

```bash
cd /home/debian/docker/apps/rep
cp .env.example .env
nano .env  # Éditer avec les valeurs appropriées
```

## 🔑 Configuration Deploy Key GitHub

Pour que le serveur puisse cloner/pull le repository automatiquement :

### Étape 1 : Générer une deploy key sur le serveur

```bash
ssh -i ~/.ssh/github-actions-rep debian@vps-d198bc07.vps.ovh.net

# Générer une clé SSH pour GitHub
ssh-keygen -t ed25519 -C "rep-deploy-key" -f ~/.ssh/github_deploy_key
```

### Étape 2 : Afficher la clé publique

```bash
cat ~/.ssh/github_deploy_key.pub
```

### Étape 3 : Ajouter comme Deploy Key sur GitHub

1. Allez dans **Settings** → **Deploy keys**
2. Cliquez sur **Add deploy key**
3. **Title** : `REP - Production Server`
4. **Key** : Collez le contenu de `github_deploy_key.pub`
5. ✅ **Ne cochez PAS** "Allow write access" (lecture seule)
6. Cliquez sur **Add key**

### Étape 4 : Configurer Git pour utiliser la deploy key

```bash
# Sur le serveur
cd /home/debian/docker/apps/rep
git remote set-url origin git@github.com:Aoleon/cjd80.git

# Configurer SSH pour utiliser la deploy key
cat >> ~/.ssh/config << EOF
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_deploy_key
    IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config

# Tester
ssh -T git@github.com
# Devrait afficher : Hi Aoleon/cjd80! You've successfully authenticated...
```

## 🐳 Configuration Docker

### Vérifier les réseaux Docker

Le workflow utilise `docker-compose.yml` qui nécessite certains réseaux :

```bash
# Vérifier si Traefik est installé (si utilisé)
docker network ls | grep proxy

# Si nécessaire, créer le réseau proxy
docker network create proxy
```

### Vérifier les permissions

```bash
# Vérifier que l'utilisateur debian peut utiliser Docker
groups | grep docker

# Si non, ajouter l'utilisateur au groupe docker
sudo usermod -aG docker debian
# Déconnexion/reconnexion nécessaire pour que cela prenne effet
```

## ✅ Vérification Finale

### Checklist

- [ ] Clé SSH configurée et testée
- [ ] Secrets GitHub configurés (`SERVER2_HOST`, `SERVER2_USER`, `SERVER2_SSH_KEY`)
- [ ] Docker installé et fonctionnel
- [ ] Docker Compose installé
- [ ] Dossier `/home/debian/docker/apps/rep` créé avec les bonnes permissions
- [ ] Deploy key GitHub configurée
- [ ] Fichier `.env` créé (ou sera créé lors du premier déploiement)
- [ ] Utilisateur `debian` dans le groupe `docker`

### Test de connexion

```bash
# Depuis votre machine locale
ssh -i ~/.ssh/github-actions-rep debian@vps-d198bc07.vps.ovh.net "cd /home/debian/docker/apps/rep && pwd"
```

### Test du workflow

Une fois tous les secrets configurés, testez le workflow :

1. Allez dans **Actions** → **🚀 Deploy Multi-Servers**
2. Cliquez sur **Run workflow**
3. Sélectionnez **server2** dans le menu déroulant
4. Cliquez sur **Run workflow**

## 🔒 Sécurité

### Bonnes pratiques

- ✅ **Ne jamais** stocker le mot de passe dans les secrets GitHub
- ✅ Utiliser uniquement des clés SSH pour l'authentification
- ✅ Changer le mot de passe par défaut après configuration
- ✅ Limiter l'accès SSH par firewall si possible
- ✅ Utiliser des clés différentes pour chaque serveur

### Rotation des clés

Pour changer la clé SSH :

1. Générer une nouvelle clé
2. Ajouter la nouvelle clé publique sur le serveur
3. Mettre à jour le secret `SERVER2_SSH_KEY` dans GitHub
4. Supprimer l'ancienne clé du serveur

## 📝 Notes

- Le dossier d'installation (`/home/debian/docker/apps/rep`) est différent de server1
- Le workflow gère automatiquement cette différence
- Le serveur utilise OVH VPS avec Debian
- L'utilisateur par défaut est `debian` (standard pour OVH)

## 🆘 Dépannage

### Problème : Connexion SSH échoue

```bash
# Vérifier la clé
ssh -v -i ~/.ssh/github-actions-rep debian@vps-d198bc07.vps.ovh.net

# Vérifier les permissions de la clé
chmod 600 ~/.ssh/github-actions-rep
```

### Problème : Docker permission denied

```bash
# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker debian
# Déconnexion/reconnexion nécessaire
```

### Problème : Git clone échoue

```bash
# Vérifier la deploy key
ssh -T git@github.com

# Vérifier la configuration SSH
cat ~/.ssh/config
```

