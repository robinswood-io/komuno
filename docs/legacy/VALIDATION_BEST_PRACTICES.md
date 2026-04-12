# Bonnes Pratiques - Validation et Types

## Règle d'Or : Une Seule Source de Vérité

L'objectif est d'éviter les doublons de validation et de documentation en définissant **une source unique** par type d'API.

**Problème courant** : Maintenir simultanément:
- class-validator (backend NestJS)
- Zod schemas (backend tRPC)
- Zod schemas (frontend)
- Documentation OpenAPI manuelle
- Types TypeScript manuels

**Solution Robinswood** : Chaque approche API a sa propre source de vérité et ses mécanismes de génération automatique.

---

## 1. Backend REST API (NestJS)

### Source de Vérité : class-validator

**Principe** : Les DTOs avec `class-validator` génèrent automatiquement OpenAPI.

### Exemple Correct

```typescript
// apps/backend/src/modules/ideas/dto/create-idea.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIdeaDto {
  @ApiProperty({
    description: 'Titre de l\'idée',
    example: 'Organiser un hackathon',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères' })
  title: string;

  @ApiProperty({
    description: 'Description détaillée',
    required: false,
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'La description ne peut pas dépasser 1000 caractères' })
  description?: string;

  @ApiProperty({
    enum: ['SUBMITTED', 'REVIEW', 'APPROVED', 'REJECTED'],
    default: 'SUBMITTED',
    description: 'Statut de l\'idée',
  })
  @IsEnum(['SUBMITTED', 'REVIEW', 'APPROVED', 'REJECTED'])
  @IsOptional()
  status?: string;
}
```

### Génération Automatique

1. **OpenAPI Spec** : Généré automatiquement depuis `@ApiProperty()`
2. **Swagger UI** : Interface interactive sur `/api/docs`
3. **Validation** : Automatique via `ValidationPipe` globale
4. **Types Client** : Générés via `openapi-generator` ou `swagger-typescript-api`

### Utilisation dans Controller

```typescript
// apps/backend/src/modules/ideas/ideas.controller.ts
import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateIdeaDto } from './dto/create-idea.dto';

@ApiTags('ideas')
@Controller('api/ideas')
export class IdeasController {
  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle idée' })
  @ApiResponse({ status: 201, description: 'Idée créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async create(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    createIdeaDto: CreateIdeaDto
  ) {
    return this.ideasService.create(createIdeaDto);
  }
}
```

### Avantages

- Une seule source de vérité (DTO)
- OpenAPI généré automatiquement
- Validation automatique des requêtes
- Types TypeScript intégrés
- Documentation Swagger UI interactive

### Anti-Patterns à Éviter

#### Maintenir OpenAPI manuel en parallèle

```typescript
// MAUVAIS : Créer un fichier openapi.json séparé manuellement
// Laisser NestJS générer OpenAPI depuis les DTOs
```

#### Dupliquer la validation en Zod

```typescript
// MAUVAIS : Ajouter un schema Zod pour la même API REST
const createIdeaDtoSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
});

// Utiliser UNIQUEMENT class-validator pour REST API
```

---

## 2. Backend tRPC

### Source de Vérité : Zod Schemas

**Principe** : Les schemas Zod génèrent automatiquement les types TypeScript et la validation.

### Exemple Correct

```typescript
// apps/backend/src/trpc/routers/ideas.router.ts
import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';

// Schema Zod partagé (source unique)
const createIdeaSchema = z.object({
  title: z.string()
    .min(1, 'Le titre est requis')
    .max(200, 'Le titre ne peut pas dépasser 200 caractères'),
  description: z.string()
    .max(1000, 'La description ne peut pas dépasser 1000 caractères')
    .optional(),
  status: z.enum(['SUBMITTED', 'REVIEW', 'APPROVED', 'REJECTED'])
    .default('SUBMITTED'),
});

const ideaIdSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

export const ideasRouter = router({
  // Créer une idée (public)
  create: publicProcedure
    .input(createIdeaSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.idea.create({
        data: {
          ...input,
          createdAt: new Date(),
        },
      });
    }),

  // Lister les idées (public)
  list: publicProcedure
    .input(z.object({
      status: z.enum(['SUBMITTED', 'REVIEW', 'APPROVED', 'REJECTED']).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { status, page, limit } = input;
      return ctx.prisma.idea.findMany({
        where: status ? { status } : undefined,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    }),

  // Obtenir une idée par ID (public)
  getById: publicProcedure
    .input(ideaIdSchema)
    .query(async ({ ctx, input }) => {
      return ctx.prisma.idea.findUnique({
        where: { id: input.id },
      });
    }),

  // Mettre à jour (protégé)
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(1000).optional(),
      status: z.enum(['SUBMITTED', 'REVIEW', 'APPROVED', 'REJECTED']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.idea.update({
        where: { id },
        data,
      });
    }),
});

// Types automatiquement inférés :
// type CreateIdeaInput = z.infer<typeof createIdeaSchema>
// Pas besoin de définir d'interface supplémentaire !
```

### Génération Automatique

1. **Types TypeScript** : Inférés automatiquement depuis Zod
2. **Hooks React** : `useMutation`, `useQuery` typés automatiquement
3. **Validation** : Automatique côté backend via Zod
4. **Erreurs** : Typées et propagées automatiquement

### Avantages

- Type-safety end-to-end sans configuration
- Pas de génération de code manuelle
- Pas de doublon validation/types
- Refactoring sûr (renommage détecté)
- Erreurs de type à la compilation

### Anti-Patterns à Éviter

#### Créer de la documentation OpenAPI pour tRPC

```typescript
// MAUVAIS : Générer OpenAPI depuis tRPC
// tRPC n'a PAS besoin d'OpenAPI !
// Les types sont déjà générés automatiquement

// Ne PAS créer :
// - scripts/generate-trpc-docs.ts
// - docs/trpc-api-documentation.json
// - TRPC_API_DOCUMENTATION.md
```

#### Redéfinir les types manuellement

```typescript
// MAUVAIS : Redéfinir des interfaces manuellement
interface CreateIdeaInput {
  title: string;
  description?: string;
  status?: string;
}

// Utiliser les types inférés de Zod :
type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
```

---

## 3. Frontend (Next.js)

### Principe : Zod UNIQUEMENT pour Validations Locales

Le frontend ne doit **jamais** redéfinir les contrats API. Les types viennent de tRPC ou du client généré OpenAPI.

### Usage Correct de Zod Frontend

#### Validations Formulaires (UX)

```typescript
// apps/frontend/src/components/ideas/IdeaForm.tsx
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trpc } from '@/lib/trpc/client';

// Validation UX avec contraintes supplémentaires
const ideaFormSchema = z.object({
  title: z.string()
    .min(3, 'Le titre doit contenir au moins 3 caractères')  // UX : min 3 (backend min 1)
    .max(200, 'Le titre ne peut pas dépasser 200 caractères'),
  description: z.string()
    .max(1000, 'La description ne peut pas dépasser 1000 caractères')
    .optional(),
});

export function IdeaForm() {
  const utils = trpc.useUtils();

  // Utilisation avec react-hook-form
  const form = useForm({
    resolver: zodResolver(ideaFormSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  // tRPC mutation (typage automatique)
  const createIdea = trpc.ideas.create.useMutation({
    onSuccess: () => {
      utils.ideas.list.invalidate();
      form.reset();
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    // Le type de data est inféré automatiquement depuis tRPC
    createIdea.mutate({
      ...data,
      status: 'SUBMITTED',
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <input {...form.register('title')} />
      {form.formState.errors.title && (
        <span>{form.formState.errors.title.message}</span>
      )}

      <textarea {...form.register('description')} />
      {form.formState.errors.description && (
        <span>{form.formState.errors.description.message}</span>
      )}

      <button type="submit" disabled={createIdea.isPending}>
        {createIdea.isPending ? 'Création...' : 'Créer l\'idée'}
      </button>
    </form>
  );
}
```

**Pourquoi c'est correct** :
- Les contraintes min/max sont purement UX (meilleure expérience utilisateur)
- Le backend valide le contrat (champs requis, types)
- Pas de duplication du contrat API
- Types inférés automatiquement depuis tRPC

#### Parsing Données Externes

```typescript
// apps/frontend/src/lib/parsers/webhook-parser.ts
import { z } from 'zod';

// Parser pour webhook HelloAsso
const helloAssoWebhookSchema = z.object({
  eventType: z.enum(['ORDER', 'PAYMENT', 'FORM']),
  data: z.object({
    amount: z.number().or(z.string().transform(str => parseFloat(str))),
    date: z.string().transform(str => new Date(str)),
    payer: z.object({
      email: z.string().email(),
      firstName: z.string(),
      lastName: z.string(),
    }),
  }),
});

export function parseHelloAssoWebhook(payload: unknown) {
  return helloAssoWebhookSchema.parse(payload);
}
```

#### Runtime Guards

```typescript
// apps/frontend/src/lib/guards/api-response.guard.ts
import { z } from 'zod';

// Vérifier données "unknown" à runtime
const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
  error: z.string().optional(),
});

export function validateApiResponse(response: unknown) {
  const result = apiResponseSchema.safeParse(response);

  if (!result.success) {
    console.error('Invalid API response', result.error);
    throw new Error('Réponse API invalide');
  }

  return result.data;
}
```

### Usages Incorrects de Zod Frontend

#### Redéfinir le Contrat API

```typescript
// MAUVAIS : Doublon du contrat tRPC
const createIdeaDtoSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['SUBMITTED', 'REVIEW', 'APPROVED', 'REJECTED']),
});

// Le backend tRPC a déjà ce schéma !
// Utiliser les types inférés de tRPC à la place :

import { type RouterInputs } from '@/lib/trpc/client';

type CreateIdeaInput = RouterInputs['ideas']['create'];
```

#### Duplication DTOs Backend

```typescript
// MAUVAIS : Redéfinir les DTOs NestJS
const createIdeaDto = z.object({
  title: z.string(),
  description: z.string().optional(),
});

// Utiliser le client généré depuis OpenAPI à la place !
import type { CreateIdeaDto } from '@/generated/api-client';
```

### Types Frontend Corrects

```typescript
// Types depuis tRPC (automatiques)
import { type RouterOutputs, type RouterInputs } from '@/lib/trpc/client';

// Type de sortie (ce que renvoie l'API)
type Idea = RouterOutputs['ideas']['list'][number];

// Type d'entrée (ce qu'attend l'API)
type CreateIdeaInput = RouterInputs['ideas']['create'];

// Utilisation dans un composant
export function IdeaCard({ idea }: { idea: Idea }) {
  return (
    <div>
      <h3>{idea.title}</h3>
      <p>{idea.description}</p>
    </div>
  );
}
```

```typescript
// Types depuis client OpenAPI (générés)
import type {
  CreateIdeaDto,
  IdeaResponseDto,
  UpdateIdeaDto
} from '@/generated/api-client';

// Utilisation dans une fonction API REST
export async function createIdeaRest(data: CreateIdeaDto): Promise<IdeaResponseDto> {
  const response = await fetch('/api/ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

---

## 4. Comparaison des Approches

| Critère | REST API (NestJS) | tRPC API | Frontend Zod |
|---------|-------------------|----------|--------------|
| **Source de vérité** | class-validator DTOs | Zod schemas | Validation UX uniquement |
| **Documentation** | OpenAPI généré | Types TypeScript natifs | N/A |
| **Génération types** | openapi-generator | Automatique tRPC | Inférés depuis API |
| **Validation** | ValidationPipe | Automatique Zod | react-hook-form + Zod |
| **Usage** | Intégrations externes | Communication interne | Formulaires, parsing |
| **Type-Safety** | Via génération | Natif end-to-end | Formulaires uniquement |
| **Doublon autorisé** | ❌ Non | ❌ Non | ✅ Oui (contraintes UX) |

---

## 5. Workflow de Développement

### Ajouter un Endpoint REST

1. Créer DTO avec `class-validator` + `@ApiProperty()`
   ```bash
   # apps/backend/src/modules/ideas/dto/create-idea.dto.ts
   ```

2. Créer controller avec décorateurs Swagger
   ```bash
   # apps/backend/src/modules/ideas/ideas.controller.ts
   ```

3. Tester dans Swagger UI
   ```
   http://localhost:5000/api/docs
   ```

4. Générer client TypeScript (si besoin)
   ```bash
   npm run generate:api-client
   ```

5. Documenter dans `API_COMPLETE_DOCUMENTATION.md`

### Ajouter une Procédure tRPC

1. Créer schema Zod dans le router
   ```bash
   # apps/backend/src/trpc/routers/ideas.router.ts
   ```

2. Définir procedure (query/mutation/subscription)
   ```typescript
   export const ideasRouter = router({
     create: publicProcedure
       .input(createIdeaSchema)
       .mutation(async ({ ctx, input }) => { ... }),
   });
   ```

3. Utiliser directement dans le frontend via hooks
   ```typescript
   const create = trpc.ideas.create.useMutation();
   ```

4. Les types sont automatiquement disponibles
   ```typescript
   type CreateInput = RouterInputs['ideas']['create'];
   ```

5. Pas de documentation OpenAPI nécessaire

### Ajouter un Formulaire Frontend

1. Créer schema Zod avec contraintes UX
   ```typescript
   const formSchema = z.object({
     title: z.string()
       .min(3, 'Minimum 3 caractères')  // UX
       .max(200, 'Maximum 200 caractères'),
   });
   ```

2. Utiliser avec `react-hook-form` + `zodResolver`
   ```typescript
   const form = useForm({
     resolver: zodResolver(formSchema),
   });
   ```

3. Ne PAS redéfinir le contrat API
   ```typescript
   // Utiliser les types inférés de tRPC
   type CreateInput = RouterInputs['ideas']['create'];
   ```

4. Appeler l'API avec les types automatiques
   ```typescript
   const create = trpc.ideas.create.useMutation();
   create.mutate(data);
   ```

---

## 6. Règles Anti-Doublon

### Bonnes Pratiques

1. **Une seule source de validation par API**
   - REST → `class-validator` (DTOs)
   - tRPC → `Zod` (schemas)
   - Frontend → `Zod` (UX uniquement)

2. **Pas de documentation manuelle**
   - REST → OpenAPI généré automatiquement
   - tRPC → Types TypeScript natifs
   - Frontend → Types inférés depuis API

3. **Frontend utilise les types générés**
   - tRPC → Types inférés automatiquement
   - REST → Client généré depuis OpenAPI
   - Pas de redéfinition manuelle

4. **Zod frontend = UX uniquement**
   - Contraintes longueur min/max
   - Messages d'erreur localisés
   - Transformations UI
   - Parsing données externes

### Anti-Patterns

1. ❌ Créer OpenAPI pour tRPC
   - tRPC génère déjà les types automatiquement
   - OpenAPI pour tRPC = doublon inutile

2. ❌ Maintenir class-validator + Zod pour même API
   - Choisir une approche : REST ou tRPC
   - Pas les deux pour le même endpoint

3. ❌ Redéfinir DTOs backend dans frontend
   - Utiliser types inférés (tRPC)
   - Ou client généré (OpenAPI)

4. ❌ Documentation OpenAPI manuelle
   - Laisser NestJS générer OpenAPI
   - Maintenir uniquement les décorateurs

5. ❌ Types manuels quand ils peuvent être inférés
   - tRPC infère automatiquement les types
   - Utiliser `RouterInputs` et `RouterOutputs`

---

## 7. Exemples Complets

### Exemple 1: Feature REST API

```typescript
// 1. DTO (apps/backend/src/modules/events/dto/create-event.dto.ts)
import { IsString, IsNotEmpty, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ description: 'Titre de l\'événement' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Date de l\'événement' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'CANCELLED'] })
  @IsEnum(['DRAFT', 'PUBLISHED', 'CANCELLED'])
  status: string;
}

// 2. Controller (apps/backend/src/modules/events/events.controller.ts)
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('events')
@Controller('api/events')
export class EventsController {
  @Post()
  @ApiOperation({ summary: 'Créer un événement' })
  async create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }
}

// 3. Frontend (apps/frontend/src/lib/api/events.ts)
import type { CreateEventDto, EventResponseDto } from '@/generated/api-client';

export async function createEvent(data: CreateEventDto): Promise<EventResponseDto> {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

### Exemple 2: Feature tRPC

```typescript
// 1. Router tRPC (apps/backend/src/trpc/routers/events.router.ts)
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

const createEventSchema = z.object({
  title: z.string().min(1),
  date: z.string().datetime(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']),
});

export const eventsRouter = router({
  create: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.event.create({ data: input });
    }),
});

// 2. Frontend (apps/frontend/src/components/events/CreateEventForm.tsx)
'use client';

import { trpc, type RouterInputs } from '@/lib/trpc/client';

export function CreateEventForm() {
  const create = trpc.events.create.useMutation();

  // Type automatiquement inféré
  const handleSubmit = (data: RouterInputs['events']['create']) => {
    create.mutate(data);
  };

  return <form onSubmit={...}>...</form>;
}
```

### Exemple 3: Formulaire Frontend avec Zod UX

```typescript
// apps/frontend/src/components/events/EventForm.tsx
'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trpc } from '@/lib/trpc/client';

// Validation UX uniquement (contraintes supplémentaires)
const eventFormSchema = z.object({
  title: z.string()
    .min(5, 'Le titre doit contenir au moins 5 caractères')  // UX: min 5 (backend min 1)
    .max(100, 'Le titre ne peut pas dépasser 100 caractères'),
  date: z.string().refine(
    (date) => new Date(date) > new Date(),
    'La date doit être dans le futur'  // Contrainte UX
  ),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']).default('DRAFT'),
});

export function EventForm() {
  const utils = trpc.useUtils();

  const form = useForm({
    resolver: zodResolver(eventFormSchema),
  });

  const create = trpc.events.create.useMutation({
    onSuccess: () => utils.events.list.invalidate(),
  });

  const onSubmit = form.handleSubmit((data) => {
    // Type automatiquement compatible avec tRPC
    create.mutate(data);
  });

  return (
    <form onSubmit={onSubmit}>
      <input {...form.register('title')} />
      {form.formState.errors.title && (
        <span>{form.formState.errors.title.message}</span>
      )}

      <input type="datetime-local" {...form.register('date')} />
      {form.formState.errors.date && (
        <span>{form.formState.errors.date.message}</span>
      )}

      <select {...form.register('status')}>
        <option value="DRAFT">Brouillon</option>
        <option value="PUBLISHED">Publié</option>
        <option value="CANCELLED">Annulé</option>
      </select>

      <button type="submit" disabled={create.isPending}>
        {create.isPending ? 'Création...' : 'Créer'}
      </button>
    </form>
  );
}
```

---

## 8. Checklist de Validation

Avant de commit du code impliquant validation/types:

### Backend REST API

- [ ] DTOs utilisent `class-validator` + `@ApiProperty()`
- [ ] Controllers ont décorateurs Swagger (`@ApiTags`, `@ApiOperation`)
- [ ] Aucun schema Zod pour mêmes endpoints REST
- [ ] OpenAPI généré automatiquement (pas de fichier manuel)
- [ ] ValidationPipe globale activée

### Backend tRPC

- [ ] Schemas Zod définis dans routers
- [ ] Types inférés via `z.infer<typeof schema>`
- [ ] Aucune documentation OpenAPI pour tRPC
- [ ] Aucun script de génération OpenAPI pour tRPC
- [ ] Pas de types manuels (utiliser inférence)

### Frontend

- [ ] Zod utilisé UNIQUEMENT pour UX (formulaires, parsing externe)
- [ ] Pas de redéfinition du contrat API
- [ ] Types depuis `RouterInputs`/`RouterOutputs` (tRPC)
- [ ] Ou types depuis client généré OpenAPI (REST)
- [ ] react-hook-form avec `zodResolver` pour formulaires

---

## 9. Ressources

### Documentation

- [NestJS Validation](https://docs.nestjs.com/techniques/validation)
- [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [tRPC Documentation](https://trpc.io/docs)
- [Zod Documentation](https://zod.dev)
- [react-hook-form + Zod](https://react-hook-form.com/get-started#SchemaValidation)

### Outils

- Swagger UI : `http://localhost:5000/api/docs`
- tRPC Panel : Via hooks React directement
- OpenAPI Generator : `openapi-generator-cli`

### Fichiers du Projet

- `ARCHITECTURE_API.md` - Architecture complète
- `API_COMPLETE_DOCUMENTATION.md` - Référence API
- `API_README.md` - Guide de démarrage

---

## Conclusion

**Règle d'Or** : Éviter les doublons en définissant une source unique par type d'API.

- **REST API** : class-validator → OpenAPI généré
- **tRPC API** : Zod schemas → Types inférés (PAS d'OpenAPI)
- **Frontend** : Zod pour UX uniquement (pas de contrat API)

Cette approche garantit :
- Aucun doublon de validation
- Types toujours synchronisés
- Documentation générée automatiquement
- Maintenance simplifiée
- Refactoring sûr
