# Bonnes Pratiques - CJD Amiens

**Date:** 2025-01-30  
**Guide des bonnes pratiques pour le développement**

## 🎯 Principes Fondamentaux

### 1. Qualité du Code

**Priorités (dans l'ordre):**
1. **Robustesse** - Résistance aux erreurs, gestion d'erreurs complète
2. **Maintenabilité** - Code clair, documenté, testé, évolutif
3. **Performance** - Optimisation continue, latence minimale

### 2. Architecture NestJS

**Règles:**
- ✅ Utiliser `asyncHandler` pour toutes les routes (pas de try-catch)
- ✅ Utiliser `logger` de `server/utils/logger.ts` (jamais `console.log`)
- ✅ Utiliser erreurs typées (`ValidationError`, `NotFoundError`, etc.)
- ✅ Valider avec Zod avant traitement
- ✅ Utiliser types depuis `@shared/schema.ts`

**Structure:**
```
server/src/
├── {module}/
│   ├── {module}.module.ts
│   ├── {module}.controller.ts
│   ├── {module}.service.ts
│   └── dto/ (optionnel)
```

### 3. Gestion des Erreurs

**Pattern recommandé:**
```typescript
// Dans un service
async method() {
  try {
    // Logique métier
  } catch (error) {
    logger.error('Context', { error });
    throw new NotFoundError('Message utilisateur');
  }
}

// Dans un controller (pas de try-catch, géré par HttpExceptionFilter)
@Get()
async handler() {
  return await this.service.method();
}
```

### 4. Validation des Données

**Toujours valider avec Zod:**
```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

@Post()
async create(@Body() body: unknown) {
  const validated = schema.parse(body);
  // Utiliser validated
}
```

### 5. Types et Interfaces

**Règles:**
- ❌ Ne jamais utiliser `any`
- ✅ Utiliser types depuis `@shared/schema.ts`
- ✅ Créer des DTOs pour les entrées/sorties complexes
- ✅ Utiliser `unknown` pour données non validées

## 🚀 Performance

### 1. Requêtes Base de Données

**Bonnes pratiques:**
- Utiliser `select()` pour limiter les colonnes
- Éviter les N+1 queries
- Utiliser des transactions pour opérations multiples
- Paginer les grandes listes

**Exemple:**
```typescript
// ❌ Mauvais
const ideas = await db.select().from(ideas);

// ✅ Bon
const ideas = await db
  .select({ id: ideas.id, title: ideas.title })
  .from(ideas)
  .limit(20)
  .offset((page - 1) * limit);
```

### 2. Cache

**Stratégies:**
- Cache utilisateur (déjà implémenté dans AuthService)
- Cache Redis pour sessions (recommandé)
- Cache HTTP pour assets statiques
- Cache application pour données fréquentes

### 3. Monitoring

**Outils disponibles:**
- `DbMonitoringInterceptor` - Monitoring DB automatique
- `LoggingInterceptor` - Logging structuré
- Health checks - `/api/health`, `/api/health/detailed`
- Scripts de monitoring - `npm run monitor`

## 🔐 Sécurité

### 1. Authentification

**Règles:**
- Toujours utiliser `@UseGuards(JwtAuthGuard, PermissionGuard)`
- Vérifier les permissions avec `@Permissions()`
- Ne jamais exposer de données sensibles dans les logs

### 2. Validation

**Toujours valider:**
- Inputs utilisateur (Zod)
- Paramètres d'URL
- Headers si nécessaire
- Fichiers uploadés

### 3. Logs

**Règles:**
- Ne jamais logger de mots de passe, tokens, secrets
- Utiliser `logger` (Winston) au lieu de `console.log`
- Sanitizer automatique dans `LoggingInterceptor`

## 📝 Développement

### 1. Workflow Quotidien

```bash
# 1. Démarrer
npm run start:dev

# 2. Valider
npm run validate

# 3. Tester
npm run test:startup
```

### 2. Avant Commit

```bash
# 1. Validation complète
npm run validate

# 2. Vérification TypeScript
npm run check

# 3. Health check
npm run health:check
```

### 3. Après Pull

```bash
# 1. Installer dépendances
npm install

# 2. Valider environnement
npm run validate:env

# 3. Vérifier dépendances
npm run check:deps
```

## 🧪 Tests

### 1. Tests Unitaires

**Structure:**
```typescript
describe('ServiceName', () => {
  it('should do something', async () => {
    // Test
  });
});
```

### 2. Tests E2E

**Utiliser Playwright:**
```bash
npm run test:playwright
```

### 3. Tests de Démarrage

```bash
npm run test:startup
```

## 📊 Monitoring et Debugging

### 1. Logs

**Niveaux:**
- `logger.error()` - Erreurs critiques
- `logger.warn()` - Avertissements
- `logger.info()` - Informations générales
- `logger.debug()` - Debug (dev uniquement)

### 2. Health Checks

**Endpoints:**
- `/api/health` - Health général
- `/api/health/db` - Health base de données
- `/api/health/detailed` - Health détaillé avec métriques

### 3. Monitoring Continu

```bash
npm run monitor
```

## 🔄 Migration NestJS

### 1. Migrer une Route

**Étapes:**
1. Créer/ajouter au controller approprié
2. Créer/ajouter au service
3. Tester la route
4. Vérifier équivalence avec route legacy
5. Supprimer route legacy (après validation)

### 2. Patterns de Migration

**Controller:**
```typescript
@Controller('api/resource')
export class ResourceController {
  @Get()
  async getAll() {
    return await this.service.getAll();
  }
}
```

**Service:**
```typescript
@Injectable()
export class ResourceService {
  async getAll() {
    // Logique métier
  }
}
```

## 🛠️ Outils et Scripts

### Scripts Essentiels

```bash
# Démarrage
npm run start:dev

# Validation
npm run validate
npm run validate:env

# Tests
npm run test:startup
npm run health:check

# Monitoring
npm run monitor

# Analyse
npm run analyze:migration
npm run check:deps
```

### Commandes Utiles

```bash
# Vérifier services Docker
docker compose -f docker-compose.services.yml ps

# Logs application
tail -f logs/*.log

# Logs Docker
docker compose -f docker-compose.services.yml logs -f
```

## 📚 Ressources

### Documentation
- `README.md` - Documentation principale
- `docs/QUICK_START.md` - Démarrage rapide
- `docs/SCRIPTS_REFERENCE.md` - Référence scripts
- `docs/PERFORMANCE_OPTIMIZATION.md` - Performance

### Migration
- `docs/migration/NESTJS_FINALIZATION_GUIDE.md` - Guide finalisation
- `docs/migration/NESTJS_MIGRATION_STATUS.md` - État migration

## ⚠️ Pièges à Éviter

### 1. Ne Jamais
- ❌ Utiliser `console.log` dans le code serveur
- ❌ Créer des `try-catch` dans les routes
- ❌ Lancer des erreurs génériques `throw new Error()`
- ❌ Exécuter SQL brut (toujours via Drizzle ORM)
- ❌ Utiliser `any` pour les types

### 2. Toujours
- ✅ Utiliser `logger` pour les logs
- ✅ Valider avec Zod
- ✅ Utiliser types depuis `@shared/schema.ts`
- ✅ Gérer les erreurs avec erreurs typées
- ✅ Tester avant de commiter

## 🎓 Apprentissages

### Leçons Clés
1. **Types stricts** améliorent la maintenabilité
2. **Validation continue** prévient les problèmes
3. **Scripts automatisés** réduisent les erreurs
4. **Documentation** facilite l'onboarding
5. **Monitoring** permet de détecter les problèmes tôt

## 🔮 Évolutions Futures

### Court Terme
- Finaliser migration NestJS
- Mettre à jour tests E2E
- Implémenter cache Redis

### Moyen Terme
- Migration NestJS v11
- APM et monitoring avancé
- Optimisations performance

### Long Terme
- Microservices si nécessaire
- Scaling horizontal
- Infrastructure as Code

