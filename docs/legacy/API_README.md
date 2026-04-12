# CJD Amiens - Documentation API

Documentation complète de l'API CJD80 "Boîte à Kiffs".

Version: **2.0.0** | Date: **22 janvier 2026**

---

## Table des Matières

- [Introduction](#introduction)
- [Documentation](#documentation)
- [Démarrage Rapide](#démarrage-rapide)
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Endpoints Principaux](#endpoints-principaux)
- [Exemples d'Utilisation](#exemples-dutilisation)
- [Support et Ressources](#support-et-ressources)

---

## Introduction

### Qu'est-ce que CJD80 ?

CJD80 est une application web moderne pour la gestion collaborative d'idées, l'organisation d'événements et la gestion CRM des membres et mécènes du CJD Amiens.

### Fonctionnalités Principales

- **Gestion des idées** - Proposer, voter, gérer des idées collaboratives
- **Événements** - Créer, publier et gérer les inscriptions aux événements
- **CRM Membres** - Suivi de l'engagement et activités des membres
- **CRM Mécènes** - Gestion des mécènes, dons et actualités
- **Prêt de matériel** - Catalogue de matériel disponible en prêt
- **Gestion financière** - Budgets, dépenses et reporting
- **Suivi automatisé** - Tracking et alertes personnalisables
- **Authentification SSO** - OAuth2/OIDC via Authentik

### Qui Utilise Cette API ?

- **Frontend Next.js** - Application web principale
- **Applications mobiles** - (Future)
- **Intégrations tierces** - Webhooks et API REST
- **Scripts d'automatisation** - Tâches planifiées

---

## Documentation

### Documentation Complète

**[API_COMPLETE_DOCUMENTATION.md](./API_COMPLETE_DOCUMENTATION.md)**

Documentation exhaustive couvrant:
- Architecture détaillée
- Authentification OAuth2/OIDC
- REST API (NestJS) - Tous les endpoints
- tRPC API - 9 routers type-safe
- Schémas de données complets
- Exemples d'utilisation
- Guide d'intégration
- Troubleshooting

**Taille**: ~50 pages | **Niveau**: Avancé

---

### Guide de Démarrage Rapide

**[API_QUICK_START.md](./API_QUICK_START.md)**

Guide rapide pour démarrer en 10 minutes:
- Installation en 4 étapes
- Premier appel API
- Exemples basiques (idées, événements, votes)
- Authentification
- Commandes utiles
- Troubleshooting rapide

**Taille**: ~10 pages | **Niveau**: Débutant

---

### Changelog

**[API_CHANGELOG.md](./API_CHANGELOG.md)**

Historique complet des versions:
- Version 2.0.0 - Migration Next.js 15 + tRPC 11 + NestJS 11
- Breaking changes et migrations
- Nouvelles fonctionnalités
- Dépréciations
- Bug fixes
- Roadmap future

**Dernière version**: 2.0.0 (22 janvier 2026)

---

### Schémas JSON

**[api-schemas.json](./api-schemas.json)**

Schémas JSON complets pour:
- Toutes les entités (Idea, Event, Member, Patron, etc.)
- Validation Zod
- Types TypeScript
- Relations entre entités

Format: JSON Schema compatible OpenAPI

---

### Collection Postman

**[CJD80_API.postman_collection.json](./CJD80_API.postman_collection.json)**

Collection Postman prête à l'emploi:
- Tous les endpoints REST
- Variables d'environnement
- Tests automatiques
- Exemples de requêtes
- Documentation intégrée

**Import**: Postman → Import → Collection File

---

## Démarrage Rapide

### Installation Express (5 minutes)

```bash
# 1. Cloner le repository
git clone https://github.com/your-org/cjd80.git
cd cjd80

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
nano .env

# 4. Démarrer les services
docker compose -f docker-compose.services.yml up -d

# 5. Initialiser la base de données
npm run db:push

# 6. Lancer l'application
npm run dev
```

Accès:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **API Docs**: http://localhost:5000/api/docs

### Premier Appel API

**Avec tRPC (Recommandé):**

```typescript
import { trpc } from '@/lib/trpc/client';

// Lister les idées
const { data } = trpc.ideas.list.useQuery({ page: 1, limit: 20 });

// Créer une idée
const create = trpc.ideas.create.useMutation();
create.mutate({
  title: 'Ma première idée',
  description: 'Description',
  proposedBy: 'John Doe',
  proposedByEmail: 'john@example.com',
});
```

**Avec REST API:**

```bash
# Lister les idées
curl http://localhost:5000/api/ideas

# Créer une idée
curl -X POST http://localhost:5000/api/ideas \
  -H "Content-Type: application/json" \
  -d '{"title":"Ma première idée","proposedBy":"John Doe","proposedByEmail":"john@example.com"}'
```

---

## Architecture

CJD80 utilise une **architecture API hybride** combinant REST (NestJS) et tRPC pour des cas d'usage complémentaires.

**Voir [ARCHITECTURE_ANALYSIS.md](../ARCHITECTURE_ANALYSIS.md) pour les détails complets.**

### Séparation des Responsabilités

#### Backend REST API (NestJS + OpenAPI)
**Source de vérité pour contrats externes**

- **Validation** : class-validator (DTOs)
- **Documentation** : OpenAPI généré automatiquement
- **Client** : Généré depuis OpenAPI
- **Usage** : Intégrations tierces, webhooks, API publique
- **Swagger UI** : `/api/docs`

#### tRPC API (Type-Safe Automatique)
**PAS d'OpenAPI - Types TypeScript natifs**

- **Validation** : Zod schemas (partagés frontend/backend)
- **Types** : Inférés automatiquement par TypeScript
- **Client** : Hooks React générés automatiquement
- **Usage** : Communication interne frontend/backend
- **Avantage** : Type-safety end-to-end, aucun doublon

**Note importante** : tRPC n'a PAS besoin d'OpenAPI car les types sont générés automatiquement. Créer de la documentation OpenAPI pour tRPC serait un doublon inutile.

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Next.js 15)                     │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Server     │    │   Client     │    │     PWA      │ │
│  │  Components  │    │  Components  │    │   Features   │ │
│  │              │    │ (tRPC hooks) │    │              │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                  ┌───────────┴───────────┐
                  │                       │
            tRPC (interne)          REST API (externe)
                  │                       │
                  ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (NestJS 11)                        │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │     tRPC     │    │     REST     │    │   Guards &   │ │
│  │   Handlers   │    │  Controllers │    │  Middleware  │ │
│  │  (Zod types) │    │ (OpenAPI gen)│    │              │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│                              │                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Business Services Layer                  │  │
│  │  (Ideas, Events, Members, Patrons, Financial, etc.)  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  PostgreSQL  │    │    MinIO     │    │    Redis     │ │
│  │  (Drizzle)   │    │ (S3 Storage) │    │   (Cache)    │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Auth Layer (Authentik)                    │
│                     OAuth2/OIDC Provider                    │
└─────────────────────────────────────────────────────────────┘
```

### Composants Clés

- **Next.js 15** - Framework React avec App Router
- **NestJS 11** - Framework backend avec DI
- **tRPC 11** - API type-safe end-to-end (communication interne)
- **REST API** - OpenAPI généré pour intégrations externes
- **Drizzle ORM** - Type-safe database queries
- **Authentik** - Identity Provider (OAuth2/OIDC)
- **PostgreSQL** - Base de données relationnelle
- **MinIO** - Stockage S3-compatible
- **Redis** - Cache et session store

---

## Technologies

### Stack Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| Next.js | 15.1.4 | Framework React |
| React | 19.0.0 | UI Library |
| TypeScript | 5.6.3 | Type Safety |
| tRPC Client | 11.0.0 | API Calls |
| TanStack Query | 5.60.5 | State Management |
| Tailwind CSS | 3.4.17 | Styling |
| shadcn/ui | Latest | Component Library |
| Zod | 3.24.2 | Validation |

### Stack Backend

| Technologie | Version | Usage |
|-------------|---------|-------|
| NestJS | 11.1.9 | Framework Backend |
| tRPC Server | 11.0.0 | Type-safe API |
| Drizzle ORM | 0.39.1 | Database ORM |
| PostgreSQL | 16+ | Database |
| Passport | 0.7.0 | Authentication |
| Winston | 3.18.3 | Logging |
| Helmet | 8.1.0 | Security |

### Infrastructure

| Service | Usage |
|---------|-------|
| Authentik | OAuth2/OIDC Provider |
| PostgreSQL | Primary Database |
| Redis | Cache & Session Store |
| MinIO | S3 Storage |
| Docker | Containerization |
| Traefik | Reverse Proxy |

---

## Endpoints Principaux

### REST API

Base URL: `http://localhost:5000/api`

| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `/auth/login` | GET | Initier OAuth2 flow | Public |
| `/auth/status` | GET | Statut de session | Public |
| `/ideas` | GET | Lister les idées | Public |
| `/ideas` | POST | Créer une idée | Public |
| `/ideas/:id` | PATCH | Mettre à jour | Admin |
| `/ideas/:id/vote` | POST | Voter | Public |
| `/events` | GET | Lister les événements | Public |
| `/events` | POST | Créer un événement | Admin |
| `/events/:id/register` | POST | S'inscrire | Public |
| `/members` | GET | Lister les membres | Admin |
| `/patrons` | GET | Lister les mécènes | Admin |
| `/financial/stats` | GET | Stats financières | Admin |

Voir la [documentation complète](./API_COMPLETE_DOCUMENTATION.md#rest-api-nestjs) pour tous les endpoints.

### tRPC API

Base URL: `http://localhost:5000/api/trpc`

**9 Routers disponibles:**

| Router | Procedures | Description |
|--------|-----------|-------------|
| `auth` | 1 | Authentification |
| `ideas` | 7 | Gestion des idées |
| `events` | 5 | Gestion des événements |
| `loans` | 3 | Matériel en prêt |
| `members` | 5 | CRM membres |
| `patrons` | 6 | CRM mécènes |
| `financial` | 5 | Gestion financière |
| `tracking` | 4 | Suivi des tâches |
| `admin` | 4 | Administration |

**Total**: 40+ procedures type-safe

Voir la [documentation complète](./API_COMPLETE_DOCUMENTATION.md#trpc-api) pour tous les routers.

---

## Exemples d'Utilisation

### Cas d'Usage 1: Créer et Voter pour une Idée

```typescript
'use client';

import { trpc } from '@/lib/trpc/client';

export function IdeaWorkflow() {
  const utils = trpc.useUtils();

  // Créer une idée
  const create = trpc.ideas.create.useMutation({
    onSuccess: () => utils.ideas.list.invalidate(),
  });

  // Voter
  const vote = trpc.ideas.vote.useMutation({
    onSuccess: () => utils.ideas.list.invalidate(),
  });

  return (
    <div>
      <button
        onClick={() =>
          create.mutate({
            title: 'Organiser un hackathon',
            description: 'Un hackathon pour les jeunes dirigeants',
            proposedBy: 'John Doe',
            proposedByEmail: 'john@example.com',
          })
        }
      >
        Créer l'idée
      </button>

      <button
        onClick={() =>
          vote.mutate({
            ideaId: 'idea-uuid',
            voterName: 'Jane Doe',
            voterEmail: 'jane@example.com',
          })
        }
      >
        Voter
      </button>
    </div>
  );
}
```

### Cas d'Usage 2: S'inscrire à un Événement

```typescript
'use client';

import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';

export function EventRegistration({ eventId }: { eventId: string }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
  });

  const register = trpc.events.register.useMutation({
    onSuccess: () => alert('Inscription réussie !'),
    onError: (error) => alert(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate({ eventId, ...formData });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Nom complet"
        required
      />
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        required
      />
      <input
        value={formData.company}
        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
        placeholder="Société"
      />
      <button type="submit" disabled={register.isPending}>
        {register.isPending ? 'Inscription...' : "S'inscrire"}
      </button>
    </form>
  );
}
```

### Cas d'Usage 3: Dashboard Admin

```typescript
'use client';

import { trpc } from '@/lib/trpc/client';

export function AdminDashboard() {
  const { data: stats } = trpc.admin.getStats.useQuery();
  const { data: ideas } = trpc.ideas.stats.useQuery();
  const { data: members } = trpc.members.list.useQuery({ status: 'active' });

  if (!stats) return <div>Chargement...</div>;

  return (
    <div>
      <h1>Dashboard Admin</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <h3>Idées</h3>
          <p>{stats.totalIdeas}</p>
        </Card>

        <Card>
          <h3>Événements</h3>
          <p>{stats.totalEvents}</p>
        </Card>

        <Card>
          <h3>Membres Actifs</h3>
          <p>{members?.length}</p>
        </Card>
      </div>

      <div>
        <h2>Statistiques des idées</h2>
        <ul>
          <li>En attente: {ideas?.byStatus.pending}</li>
          <li>Approuvées: {ideas?.byStatus.approved}</li>
          <li>Total votes: {ideas?.totalVotes}</li>
        </ul>
      </div>
    </div>
  );
}
```

Plus d'exemples dans la [documentation complète](./API_COMPLETE_DOCUMENTATION.md#exemples-dutilisation).

---

## Support et Ressources

### Documentation

- **[Documentation Complète](./API_COMPLETE_DOCUMENTATION.md)** - Référence exhaustive
- **[Guide de Démarrage](./API_QUICK_START.md)** - Démarrage rapide
- **[Changelog](./API_CHANGELOG.md)** - Historique des versions
- **[Schémas JSON](./api-schemas.json)** - Types et validation
- **[Collection Postman](./CJD80_API.postman_collection.json)** - Tests API

### Outils

- **Swagger UI**: http://localhost:5000/api/docs (dev)
- **Postman**: Importer la collection
- **TypeScript**: Auto-complétion dans l'IDE
- **DevTools**: Network inspector

### Ressources Externes

- **tRPC Documentation**: https://trpc.io
- **Next.js 15 Docs**: https://nextjs.org/docs
- **NestJS Docs**: https://nestjs.com
- **Drizzle ORM**: https://orm.drizzle.team
- **Authentik**: https://goauthentik.io

### Support

- **Email**: support@cjd80.rbw.ovh
- **Issues GitHub**: https://github.com/your-org/cjd80/issues
- **Discussions**: https://github.com/your-org/cjd80/discussions

### Commandes Utiles

```bash
# Développement
npm run dev              # Frontend + Backend
npm run dev:next         # Frontend seul
npm run dev:nest         # Backend seul

# Base de données
npm run db:push          # Sync schema
npm run db:connect       # Connect to DB
npm run db:monitor       # Monitor connections

# Docker
docker compose -f docker-compose.services.yml up -d    # Start services
docker compose -f docker-compose.services.yml logs -f  # View logs

# Tests
npm run test:playwright  # E2E tests
npm run health:check     # Health check

# Build
npm run build            # Production build
npm start                # Start production
```

---

## Licence

MIT License - Voir [LICENSE](../../LICENSE)

---

## Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](../../CONTRIBUTING.md) pour les guidelines.

### Workflow de Contribution

1. Fork le repository
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

---

## Changelog Récent

**Version 2.0.0 (22 janvier 2026)**

Migration majeure vers Next.js 15 + tRPC 11 + NestJS 11:
- tRPC API type-safe avec 9 routers
- NestJS backend avec 11 modules
- Authentification OAuth2/OIDC via Authentik
- Amélioration performance et sécurité
- Documentation complète

Voir le [changelog complet](./API_CHANGELOG.md) pour plus de détails.

---

**Documentation maintenue par**: Équipe de développement CJD80
**Dernière mise à jour**: 22 janvier 2026
**Version API**: 2.0.0
