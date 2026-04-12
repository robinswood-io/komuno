# 🔑 Deploy Keys GitHub - Configuration

Ce document décrit la configuration des deploy keys GitHub pour les serveurs de déploiement.

## 📋 Vue d'ensemble

Les **deploy keys** sont des clés SSH qui permettent aux serveurs d'accéder au repository GitHub en lecture seule. Elles sont différentes des clés SSH utilisées par GitHub Actions pour se connecter aux serveurs.

### Différence entre Deploy Key et SSH Key

| Type | Usage | Accès |
|------|-------|-------|
| **Deploy Key** | Serveur → GitHub | Lecture seule du repository |
| **SSH Key (Secret)** | GitHub Actions → Serveur | Connexion SSH au serveur |

## ✅ Serveur 1 : CJD Amiens (cjd80.fr)

### Status
- ✅ **Déjà configurée** dans les paramètres GitHub
- **Fingerprint** : `SHA256:UMJdQzyAYkw15m9LVCwOGmcjB9vNf0AYJNYuSRQkoVo`
- **Accès** : Lecture seule sur le repository

### Vérification

**Sur GitHub :**
1. Allez dans **Settings** → **Deploy keys**
2. Vérifiez que la clé avec le fingerprint `UMJdQzyAYkw15m9LVCwOGmcjB9vNf0AYJNYuSRQkoVo` est présente
3. Status : ✅ Active

**Sur le serveur :**
```bash
# Se connecter au serveur
ssh -p 22 thibault@141.94.31.162

# Vérifier la clé SSH
ssh-keygen -lf ~/.ssh/authorized_keys | grep UMJdQzyAYkw15m9LVCwOGmcjB9vNf0AYJNYuSRQkoVo

# Tester l'accès au repository
cd /docker/cjd80
git fetch origin main
```

### Utilisation

La deploy key permet au serveur de :
- ✅ Cloner le repository
- ✅ Faire `git fetch` et `git pull`
- ✅ Accéder au code source sans authentification supplémentaire

Le workflow GitHub Actions utilise cette clé automatiquement lors des étapes :
- `Prepare server directories` : Clone/mise à jour du repository
- `Deploy to server` : Pull des dernières modifications

## ⚠️ Serveur 2 : Réseau Entreprendre Picardie

### Status
- ⚠️ **À configurer** lors de la mise en place du serveur

### Configuration requise

1. **Générer une clé SSH sur le serveur :**
```bash
# Sur le serveur REP
ssh-keygen -t ed25519 -C "deploy-key-rep" -f ~/.ssh/github_deploy_key
```

2. **Afficher la clé publique :**
```bash
cat ~/.ssh/github_deploy_key.pub
```

3. **Ajouter la deploy key sur GitHub :**
   - Allez dans **Settings** → **Deploy keys**
   - Cliquez sur **Add deploy key**
   - **Title** : `REP - Production Server`
   - **Key** : Collez le contenu de `github_deploy_key.pub`
   - ✅ Cochez **Allow write access** si nécessaire (généralement non)
   - Cliquez sur **Add key**

4. **Vérifier le fingerprint :**
```bash
ssh-keygen -lf ~/.ssh/github_deploy_key.pub
```

5. **Configurer Git sur le serveur :**
```bash
# Sur le serveur
cd /docker/cjd80
git remote set-url origin git@github.com:Aoleon/cjd80.git
```

## 🔍 Vérification des Deploy Keys

### Liste des deploy keys actives

**Sur GitHub :**
1. Allez dans **Settings** → **Deploy keys**
2. Vous verrez la liste de toutes les clés configurées

**Via GitHub CLI :**
```bash
gh api repos/:owner/:repo/keys
```

### Tester une deploy key

**Depuis le serveur :**
```bash
# Tester la connexion SSH à GitHub
ssh -T git@github.com

# Devrait afficher :
# Hi Aoleon/cjd80! You've successfully authenticated, but GitHub does not provide shell access.
```

## 🔒 Sécurité

### Bonnes pratiques

1. ✅ **Une clé par serveur** : Chaque serveur doit avoir sa propre deploy key
2. ✅ **Lecture seule** : Ne pas activer "Allow write access" sauf si nécessaire
3. ✅ **Rotation régulière** : Changer les clés périodiquement
4. ✅ **Accès limité** : Supprimer les clés des serveurs qui ne sont plus utilisés

### En cas de compromission

Si une deploy key est compromise :

1. **Supprimer la clé sur GitHub :**
   - Settings → Deploy keys → Supprimer la clé compromise

2. **Générer une nouvelle clé :**
   - Suivre les étapes de configuration ci-dessus

3. **Mettre à jour le serveur :**
   - Remplacer l'ancienne clé par la nouvelle

## 📝 Notes

- Les deploy keys sont stockées dans `~/.ssh/` sur chaque serveur
- Le workflow GitHub Actions n'a pas besoin de connaître les deploy keys
- Les deploy keys sont différentes des secrets `VPS_SSH_KEY` / `SERVER2_SSH_KEY`
- Les secrets SSH sont utilisés par GitHub Actions pour se connecter aux serveurs
- Les deploy keys sont utilisées par les serveurs pour accéder au repository

## 🔗 Ressources

- [GitHub Deploy Keys Documentation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
- [Configuration SSH pour GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

