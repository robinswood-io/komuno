# Migration des utilisateurs vers Authentik

Ce guide explique comment migrer les utilisateurs existants de l'application vers Authentik.

## Vue d'ensemble

Lors de la migration vers Authentik, tous les utilisateurs doivent être créés dans Authentik. Les mots de passe ne sont plus stockés dans l'application mais gérés par Authentik.

## Stratégie de migration

### Étape 1 : Préparation

1. **Sauvegarder la base de données** :
   ```bash
   pg_dump -U postgres -d cjd80 > backup_before_migration.sql
   ```

2. **Lister les utilisateurs existants** :
   ```sql
   SELECT email, first_name, last_name, role, status FROM admins;
   ```

### Étape 2 : Création des utilisateurs dans Authentik

Pour chaque utilisateur existant :

1. **Créer l'utilisateur dans Authentik** :
   - Allez dans **Directory > Users**
   - Cliquez sur **Create**
   - Remplissez :
     - **Username** : Email de l'utilisateur (ou un identifiant unique)
     - **Email** : Email de l'utilisateur (doit correspondre à l'email dans la table `admins`)
     - **Name** : `${first_name} ${last_name}`
     - **First name** : Prénom
     - **Last name** : Nom de famille

2. **Assigner le groupe correspondant au rôle** :
   - Ouvrez la page de l'utilisateur
   - Allez dans l'onglet **Groups**
   - Ajoutez le groupe correspondant :
     - `super_admin` pour le rôle `super_admin`
     - `ideas_reader` pour le rôle `ideas_reader`
     - `ideas_manager` pour le rôle `ideas_manager`
     - `events_reader` pour le rôle `events_reader`
     - `events_manager` pour le rôle `events_manager`

3. **Définir un mot de passe temporaire** :
   - Dans la page de l'utilisateur, allez dans l'onglet **Password**
   - Cliquez sur **Set password**
   - Définissez un mot de passe temporaire
   - **Important** : L'utilisateur devra changer ce mot de passe lors de sa première connexion

### Étape 3 : Migration de la base de données

1. **Rendre le champ password nullable** :
   ```sql
   ALTER TABLE admins ALTER COLUMN password DROP NOT NULL;
   ```

2. **Mettre à jour les utilisateurs existants** (optionnel) :
   ```sql
   -- Marquer les passwords comme NULL pour les utilisateurs migrés
   UPDATE admins SET password = NULL WHERE email IN (
     'user1@example.com',
     'user2@example.com',
     -- ... liste des emails migrés
   );
   ```

   **Note** : Cette étape n'est pas obligatoire car les nouveaux utilisateurs créés via Authentik n'auront pas de password dans la base de données.

### Étape 4 : Test de migration

1. **Tester la connexion d'un utilisateur migré** :
   - Accédez à la page de connexion
   - Cliquez sur "Se connecter avec Authentik"
   - Connectez-vous avec les identifiants Authentik
   - Vérifiez que l'utilisateur est correctement synchronisé

2. **Vérifier les rôles** :
   - Vérifiez que le rôle de l'utilisateur correspond au groupe Authentik
   - Testez les permissions selon le rôle

### Étape 5 : Communication aux utilisateurs

Informez les utilisateurs de la migration :

1. **Email de notification** (exemple) :
   ```
   Bonjour,
   
   Nous avons migré notre système d'authentification vers Authentik.
   
   Pour vous connecter :
   1. Accédez à [URL de l'application]
   2. Cliquez sur "Se connecter avec Authentik"
   3. Utilisez vos identifiants Authentik
   
   Votre mot de passe temporaire est : [mot-de-passe-temporaire]
   Vous devrez le changer lors de votre première connexion.
   
   Si vous avez des questions, contactez l'administrateur.
   ```

2. **Instructions de première connexion** :
   - L'utilisateur doit se connecter via Authentik
   - Changer le mot de passe temporaire
   - Vérifier que les permissions sont correctes

## Script de migration automatique (optionnel)

Un script peut être créé pour automatiser la migration. Exemple de structure :

```typescript
// scripts/migrate-users-to-authentik.ts
import { storage } from '../server/storage';
import { getAuthentikService } from '../server/services/authentik-service';

async function migrateUsers() {
  const adminsResult = await storage.getAllAdmins();
  if (!adminsResult.success) {
    console.error('Erreur lors de la récupération des admins');
    return;
  }

  const authentikService = getAuthentikService();
  
  for (const admin of adminsResult.data) {
    // Créer l'utilisateur dans Authentik via l'API
    // (nécessite un token d'API Authentik)
    console.log(`Migration de ${admin.email}...`);
    // ... logique de création
  }
}
```

**Note** : Ce script nécessite un token d'API Authentik avec les permissions appropriées.

## Rollback (en cas de problème)

Si la migration échoue :

1. **Restaurer la base de données** :
   ```bash
   psql -U postgres -d cjd80 < backup_before_migration.sql
   ```

2. **Rétablir l'authentification locale** :
   - Revenir à la version précédente du code
   - Redémarrer l'application

3. **Informer les utilisateurs** :
   - Communiquer le retour à l'ancien système
   - Prévoir une nouvelle tentative de migration

## Points d'attention

1. **Synchronisation** : Les utilisateurs sont automatiquement synchronisés lors de leur première connexion via Authentik
2. **Rôles** : Les rôles sont déterminés depuis les groupes Authentik lors de chaque connexion
3. **Mots de passe** : Les anciens mots de passe ne sont plus utilisés
4. **Email** : L'email dans Authentik doit correspondre exactement à l'email dans la table `admins`
5. **Statut** : Les utilisateurs créés via Authentik ont automatiquement le statut `active`

## Vérification post-migration

Après la migration, vérifiez :

- [ ] Tous les utilisateurs peuvent se connecter via Authentik
- [ ] Les rôles sont correctement mappés
- [ ] Les permissions fonctionnent comme attendu
- [ ] Les utilisateurs peuvent se déconnecter
- [ ] Les sessions sont correctement gérées
- [ ] Les logs ne montrent pas d'erreurs de synchronisation

## Support

En cas de problème lors de la migration :

1. Consultez les logs d'Authentik
2. Consultez les logs de l'application
3. Vérifiez la configuration OAuth2/OIDC
4. Vérifiez les variables d'environnement



