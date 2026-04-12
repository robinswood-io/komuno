# Guide de Déploiement Production - CJD80

## 📋 Vue d'ensemble

Ce guide décrit le processus de déploiement robuste et sécurisé de l'application CJD80 en production.

## 🔒 Sécurité

### 1. Variables d'environnement

**Variables critiques à configurer:**

```bash
# Base de données (REQUIS)
DATABASE_URL=postgresql://user:password@host:5432/db

# Session (REQUIS - minimum 32 caractères)
SESSION_SECRET=<générer avec: openssl rand -base64 32>

# Authentik OAuth2 (REQUIS)
AUTHENTIK_BASE_URL=https://authentik.example.com
AUTHENTIK_CLIENT_ID=<client-id-from-authentik>
AUTHENTIK_CLIENT_SECRET=<client-secret-from-authentik>
AUTHENTIK_REDIRECT_URI=https://cjd80.fr/api/auth/authentik/callback
AUTHENTIK_TOKEN=<api-token-from-authentik>

# MinIO (RECOMMANDÉ)
MINIO_ENDPOINT=minio.example.com
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=<access-key>
MINIO_SECRET_KEY=<secret-key>

# Email SMTP (OPTIONNEL)
SMTP_HOST=ssl0.ovh.net
SMTP_PORT=465
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-password>

# VAPID pour notifications push (OPTIONNEL)
VAPID_PUBLIC_KEY=<générer avec: npx web-push generate-vapid-keys>
VAPID_PRIVATE_KEY=<private-key>
VAPID_SUBJECT=mailto:admin@cjd80.fr
```

### 2. Validation au démarrage

L'application valide automatiquement les variables d'environnement au démarrage:

- ✅ **Fail-fast**: Si des variables critiques sont manquantes ou invalides, l'application refuse de démarrer
- ✅ **Logging sécurisé**: Les URLs et secrets sont masqués dans les logs
- ✅ **Mode strict en production**: Validation plus stricte en `NODE_ENV=production`

### 3. Headers de sécurité HTTP

L'application configure automatiquement les headers de sécurité recommandés:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS) en production
- `Content-Security-Policy` (CSP)
- `Permissions-Policy`

## 🚀 Déploiement

### Prérequis

1. **Docker & Docker Compose** installés
2. **Traefik** configuré comme reverse proxy (réseau `proxy`)
3. **PostgreSQL** disponible (via Supabase ou autre)
4. **Fichier `.env`** configuré

### Déploiement automatique

```bash
# Méthode recommandée: script de déploiement robuste
./scripts/deploy-production.sh
```

Le script effectue automatiquement:

1. ✅ **Pre-flight checks**: Vérification des prérequis
2. 📦 **Backup**: Sauvegarde automatique de la base de données
3. 📥 **Pull/Build**: Récupération ou build de l'image Docker
4. 🏥 **Health check**: Vérification de l'application actuelle
5. 🛑 **Graceful shutdown**: Arrêt propre de l'ancienne version
6. 🚀 **Démarrage**: Lancement de la nouvelle version
7. ⏳ **Attente**: Attente que l'application soit ready
8. 🧪 **Smoke tests**: Tests de base
9. 🧹 **Nettoyage**: Suppression des images obsolètes
10. 📊 **Logs**: Affichage des logs

### Déploiement manuel

```bash
# 1. Build de l'image
docker build -f Dockerfile.optimized -t cjd80:latest \
  --build-arg GIT_TAG="$(git describe --tags --always)" \
  .

# 2. Backup de la base de données
docker exec postgres pg_dumpall -U postgres > backup.sql

# 3. Arrêt gracieux de l'ancienne version
docker compose -f docker-compose.prod.yml stop -t 30

# 4. Démarrage de la nouvelle version
docker compose -f docker-compose.prod.yml up -d

# 5. Vérifier le démarrage
docker compose -f docker-compose.prod.yml logs -f cjd-app
```

## 🏥 Health Checks & Monitoring

### Endpoints de santé

| Endpoint | Description | Usage |
|----------|-------------|-------|
| `/api/health` | Health check global | Monitoring externe |
| `/api/health/ready` | Readiness probe | Kubernetes/Docker |
| `/api/health/live` | Liveness probe | Kubernetes/Docker |
| `/api/health/db` | Santé de la base de données | Debug |
| `/api/health/detailed` | Santé détaillée (admin only) | Debug |
| `/api/version` | Version déployée | Info |

### Configuration Docker

```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "-q", "http://localhost:5000/api/health/ready"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 60s
```

### Monitoring Traefik

Traefik effectue automatiquement des health checks:

```yaml
labels:
  - "traefik.http.services.cjd80.loadbalancer.healthcheck.path=/api/health/ready"
  - "traefik.http.services.cjd80.loadbalancer.healthcheck.interval=30s"
  - "traefik.http.services.cjd80.loadbalancer.healthcheck.timeout=5s"
```

### Logs structurés

L'application utilise Winston pour des logs structurés JSON:

```bash
# Consulter les logs
docker compose logs -f cjd-app

# Logs avec timestamps
docker compose logs -f --tail=100 cjd-app

# Filtrer les erreurs
docker compose logs cjd-app | grep -i error
```

## 🔄 Graceful Shutdown

L'application gère proprement l'arrêt via les signaux système:

- **SIGTERM**: Arrêt gracieux (30s max)
- **SIGINT**: Arrêt gracieux (Ctrl+C)

Processus d'arrêt:

1. Marquer l'application comme "not ready" (health checks échouent)
2. Attendre la fin des requêtes en cours (max 10s)
3. Fermer l'application NestJS
4. Fermer le pool PostgreSQL
5. Exit propre (code 0)

```bash
# Arrêt gracieux manuel
docker compose stop -t 30 cjd-app

# Redémarrage gracieux
docker compose restart -t 30 cjd-app
```

## 🐛 Dépannage

### L'application ne démarre pas

1. Vérifier les logs:
   ```bash
   docker compose logs cjd-app
   ```

2. Vérifier les variables d'environnement:
   ```bash
   docker compose config
   ```

3. Tester la connectivité DB:
   ```bash
   docker exec cjd-app wget -q -O- http://localhost:5000/api/health/db
   ```

### Health check échoue

1. Vérifier que l'application est démarrée:
   ```bash
   docker ps | grep cjd-app
   ```

2. Tester manuellement le health check:
   ```bash
   curl http://localhost:5000/api/health/ready
   ```

3. Consulter les logs détaillés:
   ```bash
   docker compose logs --tail=50 cjd-app
   ```

### Rollback en cas de problème

```bash
# 1. Arrêter la nouvelle version
docker compose -f docker-compose.prod.yml down

# 2. Restaurer le backup de la DB (si nécessaire)
docker exec -i postgres psql -U postgres < backup.sql

# 3. Redémarrer l'ancienne version
docker compose -f docker-compose.prod.yml up -d
```

## 📊 Métriques & Alertes

### Métriques à surveiller

- **Health checks**: Taux de succès des `/api/health/ready`
- **Response time**: Temps de réponse moyen
- **Error rate**: Taux d'erreurs 5xx
- **Memory usage**: Utilisation mémoire du container
- **Database connections**: Nombre de connexions actives

### Configuration recommandée

Utiliser un système de monitoring type:

- **Prometheus** + **Grafana** pour les métriques
- **Loki** pour les logs
- **Alertmanager** pour les alertes

Exemple de dashboard Grafana:
- Health check status
- Request rate & latency
- Error rate
- Database connection pool
- Memory & CPU usage

## 🔐 Bonnes pratiques de sécurité

### 1. Secrets

- ❌ Ne JAMAIS committer le fichier `.env`
- ✅ Utiliser des secrets forts générés aléatoirement
- ✅ Rotation régulière des secrets (tous les 90 jours)
- ✅ Utiliser un gestionnaire de secrets (Vault, Doppler, etc.)

### 2. Mises à jour

- ✅ Mettre à jour régulièrement les dépendances npm
- ✅ Utiliser `npm audit` pour détecter les vulnérabilités
- ✅ Surveiller les CVE des images Docker de base

### 3. Backup

- ✅ Backup quotidien automatique de la base de données
- ✅ Tester régulièrement la restauration
- ✅ Conserver au moins 10 backups (rotating)

### 4. Monitoring

- ✅ Alertes sur les health checks échoués
- ✅ Alertes sur les erreurs 5xx
- ✅ Alertes sur l'utilisation mémoire excessive
- ✅ Logs centralisés et indexés

## 📚 Ressources

- [Documentation NestJS](https://docs.nestjs.com/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [12 Factor App](https://12factor.net/)
