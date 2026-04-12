# 🏷️ Processus de Versionnement et Déploiement Automatique

**Date :** 2025-01-29  
**Workflow :** `.github/workflows/deploy.yml`

## 📋 Vue d'ensemble

Le déploiement automatique se déclenche maintenant sur :
- ✅ **Push sur `main`** : Déploiement automatique avec tag SHA-based
- ✅ **Création de tags Git** : Déploiement automatique avec tag sémantique
- ✅ **Workflow Dispatch** : Déploiement manuel

## 🏷️ Format des Tags Git

### Tags Sémantiques Recommandés

Utilisez le format de versionnement sémantique (SemVer) :

```
v{major}.{minor}.{patch}
```

**Exemples :**
- `v1.0.0` : Version majeure initiale
- `v1.1.0` : Nouvelle fonctionnalité
- `v1.1.1` : Correction de bug
- `v2.0.0` : Version majeure avec breaking changes

### Préfixe 'v'

Le préfixe `v` est **recommandé** mais **optionnel**. Le workflow gère les deux formats :
- `v1.0.0` → Tag Docker : `1.0.0` et `v1.0.0`
- `1.0.0` → Tag Docker : `1.0.0`

## 🚀 Créer et Déployer une Nouvelle Version

### Méthode 1 : Via Git (Recommandé)

```bash
# 1. S'assurer que vous êtes sur main et à jour
git checkout main
git pull origin main

# 2. Créer un tag
git tag v1.0.0

# 3. Pousser le tag (déclenche automatiquement le déploiement)
git push origin v1.0.0
```

### Méthode 2 : Via GitHub (Interface Web)

1. Allez sur **Releases** → **Draft a new release**
2. Choisissez un tag (ex: `v1.0.0`)
3. Remplissez le titre et la description
4. Cliquez sur **Publish release**

**Note :** La création du tag déclenche automatiquement le workflow de déploiement.

### Méthode 3 : Via GitHub CLI

```bash
# Créer un tag et le pousser
gh release create v1.0.0 --title "Version 1.0.0" --notes "Description de la version"
```

## 📦 Tags d'Images Docker

### Format des Tags

Le workflow génère automatiquement plusieurs tags pour chaque image :

#### Pour un Tag Git (ex: `v1.0.0`)
```
ghcr.io/aoleon/cjd80:1.0.0      # Sans préfixe 'v'
ghcr.io/aoleon/cjd80:v1.0.0     # Avec préfixe 'v'
ghcr.io/aoleon/cjd80:latest     # Tag latest (toujours la dernière version)
```

#### Pour un Push sur main (SHA-based)
```
ghcr.io/aoleon/cjd80:main-a1b2c3d  # SHA court
ghcr.io/aoleon/cjd80:latest         # Tag latest
```

### Utilisation des Tags

**Déploiement automatique :**
- Le workflow utilise automatiquement le tag approprié
- Pour les tags Git : utilise `v1.0.0` ou `1.0.0`
- Pour les push sur main : utilise `main-{SHA}`

**Déploiement manuel :**
```bash
# Sur le serveur
export DOCKER_IMAGE="ghcr.io/aoleon/cjd80:v1.0.0"
cd /docker/cjd80
bash scripts/vps-deploy.sh
```

## 🔍 Vérification du Déploiement

### 1. Vérifier le Workflow GitHub Actions

1. Allez sur **Actions** → **🚀 Deploy Multi-Servers**
2. Vérifiez que le workflow s'est déclenché
3. Vérifiez que tous les jobs sont verts

### 2. Vérifier l'Image Docker

```bash
# Sur le serveur
docker images | grep cjd80

# Vous devriez voir :
# ghcr.io/aoleon/cjd80    v1.0.0    ...
# ghcr.io/aoleon/cjd80    1.0.0     ...
# ghcr.io/aoleon/cjd80    latest    ...
```

### 3. Vérifier l'Application

```bash
# Health check
curl https://cjd80.fr/api/health

# Vérifier les logs
ssh thibault@141.94.31.162
cd /docker/cjd80
docker compose logs --tail=50 cjd-app
```

## 📊 Exemples de Workflow

### Scénario 1 : Nouvelle Fonctionnalité

```bash
# 1. Développer sur une branche
git checkout -b feature/nouvelle-fonctionnalite
# ... faire les modifications ...
git commit -m "feat: ajout nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite

# 2. Créer une PR et merger sur main
# (via GitHub interface)

# 3. Après merge, créer un tag pour la nouvelle version
git checkout main
git pull origin main
git tag v1.1.0
git push origin v1.1.0
# → Déploiement automatique déclenché
```

### Scénario 2 : Correction de Bug Urgent

```bash
# 1. Corriger le bug sur main
git checkout main
git pull origin main
# ... corriger le bug ...
git commit -m "fix: correction bug urgent"
git push origin main
# → Déploiement automatique avec SHA

# 2. Créer un tag patch
git tag v1.0.1
git push origin v1.0.1
# → Déploiement automatique avec tag
```

### Scénario 3 : Version Majeure

```bash
# 1. Préparer la release
git checkout main
git pull origin main

# 2. Créer le tag de version majeure
git tag v2.0.0
git push origin v2.0.0
# → Déploiement automatique déclenché
```

## ⚠️ Bonnes Pratiques

### 1. Versionnement Sémantique

- **MAJOR** (v2.0.0) : Breaking changes
- **MINOR** (v1.1.0) : Nouvelles fonctionnalités compatibles
- **PATCH** (v1.0.1) : Corrections de bugs

### 2. Messages de Commit

Utilisez des messages de commit clairs :
- `feat: nouvelle fonctionnalité`
- `fix: correction de bug`
- `docs: mise à jour documentation`
- `refactor: refactoring du code`

### 3. Tags Annotés

Créez des tags annotés avec un message :

```bash
git tag -a v1.0.0 -m "Version 1.0.0 - Release initiale"
git push origin v1.0.0
```

### 4. Vérification Avant Tag

Avant de créer un tag, vérifiez :
- ✅ Tous les tests passent
- ✅ La documentation est à jour
- ✅ Le CHANGELOG est mis à jour
- ✅ Le code est reviewé et approuvé

## 🔄 Rollback

En cas de problème, vous pouvez rollback vers une version précédente :

```bash
# Sur le serveur
cd /docker/cjd80
export DOCKER_IMAGE="ghcr.io/aoleon/cjd80:v1.0.0"  # Version précédente
bash scripts/vps-deploy.sh
```

## 📚 Ressources

- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

## ✅ Checklist de Déploiement

Avant de créer un tag :

- [ ] Code testé et validé
- [ ] Tests passent (`npm test`)
- [ ] Documentation à jour
- [ ] CHANGELOG mis à jour
- [ ] Code review approuvé
- [ ] Merge sur `main` effectué
- [ ] Tag créé avec le bon format (vX.Y.Z)
- [ ] Tag poussé sur GitHub
- [ ] Workflow GitHub Actions vérifié
- [ ] Déploiement vérifié sur le serveur
- [ ] Health check validé

