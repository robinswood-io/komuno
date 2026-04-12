# Migration - Tables Financières

**Date :** 2025-01-29  
**Version :** 1.0

## Vue d'ensemble

Ce guide explique comment créer les tables nécessaires pour le module de prévisionnel et pilotage financier.

## Prérequis

- Base de données PostgreSQL configurée et accessible
- Variables d'environnement configurées (`.env`)
- Node.js et `tsx` installés

## Tables créées

Le script de migration crée les tables suivantes :

1. **financial_categories** : Catégories budgétaires (revenus/dépenses)
2. **financial_budgets** : Budgets prévisionnels
3. **financial_expenses** : Dépenses réelles
4. **financial_forecasts** : Prévisions de revenus

## Exécution de la migration

### Méthode 1 : Script npm (recommandé)

```bash
npm run db:create-financial-tables
```

### Méthode 2 : Exécution directe

```bash
tsx scripts/create-financial-tables.ts
```

### Méthode 3 : Via Docker

Si vous utilisez Docker, exécutez le script dans le conteneur :

```bash
# Se connecter au conteneur
docker compose exec app sh

# Dans le conteneur
npm run db:create-financial-tables
```

## Vérification

Après l'exécution, vérifiez que les tables ont été créées :

```bash
# Via psql
psql -U postgres -d votre_base -c "\dt financial_*"

# Ou via le script de monitoring
npm run db:stats
```

Vous devriez voir :
- `financial_categories`
- `financial_budgets`
- `financial_expenses`
- `financial_forecasts`

## Catégories par défaut

Le script crée automatiquement les catégories suivantes :

### Revenus
- Souscriptions membres
- Sponsorings événements
- Dons
- Autres revenus

### Dépenses
- Fonctionnement
- Événements
- Communication
- Administration
- Autres dépenses

## Dépannage

### Erreur de connexion à la base de données

Vérifiez que :
- Les variables d'environnement sont correctement configurées
- La base de données est accessible
- Les identifiants sont corrects

### Tables déjà existantes

Le script utilise `CREATE TABLE IF NOT EXISTS`, donc il est sûr de l'exécuter plusieurs fois. Les tables existantes ne seront pas modifiées.

### Erreur de permissions

Assurez-vous que l'utilisateur de la base de données a les permissions nécessaires pour créer des tables et des index.

## Rollback

Pour supprimer les tables (attention : cela supprimera toutes les données) :

```sql
DROP TABLE IF EXISTS financial_forecasts;
DROP TABLE IF EXISTS financial_expenses;
DROP TABLE IF EXISTS financial_budgets;
DROP TABLE IF EXISTS financial_categories;
```

## Prochaines étapes

Une fois les tables créées :

1. Accédez au module Finance dans l'interface admin
2. Créez vos premiers budgets
3. Enregistrez vos dépenses
4. Générez des prévisions
5. Consultez les rapports financiers

## Support

Pour toute question ou problème, consultez :
- `docs/admin/FINANCIAL_PLANNING.md` : Guide utilisateur
- `docs/admin/FINANCIAL_REPORTS.md` : Documentation technique des rapports




