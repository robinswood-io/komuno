# Système de Suivi Transversal - README

## 📋 Vue d'ensemble

Le système de suivi transversal est un module complet de CRM (Customer Relationship Management) intégré à l'application CJD Amiens - Boîte à Kiffs. Il permet de suivre, analyser et optimiser le processus de conversion des membres potentiels et des mécènes.

## 🎯 Objectifs

- **Suivre l'engagement** : Mesurer l'activité et l'engagement des membres/mécènes
- **Identifier les opportunités** : Détecter automatiquement les membres/mécènes à haut potentiel
- **Optimiser les conversions** : Analyser les taux de conversion et identifier les points d'amélioration
- **Gérer les inactifs** : Détecter et relancer les membres/mécènes inactifs
- **Analyser les tendances** : Comprendre l'évolution de l'engagement dans le temps

## 🚀 Démarrage rapide

### Pour les utilisateurs

1. **Accéder au dashboard** : `/admin/tracking`
2. **Consulter les statistiques** : Onglet "Dashboard"
3. **Gérer les alertes** : Onglet "Alertes"
4. **Exporter les données** : Boutons "Exporter" dans chaque onglet

📖 **Guide complet** : Voir [TRACKING-QUICK-START.md](TRACKING-QUICK-START.md)

### Pour les développeurs

#### Structure des fichiers

```
shared/schema.ts              # Schémas DB et validation Zod
server/storage.ts             # Méthodes de stockage (7 méthodes)
server/routes.ts              # Routes API (7 endpoints)
server/utils/tracking-scheduler.ts  # Planificateur automatique
client/src/pages/admin-tracking-page.tsx  # Dashboard frontend
```

#### Endpoints API

- `GET /api/tracking/dashboard` - Statistiques agrégées
- `GET /api/tracking/metrics` - Liste des métriques
- `POST /api/tracking/metrics` - Créer une métrique
- `GET /api/tracking/alerts` - Liste des alertes
- `POST /api/tracking/alerts` - Créer une alerte
- `PUT /api/tracking/alerts/:id` - Mettre à jour une alerte
- `POST /api/tracking/alerts/generate` - Générer les alertes

#### Intégration automatique

Le tracking est automatiquement intégré dans :
- `POST /api/members/propose` - Crée une métrique `status_change`
- `POST /api/patrons/propose` - Crée une métrique `status_change`
- `PATCH /api/admin/members/:email` - Crée des métriques `status_change` et `conversion`
- `PATCH /api/patrons/:id` - Crée des métriques `status_change` et `conversion`

## 📊 Architecture

### Base de données

**Tables** :
- `tracking_metrics` : Toutes les métriques enregistrées
- `tracking_alerts` : Toutes les alertes (automatiques et manuelles)

**Relations** :
- `tracking_metrics.entity_id` → `members.id` ou `patrons.id`
- `tracking_alerts.entity_id` → `members.id` ou `patrons.id`

### Backend

**Méthodes principales** :
- `createTrackingMetric()` - Créer une métrique
- `getTrackingMetrics()` - Récupérer avec filtres
- `getTrackingDashboard()` - Statistiques agrégées
- `createTrackingAlert()` - Créer une alerte
- `getTrackingAlerts()` - Récupérer avec filtres
- `updateTrackingAlert()` - Mettre à jour (lu/résolu)
- `generateTrackingAlerts()` - Génération automatique

### Frontend

**Composants principaux** :
- `AdminTrackingPage` - Page principale du dashboard
- Deux onglets : Dashboard et Alertes
- Filtres avancés et recherche
- Export CSV

## ⚙️ Configuration

### Variables d'environnement

```bash
# Intervalle de génération automatique des alertes (en minutes)
# Défaut : 1440 (24 heures)
TRACKING_ALERTS_INTERVAL_MINUTES=1440

# Désactiver la génération automatique
DISABLE_TRACKING_SCHEDULER=1
```

### Exemples de configuration

```bash
# Générer les alertes toutes les 12 heures
TRACKING_ALERTS_INTERVAL_MINUTES=720

# Générer les alertes toutes les 6 heures
TRACKING_ALERTS_INTERVAL_MINUTES=360

# Désactiver complètement la génération automatique
DISABLE_TRACKING_SCHEDULER=1
```

## 🔍 Détection automatique

### Alertes "Stale" (Inactifs)

**Critères** :
- Statut : `active`
- Dernière activité : > 90 jours
- Sévérité : `medium`

**Détection** :
- Membres : `lastActivityAt < (now - 90 jours)`
- Mécènes : `updatedAt < (now - 90 jours)`

### Alertes "Haut Potentiel"

**Critères membres** :
- Statut : `proposed`
- Score d'engagement : >= 15
- Sévérité : `high`

**Critères mécènes** :
- Statut : `proposed`
- Créé récemment : < 30 jours
- A des métriques récentes OU créé récemment
- Sévérité : `high`

## 📈 Métriques enregistrées

### Types de métriques

- `status_change` : Changement de statut (proposed → active, etc.)
- `conversion` : Conversion réussie (proposed → active)
- `engagement` : Activité d'engagement
- `activity` : Activité générale

### Enregistrement automatique

Les métriques sont créées automatiquement lors de :
1. **Proposition** : `status_change` avec description "Membre/Mécène proposé par [email]"
2. **Changement de statut** : `status_change` avec ancien/nouveau statut
3. **Conversion** : `conversion` quand `proposed` → `active`

## 🎨 Interface utilisateur

### Dashboard

**Statistiques** :
- Total, actifs, proposés, haut potentiel, inactifs
- Pour membres et mécènes séparément

**Graphiques** :
- Tendances d'engagement sur 7 jours
- Tooltips interactifs
- Visualisation membres vs mécènes

**Activité récente** :
- 20 dernières métriques
- Badges colorés par type
- Informations détaillées

### Alertes

**Filtres** :
- Recherche textuelle (titre, message, email, ID, type)
- Sévérité (low, medium, high, critical)
- Type d'entité (member, patron)
- Statut de lecture (read, unread)

**Actions** :
- Marquer comme lu/non lu
- Résoudre les alertes
- Générer manuellement

## ⌨️ Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl/Cmd + K` | Rafraîchir toutes les données |
| `Ctrl/Cmd + E` | Exporter (métriques ou alertes) |
| `Ctrl/Cmd + G` | Générer les alertes (onglet alertes) |
| `Échap` | Réinitialiser tous les filtres |

## 🔧 Maintenance

### Index de base de données

**Vérification des index** :
```sql
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename IN ('tracking_metrics', 'tracking_alerts')
ORDER BY tablename, indexname;
```

**Création manuelle des index** :
Si les index n'ont pas été créés automatiquement par Drizzle ORM, vous pouvez utiliser le script de migration :
```bash
psql -d your_database -f scripts/migrations/tracking-indexes.sql
```

**Script de migration** : `scripts/migrations/tracking-indexes.sql`

### Nettoyage des données

```sql
-- Supprimer les métriques de plus d'un an
DELETE FROM tracking_metrics 
WHERE recorded_at < NOW() - INTERVAL '1 year';

-- Supprimer les alertes résolues de plus de 6 mois
DELETE FROM tracking_alerts 
WHERE is_resolved = true 
AND resolved_at < NOW() - INTERVAL '6 months';
```

### Monitoring

**Logs à surveiller** :
- Génération automatique des alertes : `server/utils/tracking-scheduler.ts`
- Erreurs de tracking : `server/storage.ts`
- Performance du dashboard : Temps de réponse API

**Métriques à surveiller** :
- Nombre de métriques créées par jour
- Nombre d'alertes générées
- Taux d'erreur des requêtes
- Temps de réponse du dashboard

## 🐛 Dépannage

### Les données ne se chargent pas

1. Vérifier les permissions (`admin.view` minimum)
2. Vérifier la connexion réseau
3. Utiliser `Ctrl/Cmd + K` pour rafraîchir
4. Consulter les messages d'erreur affichés
5. Vérifier les logs serveur

### Les alertes ne se génèrent pas

1. Vérifier les permissions (`admin.manage` requis)
2. Vérifier que le scheduler est actif (logs serveur)
3. Générer manuellement avec `Ctrl/Cmd + G`
4. Vérifier la configuration `TRACKING_ALERTS_INTERVAL_MINUTES`
5. Vérifier que `DISABLE_TRACKING_SCHEDULER` n'est pas défini

### L'export échoue

1. Vérifier la plage de dates (début < fin, max 1 an)
2. Vérifier qu'il y a des données à exporter
3. Vérifier les permissions d'écriture du navigateur
4. Consulter les messages d'erreur affichés

## 📚 Documentation

- **Guide complet** : [TRACKING.md](TRACKING.md) - Documentation technique complète
- **Guide de démarrage rapide** : [TRACKING-QUICK-START.md](TRACKING-QUICK-START.md) - Guide pratique avec exemples
- **Résumé technique** : [TRACKING-SUMMARY.md](TRACKING-SUMMARY.md) - Vue d'ensemble et architecture

## 🔗 Liens utiles

- **Dashboard** : `/admin/tracking`
- **API Dashboard** : `GET /api/tracking/dashboard`
- **API Alertes** : `GET /api/tracking/alerts`
- **API Métriques** : `GET /api/tracking/metrics`

## 📝 Notes de version

### Version 1.1.0 (2025-01-29)

**Améliorations** :
- Retry automatique avec backoff exponentiel
- Gestion d'erreurs améliorée
- Validation côté client pour les exports
- Raccourcis clavier
- Statistiques filtrées en temps réel
- Amélioration de l'accessibilité
- Optimisations de performance
- Guide de démarrage rapide

### Version 1.0.0 (2025-01-29)

**Fonctionnalités initiales** :
- Système de base de données complet
- Backend avec 7 méthodes de tracking
- API REST avec 7 endpoints
- Dashboard interactif
- Tracking automatique intégré
- Planification automatique des alertes
- Export CSV

## 🤝 Contribution

Pour contribuer au système de suivi transversal :

1. Lire la documentation complète dans `docs/features/TRACKING.md`
2. Suivre les patterns existants dans `server/storage.ts` et `server/routes.ts`
3. Tester les modifications avec les données de test
4. Mettre à jour la documentation si nécessaire

## 📞 Support

Pour toute question ou problème :
1. Consulter la documentation dans `docs/features/`
2. Vérifier les logs serveur
3. Examiner les messages d'erreur dans l'interface
4. Consulter le guide de dépannage dans `TRACKING-QUICK-START.md`

