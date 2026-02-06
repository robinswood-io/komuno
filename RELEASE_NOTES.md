# Release Notes - Komuno v2.0

**Date:** 6 février 2026

## 🎉 Nouveautés Majeures

### Multi-tenant & Rebranding
- **Renommage en Komuno** - L'application devient une plateforme générique multi-tenant
- **Instances de production** :
  - CJD80 → cjd80.fr (Centre des Jeunes Dirigeants d'Amiens)
  - REP → repicardie.fr (Réseau Entreprendre Picardie)

### Branding Dynamique Complet
- **Logo configurable** - Upload de logo personnalisé via admin
- **Toggle affichage logo** - Activer/désactiver le logo dans le header
- **Couleurs dynamiques** - Modification en temps réel des couleurs (primaire, secondaire, sémantiques)
- **Textes personnalisables** - Nom de l'app, organisation, "Boîte à Idées", etc.
- **Application immédiate** - Changements visibles sans redémarrage

### CI/CD GitHub Actions
- **Build automatisé** - Docker image poussée sur ghcr.io
- **Déploiement automatique** - Push sur main → déploiement CJD80
- **Déploiement manuel** - Workflow dispatch pour REP ou les deux
- **Scripts d'installation** - Installation en une commande pour nouveaux serveurs

### Système de Cotisations Amélioré
- **Types de cotisations** - Modèles réutilisables (nom, durée, montant)
- **Attribution aux membres** - Assigner/retirer des cotisations
- **Suivi des paiements** - Historique et statut des cotisations
- **Alertes d'expiration** - Notifications avant échéance

### Graphe de Relations Membres
- **Visualisation interactive** - Graphe D3.js des relations entre membres
- **Types de relations** - Mentor, parrain, collaborateur, etc.
- **Filtres avancés** - Par type, membre, période
- **Export** - Export des données relationnelles

## 🔧 Améliorations Techniques

### Stack Modernisée
| Composant | v1.0 | v2.0 |
|-----------|------|------|
| Frontend | React 18 + Vite | Next.js 16 + Turbopack |
| Backend | Express.js | NestJS 11 |
| React | 18.x | 19.x |
| Validation | Zod v3 | Zod v4 |
| Build | Vite | Turbopack |

### Performance & Stabilité
- **Fix OOM** - Augmentation mémoire Docker 2GB → 4GB
- **NODE_OPTIONS** - Limite heap V8 à 3GB
- **Hot Reload stable** - Plus de redémarrages intempestifs
- **Assets publics** - Dossier public/ avec tous les assets

### Architecture
- **11 modules NestJS** - Backend entièrement modulaire
- **OpenAPI/Swagger** - Documentation API générée
- **Drizzle ORM** - Migrations et types TypeScript
- **BrandingContext** - Context React pour branding dynamique

## 📦 Fichiers Modifiés

### Nouveaux Fichiers
- `.github/workflows/deploy.yml` - CI/CD GitHub Actions
- `deploy/docker-compose.prod.yml` - Stack production
- `deploy/install.sh` - Script installation
- `deploy/.env.example` - Template configuration
- `components/dynamic-title.tsx` - Titre navigateur dynamique

### Fichiers Mis à Jour
- `package.json` - Renommé en "komuno"
- `README.md` - Documentation v2.0
- `config/branding-core.ts` - Ajout showLogo
- `components/layout/header.tsx` - Toggle logo conditionnel
- `app/(protected)/admin/branding/page.tsx` - UI toggle logo

## 🚀 Migration depuis v1.0

### Pour les instances existantes
1. Pull de la nouvelle version
2. Exécuter les migrations DB : `npm run db:push`
3. Redémarrer les containers

### Pour les nouvelles instances
```bash
export DOMAIN=mondomaine.fr
export APP_NAME=monorg
curl -sSL https://raw.githubusercontent.com/robinswood-io/komuno/main/deploy/install.sh | bash
```

## 📋 Prochaines Étapes

- [ ] Configuration secrets GitHub Actions
- [ ] Renommer repo GitHub : cjd80 → komuno
- [ ] Premier déploiement REP (repicardie.fr)
- [ ] Documentation utilisateur

## 🙏 Remerciements

Développé par l'équipe Robinswood pour le CJD Amiens et le Réseau Entreprendre Picardie.
