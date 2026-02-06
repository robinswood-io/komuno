# Changelog

Tous les changements notables de ce projet sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [2.0.0] - 2026-02-06

### Ajouté

- **Multi-tenant** - Support de plusieurs instances (CJD80, REP) avec une seule base de code
- **Branding Dynamique** - Personnalisation complète via interface admin (logo, couleurs, textes)
- **Toggle Logo** - Option pour afficher/masquer le logo dans le header
- **CI/CD GitHub Actions** - Build Docker automatisé et déploiement sur ghcr.io
- **Système de Cotisations** - Types d'abonnements réutilisables avec suivi des paiements
- **Graphe de Relations** - Visualisation D3.js des relations entre membres
- **Export PDF/Excel** - Export des votants, inscriptions et absences
- **Notifications Temps Réel** - Système de notifications intégré
- **Templates GitHub** - Bug report, Feature request, PR template

### Modifié

- **Migration Next.js 16** - Upgrade depuis React 18 + Vite vers Next.js 16 + Turbopack
- **Migration NestJS 11** - Refactorisation complète du backend Express vers NestJS
- **Migration React 19** - Upgrade de React 18 vers React 19
- **Migration Zod v4** - Upgrade de Zod v3 vers Zod v4
- **Renommage en Komuno** - L'application s'appelle désormais Komuno (multi-tenant)
- **Docker optimisé** - 4GB RAM, NODE_OPTIONS configuré, hot reload stable
- **Licence** - Passage d'une licence MIT à une licence non-commerciale

### Corrigé

- **Fix OOM** - Résolution des problèmes de mémoire en développement
- **Hot Reload** - Stabilisation du hot reload avec Turbopack

### Sécurité

- Ajout de SECURITY.md pour la politique de signalement des vulnérabilités
- Configuration CORS stricte via NestJS
- Headers de sécurité via Traefik

## [1.0.0] - 2025-01-15

### Ajouté

- Version initiale de l'application CJD80
- Module Boîte à Idées avec votes
- Module Événements avec inscriptions HelloAsso
- Module CRM Membres basique
- Module Prêt de Matériel
- Authentification via Authentik (OAuth2/OIDC)
- Interface React + Vite
- Backend Express.js
- Base de données PostgreSQL avec Drizzle ORM

---

## Types de changements

- **Ajouté** pour les nouvelles fonctionnalités
- **Modifié** pour les changements dans les fonctionnalités existantes
- **Déprécié** pour les fonctionnalités qui seront supprimées prochainement
- **Supprimé** pour les fonctionnalités supprimées
- **Corrigé** pour les corrections de bugs
- **Sécurité** pour les vulnérabilités corrigées
