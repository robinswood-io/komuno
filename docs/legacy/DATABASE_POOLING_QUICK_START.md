# Database Pool - Quick Start Guide

## Pour les développeurs

### 1. Utiliser les profils de timeout

```typescript
import { runDbQuery } from '../../db';
import { suggestTimeout } from '../../utils/database-config.utils';

// ✅ Simple query (2s timeout, pas de retry)
const count = await runDbQuery(
  async () => db.select().from(users).limit(1),
  'quick'
);

// ✅ Standard query (5s timeout, avec retry)
const user = await runDbQuery(
  async () => db.select().from(users).where(eq(users.id, id)),
  'normal'
);

// ✅ Complex query (10s timeout, avec retry)
const result = await runDbQuery(
  async () => db.insert(transactions).values(data).returning(),
  'complex'
);

// ✅ Adaptive timeout (ajusté selon charge du pool)
const timeout = suggestTimeout('normal');
await db.query.with({ timeout });
```

### 2. Monitoring le pool

```typescript
import {
  checkPoolHealth,
  getPoolSummary,
  getPoolMetrics,
  getPoolUtilizationPercent,
} from '../../utils/database-config.utils';

// Vérifier la santé du pool (log les alertes automatiquement)
const alert = checkPoolHealth();
if (alert && alert.severity === 'critical') {
  // Prendre une action
}

// Résumé formaté
console.log(getPoolSummary());
// Output: "Pool 3/5 (60%) | 1 idle, 0 waiting"

// Métriques détaillées
logger.info('Pool stats', getPoolMetrics());
// Output: { total: 5, active: 3, idle: 1, waiting: 0, ... }

// Pourcentage d'utilisation
const utilization = getPoolUtilizationPercent();
if (utilization > 70) {
  // Alerter les opérations
}
```

### 3. Endpoints de santé

```bash
# Vérifier pool status (public)
curl http://localhost:5000/api/health/db

# Détails complets (authentifié)
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/health/detailed

# Statut complet de tous les services
curl http://localhost:5000/api/status/all
```

### 4. Configuration par environnement

```bash
# Development (défaut: min 2, max 5)
NODE_ENV=development npm run start

# Production (défaut: min 5, max 20)
NODE_ENV=production npm run start

# Testing (défaut: min 1, max 2)
NODE_ENV=testing npm run test
```

### 5. Déboguer en Development

```bash
# Activer les logs détaillés du pool
NODE_ENV=development DEBUG=* npm run start

# Logs automatiques:
# - Connexion/fermeture du pool
# - Erreurs du pool
# - Stats du pool (toutes les 30s)
# - Queries (premiers 100 chars)
```

---

## Pour les DevOps

### Health Check Integration

```yaml
# kubernetes/deployment.yml
spec:
  containers:
    - name: api
      livenessProbe:
        httpGet:
          path: /api/health/live
          port: 5000
        initialDelaySeconds: 10
        periodSeconds: 10

      readinessProbe:
        httpGet:
          path: /api/health/ready
          port: 5000
        initialDelaySeconds: 5
        periodSeconds: 5
```

### Monitoring

```bash
# Vérifier l'état du pool
while true; do
  curl -s http://localhost:5000/api/health/detailed | \
    jq '.database.pool'
  sleep 10
done

# Alerter si utilisation > 70%
curl -s http://localhost:5000/api/health/detailed | \
  jq '.database.pool.utilization.percent' | \
  awk '{if ($1 > 70) print "WARNING: Pool at " $1 "%"}'
```

### Scaling Decision

**Scale si**:
- Pool utilization > 70% pendant plus de 5 minutes
- Requêtes en attente (waiting > 0)
- Connection timeouts dans les logs

**Configuration pour haute charge**:
```bash
export DATABASE_POOL_MIN=10
export DATABASE_POOL_MAX=30
export DATABASE_CONNECTION_TIMEOUT=30000
```

---

## Troubleshooting Rapide

### Symptôme: Connection timeout errors

```bash
# 1. Vérifier le pool
curl http://localhost:5000/api/health/detailed

# 2. Si pool critical:
export DATABASE_POOL_MAX=30  # Augmenter max
docker restart <container>

# 3. Vérifier les logs
docker logs <container> | grep -i "timeout\|pool"
```

### Symptôme: High memory usage

```bash
# 1. Limiter les requêtes (ajouter LIMIT)
# 2. Réduire le cache TTL
# 3. Scaler horizontalement
```

### Symptôme: Slow queries

```bash
# Lister les queries lentes en PostgreSQL
psql -d cjd80 -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  WHERE mean_exec_time > 5000
  ORDER BY mean_exec_time DESC
  LIMIT 10;"

# Optimiser avec EXPLAIN
EXPLAIN ANALYZE SELECT * FROM ... WHERE ...
```

---

## Files de Référence

- Configuration: `/server/src/config/database.config.ts`
- Résilience: `/server/lib/db-resilience.ts`
- Pool: `/server/db.ts`
- Health: `/server/src/health/health.service.ts`
- Utilitaires: `/server/utils/database-config.utils.ts`
- Documentation complète: `/docs/DATABASE_POOLING.md`

---

## Support

Pour plus de détails, voir `/docs/DATABASE_POOLING.md`
