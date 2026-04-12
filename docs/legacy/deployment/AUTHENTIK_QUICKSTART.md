# Guide de démarrage rapide - Authentik

Ce guide vous aide à démarrer rapidement avec Authentik après la migration.

## ✅ Étapes déjà complétées

1. ✅ **Dépendances installées** : `passport-oauth2` et `@types/passport-oauth2`
2. ✅ **Code migré** : Backend et frontend adaptés pour OAuth2
3. ✅ **Variables d'environnement** : Configuration dans `config/shared-env.defaults`

## 📋 Étapes à compléter

### 1. Configuration de la base de données

#### Créer la base de données Authentik dans PostgreSQL

```bash
# Se connecter à PostgreSQL
docker exec -it cjd-postgres psql -U postgres

# Créer la base de données Authentik
CREATE DATABASE authentik;

# Vérifier
\l
```

#### Migrer le schéma de l'application (rendre password nullable)

```bash
# S'assurer que DATABASE_URL est configuré
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cjd80"

# Exécuter la migration
npm run db:push
```

### 2. Démarrer les services Authentik

#### Résoudre le conflit de port Redis (si nécessaire)

Si le port 6380 est déjà utilisé :

```bash
# Vérifier quel processus utilise le port
lsof -i :6380

# Ou modifier le port dans docker-compose.services.yml
```

#### Démarrer Authentik

```bash
# Démarrer Redis si nécessaire
docker compose -f docker-compose.services.yml up -d redis

# Démarrer Authentik
docker compose -f docker-compose.services.yml up -d authentik-server authentik-worker

# Vérifier les logs
docker compose -f docker-compose.services.yml logs -f authentik-server
```

### 3. Configuration initiale d'Authentik

#### Accéder à l'interface Authentik

1. Ouvrir http://localhost:9002
2. Récupérer les identifiants admin depuis les logs :

```bash
docker compose -f docker-compose.services.yml logs authentik-server | grep -i "password\|admin"
```

#### Créer l'application OAuth2/OIDC

1. **Applications > Providers** → **Create** → **OAuth2/OpenID Provider**
2. Configuration :
   - **Name** : `CJD80 Application`
   - **Client ID** : Notez cette valeur (à mettre dans `AUTHENTIK_CLIENT_ID`)
   - **Client Secret** : Notez cette valeur (à mettre dans `AUTHENTIK_CLIENT_SECRET`)
   - **Redirect URIs** : `http://localhost:5000/api/auth/authentik/callback`
   - **Scopes** : `openid`, `profile`, `email`

3. **Applications > Applications** → **Create**
   - **Name** : `CJD80`
   - **Slug** : `cjd80`
   - **Provider** : Sélectionner le provider créé ci-dessus

#### Créer les groupes correspondant aux rôles

1. **Directory > Groups** → Créer les groupes suivants :
   - `super_admin`
   - `ideas_reader`
   - `ideas_manager`
   - `events_reader`
   - `events_manager`

#### Créer un token API

1. **Applications > Tokens** → **Create**
2. Notez le token (à mettre dans `AUTHENTIK_TOKEN`)

### 4. Configurer les variables d'environnement

Créer ou mettre à jour votre fichier `.env` :

```bash
# Authentik Configuration
AUTHENTIK_BASE_URL=http://localhost:9002
AUTHENTIK_TOKEN=<token-api-créé>
AUTHENTIK_CLIENT_ID=<client-id-du-provider>
AUTHENTIK_CLIENT_SECRET=<client-secret-du-provider>
AUTHENTIK_ISSUER=http://localhost:9002/application/o/cjd80/
AUTHENTIK_REDIRECT_URI=http://localhost:5000/api/auth/authentik/callback
AUTHENTIK_SECRET_KEY=<générer-une-clé-secrète>
```

Pour générer `AUTHENTIK_SECRET_KEY` :

```bash
openssl rand -base64 32
```

### 5. Créer les utilisateurs dans Authentik

Pour chaque utilisateur :

1. **Directory > Users** → **Create**
   - **Username** : Email de l'utilisateur
   - **Email** : Email de l'utilisateur (doit correspondre à l'email dans la table `admins`)
   - **Name** : Prénom Nom
   - **First name** : Prénom
   - **Last name** : Nom

2. **Assigner le groupe** :
   - Ouvrir la page de l'utilisateur
   - **Groups** → Ajouter le groupe correspondant au rôle

3. **Définir un mot de passe** :
   - **Password** → **Set password**
   - L'utilisateur devra changer ce mot de passe à la première connexion

### 6. Tester l'authentification

1. Démarrer l'application :
   ```bash
   npm run dev
   ```

2. Accéder à http://localhost:5000/auth
3. Cliquer sur "Se connecter avec Authentik"
4. S'authentifier avec un utilisateur créé dans Authentik
5. Vérifier la redirection vers `/admin`

## 🔍 Vérifications

### Vérifier que les services sont démarrés

```bash
docker ps --filter "name=authentik"
```

### Vérifier les logs

```bash
# Logs Authentik Server
docker compose -f docker-compose.services.yml logs authentik-server

# Logs Authentik Worker
docker compose -f docker-compose.services.yml logs authentik-worker
```

### Vérifier la connexion à la base de données

```bash
# Vérifier que la base de données Authentik existe
docker exec -it cjd-postgres psql -U postgres -c "\l" | grep authentik
```

## ⚠️ Problèmes courants

### Erreur "ENOTFOUND postgres"

- Vérifier que `DATABASE_URL` est correctement configuré
- Utiliser `localhost:5433` pour la connexion locale (pas `postgres`)

### Erreur "port is already allocated"

- Vérifier quel processus utilise le port : `lsof -i :<port>`
- Modifier le port dans `docker-compose.services.yml` si nécessaire

### Authentification échoue

- Vérifier que `AUTHENTIK_CLIENT_ID` et `AUTHENTIK_CLIENT_SECRET` sont corrects
- Vérifier que l'URL de callback correspond exactement à celle configurée dans Authentik
- Vérifier les logs : `docker compose -f docker-compose.services.yml logs authentik-server`

### Utilisateur non synchronisé

- Vérifier que l'email dans Authentik correspond exactement à l'email dans la table `admins`
- Vérifier les logs de l'application pour les erreurs de synchronisation

## 📚 Documentation complète

- `AUTHENTIK_SETUP.md` - Guide de configuration détaillé
- `AUTHENTIK_MIGRATION.md` - Guide de migration des utilisateurs


