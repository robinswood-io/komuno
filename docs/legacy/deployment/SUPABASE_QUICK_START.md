# Guide de Démarrage Rapide - Supabase Community Edition

## Vue d'ensemble

Ce guide explique comment migrer rapidement de Nhost vers Supabase Community Edition.

## Prérequis

- Docker et Docker Compose installés
- Accès SSH au serveur (141.94.31.162)
- Backup de la base de données Nhost

## Étapes Rapides

### 1. Créer la configuration Supabase

```bash
# Sur le serveur
cd /docker/cjd80
./scripts/create-supabase-env.sh
```

Cela crée :
- `/docker/cjd80/supabase/.env` : Variables d'environnement
- Configuration avec mots de passe générés automatiquement

### 2. Copier docker-compose.supabase.yml

```bash
# Depuis le repo local
scp docker-compose.supabase.yml user@141.94.31.162:/docker/cjd80/supabase/docker-compose.yml
```

### 3. Démarrer Supabase

```bash
# Sur le serveur
cd /docker/cjd80/supabase
docker compose up -d
```

Vérifier que tous les services sont démarrés :
```bash
docker compose ps
```

### 4. Migrer les données

```bash
# Migration complète automatique
cd /docker/cjd80
./scripts/migrate-to-supabase.sh
```

Ce script :
- Fait un backup de Nhost
- Démarre Supabase
- Restaure les données PostgreSQL
- Guide pour la migration MinIO

### 5. Mettre à jour l'application

Mettre à jour `.env` de l'application :

```bash
# Sur le serveur
cd /docker/cjd80
# Éditer .env
DATABASE_URL=postgresql://postgres:[password]@supabase-db-prod:5432/postgres
MINIO_ENDPOINT=supabase-storage-prod
```

### 6. Redémarrer l'application

```bash
docker compose restart cjd-app
```

### 7. Vérifier

```bash
# Health check
curl http://localhost:5000/api/health

# Vérifier les services Supabase
docker compose -f /docker/cjd80/supabase/docker-compose.yml ps
```

### 8. Arrêter Nhost (une fois validé)

```bash
docker compose -f /docker/cjd80/nhost/docker-compose.yml down
```

## Commandes Utiles

### Backup PostgreSQL

```bash
./scripts/backup-supabase.sh
```

### Restauration

```bash
./scripts/restore-to-supabase.sh [DUMP_FILE]
```

### Logs

```bash
# Logs PostgreSQL
docker compose -f /docker/cjd80/supabase/docker-compose.yml logs -f supabase-db

# Logs Storage
docker compose -f /docker/cjd80/supabase/docker-compose.yml logs -f supabase-storage
```

### Accès aux services

- **PostgreSQL** : `psql -h localhost -U postgres -d postgres`
- **MinIO Console** : http://localhost:9001 (credentials dans .env)
- **PostgREST API** : http://localhost:3000
- **Storage API** : http://localhost:5000

## Dépannage

### PostgreSQL ne démarre pas

```bash
# Vérifier les logs
docker compose -f /docker/cjd80/supabase/docker-compose.yml logs supabase-db

# Vérifier les permissions
ls -la /docker/cjd80/supabase/volumes/
```

### MinIO ne démarre pas

```bash
# Vérifier les logs
docker compose -f /docker/cjd80/supabase/docker-compose.yml logs supabase-storage

# Vérifier les credentials dans .env
grep MINIO /docker/cjd80/supabase/.env
```

### Erreur de connexion réseau

Vérifier que le réseau `supabase-network-prod` existe :
```bash
docker network ls | grep supabase
```

Si absent, créer le réseau :
```bash
docker network create supabase-network-prod
```

## Migration MinIO (optionnel)

Si vous avez des fichiers importants dans MinIO Nhost :

```bash
# Option 1: Copier les volumes
docker cp nhost-minio-prod:/data /docker/cjd80/supabase/volumes/storage

# Option 2: Migration via API (script à créer selon besoins)
```

## Support

- Documentation Supabase : https://supabase.com/docs
- Issues GitHub : [créer une issue]
- Logs : `/docker/cjd80/supabase/logs/`



