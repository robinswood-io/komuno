# API Quick Start Guide

Guide de démarrage rapide pour utiliser l'API CJD80.

---

## Installation Rapide

### Prérequis

- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Cloner et Installer

```bash
# Cloner le repository
git clone https://github.com/your-org/cjd80.git
cd cjd80

# Installer les dépendances
npm install
```

### 2. Configuration

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer avec vos configurations
nano .env
```

Configuration minimale requise:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cjd80
SESSION_SECRET=your-secret-key-here
AUTHENTIK_BASE_URL=http://localhost:9002
AUTHENTIK_CLIENT_ID=your-client-id
AUTHENTIK_CLIENT_SECRET=your-client-secret
```

### 3. Démarrer les Services

```bash
# Démarrer PostgreSQL, Redis, Authentik
docker compose -f docker-compose.services.yml up -d

# Attendre que les services soient prêts (30 secondes)
sleep 30

# Initialiser la base de données
npm run db:push
```

### 4. Lancer l'Application

```bash
# Démarrer Next.js (port 3000) + NestJS (port 5000)
npm run dev
```

Accéder à l'application:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **API Docs**: http://localhost:5000/api/docs

---

## Premier Appel API

### Avec tRPC (Recommandé)

#### 1. Setup Client (Next.js)

```typescript
// lib/trpc/client.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/src/trpc/routers';

export const trpc = createTRPCReact<AppRouter>();
```

#### 2. Provider dans Layout

```typescript
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

#### 3. Utiliser dans un Composant

```typescript
// app/page.tsx
'use client';

import { trpc } from '@/lib/trpc/client';

export default function HomePage() {
  // Query - Récupérer des données
  const { data: ideas, isLoading } = trpc.ideas.list.useQuery({
    page: 1,
    limit: 10,
  });

  // Mutation - Modifier des données
  const createIdea = trpc.ideas.create.useMutation();

  const handleCreate = () => {
    createIdea.mutate({
      title: 'Ma première idée',
      description: 'Description de mon idée',
      proposedBy: 'John Doe',
      proposedByEmail: 'john@example.com',
    });
  };

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div>
      <h1>Idées ({ideas?.total})</h1>
      <button onClick={handleCreate}>Créer une idée</button>
      <ul>
        {ideas?.ideas.map((idea) => (
          <li key={idea.id}>{idea.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Avec REST API (Fetch)

```typescript
// Récupérer les idées
const response = await fetch('http://localhost:5000/api/ideas');
const ideas = await response.json();

// Créer une idée
const response = await fetch('http://localhost:5000/api/ideas', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important pour les sessions
  body: JSON.stringify({
    title: 'Ma première idée',
    description: 'Description',
    proposedBy: 'John Doe',
    proposedByEmail: 'john@example.com',
  }),
});
const newIdea = await response.json();
```

### Avec cURL

```bash
# Récupérer les idées
curl http://localhost:5000/api/ideas

# Créer une idée
curl -X POST http://localhost:5000/api/ideas \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Ma première idée",
    "description": "Description",
    "proposedBy": "John Doe",
    "proposedByEmail": "john@example.com"
  }'

# Voter pour une idée
curl -X POST http://localhost:5000/api/ideas/123e4567-e89b-12d3-a456-426614174000/vote \
  -H "Content-Type: application/json" \
  -d '{
    "voterName": "Jane Doe",
    "voterEmail": "jane@example.com"
  }'
```

---

## Exemples Basiques

### 1. Lister les Idées

**tRPC:**
```typescript
const { data } = trpc.ideas.list.useQuery({ page: 1, limit: 20 });
```

**REST:**
```bash
GET /api/ideas?page=1&limit=20
```

**Réponse:**
```json
{
  "ideas": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Organiser un hackathon",
      "description": "Un hackathon pour les jeunes dirigeants",
      "proposedBy": "John Doe",
      "proposedByEmail": "john@example.com",
      "status": "pending",
      "featured": false,
      "createdAt": "2026-01-22T10:00:00Z",
      "updatedAt": "2026-01-22T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### 2. Créer une Idée

**tRPC:**
```typescript
const createIdea = trpc.ideas.create.useMutation();

createIdea.mutate({
  title: 'Mon idée',
  description: 'Description détaillée',
  proposedBy: 'John Doe',
  proposedByEmail: 'john@example.com',
});
```

**REST:**
```bash
POST /api/ideas
Content-Type: application/json

{
  "title": "Mon idée",
  "description": "Description détaillée",
  "proposedBy": "John Doe",
  "proposedByEmail": "john@example.com"
}
```

### 3. Voter pour une Idée

**tRPC:**
```typescript
const vote = trpc.ideas.vote.useMutation();

vote.mutate({
  ideaId: '123e4567-e89b-12d3-a456-426614174000',
  voterName: 'Jane Doe',
  voterEmail: 'jane@example.com',
});
```

**REST:**
```bash
POST /api/ideas/123e4567-e89b-12d3-a456-426614174000/vote
Content-Type: application/json

{
  "voterName": "Jane Doe",
  "voterEmail": "jane@example.com"
}
```

### 4. Lister les Événements

**tRPC:**
```typescript
const { data } = trpc.events.list.useQuery({ upcoming: true });
```

**REST:**
```bash
GET /api/events?upcoming=true
```

### 5. S'inscrire à un Événement

**tRPC:**
```typescript
const register = trpc.events.register.useMutation();

register.mutate({
  eventId: '123e4567-e89b-12d3-a456-426614174000',
  name: 'John Doe',
  email: 'john@example.com',
  company: 'Acme Corp',
  phone: '0612345678',
});
```

**REST:**
```bash
POST /api/events/123e4567-e89b-12d3-a456-426614174000/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Corp",
  "phone": "0612345678"
}
```

---

## Authentification

### Se Connecter

```typescript
// Rediriger vers la page de login Authentik
window.location.href = '/api/auth/login';

// Après connexion réussie, l'utilisateur est redirigé vers l'application
// La session est automatiquement créée
```

### Vérifier le Statut de Session

**tRPC:**
```typescript
const { data: user } = trpc.auth.getCurrentUser.useQuery();

if (user) {
  console.log('Connecté en tant que:', user.email);
} else {
  console.log('Non connecté');
}
```

**REST:**
```bash
GET /api/auth/status

# Réponse si connecté:
{
  "authenticated": true,
  "user": {
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ideas_manager"
  }
}

# Réponse si non connecté:
{
  "authenticated": false
}
```

### Se Déconnecter

```typescript
// Rediriger vers la déconnexion
window.location.href = '/api/auth/logout';
```

---

## Routes Protégées (Admin)

Certaines routes nécessitent des permissions admin.

### Exemple: Mettre à jour le Statut d'une Idée

**tRPC:**
```typescript
// Nécessite le rôle "ideas_manager" ou "super_admin"
const updateStatus = trpc.ideas.updateStatus.useMutation();

updateStatus.mutate({
  id: '123e4567-e89b-12d3-a456-426614174000',
  status: 'approved',
});
```

**REST:**
```bash
# Nécessite une session admin valide
PATCH /api/ideas/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json
Cookie: cjd80.session=...

{
  "status": "approved"
}
```

### Gestion des Erreurs 401/403

```typescript
const updateStatus = trpc.ideas.updateStatus.useMutation({
  onError: (error) => {
    if (error.data?.code === 'UNAUTHORIZED') {
      alert('Vous devez être connecté');
      window.location.href = '/api/auth/login';
    } else if (error.data?.code === 'FORBIDDEN') {
      alert('Vous n\'avez pas les permissions nécessaires');
    }
  },
});
```

---

## Liens Utiles

### Documentation

- **Documentation Complète**: [API_COMPLETE_DOCUMENTATION.md](./API_COMPLETE_DOCUMENTATION.md)
- **Changelog**: [API_CHANGELOG.md](./API_CHANGELOG.md)
- **Schémas JSON**: [api-schemas.json](./api-schemas.json)

### Outils

- **Swagger UI**: http://localhost:5000/api/docs
- **Postman Collection**: [CJD80_API.postman_collection.json](./CJD80_API.postman_collection.json)

### Ressources Externes

- **tRPC Documentation**: https://trpc.io
- **Next.js 15 Docs**: https://nextjs.org/docs
- **NestJS Docs**: https://nestjs.com
- **Drizzle ORM**: https://orm.drizzle.team

---

## Commandes Utiles

```bash
# Développement
npm run dev              # Démarrer frontend + backend
npm run dev:next         # Frontend seul (port 3000)
npm run dev:nest         # Backend seul (port 5000)

# Base de données
npm run db:push          # Synchroniser le schéma
npm run db:connect       # Se connecter à PostgreSQL
npm run db:monitor       # Monitorer les connexions
npm run db:stats         # Voir les statistiques

# Docker
docker compose -f docker-compose.services.yml up -d    # Démarrer services
docker compose -f docker-compose.services.yml down     # Arrêter services
docker compose -f docker-compose.services.yml logs -f  # Voir les logs

# Build & Deploy
npm run build            # Build production
npm start                # Démarrer en production
npm run validate         # Valider l'installation

# Tests
npm run test:playwright  # Tests E2E
npm run health:check     # Health check complet
```

---

## Troubleshooting Rapide

### Problème: "Cannot connect to database"

```bash
# Vérifier que PostgreSQL est démarré
docker compose -f docker-compose.services.yml ps

# Redémarrer si nécessaire
docker compose -f docker-compose.services.yml restart postgres
```

### Problème: "UNAUTHORIZED" sur tRPC

```typescript
// Vérifier si l'utilisateur est connecté
const { data: user } = trpc.auth.getCurrentUser.useQuery();

if (!user) {
  // Rediriger vers login
  window.location.href = '/api/auth/login';
}
```

### Problème: "Module not found"

```bash
# Vérifier les dépendances
npm install

# Nettoyer et reconstruire
npm run clean:all
npm install
npm run build
```

### Problème: Port déjà utilisé

```bash
# Trouver le processus utilisant le port 3000
lsof -i :3000

# Tuer le processus
kill -9 <PID>

# Ou utiliser un autre port
PORT=3001 npm run dev:next
```

---

## Prochaines Étapes

1. Explorer la [documentation complète](./API_COMPLETE_DOCUMENTATION.md)
2. Tester les endpoints avec [Postman](./CJD80_API.postman_collection.json)
3. Consulter le [changelog](./API_CHANGELOG.md) pour les dernières modifications
4. Rejoindre le channel de support sur Discord/Slack

---

**Besoin d'aide ?**

- Documentation: `/docs/`
- Issues: https://github.com/your-org/cjd80/issues
- Email: support@cjd80.rbw.ovh

---

**Dernière mise à jour**: 22 janvier 2026
