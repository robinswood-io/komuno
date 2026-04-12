# 🏷️ Configuration du Déploiement Automatique sur Tags Git

**Date :** 2025-01-29  
**Status :** ✅ Configuré

## 📋 Modifications Apportées

### 1. Ajout du Trigger sur Tags Git

Le workflow `.github/workflows/deploy.yml` a été modifié pour déclencher automatiquement le déploiement lors de la création de tags Git.

**Avant :**
```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
    ...
```

**Après :**
```yaml
on:
  push:
    branches:
      - main
    tags:
      - 'v*.*.*'  # Tags sémantiques (v1.0.0, v1.2.3, etc.)
  workflow_dispatch:
    ...
```

### 2. Génération de Tags d'Image Adaptée

La génération de tags d'image Docker a été adaptée pour utiliser le tag Git au lieu du SHA lorsque disponible.

**Logique :**
- **Tag Git (ex: v1.0.0)** : Génère `ghcr.io/aoleon/cjd80:1.0.0`, `ghcr.io/aoleon/cjd80:v1.0.0`, et `latest`
- **Push sur main** : Génère `ghcr.io/aoleon/cjd80:main-{SHA}` et `latest`

### 3. Amélioration du Résumé de Déploiement

Le résumé de déploiement affiche maintenant le tag Git si disponible.

## 🚀 Utilisation

### Créer et Déployer une Nouvelle Version

```bash
# 1. S'assurer que vous êtes sur main et à jour
git checkout main
git pull origin main

# 2. Créer un tag
git tag v1.0.0

# 3. Pousser le tag (déclenche automatiquement le déploiement)
git push origin v1.0.0
```

### Format des Tags

Utilisez le format de versionnement sémantique (SemVer) :
- `v1.0.0` : Version majeure initiale
- `v1.1.0` : Nouvelle fonctionnalité
- `v1.1.1` : Correction de bug
- `v2.0.0` : Version majeure avec breaking changes

## 📦 Tags d'Images Docker Générés

Pour un tag Git `v1.0.0` :
- `ghcr.io/aoleon/cjd80:1.0.0` (sans préfixe 'v')
- `ghcr.io/aoleon/cjd80:v1.0.0` (avec préfixe 'v')
- `ghcr.io/aoleon/cjd80:latest` (toujours la dernière version)

## ✅ Vérification

1. **Vérifier le Workflow GitHub Actions**
   - Allez sur **Actions** → **🚀 Deploy Multi-Servers**
   - Vérifiez que le workflow s'est déclenché
   - Vérifiez que tous les jobs sont verts

2. **Vérifier l'Image Docker**
   ```bash
   docker images | grep cjd80
   ```

3. **Vérifier l'Application**
   ```bash
   curl https://cjd80.fr/api/health
   ```

## 📚 Documentation Complète

Voir `docs/deployment/VERSIONING.md` pour la documentation complète du processus de versionnement.

## ⚠️ Note sur le Linter

Le linter GitHub Actions peut afficher un avertissement sur l'utilisation de `matrix` dans une condition `if`. Cet avertissement est connu et n'empêche pas le workflow de fonctionner correctement. La syntaxe utilisée est valide pour GitHub Actions.

