# 🚀 Démarrage Rapide - Déploiement via Tags Git

**Guide rapide pour déployer une nouvelle version automatiquement**

## 📋 En 3 Étapes

### 1. Créer un tag

```bash
git tag v1.0.0
```

### 2. Pousser le tag

```bash
git push origin v1.0.0
```

### 3. Vérifier le déploiement

1. Allez sur **GitHub** → **Actions**
2. Vérifiez que le workflow **🚀 Deploy Multi-Servers** s'est déclenché
3. Attendez que tous les jobs soient verts
4. Vérifiez l'application : https://cjd80.fr/api/health

## ✅ C'est tout !

Le déploiement se fait automatiquement. L'application sera mise à jour sur https://cjd80.fr.

## 📚 Documentation Complète

- **Guide complet :** `docs/deployment/VERSIONING.md`
- **Tests :** `docs/deployment/TESTING_DEPLOYMENT.md`
- **Configuration :** `docs/deployment/DEPLOYMENT_TAGS_SETUP.md`

## 🆘 Besoin d'aide ?

Consultez `docs/deployment/TESTING_DEPLOYMENT.md` pour le dépannage.

