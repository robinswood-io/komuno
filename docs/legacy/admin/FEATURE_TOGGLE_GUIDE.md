# Guide d'Utilisation - Désactivation des Fonctionnalités

## 📋 Vue d'ensemble

Le système de désactivation des fonctionnalités permet aux super administrateurs de masquer temporairement certaines fonctionnalités de la plateforme sans supprimer les données.

## 🚀 Démarrage rapide

### 1. Synchroniser la base de données

Avant d'utiliser le système, synchroniser le schéma :

```bash
npm run db:push
```

### 2. Accéder à l'interface

1. Se connecter en tant que **super admin**
2. Aller dans **Paramètres** → **Fonctionnalités** (`/admin/settings/features`)
3. Utiliser les switches pour activer/désactiver les fonctionnalités

## 🎯 Fonctionnalités disponibles

### Boîte à idées (`ideas`)
- **Route** : `/propose`
- **Section** : Section "Voter pour des idées" sur la page d'accueil
- **Admin** : `/admin/content/ideas`
- **Effet** : Masque la possibilité de proposer et voter pour des idées

### Événements (`events`)
- **Route** : `/events`
- **Section** : Section "Événements à venir" sur la page d'accueil
- **Admin** : `/admin/content/events`
- **Effet** : Masque la gestion des événements et inscriptions

### Prêt de matériel (`loan`)
- **Route** : `/loan`
- **Section** : Lien de navigation "Prêt"
- **Admin** : `/admin/content/loans`
- **Effet** : Masque le système de prêt de matériel

## 🔄 Comportement

### Lors de la désactivation

1. **Routes** : Les routes désactivées affichent un message d'erreur avec redirection vers l'accueil
2. **Navigation** : Les liens correspondants disparaissent du menu
3. **Sections** : Les sections disparaissent de la page d'accueil
4. **Admin** : Les pages d'administration correspondantes disparaissent du menu admin et sont protégées par `FeatureGuard`

### Lors de la réactivation

1. Tous les éléments masqués réapparaissent immédiatement
2. Les données existantes restent intactes
3. Aucune perte de données

## 🔒 Sécurité

- **Permissions** : Seuls les `super_admin` peuvent modifier les fonctionnalités
- **Vérification backend** : Toutes les modifications sont vérifiées côté serveur
- **Valeurs par défaut** : Toutes les fonctionnalités sont activées par défaut

## 🛠️ API

### Endpoints disponibles

#### GET `/api/admin/features`
Récupère la liste de toutes les fonctionnalités et leur état.

**Réponse** :
```json
{
  "success": true,
  "data": [
    { "featureKey": "ideas", "enabled": true },
    { "featureKey": "events", "enabled": true },
    { "featureKey": "loan", "enabled": true }
  ]
}
```

#### GET `/api/admin/features/:featureKey`
Récupère l'état d'une fonctionnalité spécifique.

**Réponse** :
```json
{
  "success": true,
  "data": {
    "featureKey": "ideas",
    "enabled": true
  }
}
```

#### PUT `/api/admin/features/:featureKey`
Active ou désactive une fonctionnalité (super admin uniquement).

**Body** :
```json
{
  "enabled": false
}
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "id": 1,
    "featureKey": "ideas",
    "enabled": false,
    "updatedBy": "admin@example.com",
    "updatedAt": "2025-01-29T12:00:00Z"
  }
}
```

## 💡 Cas d'usage

### Exemple 1 : Désactiver temporairement les événements

1. Aller sur `/admin/settings/features`
2. Désactiver le switch "Événements"
3. La section événements disparaît de la page d'accueil
4. Le lien "Événements" disparaît du menu
5. La route `/events` retourne une 404
6. La page admin `/admin/content/events` disparaît du menu

### Exemple 2 : Réactiver une fonctionnalité

1. Aller sur `/admin/settings/features`
2. Activer le switch correspondant
3. Tous les éléments réapparaissent immédiatement

## 🐛 Dépannage

### La fonctionnalité ne se désactive pas

1. Vérifier que vous êtes connecté en tant que `super_admin`
2. Vérifier la console du navigateur pour les erreurs
3. Vérifier les logs serveur
4. Vérifier que la table `feature_config` existe dans la base de données
5. Vérifier que la migration a été exécutée : `npm run db:push`

### Les routes sont toujours accessibles

1. Vérifier que le `FeatureConfigProvider` est bien enveloppé dans `App.tsx`
2. Vérifier que le hook `useFeatureConfig()` est utilisé dans le `Router`
3. Vérifier que la configuration est bien chargée (voir les requêtes réseau)
4. Vérifier que `FeatureGuard` est bien utilisé sur les routes concernées

### Erreur de chargement de la configuration

Si l'API échoue à charger la configuration :
- Les fonctionnalités restent **activées par défaut** pour éviter de bloquer l'application
- Vérifier la connexion réseau et les logs serveur
- L'application continue de fonctionner normalement avec les valeurs par défaut

## 📊 Structure de la base de données

```sql
CREATE TABLE feature_config (
  id SERIAL PRIMARY KEY,
  feature_key VARCHAR(50) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

## 🔗 Fichiers concernés

- **Backend** :
  - `shared/schema.ts` : Schéma de la table
  - `server/storage.ts` : Méthodes de stockage
  - `server/routes.ts` : Endpoints API

- **Frontend** :
  - `client/src/contexts/FeatureConfigContext.tsx` : Context et hook
  - `client/src/components/FeatureGuard.tsx` : Composant de protection des routes
  - `client/src/App.tsx` : Routes conditionnelles avec FeatureGuard
  - `client/src/components/header.tsx` : Navigation filtrée
  - `client/src/components/admin-header.tsx` : Menu admin filtré
  - `client/src/pages/home-page.tsx` : Sections conditionnelles
  - `client/src/pages/admin/settings/features-page.tsx` : Interface admin
  - `client/src/pages/admin/content/*-page.tsx` : Pages admin protégées

