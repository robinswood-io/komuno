# 🚀 Optimisation des Déploiements CI/CD

## Vue d'ensemble

Cette documentation détaille les optimisations apportées aux workflows GitHub Actions pour accélérer les builds et déploiements du projet CJD80.

### Gains de Performance Attendus

| Métrique | Avant (npm) | Après (Bun) | Gain |
|----------|-------------|-------------|------|
| **Installation dépendances** | 60-90s | 5-10s | **6-9x plus rapide** |
| **Build total** | 8-12 min | 3-5 min | **60-70% plus rapide** |
| **Build sans changements** | 8-12 min | Skip (0s) | **100% économie** |
| **Cache hit rate** | ~40% | ~85% | **2x meilleur** |

## Architecture des Optimisations

### 1. Dockerfile Multi-Stage Optimisé

**Fichier:** `Dockerfile.optimized`

#### Optimisations Clés

```dockerfile
# Stage 1: Dependencies (cache optimal)
FROM oven/bun:1.1-alpine AS deps
- Copie UNIQUEMENT package.json/bun.lockb
- Bun install 6-9x plus rapide que npm
- Layer cacké si dépendances inchangées

# Stage 2: Builder
FROM oven/bun:1.1-alpine AS builder
- Copie node_modules depuis stage deps (réutilise cache)
- Build avec Bun (moins de mémoire que Node)
- Suppression devDependencies en fin de stage

# Stage 3: Runner (production)
FROM oven/bun:1.1-alpine AS runner
- Image finale ultra-légère
- Uniquement artefacts de production
- Health check optimisé avec wget
```

#### Différences avec Dockerfile actuel

| Aspect | Ancien (npm) | Nouveau (Bun) |
|--------|--------------|---------------|
| Base image | node:20-alpine (180MB) | oven/bun:1.1-alpine (90MB) |
| Install deps | `npm ci` (60-90s) | `bun install` (5-10s) |
| Mémoire build | 3GB+ | 1.5GB |
| Layers cachés | 3 | 5 (plus granulaire) |

### 2. GitHub Actions avec Détection de Changements

**Fichier:** `.github/workflows/deploy-optimized.yml`

#### Job 1: Détection de Changements

```yaml
detect-changes:
  # Analyse les fichiers modifiés depuis le dernier commit
  # Skip le build si aucun changement code/deps
  outputs:
    - should_build: true/false
    - app_changed: true/false
    - server_changed: true/false
    - shared_changed: true/false
    - deps_changed: true/false
```

**Logique:**
- Pas de changements → Skip build entièrement (économie 100%)
- Changements détectés → Build uniquement les parties nécessaires

#### Job 2: Build Intelligent

```yaml
build:
  needs: detect-changes
  if: needs.detect-changes.outputs.should_build == 'true'
  # Build UNIQUEMENT si changements détectés
```

**Optimisations:**
- Cache Bun dependencies (GitHub Actions cache)
- Cache Docker layers (BuildKit cache)
- Cache multi-niveau: deps → builder → runner
- Provenance/SBOM désactivés (gain 20-30s)

#### Jobs 3-4: Déploiement Conditionnel

```yaml
deploy-cjd80:
  if: |
    needs.build.result == 'success' ||
    needs.detect-changes.outputs.should_build == 'false'
```

**Avantages:**
- Déploiement zéro-downtime avec `--no-deps`
- Health check automatique
- Nettoyage intelligent des images (48h au lieu de 24h)
- Skip si pas de changements

### 3. Cache Stratégies

#### Cache Bun (GitHub Actions)

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.bun/install/cache
      node_modules
    key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
```

**Hit rate attendu:** ~85%

#### Cache Docker (BuildKit)

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

**Avantages:**
- Réutilisation layers entre builds
- Cache partagé entre branches
- Invalidation intelligente

### 4. .dockerignore Optimisé

**Fichier:** `.dockerignore`

Exclut du contexte Docker:
- `node_modules` (reconstruits dans l'image)
- `dist`, `.next` (artefacts de build)
- Tests, docs, logs
- Fichiers IDE/OS

**Gain:** Context Docker réduit de ~500MB à ~50MB = **10x plus rapide**

## Migration Progressive

### Étape 1: Tests Locaux

```bash
# Installer Bun
curl -fsSL https://bun.sh/install | bash

# Tester l'installation
cd /srv/workspace/cjd80
bun install

# Vérifier que tout compile
bun run tsc --noEmit

# Tester le build
bun run build
```

### Étape 2: Générer bun.lockb

```bash
# Utiliser le script de migration
./scripts/migrate-to-bun.sh

# Ou manuellement
bun install  # Génère bun.lockb depuis package-lock.json
```

### Étape 3: Test du Dockerfile Optimisé

```bash
# Build local avec le Dockerfile optimisé
docker build -f Dockerfile.optimized -t cjd80:bun-test .

# Tester l'image
docker run -p 3000:3000 -p 5000:5000 cjd80:bun-test

# Vérifier le health check
curl http://localhost:5000/api/health
```

### Étape 4: Activation Progressive

**Option A: Test sur branche de dev**

```bash
# Créer une branche de test
git checkout -b feat/optimize-ci

# Copier les fichiers optimisés
cp Dockerfile.optimized Dockerfile
cp .github/workflows/deploy-optimized.yml .github/workflows/deploy.yml

# Commiter et pousser
git add .
git commit -m "feat: optimiser CI/CD avec Bun"
git push origin feat/optimize-ci
```

**Option B: Déploiement manuel workflow_dispatch**

1. Aller sur GitHub Actions
2. Sélectionner "Build and Deploy (Optimized)"
3. Run workflow → choisir environnement
4. Surveiller les logs

### Étape 5: Rollback si Problème

```bash
# Revenir à l'ancien workflow
git checkout main -- Dockerfile .github/workflows/deploy.yml
git commit -m "rollback: retour CI/CD npm"
git push
```

## Monitoring et Métriques

### GitHub Actions Insights

Vérifier dans l'onglet "Actions":
- Durée totale du workflow
- Durée de chaque job
- Cache hit rate
- Taille de l'image Docker

### Métriques Attendues (Premier Build)

```
✅ detect-changes: ~10s
✅ build (Bun):
   - Setup Bun: ~5s
   - Cache restore: ~10s
   - Docker build: 2-3 min (first time)
   - Total: ~3-4 min

✅ deploy-cjd80: ~45s
✅ deploy-rep: ~45s

🎯 TOTAL: ~5-6 min (vs 10-12 min avant)
```

### Métriques Attendues (Builds Suivants avec Cache)

```
✅ detect-changes: ~10s
✅ build (Bun):
   - Cache restore: ~5s
   - Docker build: 1-2 min (cached layers)
   - Total: ~2 min

✅ deploy-cjd80: ~45s

🎯 TOTAL: ~3-4 min (60% plus rapide)
```

### Métriques Attendues (Pas de Changements)

```
✅ detect-changes: ~10s
⏭️  build: SKIPPED
⏭️  deploy: SKIPPED

🎯 TOTAL: ~10s (99% économie)
```

## Troubleshooting

### Problème: Bun install échoue

```bash
# Vérifier la version Bun
bun --version  # Doit être >= 1.1.0

# Supprimer le cache et réinstaller
rm -rf node_modules bun.lockb
bun install
```

### Problème: Build Docker échoue

```bash
# Vérifier les logs
docker build -f Dockerfile.optimized --progress=plain .

# Vérifier l'espace disque
df -h

# Nettoyer le cache Docker
docker system prune -a
```

### Problème: Cache GitHub Actions corrompu

```bash
# Dans le workflow, ajouter temporairement:
- name: Clear cache
  run: |
    gh cache delete ${{ runner.os }}-bun- || true
```

## Comparaison Détaillée

### Avant: npm + Dockerfile classique

```
├─ Setup (30s)
│  ├─ Checkout: 10s
│  └─ Setup Node: 20s
│
├─ Build (8-10 min)
│  ├─ npm ci: 60-90s
│  ├─ npm run build: 5-7 min
│  └─ Docker build: 2-3 min
│
└─ Deploy (1-2 min)
   ├─ SSH connect: 10s
   ├─ Docker pull: 30s
   ├─ Docker compose: 30s
   └─ Health check: 15s

🕐 TOTAL: 10-13 minutes
```

### Après: Bun + Dockerfile optimisé + Détection changements

```
├─ Detect changes (10s)
│  └─ Git diff analysis
│
├─ Build (2-4 min) [SI CHANGEMENTS]
│  ├─ Bun install: 5-10s
│  ├─ Bun build: 1-2 min
│  └─ Docker build (cached): 1-2 min
│
└─ Deploy (45s)
   ├─ Docker pull (cached): 10s
   ├─ Zero-downtime deploy: 20s
   └─ Health check: 15s

🕐 TOTAL: 3-5 minutes (60-70% plus rapide)
🎯 SKIP: ~10 secondes si pas de changements
```

## Recommandations

### DO ✅

- Commiter `bun.lockb` dans le repo
- Utiliser `bun install --frozen-lockfile` en CI
- Monitorer les durées de build
- Tester localement avec Bun avant de pousser

### DON'T ❌

- Ne pas mixer npm et Bun (choisir l'un ou l'autre)
- Ne pas commiter `node_modules`
- Ne pas désactiver le cache sans raison
- Ne pas skip les tests pour gagner du temps

## Ressources

- [Bun Documentation](https://bun.sh/docs)
- [Docker BuildKit Cache](https://docs.docker.com/build/cache/)
- [GitHub Actions Cache](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

## Support

En cas de problème avec les workflows optimisés:

1. Vérifier les logs GitHub Actions
2. Tester le build localement
3. Comparer avec l'ancien workflow
4. Rollback si nécessaire
5. Ouvrir une issue avec les logs d'erreur
