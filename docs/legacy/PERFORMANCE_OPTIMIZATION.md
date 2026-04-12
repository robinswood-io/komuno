# Guide d'Optimisation des Performances

**Date:** 2025-01-30  
**Application:** CJD Amiens - NestJS

## Vue d'ensemble

Ce document décrit les optimisations de performance déjà en place et les recommandations pour améliorer davantage les performances de l'application.

## Optimisations Actuelles ✅

### 1. Pool de Connexions Base de Données

**Configuration actuelle:**
```typescript
// server/src/common/database/database.providers.ts
max: 20,           // Maximum 20 connexions
min: 2,            // Minimum 2 connexions
idleTimeoutMillis: 60000,  // 60 secondes
connectionTimeoutMillis: 3000,  // 3 secondes
```

**Avantages:**
- Réutilisation des connexions
- Limite la surcharge de la base de données
- Gestion automatique du pool

### 2. Monitoring de Performance

**DbMonitoringInterceptor:**
- Détection automatique des requêtes lentes (> 1 seconde)
- Logging des statistiques du pool en développement
- Monitoring en temps réel

**Health Checks:**
- Vérification de la santé de la base de données
- Monitoring de la mémoire
- Vérification MinIO

### 3. Rate Limiting

**Configuration:**
```typescript
// server/src/app.module.ts
ThrottlerModule.forRoot([
  {
    ttl: 60000,    // 1 minute
    limit: 100,    // 100 requêtes par minute
  },
])
```

**Avantages:**
- Protection contre les abus
- Limitation de la charge
- Prévention des attaques DDoS

### 4. Cache Utilisateur

**AuthService:**
- Cache en mémoire pour les utilisateurs (5 minutes TTL)
- Réduction des requêtes DB répétées
- Nettoyage automatique du cache

## Recommandations d'Amélioration

### 1. Lazy Loading des Modules

**Actuellement:** Tous les modules sont chargés au démarrage

**Optimisation:**
```typescript
// Pour les modules peu utilisés
@Module({
  // ...
})
export class SomeModule {
  static forRoot(): DynamicModule {
    return {
      module: SomeModule,
      // ...
    };
  }
}
```

**Bénéfice:** Réduction du temps de démarrage

### 2. Cache Redis pour Sessions

**Actuellement:** Sessions en mémoire ou PostgreSQL

**Optimisation:**
- Utiliser Redis pour les sessions (déjà disponible via Docker)
- Amélioration des performances
- Partage de sessions entre instances

**Implémentation:**
```typescript
// Dans AuthModule
import { RedisStore } from 'connect-redis';
import Redis from 'ioredis';

const redisClient = new Redis(process.env.REDIS_URL);
const redisStore = new RedisStore({ client: redisClient });
```

### 3. Compression des Réponses

**Optimisation:**
```typescript
// Dans main.ts
import compression from 'compression';

app.use(compression());
```

**Bénéfice:** Réduction de la bande passante

### 4. Cache HTTP pour Assets Statiques

**Optimisation:**
```typescript
// Headers de cache pour assets statiques
app.useStaticAssets(join(__dirname, '..', 'public'), {
  maxAge: '1y',
  immutable: true,
});
```

### 5. Pagination Optimisée

**Recommandation:**
- Utiliser des cursors au lieu d'offset/limit pour grandes tables
- Index sur les colonnes de tri
- Limiter le nombre de résultats par défaut

### 6. Requêtes Optimisées

**Bonnes pratiques:**
- Utiliser `select()` pour limiter les colonnes récupérées
- Éviter les N+1 queries avec des relations Drizzle
- Utiliser des transactions pour opérations multiples

**Exemple:**
```typescript
// Au lieu de
const ideas = await db.select().from(ideas);

// Utiliser
const ideas = await db
  .select({ id: ideas.id, title: ideas.title })
  .from(ideas)
  .limit(20);
```

### 7. Background Jobs

**Pour les tâches longues:**
- Utiliser `@nestjs/schedule` (déjà configuré)
- Déplacer les tâches lourdes en background
- Utiliser des queues (BullMQ avec Redis)

### 8. Monitoring Avancé

**Recommandations:**
- Intégrer APM (Application Performance Monitoring)
- Métriques Prometheus
- Logging structuré avec corrélation

## Métriques à Surveiller

### Base de Données
- Temps de réponse moyen des requêtes
- Taux d'utilisation du pool
- Nombre de connexions actives
- Requêtes lentes (> 1 seconde)

### Application
- Temps de réponse des endpoints
- Utilisation mémoire
- CPU usage
- Taux d'erreur

### Infrastructure
- Latence réseau
- Disponibilité des services
- Health checks

## Commandes de Monitoring

```bash
# Vérifier les stats du pool DB
curl http://localhost:5000/api/health/detailed

# Vérifier l'état général
curl http://localhost:5000/api/health

# Monitoring Docker
docker stats

# Logs de l'application
tail -f logs/*.log
```

## Checklist d'Optimisation

### Court Terme
- [ ] Activer compression
- [ ] Configurer cache HTTP pour assets
- [ ] Optimiser les requêtes fréquentes
- [ ] Ajouter index sur colonnes de recherche

### Moyen Terme
- [ ] Migrer sessions vers Redis
- [ ] Implémenter lazy loading pour modules optionnels
- [ ] Ajouter cache pour données fréquemment accédées
- [ ] Optimiser les requêtes avec select()

### Long Terme
- [ ] Implémenter APM
- [ ] Mettre en place queues pour tâches lourdes
- [ ] Optimiser avec cursors pour pagination
- [ ] Monitoring avancé avec métriques

## Outils Recommandés

1. **APM:** New Relic, Datadog, ou Elastic APM
2. **Monitoring:** Prometheus + Grafana
3. **Logging:** Winston (déjà en place) + ELK Stack
4. **Profiling:** clinic.js, 0x

## Conclusion

L'application a déjà plusieurs optimisations en place. Les recommandations ci-dessus permettront d'améliorer davantage les performances, surtout sous charge.

**Priorité:** Compression et cache HTTP sont les plus rapides à implémenter avec le meilleur ROI.

