# Référence des Scripts - CJD Amiens

**Date:** 2025-01-30  
**Guide complet des scripts disponibles**

## Scripts NPM Principaux

### Développement

```bash
# Démarrage complet automatisé (Docker + DB + App)
npm run start:dev

# Démarrage développement standard
npm run dev

# Démarrage Express legacy (transition)
npm run dev:express
```

### Base de Données

```bash
# Pousser le schéma vers la DB
npm run db:push

# Interface graphique Drizzle Studio
npx drizzle-kit studio

# Note: Utiliser DATABASE_URL avec localhost:5433 pour connexion depuis l'hôte
```

### Validation et Tests

```bash
# Validation complète de l'application
npm run validate

# Test de démarrage de l'application
npm run test:startup

# Validation des variables d'environnement
npm run validate:env

# Analyse de la migration NestJS
npm run analyze:migration

# Vérification des dépendances
npm run check:deps
```

### Nettoyage et Maintenance

```bash
# Nettoyage complet de l'environnement
npm run clean:all

# Reset complet (supprime toutes les données Docker)
npm run reset:env
```

### Production

```bash
# Build production (NestJS)
npm run build

# Build Express legacy (transition)
npm run build:express

# Démarrage production (NestJS)
npm start

# Démarrage Express legacy (transition)
npm run start:express
```

## Scripts Shell Directs

### Démarrage et Infrastructure

**`scripts/start-dev.sh`**
- Démarre tous les services Docker
- Initialise la base de données
- Démarre l'application
- **Usage:** `npm run start:dev` ou `./scripts/start-dev.sh`

**`scripts/clean-all.sh`**
- Arrête les services Docker
- Nettoie les conteneurs orphelins
- Supprime les fichiers de build
- Nettoie les logs et caches
- **Usage:** `npm run clean:all` ou `./scripts/clean-all.sh`

**`scripts/reset-env.sh`**
- Supprime toutes les données Docker (avec confirmation)
- Réinstalle les dépendances
- Redémarre les services
- Réinitialise la base de données
- **Usage:** `npm run reset:env` ou `./scripts/reset-env.sh`

### Validation et Tests

**`scripts/validate-app.sh`**
- Vérifie TypeScript (fichiers NestJS)
- Vérifie les services Docker
- Vérifie la connexion DB
- Vérifie les fichiers critiques
- Vérifie les scripts npm
- Vérifie les dépendances
- Vérifie la structure NestJS
- **Usage:** `npm run validate` ou `./scripts/validate-app.sh`

**`scripts/test-startup.sh`**
- Teste le démarrage complet de l'application
- Vérifie les endpoints health
- Vérifie les logs pour erreurs
- **Usage:** `npm run test:startup` ou `./scripts/test-startup.sh`

**`scripts/validate-env.sh`**
- Valide les variables d'environnement critiques
- Vérifie le format des variables
- Vérifie les valeurs par défaut
- **Usage:** `npm run validate:env` ou `./scripts/validate-env.sh`

### Analyse

**`scripts/analyze-routes-migration.sh`**
- Compte les routes dans routes.ts
- Compte les routes NestJS
- Calcule le pourcentage de migration
- Liste les modules/controllers/services
- **Usage:** `npm run analyze:migration` ou `./scripts/analyze-routes-migration.sh`

**`scripts/check-dependencies.sh`**
- Audit de sécurité (npm audit)
- Vérifie les dépendances obsolètes
- Vérifie les dépendances critiques
- Détecte les duplications
- **Usage:** `npm run check:deps` ou `./scripts/check-dependencies.sh`

## Workflows Recommandés

### Démarrage Quotidien

```bash
# 1. Vérifier les services Docker
docker compose -f docker-compose.services.yml ps

# 2. Démarrer (si nécessaire)
npm run start:dev

# 3. Valider
npm run validate
```

### Après Pull/Update

```bash
# 1. Installer dépendances
npm install

# 2. Valider environnement
npm run validate:env

# 3. Vérifier dépendances
npm run check:deps

# 4. Démarrer
npm run start:dev
```

### Avant Commit

```bash
# 1. Validation complète
npm run validate

# 2. Vérification TypeScript
npm run check

# 3. Test démarrage
npm run test:startup
```

### Nettoyage Complet

```bash
# 1. Nettoyage
npm run clean:all

# 2. Réinstallation
npm install

# 3. Reset (si nécessaire)
npm run reset:env
```

## Variables d'Environnement

### Critiques (requises)

- `DATABASE_URL` - URL de connexion PostgreSQL

### Importantes (recommandées)

- `SESSION_SECRET` - Clé secrète pour les sessions (min 32 caractères)
- `AUTHENTIK_BASE_URL` - URL de base Authentik
- `AUTHENTIK_CLIENT_ID` - ID client OAuth2
- `AUTHENTIK_CLIENT_SECRET` - Secret client OAuth2

### Optionnelles

- `PORT` - Port de l'application (défaut: 5000)
- `NODE_ENV` - Environnement (development/production/test)
- `CORS_ORIGIN` - Origine CORS (défaut: *)

## Dépannage

### Problème: Script ne s'exécute pas

```bash
# Vérifier les permissions
chmod +x scripts/*.sh

# Exécuter directement
./scripts/script-name.sh
```

### Problème: Variables d'environnement non chargées

```bash
# Vérifier le fichier .env
cat .env

# Valider les variables
npm run validate:env
```

### Problème: Services Docker non démarrés

```bash
# Vérifier l'état
docker compose -f docker-compose.services.yml ps

# Démarrer
docker compose -f docker-compose.services.yml up -d
```

## Notes

- Tous les scripts sont dans `scripts/`
- Les scripts npm sont définis dans `package.json`
- Les logs sont dans `/tmp/app-startup.log` pour test-startup.sh
- Les scripts de validation peuvent être exécutés en CI/CD

