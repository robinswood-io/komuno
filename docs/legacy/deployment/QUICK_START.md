# Guide Rapide - Contrôle et Déploiement CJD80

## 🚀 Commandes Essentielles

### Vérifier l'état actuel
```bash
./scripts/check-latest-version.sh
```

### Contrôle complet du serveur
```bash
./scripts/ssh-control.sh check
```

### Health check
```bash
./scripts/ssh-control.sh health
```

### Déployer la dernière version
```bash
./scripts/deploy-latest-version.sh
```

## 📋 Workflow Complet

1. **Vérifier** : `./scripts/check-latest-version.sh`
2. **Pousser** : `git push origin main`
3. **Attendre** : Workflow GitHub Actions
4. **Déployer** : `./scripts/deploy-latest-version.sh`
5. **Vérifier** : `./scripts/ssh-control.sh health`

## 📚 Documentation

- Scripts : `scripts/README.md`
- Déploiement : `docs/deployment/DEPLOYMENT_SUMMARY.md`
- Vérification : `docs/deployment/VERSION_CHECK_REPORT.md`
