# CJD Amiens - Documentation API Complète

Version: 2.0.0 (Migration Next.js 15 + tRPC 11 + NestJS 11)
Date: 22 janvier 2026
URL Production: https://cjd80.rbw.ovh

---

## Table des Matières

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Authentification](#authentification)
4. [REST API (NestJS)](#rest-api-nestjs)
5. [tRPC API](#trpc-api)
6. [Schémas de Données](#schémas-de-données)
7. [Exemples d'Utilisation](#exemples-dutilisation)
8. [Guide d'Intégration](#guide-dintégration)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

### Présentation

CJD Amiens "Boîte à Kiffs" est une application web moderne pour la gestion collaborative d'idées, l'organisation d'événements et la gestion CRM des membres et mécènes.

### Technologies Utilisées

- **Frontend**: Next.js 15 App Router + React 19 + TypeScript
- **Backend**: NestJS 11 + tRPC 11 + TypeScript
- **Base de données**: PostgreSQL (Neon) avec Drizzle ORM
- **Authentification**: Authentik (OAuth2/OIDC)
- **Storage**: MinIO (S3-compatible)
- **Communication**: REST API (NestJS) + tRPC (type-safe)

### Base URL

- **Production**: `https://cjd80.rbw.ovh`
- **Development**: `http://localhost:3000` (Frontend) / `http://localhost:5000` (Backend)

### Versions d'API

- **REST API**: `/api/*` (NestJS controllers)
- **tRPC API**: `/api/trpc` (tRPC endpoint)
- **Documentation Swagger**: `http://localhost:5000/api/docs` (dev only)

---

## Architecture

### Diagramme d'Architecture Globale

```mermaid
graph TB
    Client[Client Next.js 15]

    subgraph "Backend Layer"
        NestJS[NestJS 11 Server :5000]
        tRPC[tRPC Handler]
        REST[REST Controllers]
        Services[Business Services]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL)]
        MinIO[MinIO S3]
        Redis[(Redis Cache)]
    end

    subgraph "Auth Layer"
        Authentik[Authentik IdP]
        Session[Session Store]
    end

    Client -->|tRPC Calls| tRPC
    Client -->|REST Calls| REST
    tRPC --> Services
    REST --> Services
    Services --> DB
    Services --> MinIO
    Services --> Redis
    Client -->|OAuth2 Flow| Authentik
    Authentik --> Session
    Session --> DB
```

### Flow Requête-Réponse

```mermaid
sequenceDiagram
    participant Client
    participant Next.js
    participant NestJS
    participant tRPC
    participant Service
    participant Database

    Client->>Next.js: Requête utilisateur
    Next.js->>tRPC: Appel API type-safe
    tRPC->>NestJS: Route vers handler
    NestJS->>Service: Business logic
    Service->>Database: Query Drizzle ORM
    Database-->>Service: Données
    Service-->>NestJS: Résultat
    NestJS-->>tRPC: Response
    tRPC-->>Next.js: Type-safe data
    Next.js-->>Client: UI Update
```

### Middlewares et Guards

**NestJS Guards:**
- `AuthGuard`: Vérifie la session utilisateur
- `PermissionGuard`: Vérifie les rôles et permissions

**tRPC Middlewares:**
- `isAuthenticated`: Middleware pour routes protégées
- `isAdmin`: Middleware pour routes administrateur

**Global Middlewares:**
- Logging (Winston)
- DB Connection Monitoring
- Error Handling (HttpExceptionFilter)
- Helmet Security Headers
- CORS

---

## Authentification

### OAuth2/OIDC via Authentik

L'authentification est gérée par **Authentik**, un Identity Provider (IdP) externe.

#### Configuration

Variables d'environnement requises:

```bash
AUTHENTIK_BASE_URL=http://localhost:9002
AUTHENTIK_CLIENT_ID=your-client-id
AUTHENTIK_CLIENT_SECRET=your-client-secret
AUTHENTIK_ISSUER=http://localhost:9002/application/o/cjd80/
AUTHENTIK_REDIRECT_URI=http://localhost:5000/api/auth/authentik/callback
AUTHENTIK_TOKEN=your-authentik-api-token
```

#### Flow d'Authentification

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Authentik
    participant Database

    User->>App: Clic "Se connecter"
    App->>Authentik: Redirect OAuth2
    Authentik->>User: Page de login
    User->>Authentik: Credentials
    Authentik->>Authentik: Validate
    Authentik->>App: Redirect avec code
    App->>Authentik: Exchange code pour token
    Authentik-->>App: Access token + User info
    App->>Database: Sync user data
    Database-->>App: User record
    App->>App: Create session
    App-->>User: Redirect vers dashboard
```

#### Endpoints d'Authentification

**REST API:**
```
GET  /api/auth/login              - Initie le flow OAuth2
GET  /api/auth/authentik/callback - Callback OAuth2
GET  /api/auth/logout             - Déconnexion
GET  /api/auth/status             - Statut de session
```

**tRPC API:**
```typescript
auth.getCurrentUser()  - Récupère l'utilisateur connecté
```

#### Session Management

Sessions stockées dans PostgreSQL avec `connect-pg-simple`:

- **Durée**: 7 jours
- **Cookie**: `cjd80.session` (httpOnly, secure en production)
- **Store**: PostgreSQL table `session`

#### Permissions et Rôles

Rôles disponibles (définis dans `shared/schema.ts`):

| Rôle | Code | Permissions |
|------|------|-------------|
| Super Admin | `super_admin` | Tous les accès |
| Ideas Reader | `ideas_reader` | Lecture des idées |
| Ideas Manager | `ideas_manager` | Gestion des idées |
| Events Reader | `events_reader` | Lecture des événements |
| Events Manager | `events_manager` | Gestion des événements |

#### Synchronisation Utilisateurs

- **Automatique** lors de la connexion
- Mapping groupes Authentik → Rôles application
- Table `admins` dans PostgreSQL
- Service: `UserSyncService`

---

## REST API (NestJS)

### Documentation Swagger

Documentation interactive disponible en développement:

**URL**: `http://localhost:5000/api/docs`

### Endpoints REST Disponibles

#### Auth (`/api/auth`)

```
GET  /api/auth/login              - Initie OAuth2 flow
GET  /api/auth/authentik/callback - Callback OAuth2
GET  /api/auth/logout             - Déconnexion
GET  /api/auth/status             - Statut session
```

#### Health (`/api/health`)

```
GET  /api/health        - Health check global
GET  /api/health/db     - Health check database
GET  /api/health/minio  - Health check MinIO
```

#### Setup (`/api/setup`)

```
POST /api/setup/init    - Initialisation première utilisation
GET  /api/setup/status  - Statut de l'installation
```

#### Branding (`/api/branding`)

```
GET    /api/branding           - Récupère config branding
PUT    /api/branding           - Met à jour config (admin)
GET    /api/branding/colors    - Liste des couleurs
PATCH  /api/branding/colors    - Met à jour couleurs (admin)
```

#### Ideas (`/api/ideas`)

```
GET    /api/ideas              - Liste des idées
POST   /api/ideas              - Créer une idée
GET    /api/ideas/:id          - Détail d'une idée
PATCH  /api/ideas/:id          - Mettre à jour une idée (admin)
DELETE /api/ideas/:id          - Supprimer une idée (admin)
POST   /api/ideas/:id/vote     - Voter pour une idée
GET    /api/ideas/:id/votes    - Récupérer les votes
```

#### Events (`/api/events`)

```
GET    /api/events                    - Liste des événements
POST   /api/events                    - Créer un événement (admin)
GET    /api/events/:id                - Détail d'un événement
PATCH  /api/events/:id                - Mettre à jour (admin)
DELETE /api/events/:id                - Supprimer (admin)
POST   /api/events/:id/register       - S'inscrire à un événement
POST   /api/events/:id/unregister     - Se désinscrire
GET    /api/events/:id/registrations  - Liste des inscrits (admin)
```

#### Loans (`/api/loans`)

```
GET    /api/loans          - Liste du matériel
POST   /api/loans          - Proposer du matériel
GET    /api/loans/:id      - Détail d'un item
PATCH  /api/loans/:id      - Mettre à jour (admin)
DELETE /api/loans/:id      - Supprimer (admin)
POST   /api/loans/:id/photo - Uploader une photo
```

#### Members (`/api/members`)

```
GET    /api/members            - Liste des membres (admin)
POST   /api/members            - Créer un membre (admin)
GET    /api/members/:id        - Détail d'un membre
PATCH  /api/members/:id        - Mettre à jour (admin)
DELETE /api/members/:id        - Supprimer (admin)
GET    /api/members/:id/stats  - Statistiques d'engagement
```

#### Patrons (`/api/patrons`)

```
GET    /api/patrons                  - Liste des mécènes (admin)
POST   /api/patrons                  - Créer un mécène (admin)
GET    /api/patrons/:id              - Détail d'un mécène
PATCH  /api/patrons/:id              - Mettre à jour (admin)
DELETE /api/patrons/:id              - Supprimer (admin)
POST   /api/patrons/:id/donations    - Ajouter un don
GET    /api/patrons/:id/donations    - Historique des dons
POST   /api/patrons/:id/updates      - Ajouter une actualité
GET    /api/patrons/:id/updates      - Historique des actualités
```

#### Financial (`/api/financial`)

```
GET    /api/financial/budgets       - Liste des budgets (admin)
POST   /api/financial/budgets       - Créer un budget (admin)
GET    /api/financial/expenses      - Liste des dépenses (admin)
POST   /api/financial/expenses      - Créer une dépense (admin)
GET    /api/financial/stats         - Statistiques financières (admin)
```

#### Tracking (`/api/tracking`)

```
GET    /api/tracking                - Liste des suivis (admin)
POST   /api/tracking                - Créer un suivi (admin)
GET    /api/tracking/:id            - Détail d'un suivi
PATCH  /api/tracking/:id            - Mettre à jour (admin)
DELETE /api/tracking/:id            - Supprimer (admin)
POST   /api/tracking/:id/generate   - Générer alertes (admin)
```

#### Admin (`/api/admin`)

```
GET    /api/admin/users          - Liste des admins (super_admin)
POST   /api/admin/users          - Créer un admin (super_admin)
PATCH  /api/admin/users/:email   - Mettre à jour admin (super_admin)
DELETE /api/admin/users/:email   - Supprimer admin (super_admin)
GET    /api/admin/stats          - Statistiques globales (admin)
```

#### Chatbot (`/api/chatbot`)

```
POST   /api/chatbot/query     - Interroger le chatbot
GET    /api/chatbot/history   - Historique des conversations
```

#### Features (`/api/features`)

```
GET    /api/features          - Liste des features toggles
PATCH  /api/features/:name    - Activer/désactiver une feature (admin)
```

---

## tRPC API

### Introduction à tRPC

tRPC offre une API **type-safe** end-to-end. Les types TypeScript sont partagés entre frontend et backend, garantissant la cohérence des données.

**Point Important** : tRPC **n'utilise pas OpenAPI**. Les types sont générés automatiquement par TypeScript, rendant toute documentation OpenAPI inutile et redondante. Cette approche évite les doublons de validation et de documentation.

**Voir [ARCHITECTURE_ANALYSIS.md](../ARCHITECTURE_ANALYSIS.md) pour comprendre pourquoi tRPC n'a pas besoin d'OpenAPI.**

### Endpoint Principal

**URL**: `/api/trpc`

**Transport**: HTTP POST avec JSON

### Types TypeScript Automatiques

Les types sont automatiquement inférés depuis les schemas Zod du backend:

```typescript
// Types d'entrée (input)
import { type RouterInputs } from '@/lib/trpc/client';
type CreateIdeaInput = RouterInputs['ideas']['create'];

// Types de sortie (output)
import { type RouterOutputs } from '@/lib/trpc/client';
type Idea = RouterOutputs['ideas']['list']['ideas'][number];
```

**Avantages** :
- Type-safety end-to-end sans configuration
- Pas de génération de code manuelle
- Refactoring sûr (renommage détecté)
- Aucun doublon de validation
- Erreurs de type à la compilation

### Routers Disponibles

L'API tRPC est organisée en 9 routers par domaine fonctionnel:

1. **auth** - Authentification
2. **ideas** - Gestion des idées
3. **events** - Gestion des événements
4. **loans** - Matériel en prêt
5. **members** - CRM membres
6. **patrons** - CRM mécènes
7. **financial** - Gestion financière
8. **tracking** - Suivi des tâches
9. **admin** - Administration

---

### Router: `auth`

#### Procedures

##### `auth.getCurrentUser()`

Récupère l'utilisateur actuellement connecté.

**Type**: Query
**Protection**: Public
**Input**: Aucun
**Output**: `Admin | null`

```typescript
const { data: user } = trpc.auth.getCurrentUser.useQuery();
```

---

### Router: `ideas`

#### Procedures

##### `ideas.list()`

Liste les idées avec pagination.

**Type**: Query
**Protection**: Public
**Input**:
```typescript
{
  page: number;     // Numéro de page (min: 1, default: 1)
  limit: number;    // Items par page (min: 1, max: 100, default: 20)
}
```
**Output**:
```typescript
{
  ideas: Idea[];
  total: number;
  page: number;
  limit: number;
}
```

##### `ideas.create()`

Créer une nouvelle idée.

**Type**: Mutation
**Protection**: Public
**Input**:
```typescript
{
  title: string;
  description?: string;
  proposedBy: string;
  proposedByEmail: string;
}
```
**Output**: `Idea`

##### `ideas.delete()`

Supprimer une idée.

**Type**: Mutation
**Protection**: Admin
**Input**:
```typescript
{
  id: string; // UUID
}
```
**Output**:
```typescript
{
  success: boolean;
}
```

##### `ideas.updateStatus()`

Mettre à jour le statut d'une idée.

**Type**: Mutation
**Protection**: Admin
**Input**:
```typescript
{
  id: string; // UUID
  status: "pending" | "approved" | "rejected" | "under_review" | "postponed" | "completed";
}
```
**Output**:
```typescript
{
  success: boolean;
}
```

##### `ideas.getVotes()`

Récupérer les votes d'une idée.

**Type**: Query
**Protection**: Public
**Input**:
```typescript
{
  ideaId: string; // UUID
}
```
**Output**: `Vote[]`

##### `ideas.vote()`

Voter pour une idée.

**Type**: Mutation
**Protection**: Public
**Input**:
```typescript
{
  ideaId: string;
  voterName: string;
  voterEmail: string;
}
```
**Output**: `Vote`

##### `ideas.stats()`

Statistiques des idées.

**Type**: Query
**Protection**: Admin
**Input**: Aucun
**Output**:
```typescript
{
  total: number;
  byStatus: Record<string, number>;
  totalVotes: number;
}
```

---

### Router: `events`

#### Procedures

##### `events.list()`

Liste les événements.

**Type**: Query
**Protection**: Public
**Input**:
```typescript
{
  status?: "draft" | "published" | "cancelled" | "postponed" | "completed";
  upcoming?: boolean; // Événements à venir uniquement
}
```
**Output**: `Event[]`

##### `events.create()`

Créer un événement.

**Type**: Mutation
**Protection**: Admin
**Input**:
```typescript
{
  title: string;
  description?: string;
  date: Date;
  location?: string;
  maxParticipants?: number;
  helloAssoLink?: string;
  enableExternalRedirect?: boolean;
  externalRedirectUrl?: string;
  showInscriptionsCount?: boolean;
  showAvailableSeats?: boolean;
  allowUnsubscribe?: boolean;
  buttonMode?: "subscribe" | "unsubscribe" | "both" | "custom";
  customButtonText?: string;
}
```
**Output**: `Event`

##### `events.register()`

S'inscrire à un événement.

**Type**: Mutation
**Protection**: Public
**Input**:
```typescript
{
  eventId: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  comments?: string;
}
```
**Output**: `Inscription`

##### `events.unregister()`

Se désinscrire d'un événement.

**Type**: Mutation
**Protection**: Public
**Input**:
```typescript
{
  eventId: string;
  email: string;
}
```
**Output**:
```typescript
{
  success: boolean;
}
```

##### `events.getRegistrations()`

Liste des inscrits (admin).

**Type**: Query
**Protection**: Admin
**Input**:
```typescript
{
  eventId: string;
}
```
**Output**: `Inscription[]`

---

### Router: `loans`

#### Procedures

##### `loans.list()`

Liste du matériel.

**Type**: Query
**Protection**: Public
**Input**:
```typescript
{
  status?: "pending" | "available" | "borrowed" | "unavailable";
}
```
**Output**: `LoanItem[]`

##### `loans.create()`

Proposer du matériel.

**Type**: Mutation
**Protection**: Public
**Input**:
```typescript
{
  title: string;
  description?: string;
  lenderName: string;
  proposedBy: string;
  proposedByEmail: string;
}
```
**Output**: `LoanItem`

##### `loans.updateStatus()`

Mettre à jour le statut (admin).

**Type**: Mutation
**Protection**: Admin
**Input**:
```typescript
{
  id: string;
  status: "pending" | "available" | "borrowed" | "unavailable";
}
```
**Output**:
```typescript
{
  success: boolean;
}
```

---

### Router: `members`

#### Procedures

##### `members.list()`

Liste des membres.

**Type**: Query
**Protection**: Admin
**Input**:
```typescript
{
  status?: "active" | "inactive";
  search?: string;
}
```
**Output**: `Member[]`

##### `members.create()`

Créer un membre.

**Type**: Mutation
**Protection**: Admin
**Input**:
```typescript
{
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  role?: string;
  cjdRole?: string;
  notes?: string;
}
```
**Output**: `Member`

##### `members.getStats()`

Statistiques d'engagement.

**Type**: Query
**Protection**: Admin
**Input**:
```typescript
{
  memberId: string;
}
```
**Output**:
```typescript
{
  engagementScore: number;
  activityCount: number;
  lastActivityAt: Date;
  activities: Activity[];
}
```

---

### Router: `patrons`

#### Procedures

##### `patrons.list()`

Liste des mécènes.

**Type**: Query
**Protection**: Admin
**Input**:
```typescript
{
  status?: "active" | "proposed";
}
```
**Output**: `Patron[]`

##### `patrons.create()`

Créer un mécène.

**Type**: Mutation
**Protection**: Admin
**Input**:
```typescript
{
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
  role?: string;
  notes?: string;
  referrerId?: string;
}
```
**Output**: `Patron`

##### `patrons.addDonation()`

Ajouter un don.

**Type**: Mutation
**Protection**: Admin
**Input**:
```typescript
{
  patronId: string;
  donatedAt: Date;
  amount: number; // En centimes
  occasion: string;
}
```
**Output**: `PatronDonation`

##### `patrons.addUpdate()`

Ajouter une actualité.

**Type**: Mutation
**Protection**: Admin
**Input**:
```typescript
{
  patronId: string;
  type: "meeting" | "email" | "call" | "lunch" | "event";
  subject: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  duration?: number; // minutes
  description: string;
  notes?: string;
}
```
**Output**: `PatronUpdate`

---

### Router: `financial`

#### Procedures

##### `financial.getBudgets()`

Liste des budgets.

**Type**: Query
**Protection**: Admin
**Input**: Aucun
**Output**: `Budget[]`

##### `financial.createBudget()`

Créer un budget.

**Type**: Mutation
**Protection**: Admin
**Input**:
```typescript
{
  category: string;
  amount: number; // En centimes
  year: number;
}
```
**Output**: `Budget`

##### `financial.getExpenses()`

Liste des dépenses.

**Type**: Query
**Protection**: Admin
**Input**:
```typescript
{
  startDate?: Date;
  endDate?: Date;
  category?: string;
}
```
**Output**: `Expense[]`

##### `financial.createExpense()`

Créer une dépense.

**Type**: Mutation
**Protection**: Admin
**Input**:
```typescript
{
  category: string;
  amount: number; // En centimes
  description: string;
  date: Date;
}
```
**Output**: `Expense`

##### `financial.getStats()`

Statistiques financières.

**Type**: Query
**Protection**: Admin
**Input**:
```typescript
{
  year: number;
}
```
**Output**:
```typescript
{
  totalBudget: number;
  totalExpenses: number;
  remaining: number;
  byCategory: Record<string, { budget: number; expenses: number; }>;
}
```

---

### Router: `tracking`

#### Procedures

##### `tracking.list()`

Liste des suivis.

**Type**: Query
**Protection**: Admin
**Input**:
```typescript
{
  status?: "active" | "completed" | "cancelled";
}
```
**Output**: `TrackingItem[]`

##### `tracking.create()`

Créer un suivi.

**Type**: Mutation
**Protection**: Admin
**Input**:
```typescript
{
  title: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  alertRecipients: string[]; // Emails
  lastExecutedAt?: Date;
}
```
**Output**: `TrackingItem`

##### `tracking.generateAlerts()`

Générer les alertes.

**Type**: Mutation
**Protection**: Admin
**Input**:
```typescript
{
  trackingId: string;
}
```
**Output**:
```typescript
{
  alertsSent: number;
  recipients: string[];
}
```

---

### Router: `admin`

#### Procedures

##### `admin.listUsers()`

Liste des administrateurs.

**Type**: Query
**Protection**: Super Admin
**Input**: Aucun
**Output**: `Admin[]`

##### `admin.createUser()`

Créer un administrateur.

**Type**: Mutation
**Protection**: Super Admin
**Input**:
```typescript
{
  email: string;
  firstName: string;
  lastName: string;
  role: "super_admin" | "ideas_reader" | "ideas_manager" | "events_reader" | "events_manager";
}
```
**Output**: `Admin`

##### `admin.updateUserRole()`

Mettre à jour le rôle.

**Type**: Mutation
**Protection**: Super Admin
**Input**:
```typescript
{
  email: string;
  role: string;
}
```
**Output**:
```typescript
{
  success: boolean;
}
```

##### `admin.getStats()`

Statistiques globales.

**Type**: Query
**Protection**: Admin
**Input**: Aucun
**Output**:
```typescript
{
  totalIdeas: number;
  totalEvents: number;
  totalMembers: number;
  totalPatrons: number;
  activeUsers: number;
}
```

---

## Schémas de Données

### Entités Principales

#### Admin

```typescript
interface Admin {
  email: string;              // Primary key
  firstName: string;
  lastName: string;
  password: string | null;    // Nullable (géré par Authentik)
  addedBy: string | null;
  role: AdminRole;
  status: "pending" | "active" | "inactive";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type AdminRole = "super_admin" | "ideas_reader" | "ideas_manager" | "events_reader" | "events_manager";
```

#### Idea

```typescript
interface Idea {
  id: string;                 // UUID
  title: string;
  description: string | null;
  proposedBy: string;
  proposedByEmail: string;
  status: IdeaStatus;
  featured: boolean;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}

type IdeaStatus = "pending" | "approved" | "rejected" | "under_review" | "postponed" | "completed";
```

#### Vote

```typescript
interface Vote {
  id: string;                 // UUID
  ideaId: string;             // FK to ideas.id
  voterName: string;
  voterEmail: string;
  createdAt: Date;
}
```

#### Event

```typescript
interface Event {
  id: string;                 // UUID
  title: string;
  description: string | null;
  date: Date;
  location: string | null;
  maxParticipants: number | null;
  helloAssoLink: string | null;
  enableExternalRedirect: boolean;
  externalRedirectUrl: string | null;
  showInscriptionsCount: boolean;
  showAvailableSeats: boolean;
  allowUnsubscribe: boolean;
  redUnsubscribeButton: boolean;
  buttonMode: "subscribe" | "unsubscribe" | "both" | "custom";
  customButtonText: string | null;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}

type EventStatus = "draft" | "published" | "cancelled" | "postponed" | "completed";
```

#### Inscription

```typescript
interface Inscription {
  id: string;                 // UUID
  eventId: string;            // FK to events.id
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  comments: string | null;
  createdAt: Date;
}
```

#### LoanItem

```typescript
interface LoanItem {
  id: string;                 // UUID
  title: string;
  description: string | null;
  lenderName: string;
  photoUrl: string | null;
  status: LoanStatus;
  proposedBy: string;
  proposedByEmail: string;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}

type LoanStatus = "pending" | "available" | "borrowed" | "unavailable";
```

#### Member

```typescript
interface Member {
  id: string;                 // UUID
  email: string;              // Unique
  firstName: string;
  lastName: string;
  company: string | null;
  phone: string | null;
  role: string | null;
  cjdRole: CjdRole | null;
  notes: string | null;
  status: "active" | "inactive";
  proposedBy: string | null;
  engagementScore: number;
  firstSeenAt: Date;
  lastActivityAt: Date;
  activityCount: number;
  createdAt: Date;
  updatedAt: Date;
}

type CjdRole = "president" | "co_president" | "tresorier" | "secretaire" |
               "responsable_recrutement" | "responsable_jeunesse" |
               "responsable_plenieres" | "responsable_mecenes";
```

#### Patron

```typescript
interface Patron {
  id: string;                 // UUID
  firstName: string;
  lastName: string;
  role: string | null;
  company: string | null;
  phone: string | null;
  email: string;              // Unique
  notes: string | null;
  status: "active" | "proposed";
  referrerId: string | null;  // FK to members.id
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}
```

#### PatronDonation

```typescript
interface PatronDonation {
  id: string;                 // UUID
  patronId: string;           // FK to patrons.id
  donatedAt: Date;
  amount: number;             // En centimes
  occasion: string;
  recordedBy: string;
  createdAt: Date;
}
```

#### PatronUpdate

```typescript
interface PatronUpdate {
  id: string;                 // UUID
  patronId: string;           // FK to patrons.id
  type: "meeting" | "email" | "call" | "lunch" | "event";
  subject: string;
  date: string;               // YYYY-MM-DD
  startTime: string | null;   // HH:MM
  duration: number | null;    // minutes
  description: string;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Budget

```typescript
interface Budget {
  id: string;                 // UUID
  category: string;
  amount: number;             // En centimes
  year: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Expense

```typescript
interface Expense {
  id: string;                 // UUID
  category: string;
  amount: number;             // En centimes
  description: string;
  date: Date;
  recordedBy: string;
  createdAt: Date;
}
```

#### TrackingItem

```typescript
interface TrackingItem {
  id: string;                 // UUID
  title: string;
  description: string | null;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  alertRecipients: string[];  // JSON array d'emails
  lastExecutedAt: Date | null;
  nextExecutionAt: Date | null;
  status: "active" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}
```

### Relations Entre Entités

```mermaid
erDiagram
    ADMIN ||--o{ IDEA : manages
    ADMIN ||--o{ EVENT : manages
    ADMIN ||--o{ MEMBER : manages
    ADMIN ||--o{ PATRON : manages

    IDEA ||--o{ VOTE : has
    IDEA ||--o{ IDEA_PATRON_PROPOSAL : has

    EVENT ||--o{ INSCRIPTION : has
    EVENT ||--o{ UNSUBSCRIPTION : has

    MEMBER ||--o{ MEMBER_ACTIVITY : has
    MEMBER ||--o{ MEMBER_SUBSCRIPTION : has
    MEMBER ||--o| PATRON : refers

    PATRON ||--o{ PATRON_DONATION : has
    PATRON ||--o{ PATRON_UPDATE : has
    PATRON ||--o{ IDEA_PATRON_PROPOSAL : has

    LOAN_ITEM ||--|| ADMIN : managed_by
```

---

## Exemples d'Utilisation

### Frontend (Next.js + tRPC)

#### Setup du Client tRPC

```typescript
// lib/trpc/client.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/src/trpc/routers';

export const trpc = createTRPCReact<AppRouter>();
```

#### Provider Setup

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import superjson from 'superjson';
import { trpc } from '@/lib/trpc/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

#### Exemples de Requêtes

##### Lister les Idées

```typescript
'use client';

import { trpc } from '@/lib/trpc/client';

export function IdeasList() {
  const { data, isLoading, error } = trpc.ideas.list.useQuery({
    page: 1,
    limit: 20,
  });

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  return (
    <div>
      {data?.ideas.map((idea) => (
        <div key={idea.id}>
          <h3>{idea.title}</h3>
          <p>{idea.description}</p>
        </div>
      ))}
    </div>
  );
}
```

##### Créer une Idée

```typescript
'use client';

import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';

export function CreateIdeaForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const utils = trpc.useUtils();
  const createIdea = trpc.ideas.create.useMutation({
    onSuccess: () => {
      // Invalider le cache pour refetch la liste
      utils.ideas.list.invalidate();
      setTitle('');
      setDescription('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createIdea.mutate({
      title,
      description,
      proposedBy: 'John Doe',
      proposedByEmail: 'john@example.com',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre de l'idée"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />
      <button type="submit" disabled={createIdea.isPending}>
        {createIdea.isPending ? 'Création...' : 'Créer'}
      </button>
    </form>
  );
}
```

##### Voter pour une Idée

```typescript
'use client';

import { trpc } from '@/lib/trpc/client';

export function VoteButton({ ideaId }: { ideaId: string }) {
  const utils = trpc.useUtils();
  const vote = trpc.ideas.vote.useMutation({
    onSuccess: () => {
      // Invalider les votes pour cette idée
      utils.ideas.getVotes.invalidate({ ideaId });
    },
  });

  const handleVote = () => {
    vote.mutate({
      ideaId,
      voterName: 'John Doe',
      voterEmail: 'john@example.com',
    });
  };

  return (
    <button onClick={handleVote} disabled={vote.isPending}>
      {vote.isPending ? 'Vote en cours...' : '👍 Voter'}
    </button>
  );
}
```

##### S'inscrire à un Événement

```typescript
'use client';

import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';

export function EventRegistrationForm({ eventId }: { eventId: string }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    comments: '',
  });

  const utils = trpc.useUtils();
  const register = trpc.events.register.useMutation({
    onSuccess: () => {
      alert('Inscription réussie !');
      utils.events.list.invalidate();
    },
    onError: (error) => {
      alert(`Erreur: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate({
      eventId,
      ...formData,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
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
        type="text"
        value={formData.company}
        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
        placeholder="Société (optionnel)"
      />
      <input
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        placeholder="Téléphone (optionnel)"
      />
      <textarea
        value={formData.comments}
        onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
        placeholder="Commentaires (optionnel)"
      />
      <button type="submit" disabled={register.isPending}>
        {register.isPending ? 'Inscription...' : "S'inscrire"}
      </button>
    </form>
  );
}
```

##### Gérer les Membres (Admin)

```typescript
'use client';

import { trpc } from '@/lib/trpc/client';

export function MembersManagement() {
  const { data: members, isLoading } = trpc.members.list.useQuery({
    status: 'active',
  });

  const utils = trpc.useUtils();
  const createMember = trpc.members.create.useMutation({
    onSuccess: () => {
      utils.members.list.invalidate();
    },
  });

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div>
      <h2>Membres actifs ({members?.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Société</th>
            <th>Score d'engagement</th>
          </tr>
        </thead>
        <tbody>
          {members?.map((member) => (
            <tr key={member.id}>
              <td>{member.firstName} {member.lastName}</td>
              <td>{member.email}</td>
              <td>{member.company}</td>
              <td>{member.engagementScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Guide d'Intégration

### Prérequis

- Node.js 20+
- TypeScript 5.6+
- Accès à la base de données PostgreSQL
- Compte Authentik configuré (pour l'authentification)

### Installation

```bash
# Cloner le repository
git clone https://github.com/your-org/cjd80.git
cd cjd80

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos configurations
nano .env
```

### Configuration

#### Variables d'Environnement

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Session
SESSION_SECRET=your-strong-secret-key

# Authentik OAuth2
AUTHENTIK_BASE_URL=http://localhost:9002
AUTHENTIK_CLIENT_ID=your-client-id
AUTHENTIK_CLIENT_SECRET=your-client-secret
AUTHENTIK_ISSUER=http://localhost:9002/application/o/cjd80/
AUTHENTIK_REDIRECT_URI=http://localhost:5000/api/auth/authentik/callback
AUTHENTIK_TOKEN=your-authentik-api-token

# MinIO (optionnel)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# CORS
CORS_ORIGIN=http://localhost:3000
```

#### Démarrage des Services Docker

```bash
# Démarrer PostgreSQL, Redis, Authentik
docker compose -f docker-compose.services.yml up -d
```

#### Initialisation de la Base de Données

```bash
# Pousser le schéma vers la database
npm run db:push
```

#### Démarrage de l'Application

```bash
# Développement (Next.js + NestJS)
npm run dev

# Next.js seul (port 3000)
npm run dev:next

# NestJS seul (port 5000)
npm run dev:nest
```

### Setup Client tRPC

Pour intégrer tRPC dans votre application Next.js:

1. **Créer le client tRPC**

```typescript
// lib/trpc/client.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/src/trpc/routers';

export const trpc = createTRPCReact<AppRouter>();
```

2. **Wrapper Provider**

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import superjson from 'superjson';
import { trpc } from '@/lib/trpc/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

3. **Intégrer dans le Layout**

```typescript
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### Error Handling

#### Frontend (tRPC)

```typescript
const createIdea = trpc.ideas.create.useMutation({
  onSuccess: (data) => {
    console.log('Idée créée:', data);
  },
  onError: (error) => {
    console.error('Erreur:', error.message);
    // Afficher un toast d'erreur
    toast.error(error.message);
  },
});
```

#### Backend (NestJS)

```typescript
@Post()
async createIdea(@Body() dto: CreateIdeaDto) {
  try {
    return await this.ideasService.createIdea(dto);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new ConflictException('Cette idée existe déjà');
    }
    throw new InternalServerErrorException('Erreur lors de la création');
  }
}
```

### Best Practices

1. **Type Safety**: Toujours utiliser les types générés par tRPC
2. **Error Handling**: Gérer les erreurs à tous les niveaux
3. **Loading States**: Afficher des indicateurs de chargement
4. **Optimistic Updates**: Mettre à jour l'UI avant la confirmation serveur
5. **Cache Invalidation**: Invalider le cache après les mutations
6. **Pagination**: Utiliser la pagination pour les grandes listes
7. **Debouncing**: Debounce les recherches et requêtes fréquentes

---

## Troubleshooting

### Erreurs Communes

#### "UNAUTHORIZED" sur tRPC

**Cause**: Session expirée ou utilisateur non connecté

**Solution**:
```typescript
// Vérifier le statut de session
const { data: user } = trpc.auth.getCurrentUser.useQuery();

if (!user) {
  // Rediriger vers login
  router.push('/api/auth/login');
}
```

#### "Module not found" après migration

**Cause**: Imports non mis à jour

**Solution**:
- Vérifier les alias dans `tsconfig.json`
- Utiliser `@/` pour les imports depuis la racine
- Redémarrer le serveur TypeScript

#### Database connection timeout

**Cause**: PostgreSQL non démarré ou mauvaise configuration

**Solution**:
```bash
# Vérifier que PostgreSQL est démarré
docker compose -f docker-compose.services.yml ps

# Vérifier DATABASE_URL dans .env
echo $DATABASE_URL

# Tester la connexion
npm run db:connect
```

#### tRPC batch request failed

**Cause**: Problème de réseau ou serveur backend down

**Solution**:
- Vérifier que le backend NestJS est démarré sur le bon port
- Vérifier l'URL dans le client tRPC (`/api/trpc`)
- Vérifier les logs du serveur

#### Authentik callback error

**Cause**: Configuration OAuth2 incorrecte

**Solution**:
1. Vérifier que l'application existe dans Authentik
2. Vérifier le callback URL: `http://localhost:5000/api/auth/authentik/callback`
3. Vérifier CLIENT_ID et CLIENT_SECRET
4. Vérifier que l'utilisateur existe et est assigné à l'application

#### Session not persisting

**Cause**: Configuration cookie ou session store

**Solution**:
```typescript
// Vérifier la config session dans main.ts
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
  },
  store: new PostgresStore({
    pool: dbPool,
    tableName: 'session',
  }),
};
```

#### File upload fails

**Cause**: MinIO non configuré ou limites de taille

**Solution**:
```bash
# Démarrer MinIO
docker compose -f docker-compose.services.yml up -d minio

# Vérifier les variables d'environnement
echo $MINIO_ENDPOINT
echo $MINIO_ACCESS_KEY

# Vérifier la limite de taille (NestJS)
app.useBodyParser('json', { limit: '50mb' });
app.useBodyParser('urlencoded', { limit: '50mb', extended: true });
```

### Logs et Debugging

#### Backend Logs

```bash
# Logs en temps réel
npm run dev:nest

# Logs Docker
docker compose -f docker-compose.services.yml logs -f authentik-server
```

#### Frontend Logs

```bash
# Logs Next.js
npm run dev:next

# Logs dans le navigateur
# Ouvrir DevTools > Console
```

#### Database Logs

```bash
# Se connecter à la DB
npm run db:connect

# Voir les requêtes actives
SELECT * FROM pg_stat_activity WHERE state = 'active';

# Voir les locks
SELECT * FROM pg_locks;
```

### Performance Issues

#### Slow queries

```bash
# Monitorer les connexions DB
npm run db:monitor

# Voir les stats
npm run db:stats
```

#### Large response times

- Activer la pagination sur les listes
- Utiliser des indexes sur les colonnes fréquemment requêtées
- Implémenter du caching avec Redis

---

## Support

Pour toute question ou problème:

- **Documentation**: `/docs/`
- **Issues GitHub**: https://github.com/your-org/cjd80/issues
- **Email**: support@cjd80.rbw.ovh

---

**Dernière mise à jour**: 22 janvier 2026
**Version**: 2.0.0
