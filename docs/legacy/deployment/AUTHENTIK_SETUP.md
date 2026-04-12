# Configuration Authentik

Ce guide explique comment configurer Authentik comme fournisseur d'identité (IdP) pour l'application.

## Prérequis

- Docker et Docker Compose installés
- Accès à la base de données PostgreSQL
- Ports disponibles : 9002 (Authentik web), 9443 (HTTPS)

## Installation

### 1. Démarrage des services

Les services Authentik sont configurés dans `docker-compose.services.yml`. Pour démarrer :

```bash
docker-compose -f docker-compose.services.yml up -d authentik-server authentik-worker
```

Vérifiez que les services sont démarrés :

```bash
docker-compose -f docker-compose.services.yml ps
```

### 2. Accès à l'interface Authentik

Une fois démarré, accédez à l'interface web Authentik :

- URL : http://localhost:9002
- Le compte administrateur initial est créé automatiquement au premier démarrage
- Les identifiants sont affichés dans les logs du conteneur `authentik-server`

Pour récupérer les identifiants :

```bash
docker-compose -f docker-compose.services.yml logs authentik-server | grep -i "password\|admin"
```

### 3. Configuration de l'application OAuth2/OIDC

#### Créer un Provider OAuth2/OIDC

1. Dans l'interface Authentik, allez dans **Applications > Providers**
2. Cliquez sur **Create** et sélectionnez **OAuth2/OpenID Provider**
3. Configurez le provider :
   - **Name** : `CJD80 Application`
   - **Authorization flow** : Créez un flow ou utilisez le flow par défaut
   - **Redirect URIs** : 
     - Développement : `http://localhost:5000/api/auth/authentik/callback`
     - Production : `https://votre-domaine.com/api/auth/authentik/callback`
   - **Client type** : `Confidential`
   - **Client authentication** : `Client secret`

4. Notez le **Client ID** et **Client Secret** générés

#### Créer une Application

1. Allez dans **Applications > Applications**
2. Cliquez sur **Create**
3. Configurez l'application :
   - **Name** : `CJD80`
   - **Slug** : `cjd80`
   - **Provider** : Sélectionnez le provider créé précédemment
   - **Launch URL** : URL de votre application

### 4. Configuration des groupes et rôles

Les groupes Authentik sont mappés aux rôles de l'application. Créez les groupes suivants :

1. Allez dans **Directory > Groups**
2. Créez les groupes correspondant aux rôles :
   - `super_admin` → Rôle Super Administrateur
   - `ideas_reader` → Rôle Consultation des idées
   - `ideas_manager` → Rôle Gestion des idées
   - `events_reader` → Rôle Consultation des événements
   - `events_manager` → Rôle Gestion des événements

**Important** : Les noms des groupes doivent correspondre exactement aux noms ci-dessus (en minuscules).

### 5. Configuration des utilisateurs

#### Créer un utilisateur

1. Allez dans **Directory > Users**
2. Cliquez sur **Create**
3. Remplissez les informations :
   - **Username** : Identifiant unique
   - **Email** : Adresse email (utilisée comme clé primaire dans l'application)
   - **Name** : Nom complet
   - **First name** : Prénom
   - **Last name** : Nom de famille

#### Assigner un groupe à un utilisateur

1. Ouvrez la page de l'utilisateur
2. Allez dans l'onglet **Groups**
3. Cliquez sur **Add** et sélectionnez le groupe approprié

### 6. Configuration des attributs utilisateur

Pour que les informations utilisateur (firstName, lastName) soient correctement transmises :

1. Allez dans **Applications > Providers**
2. Ouvrez votre provider OAuth2/OIDC
3. Dans **Property mappings**, configurez :
   - **User fields** : Assurez-vous que `given_name`, `family_name`, et `email` sont mappés
   - **Groups** : Assurez-vous que les groupes sont inclus dans le token

### 7. Variables d'environnement

Configurez les variables suivantes dans votre fichier `.env` :

```env
AUTHENTIK_BASE_URL=http://localhost:9002
AUTHENTIK_CLIENT_ID=<votre-client-id>
AUTHENTIK_CLIENT_SECRET=<votre-client-secret>
AUTHENTIK_ISSUER=http://localhost:9002/application/o/cjd80/
AUTHENTIK_REDIRECT_URI=http://localhost:5000/api/auth/authentik/callback
AUTHENTIK_SECRET_KEY=<clé-secrète-pour-authentik>
```

Pour la production, remplacez les URLs par les URLs de production.

### 8. Migration de la base de données

Le champ `password` de la table `admins` doit être rendu nullable :

```sql
ALTER TABLE admins ALTER COLUMN password DROP NOT NULL;
```

Ou utilisez Drizzle :

```bash
npm run db:push
```

## Vérification

1. Démarrez l'application
2. Accédez à la page de connexion
3. Cliquez sur "Se connecter avec Authentik"
4. Vous devriez être redirigé vers Authentik
5. Après authentification, vous serez redirigé vers l'application

## Dépannage

### L'authentification échoue

- Vérifiez que les URLs de redirection correspondent exactement dans Authentik et dans les variables d'environnement
- Vérifiez que le Client ID et Client Secret sont corrects
- Consultez les logs d'Authentik : `docker-compose -f docker-compose.services.yml logs authentik-server`

### L'utilisateur n'est pas créé dans la base de données

- Vérifiez que l'email dans Authentik correspond à un email valide
- Consultez les logs de l'application pour voir les erreurs de synchronisation
- Vérifiez que les groupes sont correctement assignés à l'utilisateur

### Les rôles ne sont pas correctement mappés

- Vérifiez que les noms des groupes dans Authentik correspondent exactement aux noms attendus (en minuscules)
- Vérifiez que les groupes sont inclus dans le token OAuth2 (configuration du provider)

## Sécurité

- Utilisez HTTPS en production
- Gardez le Client Secret secret
- Configurez des URLs de redirection strictes
- Utilisez des mots de passe forts pour le compte administrateur Authentik
- Activez l'authentification à deux facteurs (2FA) pour les comptes administrateurs



