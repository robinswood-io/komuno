# Release Notes - Komuno v2.0

**Date:** 6 fevrier 2026

## Nouveautes majeures

### Multi-tenant et rebranding
- Repositionnement de l'application en plateforme multi-tenant
- Renommage officiel du projet en Komuno

### Branding dynamique
- Upload de logo personnalise
- Option d'affichage/masquage du logo
- Couleurs dynamiques
- Textes personnalisables
- Application immediate des changements

### CI/CD
- Build Docker automatise
- Deploiement automatise via GitHub Actions
- Deploiement manuel possible par environnement
- Scripts d'installation serveur

### Cotisations
- Types de cotisations reutilisables
- Attribution aux membres
- Suivi de statut des paiements
- Alertes d'expiration

### Relations membres
- Visualisation graphe interactive
- Types de relations parametrables
- Filtres avances
- Exports

## Evolutions techniques

| Composant | v1.0 | v2.0 |
|-----------|------|------|
| Frontend | React + Vite | Next.js 16 + Turbopack |
| Backend | Express.js | NestJS 11 |
| React | 18.x | 19.x |
| Validation | Zod v3 | Zod v4 |

## Performance et stabilite

- Ajustements memoire Docker
- Stabilisation du hot reload
- Organisation des assets publics

## Fichiers importants

### Nouveaux
- `.github/workflows/deploy.yml`
- `deploy/docker-compose.prod.yml`
- `deploy/install.sh`
- `deploy/.env.example`

### Mis a jour
- `package.json`
- `README.md`
- `config/branding-core.ts`
- `components/layout/header.tsx`
- `app/(protected)/admin/branding/page.tsx`

## Migration depuis v1

1. Pull de la nouvelle version
2. Migrations DB: `npm run db:push`
3. Redemarrage des services

## Prochaines etapes

- Renforcer la documentation utilisateur
- Finaliser la standardisation CI/CD multi-environnements
- Continuer la consolidation de la suite de tests
