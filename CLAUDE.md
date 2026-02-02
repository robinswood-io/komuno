# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CJD Amiens "Boîte à Kiffs" - Modern internal web application for collaborative idea management, event organization with HelloAsso integration, and comprehensive administration interface.

**Tech Stack:**
- **Backend:** NestJS 11 (migrated from Express.js) + TypeScript + Drizzle ORM
- **Frontend:** Next.js 15 App Router + React 19 + TypeScript + tRPC + TanStack Query
- **Database:** PostgreSQL (Neon) with connection pooling
- **Auth:** @robinswood/auth-unified (Local auth + JWT + RBAC)
- **Storage:** MinIO (S3-compatible)
- **UI:** Tailwind CSS + shadcn/ui with semantic color system
- **PWA:** Service workers, offline queue, push notifications

**Key Features:**
- Collaborative idea management with voting system
- Event management with HelloAsso integration
- CRM for members and sponsors
- Customizable branding system (17 configurable colors)
- Progressive Web App with native-like features
- OAuth2/OIDC authentication via Authentik

## Important Architecture Patterns

### NestJS Migration Status

The backend has been **migrated from Express.js to NestJS** (January 2025). Key points:

- **11 modules** organized by feature (auth, ideas, events, admin, members, patrons, loans, financial, tracking, chatbot, branding)
- **Dependency injection** throughout - use constructor-based DI
- **Main entry:** `server/src/main.ts` bootstraps the NestJS app
- **App module:** `server/src/app.module.ts` imports all feature modules
- **Controllers** handle HTTP requests, **Services** contain business logic
- **Guards** for authentication (`AuthGuard`) and permissions (`PermissionGuard`)
- **Interceptors** for logging and DB monitoring (global)
- **Filters** for exception handling (global `HttpExceptionFilter`)

**Module Structure Pattern:**
```
server/src/{feature}/
├── {feature}.module.ts       # Feature module
├── {feature}.controller.ts   # HTTP endpoints
└── {feature}.service.ts      # Business logic
```

### Authentication (@robinswood/auth-unified)

Authentication is handled by **@robinswood/auth-unified** package:

- **Package:** `@robinswood/auth@3.1.4` from https://verdaccio.robinswood.io/
- **Strategies:** Local (email/password with bcrypt) + Dev Login (development bypass)
- **Session Store:** PostgreSQL (connect-pg-simple)
- **Password Reset:** Email-based token flow
- **RBAC:** Role-based permissions (super_admin, ideas_manager, etc.)

**Dev Mode:**
- `ENABLE_DEV_LOGIN=true` + `NODE_ENV=development` → Password bypass
- Auto-disabled in production

**Production:**
- Standard email/password authentication
- Secure password hashing (bcrypt)
- Session-based with secure cookies

**Critical Files:**
- `server/src/auth/auth.module.ts` - Passport configuration
- `server/src/auth/auth.controller.ts` - Local auth routes
- `server/src/auth/strategies/local.strategy.ts` - Local strategy

### Database Architecture

**Drizzle ORM** with PostgreSQL:
- **Schema:** `shared/schema.ts` - Single source of truth for DB schema + Zod validation
- **Tables:** admins, ideas, votes, events, inscriptions, members, patrons, loan_items, budgets, expenses, tracking_items
- **Connection:** `server/src/common/database/database.providers.ts` provides injectable `DB` token
- **Migrations:** Run `npm run db:push` to sync schema changes

**Key Patterns:**
- Use Drizzle query builders, not raw SQL
- Validation schemas derived from table schemas via `createInsertSchema()`
- Indexes on frequently queried columns (status, email, dates)
- Cascade deletes for referential integrity

### Shared Types and Validation

The `shared/` directory contains types used by **both frontend and backend**:
- `shared/schema.ts` - Drizzle tables, Zod schemas, TypeScript types
- `shared/errors.ts` - Custom error types

**Pattern:** When adding a new feature:
1. Define table in `shared/schema.ts`
2. Export insert/select schemas (Zod)
3. Run `npm run db:push` to apply changes
4. Use types in both backend (controllers/services) and frontend (components/hooks)

### Frontend Architecture (Next.js 15)

**Next.js 15 App Router** with tRPC:
- **Structure:** `app/` directory for pages and routes
- **Server Components:** Default rendering mode (faster, SEO-friendly)
- **Client Components:** Use `"use client"` directive when needed (interactivity, hooks)
- **tRPC integration:** Type-safe API calls with full TypeScript inference
- **TanStack Query:** Server state management via tRPC React Query

**Example Pattern:**
```typescript
// Server Component (app/page.tsx)
export default async function HomePage() {
  // Can fetch data directly in Server Component
  return <IdeasSection />;
}

// Client Component (components/ideas/ideas-section.tsx)
"use client";

export function IdeasSection() {
  // Use tRPC hooks
  const { data: ideas, isLoading } = trpc.ideas.list.useQuery();
  const createIdea = trpc.ideas.create.useMutation();

  return <div>...</div>;
}
```

### Branding System

**Centralized configuration** for multi-tenant-ready customization:
- **Core config:** `lib/config/branding-core.ts` - All text, colors, logos (JS object)
- **Next.js config:** `lib/config/branding.ts` - Extends core with Next.js public asset paths
- **Generation script:** `npm run generate:config` creates static config files (if needed)
- **Admin interface:** `/admin/branding` route allows SUPER_ADMIN to modify branding
- **Semantic colors:** 17 configurable colors (success, warning, error, info families) in global CSS
- **Helper functions:** `lib/config/branding.ts` for accessing branding values

**Pattern:** Use semantic color classes (`bg-success`, `text-error`) instead of hardcoded Tailwind colors.

## Common Development Commands

### Development

```bash
# Start full dev environment (Docker services + DB migration + dev servers)
npm run start:dev

# Start frontend + backend (Next.js on :3000 + NestJS on :5000)
npm run dev

# Start Next.js only
npm run dev:next

# Start NestJS backend only
npm run dev:nest

# Type checking
npm run check
```

### Database

```bash
# Push schema changes to database
npm run db:push

# Connect to database (psql)
npm run db:connect

# Monitor database connections
npm run db:monitor

# View DB statistics
npm run db:stats
```

### Docker Services

```bash
# Start services (PostgreSQL, Redis, MinIO)
docker compose -f docker-compose.services.yml up -d postgres redis minio

# Stop services
docker compose -f docker-compose.services.yml down

# View logs
docker compose -f docker-compose.services.yml logs -f postgres
```

### Environment Setup

```bash
# Reset entire environment (WARNING: deletes all data)
npm run reset:env

# Clean all caches
npm run clean:all
```

### Building and Deployment

```bash
# Build for production (Next.js build + backend compilation)
npm run build

# Start production server (Next.js + NestJS)
npm start

# Validate application health
npm run validate

# Generate branding config files (if needed for legacy PWA)
npm run generate:config
```

### Testing and Validation

```bash
# Playwright E2E tests
npm run test:playwright

# Analyze test results
npm run test:analyze

# Check dependencies
npm run check:deps

# Validate environment variables
npm run validate:env

# Complete health check
npm run health:check
```

### GitHub Operations

```bash
# Authenticate with GitHub CLI
npm run gh:auth

# Create PR
npm run gh:pr

# Deploy via GitHub Actions
npm run gh:deploy

# View GitHub Actions status
npm run gh:actions
```

### SSH and Remote Operations

```bash
# Setup SSH access to remote server
npm run ssh:setup

# Connect to remote server
npm run ssh:connect

# Mount remote filesystem locally
npm run ssh:mount

# Sync files to remote server
npm run ssh:sync
```

## Critical Development Patterns

### Creating a New NestJS Module

1. **Generate with NestJS CLI:**
   ```bash
   npx nest generate module features/my-feature --no-spec
   npx nest generate controller features/my-feature --no-spec
   npx nest generate service features/my-feature --no-spec
   ```

2. **Define schema in `shared/schema.ts`:**
   ```typescript
   export const myFeatures = pgTable("my_features", {
     id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
     title: text("title").notNull(),
     createdAt: timestamp("created_at").defaultNow().notNull()
   });

   export const insertMyFeatureSchema = createInsertSchema(myFeatures);
   ```

3. **Create service with DB injection:**
   ```typescript
   @Injectable()
   export class MyFeatureService {
     constructor(@Inject('DB') private db: Database) {}

     async findAll() {
       return this.db.query.myFeatures.findMany();
     }
   }
   ```

4. **Create controller with guards:**
   ```typescript
   @Controller('api/my-features')
   export class MyFeatureController {
     constructor(private myFeatureService: MyFeatureService) {}

     @Get()
     @UseGuards(AuthGuard)  // Require authentication
     async findAll() {
       return this.myFeatureService.findAll();
     }
   }
   ```

5. **Import module in `app.module.ts`**

### Adding a Database Table

1. **Define in `shared/schema.ts`** with Drizzle schema
2. **Add indexes** for frequently queried columns
3. **Create Zod validation schemas** using `createInsertSchema()`
4. **Run `npm run db:push`** to apply changes
5. **Update TypeScript types** (auto-inferred from schema)

### Authentication and Authorization

**Pattern for protected routes:**
```typescript
@Controller('api/admin/features')
@UseGuards(AuthGuard)  // Session-based auth
export class AdminFeatureController {
  @Get()
  @Permissions('super_admin', 'ideas_manager')  // Role-based permissions
  @UseGuards(PermissionGuard)
  async findAll() { ... }
}
```

**Getting current user:**
```typescript
@Get('profile')
@UseGuards(AuthGuard)
async getProfile(@User() user: Admin) {  // Use @User() decorator
  return user;
}
```

### Frontend Component Patterns (Next.js)

**Server Component (default):**
```typescript
// app/ideas/page.tsx
export default async function IdeasPage() {
  // Can fetch data directly in Server Component
  // No "use client" needed - SSR by default
  return (
    <div>
      <IdeasList />
    </div>
  );
}
```

**Client Component (interactive):**
```typescript
// components/ideas/ideas-list.tsx
"use client";

export function IdeasList() {
  // 1. State hooks
  const [localState, setLocalState] = useState();

  // 2. tRPC data fetching
  const { data, isLoading } = trpc.ideas.list.useQuery();

  // 3. tRPC mutations
  const createIdea = trpc.ideas.create.useMutation({
    onSuccess: () => {
      // Auto-invalidate via tRPC
      utils.ideas.list.invalidate();
    }
  });

  // 4. Event handlers
  const handleSubmit = (data) => createIdea.mutate(data);

  // 5. Early returns for loading/error states
  if (isLoading) return <Spinner />;

  // 6. Render
  return <div>...</div>;
}
```

### Error Handling

**Backend (NestJS):**
- Throw standard HTTP exceptions: `throw new BadRequestException('message')`
- Use global exception filter (`HttpExceptionFilter`) for consistent error responses
- Log errors with structured logging: `logger.error('message', { context: { ... } })`

**Frontend (Next.js + tRPC):**
- Use tRPC's built-in error handling
- Display user-friendly error messages from `error.message`
- Use toast notifications for transient errors
- ErrorBoundary component catches React errors
- Server Components can throw errors for Next.js error boundaries

### PWA Service Worker

**Offline queue pattern:**
- Actions saved to IndexedDB when offline
- Auto-sync every hour or when online returns
- Banner shows offline status
- Located in `public/sw.js` and `public/sw-register.js` (legacy PWA)
- **Note:** Consider migrating to Next.js PWA plugin in the future

## Project-Specific Conventions

### File Naming

- **Backend:** `kebab-case.ts` for files, `PascalCase` for classes
- **Frontend (Next.js):**
  - `page.tsx` for routes (app directory)
  - `layout.tsx` for layouts
  - `kebab-case.tsx` for components (lowercase)
  - `PascalCase.tsx` for React components (when needed)
- **Shared:** `kebab-case.ts` for schemas and utilities

### Import Aliases

- `@/` → Project root (Next.js convention)
  - `@/app/` → Next.js pages
  - `@/components/` → React components
  - `@/lib/` → Utilities and helpers
  - `@/hooks/` → Custom React hooks
- `@shared/` → `shared/` (shared types/schemas)

### Semantic Colors

**Use semantic classes instead of hardcoded colors:**
- Success: `bg-success`, `text-success`, `border-success`
- Warning: `bg-warning`, `text-warning`, `border-warning`
- Error: `bg-error`, `text-error`, `border-error`
- Info: `bg-info`, `text-info`, `border-info`

**Each has dark/light variants:**
- Dark: `bg-success-dark`, `text-success-dark`
- Light: `bg-success-light`, `text-success-light`

### Status Constants

Always use constants from `shared/schema.ts`:
- **Ideas:** `IDEA_STATUS.PENDING`, `IDEA_STATUS.APPROVED`, etc.
- **Events:** `EVENT_STATUS.DRAFT`, `EVENT_STATUS.PUBLISHED`, etc.
- **Loans:** `LOAN_STATUS.AVAILABLE`, `LOAN_STATUS.BORROWED`, etc.
- **Admins:** `ADMIN_ROLES.SUPER_ADMIN`, `ADMIN_STATUS.ACTIVE`, etc.

## Environment Variables

**Required for development:**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/database

# Session
SESSION_SECRET=generate-strong-secret-key

# Authentication (optional in dev)
AUTH_MODE=local
ENABLE_DEV_LOGIN=true

# MinIO (optional)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

**Setup:**
1. Copy `.env.example` to `.env`
2. Start Docker services: `docker compose -f docker-compose.services.yml up -d postgres redis`
3. Run `npm run start:dev`

## Testing

**Playwright E2E tests:**
- Located in `tests/e2e/`
- Run with `npm run test:playwright`
- Reports in `tests/reports/`

**Manual testing checklist:**
1. Ideas CRUD and voting
2. Events CRUD and registration
3. Admin authentication via Authentik
4. Member/patron management
5. Loan items management
6. Financial dashboard
7. PWA offline mode

## Documentation

**Key documentation files:**
- `README.md` - Complete project documentation
- `docs/` - Organized technical documentation
- `docs/deployment/` - Deployment guides
- `docs/features/` - Feature documentation (e.g., `CUSTOMIZATION.md`)
- `docs/migration/` - Migration reports (NestJS, Authentik)
- `.cursor/rules/` - Extensive Cursor AI rules (100+ files)

## Common Issues and Solutions

**"Module not found" errors:**
- Check import aliases are configured in `tsconfig.json`
- Verify file exists at expected path
- Restart TypeScript server

**Database connection errors:**
- Ensure PostgreSQL container is running: `docker compose -f docker-compose.services.yml ps`
- Check `DATABASE_URL` format and credentials
- For Neon: use connection string from Neon dashboard

**Local authentication fails:**
- Verify PostgreSQL is running: `docker compose -f docker-compose.services.yml logs postgres`
- Check database connection string in `.env`
- Ensure user exists in `admins` table: `npm run db:connect`
- Check password is correct (use dev login in development: `ENABLE_DEV_LOGIN=true`)

**Build fails with heap out of memory:**
- Use production Dockerfile: `docker build -f Dockerfile.production .`
- Or build locally and deploy: `./scripts/build-and-copy-to-vps.sh`

**Service worker not updating:**
- Clear browser cache and service worker
- Check `deploy-info.json` has new timestamp
- Hard reload: Ctrl+Shift+R

## Key Files to Reference

**Architecture:**
- `server/src/main.ts` - Application bootstrap
- `server/src/app.module.ts` - Module imports and global config
- `shared/schema.ts` - Database schema and validation

**Authentication:**
- `server/src/auth/auth.module.ts` - Passport and session config
- `server/src/auth/auth.controller.ts` - Local auth routes
- `server/src/auth/strategies/local.strategy.ts` - Local strategy
- `server/src/auth/guards/auth.guard.ts` - Session auth guard

**Frontend (Next.js):**
- `app/layout.tsx` - Root layout with providers
- `app/page.tsx` - Home page
- `app/providers.tsx` - tRPC and TanStack Query setup
- `lib/trpc/client.ts` - tRPC client configuration
- `hooks/` - Custom React hooks
- `components/` - React components

**Configuration:**
- `lib/config/branding-core.ts` - Branding configuration
- `lib/config/branding.ts` - Next.js branding with assets
- `docker-compose.services.yml` - Docker services
- `.env.example` - Environment variable template

**Migration:**
- `MIGRATION_REPORT.md` - Complete Next.js migration report

**Scripts:**
- `scripts/start-dev.sh` - Automated dev environment setup
- `scripts/setup-authentik.sh` - Authentik configuration automation
- `scripts/build-and-copy-to-vps.sh` - VPS deployment with local build

---

## BMAD Deployment Verification (DoD)

**Definition of Done - Staging/Dev uniquement**

Avant de considérer une tâche terminée, vérifier:

- [ ] **TypeScript:** `npx tsc --noEmit` (exit 0)
- [ ] **Tests:** `npm test` (100% pass)
- [ ] **Container:** `docker ps | grep cjd80` (running, uptime > 30s)
- [ ] **Logs:** `docker logs cjd80 --tail 100 | grep -i error` (0 matches)
- [ ] **Browser:** Playwright test at `https://cjd80.rbw.ovh` (0 console errors)
- [ ] **Health check:** `curl https://cjd80.rbw.ovh/api/health` (200 OK)
- [ ] **PWA:** Service worker installé, offline ready

**IMPORTANT:** Ces vérifications valident le staging (.rbw.ovh).
Production = serveur distant via CI/CD.

## Deployment

### Dev/Staging (ce serveur)

```bash
cd /srv/workspace
docker compose -f docker-compose.apps.yml up -d cjd80
docker compose -f docker-compose.apps.yml logs -f cjd80
```

**URL Staging:** https://cjd80.rbw.ovh

### Production (CI/CD uniquement)

Déploiement production via:
- `/deploy-remote cjd80 production clients-vps`
- `/github-deploy` (GitHub Actions)

**Voir workflow complet:**
`/opt/ia-webdev/rulebook-ai/packs/robinswood-core/rules/bmad-mapping.md`

## Environment Distinctions

| Environment | Location | URLs | Stack |
|-------------|----------|------|-------|
| **Dev/Staging** | `/srv/workspace/` | `cjd80.rbw.ovh` | Next.js 15 + React 19 + NestJS |
| **Production** | Clients VPS | Production domain | Same stack, optimized build |

**Hot Reload:** 99% modifications sans restart Docker (bind mounts + Turbopack).
