# Guide Utilisateur - Administration CJD Amiens

**Version :** 1.0  
**Date :** 2025-01-29

## Vue d'ensemble

L'interface d'administration de la Boîte à Kiffs est organisée en modules fonctionnels pour faciliter la gestion de l'association.

## Navigation

### Menu Principal

Le menu principal est organisé en modules :

- **Dashboard** : Vue d'ensemble avec KPIs et statistiques
- **CRM** : Gestion des membres et mécènes
  - Membres
  - Mécènes
- **Contenu** : Gestion du contenu
  - Idées
  - Événements
  - Prêt
- **Finances** : Gestion financière (Super Admin uniquement)
  - Sponsorings
- **Suivi** : Suivi transversal et alertes
- **Paramètres** : Configuration (Super Admin uniquement)
  - Branding
  - Email SMTP

### Breadcrumbs

Les breadcrumbs permettent de naviguer rapidement dans la hiérarchie :
- Accueil > CRM > Membres
- Accueil > Contenu > Idées

## Modules

### Dashboard

Le dashboard unifié affiche :
- Statistiques globales (membres, mécènes, idées, événements)
- KPIs financiers (souscriptions, sponsorings)
- KPIs d'engagement (conversion, rétention, churn)
- Métriques de tracking
- Actions rapides

### CRM - Membres

**Vues disponibles :**
- **Pipeline** : Vue Kanban pour les prospects (Proposé, Contacté, Converti)
- **Tableau** : Vue tableau pour les prospects
- **Liste** : Vue liste pour les membres actifs
- **Cartes** : Vue cartes pour les membres actifs

**Filtres :**
- Statut (Tous, Actifs, Proposés)
- Score d'engagement (Tous, Élevé, Moyen, Faible)
- Activité (Tous, Récent, Inactif)
- Recherche textuelle

**Fiche membre :**
- **Profil** : Informations, statistiques, performance
- **Activité** : Historique des activités, souscriptions
- **Gestion** : Tags, tâches, relations
- **Chatbot** : Assistant IA pour questions sur le membre

### CRM - Mécènes

Gestion complète des mécènes avec :
- Liste paginée
- Fiche détaillée
- Gestion des donations
- Gestion des sponsorings liés

### Contenu - Idées

Gestion des idées proposées :
- Liste avec filtres par statut
- Détails et votes
- Transformation en événement

### Contenu - Événements

Gestion des événements :
- Création et édition
- Gestion des inscriptions
- Export des inscriptions (CSV, TXT)
- Intégration HelloAsso

### Contenu - Prêt

Gestion du matériel disponible au prêt :
- Liste des items
- Statuts (En attente, Disponible, Emprunté, Indisponible)
- Photos et descriptions

### Finances - Sponsorings

Gestion des sponsorings d'événements :
- Liste avec filtres (statut, niveau)
- Création/édition
- Statistiques (total, par niveau, par statut)
- Association événement + mécène

### Suivi

Dashboard de suivi transversal :
- **Dashboard** : Statistiques agrégées, graphiques, activité récente
- **Alertes** : Alertes automatiques et manuelles
  - Filtres par sévérité, type, statut
  - Export CSV

### Paramètres

**Branding :**
- Configuration des couleurs
- Logo et images
- Personnalisation de l'interface

**Email SMTP :**
- Configuration du serveur SMTP
- Test d'envoi

## KPIs et Rapports

### KPIs Financiers

Accessibles via `/api/admin/kpis/financial` :
- Recettes totales (souscriptions + sponsorings)
- Souscriptions actives
- Revenus mensuels
- Sponsorings par niveau

### KPIs d'Engagement

Accessibles via `/api/admin/kpis/engagement` :
- Taux de conversion (membres, mécènes)
- Taux de rétention
- Taux de churn
- Score moyen d'engagement
- Activités par type

## Exports

### Formats Disponibles

- **CSV** : Export tabulaire standard
- **TXT** : Export texte avec séparateurs

### Données Exportables

- Membres (liste complète)
- Mécènes (liste complète)
- Métriques de tracking
- Alertes de tracking
- Inscriptions aux événements

## Permissions

### Rôles

- **super_admin** : Accès complet à tous les modules
- **ideas_reader** : Consultation des idées
- **ideas_manager** : Gestion complète des idées
- **events_reader** : Consultation des événements
- **events_manager** : Gestion complète des événements

### Restrictions

- Les modules Finances et Paramètres sont réservés aux super_admin
- Certaines actions nécessitent la permission `admin.manage`

## Raccourcis Clavier

- `Ctrl/Cmd + K` : Rafraîchir les données
- `Ctrl/Cmd + E` : Exporter (selon le contexte)
- `Échap` : Réinitialiser les filtres

## Support

Pour toute question ou problème, contactez l'administrateur système.

