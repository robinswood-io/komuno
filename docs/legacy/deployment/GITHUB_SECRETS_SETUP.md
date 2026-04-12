# Configuration des Secrets GitHub Actions

## Problème Identifié

Le workflow GitHub Actions échoue avec l'erreur :
- `Missing secret: VPS_USER` (ou autres secrets)
- `Connection reset by peer` lors de la connexion SSH

## Secrets Requis

Le workflow nécessite les secrets suivants dans **Settings → Secrets and variables → Actions → Repository secrets** :

| Secret | Valeur attendue | Description |
|--------|----------------|-------------|
| `VPS_SSH_KEY` | Clé privée SSH complète | Clé privée pour se connecter au VPS |
| `VPS_HOST` | `141.94.31.162` | Adresse IP du serveur VPS |
| `VPS_PORT` | `22` | Port SSH du serveur |
| `VPS_USER` | `thibault` | Nom d'utilisateur SSH |

## Vérification des Secrets

### 1. Vérifier que tous les secrets existent

1. Allez sur GitHub : **Settings → Secrets and variables → Actions**
2. Vérifiez que les 4 secrets sont présents :
   - ✅ `VPS_SSH_KEY`
   - ✅ `VPS_HOST`
   - ✅ `VPS_PORT`
   - ✅ `VPS_USER`

### 2. Vérifier la valeur de `VPS_USER`

**Problème courant** : `VPS_USER` peut être vide ou mal configuré.

**Solution** :
1. Cliquez sur `VPS_USER` dans la liste des secrets
2. Vérifiez que la valeur est exactement : `thibault` (sans espaces, sans guillemets)
3. Si vide ou incorrect, mettez à jour avec la valeur : `thibault`
4. Cliquez sur **Update secret**

### 3. Vérifier la clé SSH (`VPS_SSH_KEY`)

La clé SSH doit être la clé privée complète, au format :

```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

Ou au format RSA :

```
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

**Important** : La clé doit inclure les lignes `-----BEGIN...` et `-----END...`

## Configuration Recommandée

### Valeurs des Secrets

```
VPS_SSH_KEY: [Votre clé privée SSH complète]
VPS_HOST: 141.94.31.162
VPS_PORT: 22
VPS_USER: thibault
```

### Comment obtenir la clé SSH

Si vous n'avez pas la clé SSH :

1. **Générer une nouvelle paire de clés** (sur votre machine locale) :
   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions@cjd80"
   ```

2. **Copier la clé publique sur le serveur** :
   ```bash
   ssh-copy-id -p 22 thibault@141.94.31.162
   ```

3. **Copier la clé privée dans GitHub Secrets** :
   ```bash
   cat ~/.ssh/id_rsa
   ```
   Copiez tout le contenu (y compris `-----BEGIN...` et `-----END...`) dans le secret `VPS_SSH_KEY`

## Test de Connexion

Pour tester la connexion SSH manuellement :

```bash
ssh -p 22 thibault@141.94.31.162
```

Si la connexion fonctionne manuellement mais pas dans GitHub Actions, vérifiez :
- La clé SSH est bien la clé privée (pas la clé publique)
- La clé n'a pas d'espaces ou de retours à la ligne supplémentaires
- Le secret `VPS_USER` contient exactement `thibault`

## Résolution du Problème "Connection reset by peer"

Cette erreur peut être due à :

1. **Serveur SSH surchargé** : Attendre quelques minutes et réessayer
2. **Firewall bloquant** : Vérifier que le port 22 est ouvert
3. **Service SSH arrêté** : Vérifier que `sshd` est actif sur le serveur
4. **Trop de connexions simultanées** : Limiter les connexions SSH

## Après Configuration

Une fois les secrets correctement configurés :

1. Le workflow GitHub Actions devrait passer l'étape "Precheck secrets"
2. La connexion SSH devrait fonctionner
3. Le déploiement devrait se faire automatiquement

## Vérification Post-Configuration

Pour vérifier que tout fonctionne :

1. Allez sur **Actions** dans GitHub
2. Déclenchez manuellement le workflow (bouton "Run workflow")
3. Vérifiez que l'étape "Precheck secrets" passe ✅
4. Vérifiez que l'étape "Setup SSH" passe ✅

