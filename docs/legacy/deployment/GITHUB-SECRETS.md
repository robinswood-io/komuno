# Configuration des Secrets GitHub Actions

Ce guide explique comment configurer les secrets GitHub nécessaires pour le déploiement automatique sur cjd80.fr.

## 📋 Liste des Secrets Requis

| Secret | Description | Obligatoire |
|--------|-------------|-------------|
| `VPS_SSH_KEY` | Clé privée SSH pour accéder au VPS | ✅ Oui |
| `VPS_HOST` | Adresse du VPS (domaine ou IP) | ✅ Oui |
| `VPS_PORT` | Port SSH (généralement 22) | ✅ Oui |
| `VPS_USER` | Nom d'utilisateur SSH | ✅ Oui |

## 🔐 Étape 1 : Générer une Clé SSH Dédiée

Il est **fortement recommandé** de créer une clé SSH dédiée pour GitHub Actions (plutôt que d'utiliser votre clé personnelle).

```bash
# Sur votre machine locale
ssh-keygen -t ed25519 -C "github-actions-deploy-cjd80" -f ~/.ssh/github-deploy-cjd80

# Vous verrez:
# Generating public/private ed25519 key pair.
# Enter passphrase (empty for no passphrase): [LAISSEZ VIDE - appuyez sur Entrée]
# Enter same passphrase again: [LAISSEZ VIDE - appuyez sur Entrée]

# Deux fichiers sont créés:
# - ~/.ssh/github-deploy-cjd80 (clé privée - À GARDER SECRÈTE)
# - ~/.ssh/github-deploy-cjd80.pub (clé publique - À copier sur le VPS)
```

## 🚀 Étape 2 : Autoriser la Clé sur le VPS

```bash
# Copier la clé publique sur le VPS
ssh-copy-id -i ~/.ssh/github-deploy-cjd80.pub votre-user@cjd80.fr

# OU manuellement si ssh-copy-id ne fonctionne pas:
cat ~/.ssh/github-deploy-cjd80.pub | ssh votre-user@cjd80.fr "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

## ✅ Étape 3 : Tester la Connexion

```bash
# Tester que la clé fonctionne
ssh -i ~/.ssh/github-deploy-cjd80 votre-user@cjd80.fr "echo 'Connexion SSH OK'"

# Vous devriez voir: "Connexion SSH OK"
# Si un mot de passe est demandé, la clé n'est pas correctement installée
```

## 📤 Étape 4 : Ajouter les Secrets dans GitHub

### Via l'interface web GitHub :

1. Allez sur votre repository : `https://github.com/Aoleon/cjd80`
2. Cliquez sur **Settings** (en haut à droite)
3. Dans le menu de gauche : **Secrets and variables** > **Actions**
4. Cliquez sur **New repository secret**

### Secret 1 : VPS_SSH_KEY

```bash
# Sur votre machine locale, afficher la clé privée
cat ~/.ssh/github-deploy-cjd80
```

- **Name** : `VPS_SSH_KEY`
- **Value** : Copier **TOUT** le contenu (y compris les lignes `-----BEGIN` et `-----END`)

Exemple de format :
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACB1234567890abcdefghijklmnopqrstuvwxyz...
...plusieurs lignes...
-----END OPENSSH PRIVATE KEY-----
```

⚠️ **Important** : Copiez EXACTEMENT tout, sans espace supplémentaire avant/après.

### Secret 2 : VPS_HOST

- **Name** : `VPS_HOST`
- **Value** : `cjd80.fr` (ou l'adresse IP de votre VPS)

Exemples valides :
- `cjd80.fr`
- `www.cjd80.fr`
- `123.45.67.89`

### Secret 3 : VPS_PORT

- **Name** : `VPS_PORT`
- **Value** : `22` (ou votre port SSH personnalisé)

Port par défaut : `22`

Si vous avez changé le port SSH pour la sécurité, utilisez votre port personnalisé (ex: `2222`).

### Secret 4 : VPS_USER

- **Name** : `VPS_USER`
- **Value** : `ubuntu` (ou votre nom d'utilisateur SSH)

Exemples courants :
- `ubuntu` (Ubuntu)
- `debian` (Debian)
- `root` (déconseillé mais parfois utilisé)
- `admin`
- Votre nom d'utilisateur personnalisé

## 🔍 Vérification des Secrets

Une fois tous les secrets ajoutés, vous devriez voir dans `Settings > Secrets and variables > Actions` :

```
VPS_SSH_KEY     Updated X minutes ago
VPS_HOST        Updated X minutes ago
VPS_PORT        Updated X minutes ago
VPS_USER        Updated X minutes ago
```

⚠️ **Note** : GitHub ne montre jamais les valeurs des secrets pour des raisons de sécurité. C'est normal !

## 🧪 Tester le Déploiement

### Méthode 1 : Workflow Dispatch (recommandé pour le premier test)

1. Allez sur `https://github.com/Aoleon/cjd80/actions`
2. Cliquez sur **Deploy to VPS (cjd80.fr)**
3. Cliquez sur **Run workflow**
4. Sélectionnez la branche `main`
5. Cliquez sur **Run workflow**

### Méthode 2 : Push sur main

```bash
# Créer un commit test
git commit --allow-empty -m "Test déploiement automatique"
git push origin main

# Le workflow se déclenchera automatiquement
```

## 🐛 Dépannage

### Erreur : "Missing secret: VPS_SSH_KEY"

**Cause** : Le secret n'est pas configuré ou mal nommé.

**Solution** :
1. Vérifiez que le nom est exactement `VPS_SSH_KEY` (sensible à la casse)
2. Vérifiez que la valeur n'est pas vide
3. Re-créez le secret si nécessaire

### Erreur : "Permission denied (publickey)"

**Cause** : La clé SSH n'est pas autorisée sur le VPS.

**Solution** :
```bash
# Vérifier que la clé publique est sur le VPS
ssh votre-user@cjd80.fr "cat ~/.ssh/authorized_keys"

# Vous devriez voir votre clé publique
# Si elle n'est pas là, recommencez l'étape 2
```

### Erreur : "Connection timeout"

**Causes possibles** :
1. `VPS_HOST` incorrect
2. `VPS_PORT` incorrect
3. Firewall bloque la connexion

**Solutions** :
```bash
# Tester la connexion manuellement
ssh -i ~/.ssh/github-deploy-cjd80 -p 22 votre-user@cjd80.fr

# Si timeout:
# 1. Vérifier que le VPS est en ligne
# 2. Vérifier le firewall: sudo ufw status
# 3. Vérifier que le port SSH est le bon
```

### Erreur : "Host key verification failed"

**Cause** : Le VPS n'est pas dans les known_hosts.

**Solution** : 
Le workflow GitHub Actions gère cela automatiquement avec `ssh-keyscan`. Si le problème persiste :
```bash
# Accepter manuellement la clé du VPS
ssh-keyscan -p 22 cjd80.fr >> ~/.ssh/known_hosts
```

## 🔒 Sécurité

### ✅ Bonnes pratiques

- ✅ Utiliser une clé SSH dédiée (pas votre clé personnelle)
- ✅ Ne jamais committer la clé privée dans Git
- ✅ Révoquer immédiatement une clé compromise
- ✅ Utiliser ed25519 (plus sécurisé que RSA)
- ✅ Ne pas mettre de passphrase sur la clé GitHub Actions

### ❌ À éviter

- ❌ Partager la clé privée
- ❌ Réutiliser la même clé pour plusieurs projets
- ❌ Utiliser `root` comme VPS_USER (sauf si nécessaire)
- ❌ Exposer les secrets dans les logs

### 🔄 Rotation des Clés

Il est recommandé de changer les clés SSH périodiquement (tous les 6-12 mois) :

```bash
# 1. Générer une nouvelle clé
ssh-keygen -t ed25519 -C "github-actions-deploy-cjd80-2025" -f ~/.ssh/github-deploy-cjd80-new

# 2. Ajouter la nouvelle clé sur le VPS
ssh-copy-id -i ~/.ssh/github-deploy-cjd80-new.pub votre-user@cjd80.fr

# 3. Tester la nouvelle clé
ssh -i ~/.ssh/github-deploy-cjd80-new votre-user@cjd80.fr "echo OK"

# 4. Mettre à jour le secret VPS_SSH_KEY dans GitHub
cat ~/.ssh/github-deploy-cjd80-new

# 5. Tester un déploiement

# 6. Supprimer l'ancienne clé du VPS
ssh votre-user@cjd80.fr
nano ~/.ssh/authorized_keys
# Supprimer la ligne de l'ancienne clé

# 7. Supprimer l'ancienne clé localement
rm ~/.ssh/github-deploy-cjd80*
mv ~/.ssh/github-deploy-cjd80-new ~/.ssh/github-deploy-cjd80
mv ~/.ssh/github-deploy-cjd80-new.pub ~/.ssh/github-deploy-cjd80.pub
```

## 📞 Support

En cas de problème persistant :

1. Vérifier les logs du workflow : `Actions > Deploy to VPS > Dernier workflow`
2. Consulter ce guide
3. Tester la connexion SSH manuellement
4. Vérifier que tous les secrets sont correctement configurés

## ✅ Checklist Finale

- [ ] Clé SSH dédiée générée
- [ ] Clé publique copiée sur le VPS
- [ ] Connexion SSH testée manuellement
- [ ] Secret `VPS_SSH_KEY` ajouté (clé privée complète)
- [ ] Secret `VPS_HOST` ajouté (cjd80.fr)
- [ ] Secret `VPS_PORT` ajouté (22)
- [ ] Secret `VPS_USER` ajouté (votre username)
- [ ] Tous les secrets visibles dans GitHub Settings
- [ ] Test de déploiement via "Run workflow" réussi

🎉 **Félicitations !** Votre déploiement automatique est configuré !
