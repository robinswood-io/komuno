# Configuration Supabase Community Edition

## Vue d'ensemble

Ce document décrit la migration de Nhost vers Supabase Community Edition pour l'application CJD80.

## Architecture Supabase

Supabase Community Edition fournit :
- **PostgreSQL** : Base de données principale (avec PostgREST pour API REST automatique)
- **Storage** : Stockage objet S3-compatible (basé sur MinIO)
- **Auth** : Système d'authentification (non utilisé, on garde Microsoft OAuth)
- **Redis** : Cache optionnel pour les fonctions edge

## Services Migrés

### PostgreSQL
- **Nhost** : `nhost-postgres-prod:5432/nhost`
- **Supabase** : `supabase-db:5432/postgres`

### MinIO/Storage
- **Nhost** : `nhost-minio-prod:9000`
- **Supabase** : `supabase-storage:9000` (MinIO intégré)

### Redis
- **Nhost** : `nhost-redis-prod:6379`
- **Supabase** : `supabase-redis:6379` (optionnel)

## Configuration Docker Compose

Le fichier `docker-compose.supabase.yml` contient la stack complète Supabase :
- PostgreSQL 15
- MinIO (Storage)
- Redis (optionnel)
- PostgREST (API REST automatique)
- GoTrue (Auth - non utilisé)
- Realtime (WebSockets - optionnel)

## Migration des Données

### PostgreSQL
```bash
# 1. Dump depuis Nhost
docker compose -f /docker/cjd80/nhost/docker-compose.yml exec -T postgres pg_dump -U postgres nhost > nhost-dump.sql

# 2. Restauration vers Supabase
docker compose -f docker-compose.supabase.yml exec -T supabase-db psql -U postgres -d postgres < nhost-dump.sql
```

### MinIO/Storage
Les fichiers MinIO peuvent être migrés via l'API S3 ou en copiant les volumes Docker.

## Variables d'Environnement

Voir `config/shared-env.defaults` pour les variables Supabase.

## Scripts Disponibles

- `scripts/create-supabase-env.sh` : Créer le fichier .env Supabase
- `scripts/migrate-to-supabase.sh` : Migration complète depuis Nhost
- `scripts/backup-supabase.sh` : Backup PostgreSQL Supabase
- `scripts/restore-to-supabase.sh` : Restauration PostgreSQL Supabase

