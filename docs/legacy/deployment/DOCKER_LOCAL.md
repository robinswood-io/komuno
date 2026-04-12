# Guide de Démarrage Docker Local - CJD Amiens

Ce guide explique comment démarrer l'application CJD Amiens en local avec Docker et une base de données PostgreSQL minimale (configuration Nhost).

## 📋 Vue d'ensemble

La configuration Docker locale inclut :
- **PostgreSQL 16** : Base de données locale
- **Application CJD** : Buildée depuis le Dockerfile
- **Réseau Docker** : Communication entre les services

## 🚀 Démarrage Rapide

### Prérequis

- Docker et Docker Compose installés
- Fichier `.env` configuré avec au minimum :
  - `SESSION_SECRET` (générer avec `openssl rand -base64 32`)
  - Autres variables optionnelles

### Démarrage Automatique

```bash
# Utiliser le script de démarrage
./scripts/docker-local-start.sh
```

Le script va :
1. ✅ Vérifier les prérequis
2. ✅ Arrêter les conteneurs existants
3. ✅ Construire et démarrer les services
4. ✅ Attendre que PostgreSQL soit prêt
5. ✅ Exécuter les migrations automatiquement
6. ✅ Vérifier que l'application est prête

### Démarrage Manuel

```bash
# Démarrer les services
docker compose -f docker-compose.local.yml up --build -d

# Attendre que PostgreSQL soit prêt
docker compose -f docker-compose.local.yml exec -T postgres pg_isready -U postgres

# Exécuter les migrations
docker compose -f docker-compose.local.yml exec -T cjd-app sh -c "cd /app && npx drizzle-kit push"

# Vérifier le statut
docker compose -f docker-compose.local.yml ps
```

## 🌐 Accès aux Services

- **Application** : http://localhost:5001
- **PostgreSQL** : localhost:5432
  - User: `postgres`
  - Password: `postgres`
  - Database: `cjd80`

## 📋 Commandes Utiles

### Voir les logs

```bash
# Logs de l'application
docker compose -f docker-compose.local.yml logs -f cjd-app

# Logs de PostgreSQL
docker compose -f docker-compose.local.yml logs -f postgres

# Tous les logs
docker compose -f docker-compose.local.yml logs -f
```

### Arrêter les services

```bash
docker compose -f docker-compose.local.yml down
```

### Redémarrer les services

```bash
docker compose -f docker-compose.local.yml restart
```

### Accéder à la base de données

```bash
# Via psql dans le conteneur
docker compose -f docker-compose.local.yml exec postgres psql -U postgres -d cjd80

# Depuis votre machine (si psql est installé)
psql -h localhost -U postgres -d cjd80
# Password: postgres
```

### Exécuter des migrations

```bash
docker compose -f docker-compose.local.yml exec cjd-app sh -c "cd /app && npx drizzle-kit push"
```

### Rebuild l'application

```bash
docker compose -f docker-compose.local.yml up --build -d
```

## 🔧 Configuration

### Variables d'environnement

Le fichier `docker-compose.local.yml` surcharge automatiquement :
- `DATABASE_URL` : Pointant vers le conteneur PostgreSQL
- `NODE_ENV` : `development`
- `PORT` : `5000` (exposé sur `5001` pour éviter les conflits macOS)

### Ports

- **5001** : Application (mappé vers 5000 dans le conteneur)
- **5432** : PostgreSQL

> **Note** : Le port 5000 est utilisé par ControlCenter sur macOS, c'est pourquoi l'application est exposée sur 5001.

### Volumes

- `postgres-data` : Données persistantes de PostgreSQL
- `./logs` : Logs de l'application

## 🐛 Dépannage

### Port 5001 déjà utilisé

Si le port 5001 est déjà utilisé, modifiez `docker-compose.local.yml` :

```yaml
ports:
  - "5002:5000"  # Changez 5001 en 5002
```

### Erreur de connexion à la base de données

Vérifiez que PostgreSQL est démarré :

```bash
docker compose -f docker-compose.local.yml ps postgres
```

Si le conteneur n'est pas "healthy", consultez les logs :

```bash
docker compose -f docker-compose.local.yml logs postgres
```

### Erreur lors du build

Si le build échoue, vérifiez que les assets nécessaires sont présents :

```bash
ls -la attached_assets/logo-cjd-social_1756108273665.jpg
ls -la attached_assets/boite-kiff_1756106212980.jpeg
```

### Tables manquantes

Si certaines tables manquent, exécutez les migrations :

```bash
docker compose -f docker-compose.local.yml exec cjd-app sh -c "cd /app && npx drizzle-kit push"
```

### Réinitialiser la base de données

Pour repartir de zéro :

```bash
# Arrêter les services
docker compose -f docker-compose.local.yml down

# Supprimer le volume PostgreSQL
docker volume rm cjd80_postgres-data

# Redémarrer
docker compose -f docker-compose.local.yml up -d
```

## 📊 Structure des Services

```
┌─────────────────────────────────────┐
│  cjd-app-local (Port 5001)          │
│  - Application Node.js               │
│  - Build depuis Dockerfile           │
└──────────────┬──────────────────────┘
               │
               │ DATABASE_URL
               │ postgresql://postgres:postgres@postgres:5432/cjd80
               │
┌──────────────▼──────────────────────┐
│  cjd-postgres-local (Port 5432)      │
│  - PostgreSQL 16 Alpine               │
│  - Volume: postgres-data              │
└──────────────────────────────────────┘
```

## 🔐 Sécurité

⚠️ **Important** : Cette configuration est pour le développement local uniquement.

- Les mots de passe par défaut (`postgres/postgres`) ne doivent **jamais** être utilisés en production
- Le port PostgreSQL est exposé publiquement (5432) - à restreindre en production
- Les variables d'environnement sensibles doivent être dans `.env` (non versionné)

## 📝 Notes

- La base de données est persistante via le volume Docker `postgres-data`
- Les migrations sont exécutées automatiquement au démarrage via le script
- L'application utilise le mode `development` avec logs détaillés
- Le health check vérifie que l'application répond sur `/api/health`

## 🔗 Voir aussi

- [Guide de déploiement production](./DEPLOYMENT.md)
- [Configuration Nhost complète](./NHOST_MIGRATION_REPORT.md)
- [README principal](../../README.md)

