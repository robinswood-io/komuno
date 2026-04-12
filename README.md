# Komuno

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

Plateforme collaborative multi-tenant pour associations et organisations.

Komuno centralise la gestion des idees, evenements, membres, cotisations et notifications dans une application web moderne, personnalisable par organisation.

## Fonctionnalites

- Boite a idees: proposition, vote, suivi
- Evenements: creation, inscriptions, gestion
- CRM membres: profils, tags, relations, engagement
- Cotisations et finance: suivi des paiements
- Notifications: in-app + flux temps reel
- Branding dynamique: logo, couleurs, textes, theming
- Authentification OAuth2/OIDC (compatible Authentik)
- Architecture multi-tenant

## Stack technique

- Frontend: Next.js 16, React 19, App Router
- Backend: NestJS 11
- Base de donnees: PostgreSQL
- ORM: Drizzle
- Cache: Redis
- Object storage: MinIO (S3 compatible)
- Build: Turbopack (dev), Next build (prod)

## Demarrage rapide (local)

### Prerequis

- Node.js 20+
- npm 10+
- Docker + Docker Compose (recommande)

### Option 1: Docker (recommande)

```bash
git clone https://github.com/robinswood-io/komuno.git
cd komuno
cp .env.example .env

docker compose -f docker-compose.dev.yml up -d
```

### Option 2: local natif

```bash
git clone https://github.com/robinswood-io/komuno.git
cd komuno
npm install --legacy-peer-deps
cp .env.example .env
npm run dev
```

## Installation open source (serveur)

Le dossier [`deploy/`](deploy/) contient un script d'installation et une configuration Docker de production reutilisable.

```bash
export DOMAIN=example.org
export APP_NAME=komuno
export GHCR_USER=<github-user>
export GHCR_TOKEN=<github-token-read-packages>

curl -sSL https://raw.githubusercontent.com/robinswood-io/komuno/main/deploy/install.sh | bash
```

Guide detaille: [`deploy/README.md`](deploy/README.md)

## Variables d'environnement

Copiez `.env.example` vers `.env` puis adaptez:

- `DATABASE_URL`: connexion PostgreSQL
- `DATABASE_URL_SUPERUSER`: superuser pour migrations DDL (optionnel mais recommande)
- `SESSION_SECRET`: secret de session
- `AUTH_MODE`: mode auth (`local` ou `oauth` selon votre setup)
- `SMTP_*`: email sortant (optionnel)
- `MINIO_*` / `S3_*`: stockage objet

## Scripts utiles

```bash
npm run dev            # Next.js + NestJS en local
npm run build          # Build frontend + backend
npm run start          # Demarrage production local
npm run test           # Tests unitaires
npx tsc --noEmit       # Verification TypeScript
npm run db:migrate     # Migrations DB
npm run db:studio      # UI Drizzle
npm run docs:check     # Verification des liens de documentation maintenue
npm run docs:check:all # Verification de tous les liens Markdown (README + deploy + docs)
```

## Qualite et verification

Avant PR:

```bash
npx tsc --noEmit
npm test
npm run docs:check
```

## Structure du projet

```text
komuno/
├── app/                 # Next.js App Router
├── components/          # UI React
├── server/src/          # Backend NestJS
├── shared/              # Types/schemas partages
├── deploy/              # Installation et deploiement production
├── docs/                # Documentation projet
├── tests/               # Tests integration / validation API
└── test/                # Tests unitaires
```

## Documentation connexe

- [docs/README.md](docs/README.md)
- [docs/MAINTAINED_DOCS.md](docs/MAINTAINED_DOCS.md)
- [deploy/README.md](deploy/README.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [CHANGELOG.md](CHANGELOG.md)

## Licence

Ce projet est sous licence [MIT](LICENSE).

## Mainteneur

Komuno est maintenu par Robinswood.
