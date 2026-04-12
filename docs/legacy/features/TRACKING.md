# Système de Suivi Transversal

## Vue d'ensemble

Le système de suivi transversal permet de suivre et analyser l'engagement des membres potentiels et des mécènes de l'organisation. Il fournit des métriques détaillées, des alertes automatiques et un dashboard complet pour le suivi des conversions et de l'activité.

**Version** : 1.1.0  
**Dernière mise à jour** : 2025-01-29

> 💡 **Nouveau** : Consultez le [Guide de démarrage rapide](TRACKING-QUICK-START.md) pour des exemples pratiques et des cas d'usage courants.

## Changelog

### Version 1.1.0 (2025-01-29)
- ✅ Retry automatique avec backoff exponentiel
- ✅ Gestion d'erreurs améliorée avec messages clairs
- ✅ Validation côté client pour les exports
- ✅ Raccourcis clavier pour améliorer la productivité
- ✅ Statistiques filtrées en temps réel
- ✅ Amélioration de l'accessibilité (ARIA labels)
- ✅ Optimisations de performance (useMemo)
- ✅ Indicateur de rafraîchissement automatique

### Version 1.0.0 (2025-01-29)
- ✅ Système de base de données complet
- ✅ Backend avec 7 méthodes de tracking
- ✅ API REST avec 7 endpoints
- ✅ Dashboard interactif
- ✅ Tracking automatique intégré
- ✅ Planification automatique des alertes
- ✅ Export CSV des métriques et alertes

## Fonctionnalités principales

### 1. Métriques de tracking

Le système enregistre automatiquement des métriques lors des actions importantes :

- **Propositions** : Lorsqu'un membre ou mécène est proposé
- **Changements de statut** : Passage de `proposed` à `active`
- **Conversions** : Détection automatique des conversions réussies
- **Activités** : Suivi des interactions et engagements

### 2. Dashboard de suivi

Le dashboard (`/admin/tracking`) fournit :

- **Statistiques en temps réel** :
  - Total de membres/mécènes
  - Membres/mécènes actifs
  - Membres/mécènes proposés
  - Membres/mécènes à haut potentiel
  - Membres/mécènes inactifs (stale)

- **Taux de conversion** :
  - Pourcentage de conversions `proposed` → `active`
  - Calculé séparément pour membres et mécènes
  - Indicateurs visuels (Excellent ≥50%, Bon 25-49%, À améliorer <25%)

- **Graphiques de tendances** :
  - Évolution de l'engagement sur 7 jours
  - Visualisation des activités membres vs mécènes
  - Tooltips interactifs avec détails par jour
  - Affichage du total quotidien

- **Activité récente** :
  - Dernières métriques enregistrées (20 dernières)
  - Historique des actions importantes
  - Badges colorés par type de métrique
  - Informations détaillées (email, description, timestamp)

### 3. Système d'alertes

#### Types d'alertes automatiques

1. **Alertes "Stale" (Inactifs)** :
   - Déclenchées pour les membres/mécènes sans activité depuis 90 jours
   - Sévérité : `medium`
   - Type : `stale`

2. **Alertes "Haut Potentiel"** :
   - Déclenchées pour les membres/mécènes proposés avec un score d'engagement élevé
   - Sévérité : `high`
   - Type : `high_potential`

3. **Alertes "Besoin de suivi"** :
   - Déclenchées pour les entités nécessitant une attention particulière
   - Sévérité : variable
   - Type : `needs_followup`

4. **Alertes "Opportunité de conversion"** :
   - Déclenchées pour les entités proposées prêtes à être converties
   - Sévérité : `medium`
   - Type : `conversion_opportunity`

#### Gestion des alertes

- **Filtres disponibles** :
  - Par sévérité (faible, moyenne, élevée, critique)
  - Par type d'entité (membres, mécènes)
  - Par statut de lecture (lues, non lues)
  - Recherche textuelle (titre, message, email)

- **Actions** :
  - Marquer comme lu/non lu
  - Résoudre les alertes
  - Génération manuelle des alertes

### 4. Export de données

#### Export des métriques

- Format : CSV
- Filtres : Plage de dates (début/fin)
- Colonnes :
  - Date
  - Type (Membre/Mécène)
  - ID Entité
  - Email
  - Type métrique
  - Valeur
  - Description
  - Enregistré par

#### Export des alertes

- Format : CSV
- Filtres : Applique les filtres actifs de l'interface
- Colonnes :
  - Date
  - Type (Membre/Mécène)
  - ID Entité
  - Email
  - Type alerte
  - Sévérité
  - Titre
  - Message
  - Statut (Résolu/Lu/Non lu)

## Architecture technique

### Base de données

#### Table `tracking_metrics`

Enregistre toutes les métriques de suivi :

```sql
- id (UUID, PK)
- entity_type ('member' | 'patron')
- entity_id (UUID)
- entity_email (string)
- metric_type (string)
- metric_value (number)
- description (text, nullable)
- recorded_at (timestamp)
- recorded_by (string, nullable)
```

#### Table `tracking_alerts`

Gère les alertes de suivi :

```sql
- id (UUID, PK)
- entity_type ('member' | 'patron')
- entity_id (UUID)
- entity_email (string)
- alert_type (string)
- severity ('low' | 'medium' | 'high' | 'critical')
- title (string)
- message (text)
- is_read (boolean)
- is_resolved (boolean)
- created_at (timestamp)
- created_by (string, nullable)
- resolved_at (timestamp, nullable)
- resolved_by (string, nullable)
- expires_at (timestamp, nullable)
```

### API Endpoints

#### Dashboard

- `GET /api/tracking/dashboard`
  - Retourne les statistiques agrégées
  - Inclut : compteurs, taux de conversion, tendances, activité récente
  - Permission : `admin.view`

#### Métriques

- `GET /api/tracking/metrics`
  - Récupère les métriques avec filtres optionnels
  - Paramètres : `entityType`, `entityId`, `entityEmail`, `metricType`, `startDate`, `endDate`, `limit`
  - Permission : `admin.view`

- `POST /api/tracking/metrics`
  - Crée une nouvelle métrique
  - Body : `entityType`, `entityId`, `entityEmail`, `metricType`, `metricValue`, `description`, `recordedBy`
  - Permission : `admin.manage`

#### Alertes

- `GET /api/tracking/alerts`
  - Récupère les alertes avec filtres optionnels
  - Paramètres : `entityType`, `entityId`, `isRead`, `isResolved`, `severity`, `limit`
  - Permission : `admin.view`

- `POST /api/tracking/alerts`
  - Crée une nouvelle alerte
  - Body : `entityType`, `entityId`, `entityEmail`, `alertType`, `severity`, `title`, `message`, `createdBy`
  - Permission : `admin.manage`

- `PUT /api/tracking/alerts/:id`
  - Met à jour une alerte (marquer comme lu, résoudre)
  - Body : `isRead`, `isResolved`
  - Permission : `admin.manage`

- `POST /api/tracking/alerts/generate`
  - Génère automatiquement les alertes
  - Analyse les membres/mécènes et crée les alertes appropriées
  - Permission : `admin.manage`

### Tracking automatique

Le système enregistre automatiquement des métriques lors des actions suivantes :

#### Propositions

- **Membre proposé** (`POST /api/members/propose`) :
  - Métrique `status_change` avec description "Membre proposé par [email]"

- **Mécène proposé** (`POST /api/patrons/propose`) :
  - Métrique `status_change` avec description "Mécène proposé par [email]"

#### Changements de statut

- **Mise à jour membre** (`PATCH /api/admin/members/:email`) :
  - Si changement de statut : métrique `status_change`
  - Si `proposed` → `active` : métrique `conversion`

- **Mise à jour mécène** (`PATCH /api/patrons/:id`) :
  - Si changement de statut : métrique `status_change`
  - Si `proposed` → `active` : métrique `conversion`

## Utilisation

### Accès au dashboard

1. Se connecter en tant qu'administrateur avec permission `admin.view`
2. Naviguer vers `/admin/tracking`
3. Le dashboard s'affiche avec les statistiques en temps réel

### Génération des alertes

**Méthode 1 - Manuellement** :
1. Aller dans l'onglet "Alertes"
2. Cliquer sur le bouton "Générer les alertes"
3. Ou utiliser le raccourci `Ctrl/Cmd + G`
4. Le système analyse automatiquement :
   - Les membres/mécènes inactifs (90 jours) → Alertes "stale"
   - Les membres avec score d'engagement ≥ 15 → Alertes "high_potential"
   - Les mécènes proposés récemment (< 30 jours) → Alertes "high_potential"
5. Les alertes sont créées et affichées dans la liste
6. Un message de confirmation affiche le nombre d'alertes créées

**Méthode 2 - Automatiquement** :
- Les alertes sont générées automatiquement toutes les 24 heures (configurable)
- Exécution immédiate au démarrage du serveur
- Configurable via `TRACKING_ALERTS_INTERVAL_MINUTES`
- Désactivable via `DISABLE_TRACKING_SCHEDULER=1`

### Filtrage des alertes

**Recherche** :
1. Utiliser la barre de recherche pour filtrer par texte dans :
   - Titres des alertes
   - Messages des alertes
   - Emails des entités
   - IDs des entités
   - Types d'alertes
2. Le bouton "X" permet d'effacer rapidement la recherche
3. Raccourci : `Échap` pour réinitialiser tous les filtres

**Filtres** :
1. **Sévérité** : Filtrer par `low`, `medium`, `high`, ou `critical`
2. **Type d'entité** : Filtrer par `member` (Membres) ou `patron` (Mécènes)
3. **Statut de lecture** : Filtrer par `read` (Lues) ou `unread` (Non lues)
4. Les résultats se mettent à jour en temps réel
5. Les statistiques filtrées s'affichent automatiquement (total, non lues, critiques, élevées)
6. Cliquer sur "Réinitialiser" pour effacer tous les filtres

### Export des données

**Export des métriques** :
1. Aller dans l'onglet "Dashboard"
2. Sélectionner une plage de dates (début et fin)
3. Cliquer sur "Exporter métriques"
4. Ou utiliser le raccourci `Ctrl/Cmd + E` (dans l'onglet Dashboard)
5. Le fichier CSV est téléchargé avec toutes les métriques de la période
6. **Validation automatique** :
   - Vérification que date début < date fin
   - Limite de 1 an maximum
   - Avertissement si aucune métrique trouvée

**Export des alertes** :
1. Aller dans l'onglet "Alertes"
2. Appliquer les filtres souhaités (sévérité, type, statut, recherche)
3. Cliquer sur "Exporter alertes (X)" où X est le nombre d'alertes filtrées
4. Ou utiliser le raccourci `Ctrl/Cmd + E` (dans l'onglet Alertes)
5. Le fichier CSV est téléchargé avec les alertes filtrées
6. **Validation automatique** : Avertissement si aucune alerte à exporter

## Calculs et métriques

### Taux de conversion

Le taux de conversion mesure le pourcentage de membres/mécènes qui sont passés de `proposed` à `active`.

```
Taux de conversion = (Nombre de membres/mécènes actifs / (Nombre proposés + Nombre actifs)) × 100
```

**Calcul détaillé** :
- **Membres** : 
  - Convertis = Membres avec statut `active` et `firstSeenAt` défini
  - Taux = Convertis / (Proposés + Convertis) × 100

- **Mécènes** :
  - Convertis = Mécènes avec statut `active` et `createdAt` défini
  - Taux = Convertis / (Proposés + Convertis) × 100

**Note** : Le calcul inclut les membres/mécènes actifs dans le dénominateur pour refléter le taux réel de conversion parmi tous les candidats (proposés + convertis).

### Détection "Haut Potentiel"

Un membre/mécène est considéré à haut potentiel si :
- Statut : `proposed`
- Score d'engagement élevé (basé sur les activités)
- Activité récente significative

### Détection "Stale" (Inactif)

Un membre/mécène est considéré inactif si :
- Aucune activité depuis 90 jours
- Statut : `active` ou `proposed`
- Pas de métrique récente

## Permissions

- **`admin.view`** : Consultation du dashboard et des métriques/alertes
- **`admin.manage`** : Création de métriques/alertes, génération d'alertes, résolution

## Maintenance

### Génération automatique des alertes

Le système inclut une génération automatique des alertes qui s'exécute en arrière-plan :

1. **Automatique** : 
   - Par défaut, les alertes sont générées toutes les 24 heures
   - Configurable via la variable d'environnement `TRACKING_ALERTS_INTERVAL_MINUTES`
   - Exemple : `TRACKING_ALERTS_INTERVAL_MINUTES=720` pour toutes les 12 heures

2. **Manuel** : 
   - Utiliser le bouton "Générer les alertes" dans l'interface `/admin/tracking`
   - Ou utiliser le raccourci `Ctrl/Cmd + G`
   - Appeler directement l'API `POST /api/tracking/alerts/generate`

3. **Désactivation** :
   - Définir `DISABLE_TRACKING_SCHEDULER=1` pour désactiver la génération automatique

**Note** : La génération automatique s'exécute immédiatement au démarrage du serveur, puis selon l'intervalle configuré.

### Optimisation des performances

**Index de base de données recommandés** :

Pour améliorer les performances des requêtes, il est recommandé de créer les index suivants :

```sql
-- Index pour tracking_metrics
CREATE INDEX IF NOT EXISTS idx_tracking_metrics_entity 
  ON tracking_metrics(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tracking_metrics_email 
  ON tracking_metrics(entity_email);
CREATE INDEX IF NOT EXISTS idx_tracking_metrics_recorded_at 
  ON tracking_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_metrics_type 
  ON tracking_metrics(metric_type);

-- Index pour tracking_alerts
CREATE INDEX IF NOT EXISTS idx_tracking_alerts_entity 
  ON tracking_alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tracking_alerts_status 
  ON tracking_alerts(is_read, is_resolved);
CREATE INDEX IF NOT EXISTS idx_tracking_alerts_severity 
  ON tracking_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_tracking_alerts_created_at 
  ON tracking_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_alerts_type 
  ON tracking_alerts(alert_type);
```

**Note** : Ces index sont créés automatiquement par Drizzle ORM lors de la première migration si la configuration le permet. Sinon, ils peuvent être créés manuellement avec les commandes SQL ci-dessus.

**Script de migration** : Un script SQL complet est disponible dans `scripts/migrations/tracking-indexes.sql` pour créer manuellement tous les index si nécessaire.

### Nettoyage des données

Les métriques et alertes sont conservées indéfiniment. Pour nettoyer les données anciennes :

```sql
-- Supprimer les métriques de plus d'un an
DELETE FROM tracking_metrics 
WHERE recorded_at < NOW() - INTERVAL '1 year';

-- Supprimer les alertes résolues de plus de 6 mois
DELETE FROM tracking_alerts 
WHERE is_resolved = true 
AND resolved_at < NOW() - INTERVAL '6 months';
```

## Exemples d'utilisation

### Suivre une proposition de membre

1. Un membre est proposé via `/api/members/propose`
2. Une métrique `status_change` est automatiquement créée
3. L'alerte "Haut Potentiel" peut être générée si le score est élevé
4. Lors de la conversion en `active`, une métrique `conversion` est créée

### Analyser les conversions

1. Accéder au dashboard `/admin/tracking`
2. Consulter le taux de conversion affiché
3. Exporter les métriques de conversion pour analyse détaillée
4. Filtrer les alertes par type "conversion_opportunity"

### Gérer les membres inactifs

1. Générer les alertes automatiquement
2. Filtrer les alertes par type "stale"
3. Examiner les membres inactifs
4. Prendre des actions de relance si nécessaire

## Détection des alertes

### Critères de détection

#### Alertes "Stale" (Inactifs)

**Membres** :
- Statut : `active`
- Dernière activité : > 90 jours
- Sévérité : `medium`

**Mécènes** :
- Statut : `active`
- Dernière mise à jour : > 90 jours
- Sévérité : `medium`

#### Alertes "Haut Potentiel"

**Membres** :
- Statut : `proposed`
- Score d'engagement : >= 15
- Sévérité : `high`

**Mécènes** :
- Statut : `proposed`
- Créé récemment : < 30 jours
- A des métriques récentes OU a été créé récemment
- Sévérité : `high`

### Fréquence de génération

- **Par défaut** : Toutes les 24 heures
- **Configurable** : Via `TRACKING_ALERTS_INTERVAL_MINUTES`
- **Exécution** : Immédiate au démarrage du serveur, puis selon l'intervalle

## Gestion d'erreurs et robustesse

### Retry automatique

Le système inclut un mécanisme de retry automatique pour les requêtes :

- **Nombre de tentatives** : 3 tentatives en cas d'échec
- **Délai exponentiel** : 1s, 2s, 4s (max 30s)
- **Rafraîchissement automatique** : 
  - Lors du retour du focus sur la fenêtre
  - Lors de la reconnexion réseau
  - Selon l'intervalle configuré (60s pour dashboard, 30s pour alertes)

### Gestion des erreurs

- **Messages d'erreur clairs** : Affichage des messages d'erreur du serveur
- **Boutons de réessai** : Possibilité de réessayer manuellement
- **Validation côté client** : Vérification des dates et plages avant export
- **Feedback utilisateur** : Toasts informatifs pour toutes les actions

### Validation des exports

- **Plage de dates** : Vérification que la date de début < date de fin
- **Limite de plage** : Maximum 1 an pour éviter les exports trop volumineux
- **Vérification de données** : Avertissement si aucune donnée à exporter

## Raccourcis clavier

Le dashboard supporte plusieurs raccourcis clavier pour améliorer la productivité :

- **Ctrl/Cmd + K** : Rafraîchir toutes les données
- **Ctrl/Cmd + E** : Exporter (métriques ou alertes selon l'onglet)
- **Ctrl/Cmd + G** : Générer les alertes (onglet alertes uniquement)
- **Échap** : Réinitialiser tous les filtres et la recherche

## Guide de démarrage rapide

### Première utilisation

1. **Accéder au dashboard** :
   - Se connecter en tant que super-admin
   - Cliquer sur "Suivi" dans le menu admin
   - Ou accéder directement à `/admin/tracking`

2. **Comprendre le dashboard** :
   - **Onglet Dashboard** : Vue d'ensemble avec statistiques et graphiques
   - **Onglet Alertes** : Liste des alertes avec filtres et recherche

3. **Générer les alertes** :
   - Cliquer sur "Générer les alertes" dans l'onglet Alertes
   - Ou utiliser le raccourci `Ctrl/Cmd + G`
   - Les alertes sont aussi générées automatiquement toutes les 24h

4. **Exporter des données** :
   - **Métriques** : Sélectionner une plage de dates, puis "Exporter métriques"
   - **Alertes** : Appliquer des filtres si nécessaire, puis "Exporter alertes"
   - Ou utiliser le raccourci `Ctrl/Cmd + E`

### Exemples d'utilisation

#### Exemple 1 : Identifier les membres à haut potentiel

1. Accéder au dashboard
2. Consulter la carte "Membres" → "Haut potentiel"
3. Aller dans l'onglet "Alertes"
4. Filtrer par type "high_potential" et sévérité "high"
5. Examiner les alertes pour identifier les membres prioritaires

#### Exemple 2 : Analyser les conversions

1. Consulter le taux de conversion dans le dashboard
2. Si le taux est faible (< 25%), examiner les alertes "conversion_opportunity"
3. Exporter les métriques de conversion pour analyse détaillée
4. Filtrer par type de métrique "conversion" dans l'export

#### Exemple 3 : Suivre les membres inactifs

1. Générer les alertes manuellement (`Ctrl/Cmd + G`)
2. Filtrer les alertes par type "stale"
3. Examiner les membres inactifs depuis plus de 90 jours
4. Exporter la liste pour planifier des actions de relance

#### Exemple 4 : Analyser les tendances

1. Consulter le graphique "Tendances d'engagement" (7 derniers jours)
2. Identifier les jours avec le plus d'activité
3. Examiner l'activité récente pour comprendre les patterns
4. Utiliser les filtres de dates pour analyser des périodes spécifiques

### Bonnes pratiques

1. **Générer les alertes régulièrement** :
   - Au moins une fois par jour
   - Après des changements importants de statuts
   - Utiliser la génération automatique (configurée par défaut)

2. **Examiner les alertes critiques en priorité** :
   - Filtrer par sévérité "critical"
   - Traiter rapidement les alertes non lues
   - Résoudre les alertes après traitement

3. **Exporter régulièrement les données** :
   - Exporter les métriques mensuellement pour archivage
   - Exporter les alertes résolues pour historique
   - Utiliser des plages de dates raisonnables (< 1 an)

4. **Utiliser les raccourcis clavier** :
   - `Ctrl/Cmd + K` pour rafraîchir les données
   - `Ctrl/Cmd + E` pour exporter rapidement
   - `Échap` pour réinitialiser les filtres

## Évolutions futures

- [ ] Notifications en temps réel (WebSocket)
- [ ] Graphiques interactifs plus avancés
- [ ] Prédictions basées sur l'IA
- [ ] Intégration avec systèmes CRM externes
- [ ] Rapports automatisés par email
- [ ] Tableaux de bord personnalisables
- [ ] Notifications push pour alertes critiques
- [ ] Export PDF en plus du CSV
- [ ] Historique détaillé par membre/mécène

