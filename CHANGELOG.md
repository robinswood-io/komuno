# Changelog

Tous les changements notables de ce projet sont documentes dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et [Semantic Versioning](https://semver.org/lang/fr/).

## [2.0.0] - 2026-02-06

### Ajoute

- Support multi-tenant (plusieurs organisations sur une base de code)
- Branding dynamique via interface admin (logo, couleurs, textes)
- Toggle d'affichage du logo dans le header
- CI/CD GitHub Actions (build Docker + deploiement)
- Systeme de cotisations avec types reutilisables
- Graphe de relations membres
- Exports PDF/Excel
- Notifications integrees
- Templates GitHub (issues, PR)

### Modifie

- Migration frontend vers Next.js 16 + Turbopack
- Migration backend vers NestJS 11
- Migration React 19
- Migration Zod v4
- Rebranding du projet sous le nom Komuno
- Optimisations Docker pour le developpement
- Licence du projet basculee vers MIT

### Corrige

- Stabilisation du hot reload
- Correctifs memoire (OOM) en environnement de dev

### Securite

- Ajout d'une politique de securite (`SECURITY.md`)
- Renforcement de la configuration CORS

## [1.0.0] - 2025-01-15

### Ajoute

- Version initiale de la plateforme
- Module idees avec votes
- Module evenements avec inscriptions
- Module membres/CRM
- Module pret de materiel
- Authentification OAuth2/OIDC
- Frontend React
- Backend Express.js
- PostgreSQL + Drizzle ORM

---

## Types de changements

- **Ajoute** pour les nouvelles fonctionnalites
- **Modifie** pour les changements de comportement
- **Deprecie** pour les fonctionnalites a retirer prochainement
- **Supprime** pour les fonctionnalites retirees
- **Corrige** pour les corrections de bugs
- **Securite** pour les changements de securite
