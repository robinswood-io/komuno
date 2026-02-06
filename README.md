# Komuno

[![License: Non-Commercial](https://img.shields.io/badge/License-Non--Commercial-red.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue)](https://www.typescriptlang.org/)

**Plateforme collaborative multi-tenant pour associations et organisations**

Komuno est une application web moderne permettant la gestion collaborative d'idées, d'événements, de membres et de finances. Entièrement personnalisable via un système de branding dynamique.

## 🚀 Instances en Production

| Instance | Domaine | Organisation |
|----------|---------|--------------|
| **CJD80** | [cjd80.fr](https://cjd80.fr) | Centre des Jeunes Dirigeants d'Amiens |
| **REP** | [repicardie.fr](https://repicardie.fr) | Réseau Entreprendre Picardie |

## ✨ Fonctionnalités

### Modules Métier
- **💡 Boîte à Idées** - Proposition, vote et suivi d'idées avec workflow flexible
- **📅 Événements** - Création, gestion et inscriptions avec intégration HelloAsso
- **👥 CRM Membres** - Gestion complète avec relations, tags et scoring d'engagement
- **💰 Finance** - Cotisations, types d'abonnements, suivi des paiements
- **🔧 Prêt de Matériel** - Gestion du parc matériel et des emprunts
- **🔔 Notifications** - Système de notifications temps réel

### Fonctionnalités Techniques
- **🎨 Branding Dynamique** - Personnalisation complète (logo, couleurs, textes) via interface admin
- **🔐 Authentification OAuth2** - Via Authentik (SSO, OIDC)
- **📱 PWA** - Installation native, mode hors ligne, notifications push
- **🌐 Multi-tenant** - Une base de code, plusieurs instances personnalisées
- **📊 Dashboard Admin** - Statistiques, graphiques, exports

## 🏗️ Architecture

### Stack Technique v2.0

| Composant | Technologie | Version |
|-----------|-------------|---------|
| **Frontend** | Next.js + React | 16.x / 19.x |
| **Backend** | NestJS | 11.x |
| **Base de données** | PostgreSQL | 16 |
| **ORM** | Drizzle | Latest |
| **Cache** | Redis | 7 |
| **Stockage** | MinIO (S3) | Latest |
| **Auth** | Authentik (OAuth2/OIDC) | Latest |
| **Build** | Turbopack | Next.js 16 |

### Structure du Projet

```
komuno/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Pages authentification
│   ├── (protected)/       # Pages admin protégées
│   └── (public)/          # Pages publiques
├── components/            # Composants React
├── server/                # Backend NestJS
│   └── src/
│       ├── admin/         # Module administration
│       ├── auth/          # Module authentification
│       ├── branding/      # Module branding dynamique
│       ├── events/        # Module événements
│       ├── financial/     # Module finance
│       ├── ideas/         # Module idées
│       ├── members/       # Module membres/CRM
│       └── notifications/ # Module notifications
├── shared/                # Types et schémas partagés
├── deploy/                # Configuration déploiement
└── docs/                  # Documentation
```

## 🚀 Déploiement

### CI/CD avec GitHub Actions

Le déploiement est automatisé via GitHub Actions:

- **Push sur `main`** → Build + Déploiement automatique sur CJD80
- **Workflow manuel** → Déploiement sur REP ou les deux

```yaml
# Déclencher un déploiement manuel
Actions > Build and Deploy > Run workflow > Choisir environnement
```

### Nouvelle Installation

```bash
# Sur le nouveau serveur
export DOMAIN=example.com
export APP_NAME=myorg
curl -sSL https://raw.githubusercontent.com/robinswood-io/komuno/main/deploy/install.sh | bash
```

Voir [deploy/README.md](deploy/README.md) pour la documentation complète.

## 💻 Développement Local

### Prérequis

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16, Redis 7, MinIO

### Installation

```bash
# Cloner le repository
git clone https://github.com/robinswood-io/komuno.git
cd komuno

# Installer les dépendances
npm install --legacy-peer-deps

# Configurer l'environnement
cp .env.example .env

# Démarrer en développement
npm run dev
```

### Scripts Disponibles

```bash
npm run dev          # Développement (Next.js + NestJS)
npm run build        # Build production
npm run start        # Démarrer en production
npm run db:push      # Pousser le schéma DB
npx tsc --noEmit     # Vérification TypeScript
```

## 🎨 Personnalisation

Chaque instance peut personnaliser:

- **Logo** - Upload via admin + toggle affichage
- **Couleurs** - Primaire, secondaire, sémantiques (success, warning, error, info)
- **Textes** - Nom de l'app, organisation, "Boîte à Idées", etc.
- **PWA** - Nom, icônes, thème

Configuration via `/admin/branding` (interface graphique) ou fichiers:
- `config/branding-core.ts` - Configuration par défaut
- `public/manifest.json` - Manifest PWA

## 📊 Changelog v2.0

### Nouveautés Majeures

- ✅ **Migration Next.js 16** - Turbopack par défaut, App Router
- ✅ **Migration NestJS 11** - Backend entièrement refactorisé
- ✅ **Branding Dynamique** - Personnalisation temps réel via admin
- ✅ **Toggle Logo** - Afficher/masquer le logo dans le header
- ✅ **CI/CD GitHub Actions** - Build Docker + déploiement automatisé
- ✅ **Multi-tenant** - Support de plusieurs instances (CJD80, REP)
- ✅ **Système de Cotisations** - Types d'abonnements réutilisables
- ✅ **Graphe de Relations** - Visualisation des relations entre membres
- ✅ **Notifications Temps Réel** - Système de notifications intégré

### Améliorations Techniques

- Migration React 18 → React 19
- Migration Vite → Next.js 16 avec Turbopack
- Migration Express → NestJS 11
- Validation Zod v4
- OpenAPI/Swagger pour documentation API
- Docker optimisé (4GB RAM, NODE_OPTIONS)
- Hot reload stable (fix OOM)

### Par rapport à v1.0

| Aspect | v1.0 | v2.0 |
|--------|------|------|
| Frontend | React + Vite | Next.js 16 + Turbopack |
| Backend | Express.js | NestJS 11 |
| Branding | Statique | Dynamique (admin UI) |
| Déploiement | Manuel | GitHub Actions CI/CD |
| Multi-tenant | Non | Oui |
| Cotisations | Création directe | Types réutilisables |

## 📄 Licence

**Komuno Non-Commercial License (KNCL) v1.0**

Ce logiciel est sous licence non-commerciale. Vous pouvez librement :
- Utiliser pour un usage personnel ou éducatif
- Modifier et créer des œuvres dérivées
- Distribuer sous les mêmes termes

**Interdit** : Usage commercial sans accord préalable.

Voir [LICENSE](LICENSE) pour les détails complets.

Pour une licence commerciale : contact@robinswood.io

## 🤝 Contribuer

Les contributions sont les bienvenues ! Consultez :
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guide de contribution
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Code de conduite
- [SECURITY.md](SECURITY.md) - Politique de sécurité

---

**Développé par [Robinswood](https://robinswood.io)** - Solutions digitales sur mesure
