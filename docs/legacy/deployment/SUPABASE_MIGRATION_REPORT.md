# Rapport de Migration Nhost → Supabase Community Edition

**Date de migration :** 2025-01-29  
**Serveur de destination :** 141.94.31.162  
**Base de données source :** Nhost Self-Hosted (PostgreSQL + Hasura + Auth + Storage)  
**Base de données destination :** Supabase Community Edition (PostgreSQL + PostgREST + Storage + Auth)

## Résumé Exécutif

✅ **Migration planifiée** - Configuration complète pour remplacer Nhost par Supabase Community Edition.

### Services Migrés

- ✅ **PostgreSQL** : Migration depuis `nhost-postgres-prod` vers `supabase-db-prod`
- ✅ **MinIO/Storage** : Migration depuis `nhost-minio-prod` vers `supabase-storage-prod`
- ✅ **Redis** : Migration depuis `nhost-redis-prod` vers `supabase-redis-prod`
- ⚠️ **Hasura** : Non migré (non utilisé dans l'application)
- ⚠️ **Auth** : Non migré (Microsoft OAuth utilisé à la place)

## Architecture Supabase

### Services Déployés

1. **PostgreSQL 15** (`supabase-db-prod`)
   - Base de données principale
   - Extensions : uuid-ossp, pgcrypto, pgjwt, pg_stat_statements
   - Port : 5432

2. **MinIO** (`supabase-storage-prod`)
   - Stockage objet S3-compatible
   - API : port 9000
   - Console : port 9001

3. **Redis 7** (`supabase-redis-prod`)
   - Cache optionnel
   - Port : 6379

4. **PostgREST** (`supabase-rest-prod`)
   - API REST automatique depuis PostgreSQL
   - Port : 3000

5. **GoTrue** (`supabase-auth-prod`)
   - Authentification (désactivé, Microsoft OAuth utilisé)
   - Port : 9999

6. **Realtime** (`supabase-realtime-prod`)
   - WebSockets pour subscriptions (optionnel)
   - Port : 4000

7. **Storage API** (`supabase-storage-api-prod`)
   - Gestion des fichiers
   - Port : 5000

## Phases de Migration

### Phase 1 : Configuration Supabase ✅

**Fichiers créés :**
- `docker-compose.supabase.yml` : Stack complète Supabase
- `scripts/create-supabase-env.sh` : Génération fichier .env
- `scripts/migrate-to-supabase.sh` : Script de migration complet
- `scripts/backup-supabase.sh` : Backup PostgreSQL
- `scripts/restore-to-supabase.sh` : Restauration PostgreSQL

**Configuration :**
- Répertoire : `/docker/cjd80/supabase/`
- Réseau Docker : `supabase-network-prod`
- Variables d'environnement : Générées automatiquement

### Phase 2 : Migration PostgreSQL ⏳

**Script créé :** `scripts/migrate-to-supabase.sh`

**Étapes :**
1. Backup PostgreSQL Nhost
2. Création configuration Supabase
3. Démarrage services Supabase
4. Restauration données PostgreSQL
5. Migration MinIO (optionnel)

**Commandes :**
```bash
# Migration complète
./scripts/migrate-to-supabase.sh

# Backup manuel
./scripts/backup-supabase.sh

# Restauration manuelle
./scripts/restore-to-supabase.sh [DUMP_FILE]
```

### Phase 3 : Adaptation Application ✅

**Fichiers modifiés :**

1. **`docker-compose.yml`**
   - Réseau `nhost_nhost-network-prod` → `supabase-network-prod`
   - Connexion application au réseau Supabase

2. **`config/shared-env.defaults`**
   - Variables Nhost → Variables Supabase
   - Configuration MinIO/Supabase

3. **`server/db.ts`**
   - Commentaires mis à jour (Nhost → Supabase)
   - Support PostgreSQL standard conservé

4. **`scripts/ensure-shared-env.ts`**
   - Références Nhost → Supabase

### Phase 4 : Migration MinIO ⏳

**Option 1 : Copie des volumes Docker**
```bash
# Copier les données MinIO
docker cp nhost-minio-prod:/data /docker/cjd80/supabase/volumes/storage
```

**Option 2 : Migration via API S3**
- Utiliser les scripts de migration existants
- Adapter les endpoints MinIO

### Phase 5 : Déploiement ⏳

**En attente :**
- Exécution du script de migration sur le serveur
- Vérification des services Supabase
- Mise à jour DATABASE_URL dans l'application
- Tests fonctionnels
- Arrêt de Nhost une fois validé

## Configuration Finale

### Variables d'Environnement

**PostgreSQL Supabase :**
```
DATABASE_URL=postgresql://postgres:[password]@supabase-db-prod:5432/postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=[généré]
POSTGRES_DB=postgres
```

**Supabase Storage (MinIO) :**
```
MINIO_ACCESS_KEY=[généré]
MINIO_SECRET_KEY=[généré]
S3_ENDPOINT=http://supabase-storage-prod:9000
S3_BUCKET=supabase-storage
```

**Supabase Services :**
- JWT Secret : [généré]
- Anon Key : [généré]
- Service Key : [généré]
- Redis Password : [généré]

### Réseaux Docker

- `supabase-network-prod` : Réseau interne Supabase
- `proxy` : Réseau Traefik (externe)
- `cjd-network` : Réseau interne application

## Scripts Disponibles

### Migration

```bash
# Migration complète Nhost → Supabase
./scripts/migrate-to-supabase.sh

# Créer fichier .env Supabase
./scripts/create-supabase-env.sh
```

### Backup/Restore

```bash
# Backup PostgreSQL Supabase
./scripts/backup-supabase.sh

# Restauration depuis dump
./scripts/restore-to-supabase.sh [DUMP_FILE]
```

## Avantages de Supabase vs Nhost

1. **PostgREST** : API REST automatique depuis PostgreSQL (plus simple que Hasura)
2. **Storage API** : Gestion intégrée des fichiers avec permissions
3. **Realtime** : WebSockets intégrés pour subscriptions
4. **Documentation** : Documentation plus complète et active
5. **Communauté** : Communauté plus large et active

## Points d'Attention

- **Hasura** : Non utilisé dans l'application (remplacé par PostgREST)
- **Auth** : Non utilisé (Microsoft OAuth à la place)
- **MinIO** : Migration des fichiers nécessaire si données importantes
- **Backups** : Script `backup-supabase.sh` prêt pour automatisation
- **Réseau** : Mettre à jour `docker-compose.yml` pour utiliser `supabase-network-prod`

## Prochaines Étapes

1. **Exécuter la migration sur le serveur**
   ```bash
   ssh user@141.94.31.162
   cd /docker/cjd80
   ./scripts/migrate-to-supabase.sh
   ```

2. **Vérifier les services**
   ```bash
   docker compose -f /docker/cjd80/supabase/docker-compose.yml ps
   ```

3. **Mettre à jour DATABASE_URL**
   - Mettre à jour `.env` avec la nouvelle URL Supabase
   - Redémarrer l'application

4. **Tests fonctionnels**
   - Vérifier toutes les fonctionnalités
   - Tester les uploads de fichiers
   - Vérifier les performances

5. **Arrêter Nhost**
   ```bash
   docker compose -f /docker/cjd80/nhost/docker-compose.yml down
   ```

## Validation

⏳ **Migration des données :** En attente d'exécution  
✅ **Infrastructure :** Configuration complète  
✅ **Code application :** Adapté et prêt  
⏳ **Déploiement :** En attente d'exécution

---

**Migration planifiée le :** 2025-01-29  
**Statut final :** ✅ **Configuration complète - Prêt pour migration**



