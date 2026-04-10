# Optimisations CI/CD - Komuno

Ce document decrit les optimisations CI/CD introduites pour accelerer les builds et deploiements.

## Gains attendus

- Build global: 60-70% plus rapide
- Installation dependances: 6-9x plus rapide (selon cache)
- Skip des builds sans changements applicatifs
- Image Docker plus legere

## Principes

1. Dockerfile multi-stage optimise
2. Detection intelligente des changements
3. Cache Bun/npm + cache Docker BuildKit
4. Workflows GitHub Actions adaptes au contexte

## Activation rapide

```bash
# Test local
./scripts/migrate-to-bun.sh
bun run tsc --noEmit
bun run build

# Test Docker
docker build -f Dockerfile.optimized -t komuno:test .
docker run -d -p 5000:5000 --name komuno-test komuno:test
curl http://localhost:5000/api/health
docker rm -f komuno-test
```

## Notes

- Adaptez les workflows `.github/workflows/*` a vos environnements
- Verifiez les secrets GitHub Actions avant activation en production
- Conservez une procedure de rollback simple et testee
