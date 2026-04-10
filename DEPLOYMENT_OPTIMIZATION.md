# Optimisation des deploiements CI/CD

Ce document presente les optimisations appliquees au pipeline GitHub Actions.

## Objectifs

- Reduire le temps total de build/deploiement
- Eviter les builds inutiles
- Fiabiliser le cache
- Garder un rollback simple

## Techniques utilisees

### 1. Docker multi-stage
- Stage dependencies
- Stage build
- Stage runtime

### 2. Detection de changements
- Skip build si aucun changement applicatif
- Build conditionnel selon zones impactees

### 3. Caching
- Cache des dependances
- Cache Docker BuildKit
- Cle de cache basee sur lockfile

## Procedure type

```bash
# Test local
bun run tsc --noEmit
bun run build

# Test container
docker build -f Dockerfile.optimized -t komuno:bun-test .
docker run -p 5000:5000 komuno:bun-test
```

## Mesures de controle

- Healthcheck API apres deploiement
- Verification logs applicatifs
- Verification des jobs CI (build/test/deploy)

## Rollback

- Revenir au Dockerfile/workflow precedent
- Redeployer le tag d'image precedent
- Verifier le health endpoint
