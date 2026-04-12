# Configuration du Monitoring - CJD80

## 📊 Vue d'ensemble

Ce guide décrit comment configurer un système de monitoring complet pour l'application CJD80.

## 🏥 Health Checks

### Endpoints disponibles

```bash
# Health check global (public)
curl http://localhost:5000/api/health

# Readiness probe (Kubernetes/Docker)
curl http://localhost:5000/api/health/ready

# Liveness probe (Kubernetes/Docker)
curl http://localhost:5000/api/health/live

# Database health (public)
curl http://localhost:5000/api/health/db

# Detailed health (admin only - requires authentication)
curl http://localhost:5000/api/health/detailed

# Version info (public)
curl http://localhost:5000/api/version

# All status checks (public)
curl http://localhost:5000/api/status/all
```

### Réponses

**Health check successful:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-28T15:55:40.123Z",
  "uptime": 1234.567,
  "version": "1.0.0",
  "environment": "production",
  "database": {
    "connected": true,
    "responseTime": "5ms"
  }
}
```

**Readiness probe successful:**
```json
{
  "status": "ready",
  "timestamp": "2025-11-28T15:55:40.123Z",
  "database": {
    "name": "Database",
    "status": "healthy",
    "message": "Connected (5ms)",
    "responseTime": 5
  }
}
```

## 📈 Prometheus Metrics

### Configuration recommandée

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'cjd80-app'
    scrape_interval: 30s
    static_configs:
      - targets: ['cjd-app:5000']
    metrics_path: '/api/metrics'  # À implémenter si besoin
```

### Métriques à collecter

1. **Application**
   - `http_requests_total` - Total des requêtes HTTP
   - `http_request_duration_seconds` - Durée des requêtes
   - `http_errors_total` - Total des erreurs

2. **Base de données**
   - `db_connections_active` - Connexions actives
   - `db_connections_idle` - Connexions idle
   - `db_connections_waiting` - Connexions en attente
   - `db_query_duration_seconds` - Durée des requêtes DB

3. **Système**
   - `nodejs_heap_size_total_bytes` - Mémoire heap totale
   - `nodejs_heap_size_used_bytes` - Mémoire heap utilisée
   - `process_cpu_seconds_total` - CPU utilisé

## 📊 Grafana Dashboards

### Dashboard principal

```json
{
  "dashboard": {
    "title": "CJD80 Application",
    "panels": [
      {
        "title": "Health Status",
        "targets": [
          {
            "expr": "up{job=\"cjd80-app\"}"
          }
        ]
      },
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_errors_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time P95",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "db_connections_active"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes * 100"
          }
        ]
      }
    ]
  }
}
```

## 🚨 Alertes Prometheus

### Configuration des alertes

```yaml
# alerts.yml
groups:
  - name: cjd80-alerts
    interval: 30s
    rules:
      # Application down
      - alert: ApplicationDown
        expr: up{job="cjd80-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "CJD80 application is down"
          description: "Application {{ $labels.instance }} has been down for more than 1 minute."
      
      # Health check failing
      - alert: HealthCheckFailing
        expr: probe_success{job="cjd80-health"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Health check is failing"
          description: "Health check has been failing for more than 2 minutes."
      
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)."
      
      # Slow response time
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time detected"
          description: "P95 response time is {{ $value }}s (threshold: 1s)."
      
      # High memory usage
      - alert: HighMemoryUsage
        expr: (nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value | humanizePercentage }} (threshold: 90%)."
      
      # Database connection pool exhausted
      - alert: DatabasePoolExhausted
        expr: db_connections_waiting > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool exhausted"
          description: "{{ $value }} connections are waiting (threshold: 5)."
```

## 📝 Logs avec Loki

### Configuration Promtail

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
        filters:
          - name: label
            values: ["service=cjd-app"]
    
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'
```

### Requêtes Loki utiles

```logql
# Tous les logs de l'application
{container="cjd-app"}

# Erreurs uniquement
{container="cjd-app"} |= "error" or "ERROR"

# Logs d'authentification
{container="cjd-app"} |= "Auth"

# Performances de base de données
{container="cjd-app"} |= "[DB"

# Requêtes lentes (> 100ms)
{container="cjd-app"} | json | duration > 100

# Taux d'erreurs par minute
rate({container="cjd-app"} |= "error" [1m])
```

## 🔔 Notifications Alertmanager

### Configuration

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'team-emails'
  routes:
    - match:
        severity: critical
      receiver: 'team-pager'
      continue: true
    - match:
        severity: warning
      receiver: 'team-emails'

receivers:
  - name: 'team-emails'
    email_configs:
      - to: 'admin@cjd80.fr'
        from: 'alerts@cjd80.fr'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alerts@cjd80.fr'
        auth_password: 'password'
        headers:
          Subject: '🚨 [{{ .Status }}] {{ .CommonLabels.alertname }}'
  
  - name: 'team-pager'
    webhook_configs:
      - url: 'https://your-pagerduty-url.com/webhook'
```

## 📱 Monitoring avec Uptime Robot

### Configuration recommandée

1. **HTTP Monitor**
   - URL: `https://cjd80.fr/api/health`
   - Interval: 5 minutes
   - HTTP Method: GET
   - Expected Status Code: 200

2. **Keyword Monitor**
   - URL: `https://cjd80.fr/api/health`
   - Interval: 5 minutes
   - Keyword: `"status":"healthy"`

3. **Response Time Monitor**
   - URL: `https://cjd80.fr/api/health`
   - Interval: 5 minutes
   - Alert if > 2000ms

## 🔍 APM (Application Performance Monitoring)

### Options recommandées

1. **Sentry** (Error tracking)
   ```typescript
   import * as Sentry from '@sentry/node';
   
   Sentry.init({
     dsn: 'your-sentry-dsn',
     environment: process.env.NODE_ENV,
   });
   ```

2. **New Relic** (Full APM)
   ```bash
   npm install newrelic
   ```

3. **Datadog** (Full observability)
   ```bash
   DD_AGENT_HOST=datadog-agent npm start
   ```

## 📊 Tableau de bord recommandé

### Vue d'ensemble

| Métrique | Seuil Normal | Seuil Warning | Seuil Critical |
|----------|--------------|---------------|----------------|
| Health Check | UP | - | DOWN > 1min |
| Response Time (P95) | < 500ms | > 1s | > 2s |
| Error Rate | < 1% | > 5% | > 10% |
| Memory Usage | < 70% | > 90% | > 95% |
| CPU Usage | < 70% | > 90% | > 95% |
| DB Connections | < 50 | > 80 | > 95 |
| Disk Usage | < 70% | > 85% | > 95% |

## 🛠️ Outils de debug

### Commandes utiles

```bash
# Voir les métriques en temps réel
watch -n 1 'curl -s http://localhost:5000/api/health | jq'

# Surveiller les logs
docker compose logs -f --tail=100 cjd-app

# Voir l'utilisation des ressources
docker stats cjd-app

# Inspecter le container
docker inspect cjd-app

# Exécuter des commandes dans le container
docker exec -it cjd-app sh
```

### Debug des performances

```bash
# Profiling Node.js
node --inspect dist/main.js

# Heap snapshot
kill -USR2 $(pgrep -f "node.*dist/main.js")

# CPU profiling
node --prof dist/main.js
```

## 📚 Ressources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
