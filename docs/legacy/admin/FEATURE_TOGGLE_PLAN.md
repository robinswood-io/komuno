# Plan d'Implémentation - Désactivation des Fonctionnalités

## 📋 Objectif

Permettre aux super admin de désactiver certaines fonctionnalités frontend :
- **Boîte à idées** (ideas/propose)
- **Événements** (events)
- **Prêt** (loan)

## 🏗️ Architecture

### 1. Base de données

**Table `feature_config`** :
```sql
CREATE TABLE feature_config (
  id SERIAL PRIMARY KEY,
  feature_key VARCHAR(50) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

**Fonctionnalités** :
- `ideas` : Boîte à idées
- `events` : Événements
- `loan` : Prêt

### 2. Backend

**Storage** :
- `getFeatureConfig()` : Récupérer toutes les configurations
- `updateFeatureConfig(featureKey, enabled, updatedBy)` : Mettre à jour une fonctionnalité
- `isFeatureEnabled(featureKey)` : Vérifier si une fonctionnalité est activée

**API Routes** :
- `GET /api/admin/features` : Liste des fonctionnalités et leur état
- `PUT /api/admin/features/:featureKey` : Activer/désactiver une fonctionnalité

### 3. Frontend

**Context/Hook** :
- `FeatureConfigContext` : Context React pour les fonctionnalités
- `useFeatureConfig()` : Hook pour vérifier si une fonctionnalité est activée
- `useFeatureConfigAdmin()` : Hook admin pour gérer les fonctionnalités

**Pages à modifier** :
- `App.tsx` : Conditionner les routes
- `Header` : Masquer les liens de navigation
- `HomePage` : Masquer les sections
- `AdminHeader` : Masquer les liens admin

**Page Admin** :
- `admin/settings/features-page.tsx` : Interface de gestion

## 📝 Implémentation

### Phase 1 : Backend
1. Ajouter schéma DB `feature_config`
2. Migration Drizzle
3. Implémenter méthodes storage
4. Créer endpoints API

### Phase 2 : Frontend Core
1. Créer `FeatureConfigContext`
2. Créer hook `useFeatureConfig`
3. Charger config au démarrage

### Phase 3 : Masquage Routes/Sections
1. Conditionner routes dans `App.tsx`
2. Masquer liens dans `Header`
3. Masquer sections dans `HomePage`
4. Masquer liens admin dans `AdminHeader`

### Phase 4 : Interface Admin
1. Créer page settings/features
2. Ajouter au menu admin
3. Interface toggle pour chaque fonctionnalité

### Phase 5 : Tests & Documentation
1. Tester activation/désactivation
2. Documenter le système

## 🔒 Sécurité

- Seuls les `super_admin` peuvent modifier les fonctionnalités
- Vérification côté backend obligatoire
- Les routes désactivées retournent 404 ou redirection

## 📊 Données par défaut

Toutes les fonctionnalités sont **activées par défaut** lors de la première installation.

## 🛡️ Robustesse

- **Gestion d'erreurs** : En cas d'échec de l'API, les fonctionnalités restent activées par défaut
- **Retry automatique** : 2 tentatives avec backoff exponentiel
- **Fallback** : L'application continue de fonctionner même si l'API échoue
- **Protection des routes** : `FeatureGuard` affiche un message clair si fonctionnalité désactivée

## ⚡ Performance

- **Memoization** : `useMemo` pour le contextValue afin d'éviter les recréations inutiles
- **Callback stables** : `useCallback` pour `isFeatureEnabled` et `updateFeature`
- **Cache React Query** : 5 minutes de staleTime pour réduire les requêtes réseau
- **Optimisation re-renders** : Réduction des re-renders inutiles grâce aux hooks optimisés

