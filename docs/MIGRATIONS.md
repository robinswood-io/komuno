# Database Migrations

## Overview

Ce projet utilise Drizzle ORM pour gérer les migrations de base de données. Les migrations sont exécutées automatiquement au démarrage du container Docker en production.

## Workflow

### 1. Modifier le schéma

Modifier le fichier `shared/schema.ts` pour ajouter/modifier des tables ou colonnes.

```typescript
// Exemple: Ajouter une nouvelle colonne
export const members = pgTable("members", {
  // ... colonnes existantes
  newField: text("new_field"), // Nouvelle colonne
});
```

### 2. Générer la migration

```bash
npm run db:generate
# Ou avec un nom personnalisé:
npm run db:generate -- --name add_new_field
```

Cela crée un nouveau fichier SQL dans `migrations/XXXX_migration_name.sql`

### 3. Vérifier la migration générée

```bash
cat migrations/XXXX_migration_name.sql
```

Vérifier que les commandes SQL sont correctes (ALTER TABLE, CREATE TABLE, etc.)

### 4. Tester localement (optionnel mais recommandé)

```bash
# Appliquer sur la DB locale
npm run db:push
```

### 5. Commit la migration

```bash
git add migrations/XXXX_migration_name.sql
git commit -m "feat: add new_field to members table"
git push
```

### 6. Déploiement automatique

Lors du déploiement via GitHub Actions:
1. L'image Docker est buildée avec le dossier `migrations/`
2. Au démarrage du container, le script `/app/scripts/run-migrations.sh` s'exécute
3. Toutes les migrations SQL sont appliquées dans l'ordre
4. Les erreurs "already exists" sont ignorées (normal pour les migrations déjà appliquées)

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run db:generate` | Génère une nouvelle migration basée sur les changements du schéma |
| `npm run db:push` | Applique directement le schéma (dev uniquement, sans migration) |
| `npm run db:studio` | Ouvre Drizzle Studio pour explorer la DB |

## Comment ça fonctionne en production

### Au démarrage du container

1. Le script `docker-entrypoint.sh` appelle `scripts/run-migrations.sh`
2. Ce script:
   - Installe `postgresql-client` si nécessaire
   - Exécute tous les fichiers `.sql` dans `migrations/` dans l'ordre alphabétique
   - Ignore les erreurs "already exists" (idempotent)
3. Les serveurs NestJS et NextJS démarrent

### Fichiers concernés

- `Dockerfile`: Copie `migrations/` et `scripts/run-migrations.sh` dans l'image
- `docker-entrypoint.sh`: Exécute les migrations au démarrage
- `scripts/run-migrations.sh`: Script shell qui applique les migrations SQL
- `migrations/*.sql`: Fichiers de migration générés par Drizzle

## Rollback

Si une migration pose problème:

1. **Option 1 - Rollback manuel** (si possible):
   ```sql
   -- Se connecter à la DB en production
   psql $DATABASE_URL

   -- Annuler les changements manuellement
   DROP TABLE IF EXISTS new_table;
   ALTER TABLE members DROP COLUMN IF EXISTS new_field;
   ```

2. **Option 2 - Déployer un fix**:
   - Créer une nouvelle migration qui annule les changements
   - Déployer normalement

3. **Option 3 - Redéployer une version antérieure**:
   ```bash
   # Redéployer un commit précédent
   git revert HEAD
   git push
   ```

## Bonnes pratiques

### ✅ À faire

- Toujours tester les migrations localement avant de déployer
- Utiliser des noms de migration descriptifs
- Commiter les migrations avec le code qui les utilise
- Faire des migrations atomiques (1 changement = 1 migration)
- Ajouter des `IF NOT EXISTS` pour l'idempotence

### ❌ À éviter

- Ne jamais modifier une migration déjà déployée en production
- Ne pas supprimer des colonnes utilisées sans déployer d'abord le code qui les retire
- Ne pas faire de migrations destructives sans backup

## Ordre de déploiement pour changements cassants

Pour éviter les downtimes lors de changements de schéma:

### Ajouter une colonne
1. ✅ Déployer la migration (ajoute la colonne)
2. ✅ Déployer le code qui utilise la colonne

### Renommer une colonne
1. ✅ Ajouter la nouvelle colonne
2. ✅ Déployer le code qui écrit dans les deux colonnes
3. ✅ Migrer les données (UPDATE old_col -> new_col)
4. ✅ Déployer le code qui lit seulement new_col
5. ✅ Supprimer old_col

### Supprimer une colonne
1. ✅ Déployer le code qui n'utilise plus la colonne
2. ✅ Attendre (optionnel: garder quelques jours pour rollback)
3. ✅ Déployer la migration qui supprime la colonne

## Troubleshooting

### Migration échoue au démarrage

Vérifier les logs du container:
```bash
docker logs <container_id> | grep migration
```

### Table déjà existante

Normal! Le script ignore ces erreurs. Les migrations sont idempotentes.

### Migration SQL invalide

1. Corriger le schéma dans `shared/schema.ts`
2. Supprimer le fichier de migration cassé
3. Régénérer: `npm run db:generate`
4. Vérifier le nouveau SQL
5. Redéployer

## Références

- [Drizzle ORM Migrations](https://orm.drizzle.team/docs/migrations)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
