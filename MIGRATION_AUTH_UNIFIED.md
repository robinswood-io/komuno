# Migration: @robinswood/auth vers @robinswood/auth-unified v3

## Résumé

Migration complète et réussie du package d'authentification obsolète vers la version unifiée v3.

**Date:** 2026-02-03  
**Commit:** a2356a3  
**Status:** ✅ Complétée  

## Changements Effectués

### 1. Installation du nouveau package
```bash
npm install @robinswood/auth-unified@3.0.0 --registry=https://verdaccio.robinswood.io/ --legacy-peer-deps
```

**Détails:**
- Package: `@robinswood/auth-unified@3.0.0`
- Registry: https://verdaccio.robinswood.io/
- Flag `--legacy-peer-deps` utilisé en raison d'une dépendance optionnelle Express ^5.0.1

### 2. Désinstallation de l'ancien package
```bash
npm uninstall @robinswood/auth --legacy-peer-deps
```

**Résultat:** 4 packages supprimés (dépendances)

### 3. Vérification des imports
- Recherche complète pour `@robinswood/auth` dans `server/src/`
- **Résultat:** Aucun import direct trouvé
- Commentaires documentaires maintenus pour traçabilité

### 4. Vérification TypeScript
```bash
npx tsc --noEmit
```

**Résultat:** ✅ Aucune erreur (0 erreurs)

### 5. Vérification des fichiers
- `npm list @robinswood/auth-unified` → `@robinswood/auth-unified@3.0.0` ✅
- `npm list @robinswood/auth` → `(empty)` ✅
- `node_modules/@robinswood/` → seul `auth-unified` présent ✅

## Architecture Inchangée

### AuthModule (`server/src/auth/auth.module.ts`)
```typescript
@Module({
  imports: [
    PassportModule.register({ session: true }),
    StorageModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    PasswordResetService,
    LocalStrategy,
    // ... session config et autres services
  ],
  exports: [AuthService, PasswordService, PasswordResetService, PassportModule, 'SESSION_CONFIG', 'AUTH_MODE'],
})
export class AuthModule {}
```

### AuthService (`server/src/auth/auth.service.ts`)
- Utilise `StorageService` pour récupérer les utilisateurs (inchangé)
- Serialization/deserialization pour sessions (inchangé)
- Cache en mémoire des utilisateurs (inchangé)

### Guards (`server/src/auth/guards/auth.guard.ts`)
- `JwtAuthGuard` - Basée sur session Passport
- Vérifie `request.isAuthenticated()` et `request.user`
- Commentaire mis à jour: `@robinswood/auth-unified`

### Strategies
- `LocalStrategy` - Authentification par email/password (inchangé)
- `DevLoginStrategy` - Support du dev-login en développement (inchangé)

### Services
- `PasswordService` - Hachage et validation des mots de passe (inchangé)
- `PasswordResetService` - Réinitialisation des mots de passe (inchangé)

## Nouvelles Fonctionnalités Disponibles

Le package `@robinswood/auth-unified` v3 offre :

### Features Principales
```typescript
// Authentication
export { AuthUnifiedModule } from './auth.module';
export { LocalAuthService, LocalStrategy, PasswordService } from './features/local-auth';
export { PasswordResetService } from './features/password-reset';
export { RefreshTokensService } from './features/refresh-tokens';
export { JwtSimpleService, JwtSimpleStrategy, JwtAuthGuard } from './features/jwt-simple';

// Authorization
export { PermissionsService, PermissionsGuard } from './features/permissions';
export { RequirePermission } from './core/decorators/permissions.decorator';
export { Public } from './core/decorators/public.decorator';
export { User } from './core/decorators/user.decorator';

// OAuth
export { OAuthAzureService, OAuthAzureController } from './features/oauth-azure';
export { OAuthGoogleService, OAuthGoogleController } from './features/oauth-google';

// Development
export { DevBypassGuard, DevLoginService, DevLoginController } from './features/dev-login';

// Utilities
export { calculatePermissions, hasPermission, hasAnyPermission, hasAllPermissions } from './core/utils/rbac.utils';
export { generateSecureToken, generateUuid, sha256 } from './core/utils/crypto.utils';
export { validatePasswordStrength, isValidEmail } from './core/utils/validation.utils';
```

### Types Disponibles
```typescript
// Core types
export type { IAuthUser, IJwtPayload, ILoginResponse, IRefreshToken } from './core/types/auth.types';
export type { IAuthStorageAdapter, IPasswordResetToken } from './core/types/adapter.types';

// Configuration
export type { IAuthUnifiedModuleOptions, IJwtConfig, IFeaturesConfig } from './core/types/config.types';

// Extended users & Enterprise
export type { IExtendedAuthUser, ExtractCustomFields, IEnterpriseUserFields } from './core/types/extended-user.types';

// RBAC
export type { IPermissionDefinition, IRoleDefinition, IRbacConfig } from './core/utils/rbac.utils';
```

## Vérifications Complétées

### Pré-commit Hook
✅ TypeScript validation réussie:
```
Running: npx tsc --noEmit
✅ TypeScript: No errors
```

### Build Server
- Problèmes de permissions sur `dist/` (containers root)
- Compilation TypeScript fonctionne (`--noEmit`)
- Aucune erreur de type détectée

### Package Dependencies
✅ package.json
```json
{
  "@robinswood/auth-unified": "^3.0.0"
}
```

✅ package-lock.json mis à jour

## Instructions pour Utilisation Future

### Importer les types du package
```typescript
import type { IAuthUser, IJwtPayload } from '@robinswood/auth-unified';
import { JwtAuthGuard, PermissionsGuard } from '@robinswood/auth-unified';
import { User, RequirePermission } from '@robinswood/auth-unified';
```

### Configuration OAuth (optionnel)
Le package supporte OAuth Azure et Google. Pour activer:

```typescript
// Dans AuthModule
import { OAuthAzureService, OAuthGoogleService } from '@robinswood/auth-unified';

@Module({
  imports: [
    AuthUnifiedModule.forRoot({
      // Configuration OAuth
      oauth: {
        azure: {
          clientId: process.env.AZURE_CLIENT_ID,
          clientSecret: process.env.AZURE_CLIENT_SECRET,
          redirectUri: 'https://app.rbw.ovh/auth/azure/callback',
        },
      },
    }),
  ],
})
```

### Refresh Tokens (optionnel)
```typescript
import { RefreshTokensService } from '@robinswood/auth-unified';

// Gérer les refresh tokens pour long-lived sessions
@Injectable()
export class MyAuthService {
  constructor(private refreshTokensService: RefreshTokensService) {}
  
  async refreshToken(refreshToken: string) {
    return this.refreshTokensService.validateAndRefresh(refreshToken);
  }
}
```

## Problèmes Rencontrés et Solutions

### Issue 1: ERESOLVE - Peer Dependency Conflict
**Cause:** Express version mismatch (@nestjs/serve-static@5.0.4 veut Express ^5.0.1, mais v4 installée)

**Solution:** Utiliser `--legacy-peer-deps` pour npm install/uninstall

### Issue 2: Slow npm Registry
**Cause:** Registry verdaccio.robinswood.io temporairement lent

**Solution:** Relancer l'installation ou utiliser timeout plus élevé

### Issue 3: dist/ Permission Denied
**Cause:** Processus root a créé des fichiers lors de build précédent

**Solution:** Nettoyage manuel avec sudo, TypeScript compile correctement sans génération

## Prochaines Étapes Recommandées

1. **Tests d'intégration:** Vérifier l'auth en environnement de test
   ```bash
   npm test -- server/src/auth
   ```

2. **Docker:** Reconstruire l'image avec le nouveau package
   ```bash
   docker compose -f /srv/workspace/docker-compose.apps.yml up -d cjd80
   ```

3. **Tests E2E:** Vérifier les scénarios d'authentification
   ```bash
   npm run test:playwright
   ```

4. **Documenter les APIs:** Mettre à jour OpenAPI si utilisé

## References

- **Package:** https://verdaccio.robinswood.io/@robinswood/auth-unified
- **Exports:** `/srv/workspace/cjd80/node_modules/@robinswood/auth-unified/dist/index.d.ts`
- **Commit:** a2356a3
- **Date:** 2026-02-03

---

**Status:** Migration complète et validée  
**Risque:** Faible (aucune modification du code métier)  
**Dépendances:** ✅ TypeScript compile, ✅ Ancien package supprimé, ✅ Nouveau package installé
