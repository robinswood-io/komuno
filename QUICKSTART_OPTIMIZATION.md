# Guide rapide - Optimisation CI/CD

Objectif: accelerer le pipeline de build/deploiement.

## Etapes

```bash
# 1) Migration locale Bun (optionnel)
./scripts/migrate-to-bun.sh
bun run tsc --noEmit
bun run build

# 2) Test image Docker optimisee
docker build -f Dockerfile.optimized -t komuno:bun-test .
docker run -d -p 5000:5000 --name komuno-test komuno:bun-test
sleep 10
curl http://localhost:5000/api/health
docker rm -f komuno-test

# 3) Activer workflow optimise
cp .github/workflows/deploy-optimized.yml .github/workflows/deploy.yml
```

## Validation

- Workflow GitHub Actions vert
- Health endpoint OK
- Duree build reduite vs baseline
- Aucun impact fonctionnel

## Rollback

```bash
git checkout -- Dockerfile .github/workflows/deploy.yml
git commit -m "rollback: restauration pipeline precedent"
```
