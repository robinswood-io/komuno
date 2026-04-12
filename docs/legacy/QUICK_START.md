# Guide de Démarrage Rapide - CJD Amiens

**Date:** 2025-11-30  
**Version:** Optimisée avec tsup

## Démarrage en 3 Étapes

### 1. Démarrer les Services Docker

```bash
docker compose -f docker-compose.services.yml up -d postgres redis authentik-server authentik-worker minio
```

### 2. Initialiser la Base de Données

```bash
npm run db:push
```

### 3. Démarrer l'Application

```bash
npm run dev
```

**L'application sera disponible sur:**
- **API Backend:** http://localhost:5001
- **Frontend (dev):** http://localhost:5173 (avec proxy vers API)

## Scripts Utiles

### Développement

```bash
# Démarrage complet (API + Frontend)
npm run dev

# API seule (tsup build + node)
npm run dev:api

# Frontend seul (Vite sur port 5173)
npm run dev:client

# Mode tsx (ancien, injection KO)
npm run dev:tsx
```

### Base de Données

```bash
# Pousser le schéma
npm run db:push

# Interface graphique
npx drizzle-kit studio
```

### Production

```bash
# Build complet
npm run build

# Démarrage production
npm start
```

## Vérification Rapide

### 1. Vérifier les Services Docker

```bash
docker compose -f docker-compose.services.yml ps
```

Tous les services doivent être "healthy" ou "running".

### 2. Vérifier la Connexion DB

```bash
curl http://localhost:5001/api/health/db
```

### 3. Vérifier l'Application

```bash
curl http://localhost:5001/api/health
```

## Configuration

### Variables d'Environnement Essentielles

```env
# Base de données (pour connexion depuis l'hôte)
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cjd80

# Session
SESSION_SECRET=your-secret-key-here

# Authentik (à configurer après démarrage)
AUTHENTIK_BASE_URL=http://localhost:9002
AUTHENTIK_CLIENT_ID=your-client-id
AUTHENTIK_CLIENT_SECRET=your-client-secret
```

### Ports Utilisés

- **5001** - API Backend NestJS
- **5173** - Frontend Vite (développement)
- **5433** - PostgreSQL (externe)
- **6381** - Redis (externe)
- **9000-9001** - MinIO
- **9002** - Authentik

## Dépannage

### Problème: Port 5001 occupé

```bash
# Vérifier ce qui utilise le port
lsof -i:5001
# Tuer le processus si nécessaire
kill -9 <PID>
```

### Problème: Connexion DB échoue

Vérifier que:
1. PostgreSQL est démarré: `docker compose -f docker-compose.services.yml ps`
2. DATABASE_URL utilise `localhost:5433` (pas `postgres:5432`)
3. Les credentials sont corrects

### Problème: Services Docker ne démarrent pas

```bash
# Vérifier les logs
docker compose -f docker-compose.services.yml logs

# Redémarrer
docker compose -f docker-compose.services.yml restart
```

## Prochaines Étapes

1. **Configurer Authentik** (première fois)
   - Accéder à http://localhost:9002
   - Créer l'application OAuth2/OIDC
   - Récupérer les identifiants

2. **Valider l'Application**
   ```bash
   npm run validate
   ```

3. **Consulter la Documentation**
   - `docs/OPTIMIZATION_REPORT.md` - Rapport d'optimisation
   - `docs/PERFORMANCE_OPTIMIZATION.md` - Guide performance
   - `docs/migration/NESTJS_FINALIZATION_GUIDE.md` - Finalisation migration

## Support

Pour plus d'informations:
- README.md - Documentation complète
- docs/ - Documentation détaillée
- scripts/ - Scripts d'automatisation

