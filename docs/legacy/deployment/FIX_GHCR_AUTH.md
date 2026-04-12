# Solution : Authentification GHCR sur le VPS

## 🔐 Problème

Le workflow GitHub Actions échoue car le VPS n'est pas authentifié auprès de GitHub Container Registry (GHCR), donc il ne peut pas pull les images Docker.

## ✅ Solution

### Option 1 : Authentification Manuelle (Recommandée)

1. **Créer un token GitHub :**
   - Aller sur : https://github.com/settings/tokens
   - Cliquer sur "Generate new token (classic)"
   - Nom : `GHCR-VPS-Access`
   - Expiration : Selon vos besoins (90 jours recommandé)
   - Permissions :
     - ✅ `read:packages` (lire les packages)
     - ✅ `write:packages` (écrire les packages)
   - Cliquer sur "Generate token"
   - **⚠️ IMPORTANT : Copier le token immédiatement (il ne sera plus visible)**

2. **Authentifier le VPS :**
   ```bash
   ssh thibault@141.94.31.162
   docker login ghcr.io -u VOTRE_USERNAME_GITHUB -p VOTRE_TOKEN
   ```
   
   Remplacez :
   - `VOTRE_USERNAME_GITHUB` par votre nom d'utilisateur GitHub
   - `VOTRE_TOKEN` par le token généré à l'étape 1

3. **Vérifier l'authentification :**
   ```bash
   cat ~/.docker/config.json | grep -A 3 ghcr.io
   ```
   
   Vous devriez voir quelque chose comme :
   ```json
   "auths": {
     "ghcr.io": {
       "auth": "base64_encoded_credentials"
     }
   }
   ```

### Option 2 : Authentification Automatique via Workflow

Modifier le workflow pour authentifier automatiquement le VPS :

```yaml
- name: Authenticate VPS to GHCR
  uses: appleboy/ssh-action@v1.0.3
  with:
    host: ${{ secrets.VPS_HOST }}
    username: ${{ secrets.VPS_USER }}
    port: ${{ secrets.VPS_PORT }}
    key: ${{ secrets.VPS_SSH_KEY }}
    script: |
      echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
```

**Note :** Cette méthode utilise `GITHUB_TOKEN` qui est automatiquement disponible dans les workflows GitHub Actions.

---

## 🔍 Vérification

Après l'authentification, testez :

```bash
ssh thibault@141.94.31.162
docker pull ghcr.io/aoleon/cjd80:latest
```

Si cela fonctionne, l'authentification est correcte.

---

## ⚠️ Sécurité

- **Ne jamais commiter les tokens dans le code**
- **Utiliser des tokens avec des permissions minimales**
- **Régénérer les tokens régulièrement**
- **Utiliser des tokens avec expiration**

---

## 🚀 Après Authentification

Une fois l'authentification configurée :

1. **Vérifier que tout fonctionne :**
   ```bash
   ./scripts/diagnose-github-actions.sh
   ```

2. **Déclencher le workflow :**
   ```bash
   git push origin main
   ```

3. **Surveiller le workflow :**
   - https://github.com/Aoleon/cjd80/actions

---

## 📝 Notes

- L'authentification est persistante (stockée dans `~/.docker/config.json`)
- Si vous changez de serveur, vous devrez ré-authentifier
- Les tokens peuvent être révoqués depuis GitHub Settings > Developer settings > Personal access tokens
