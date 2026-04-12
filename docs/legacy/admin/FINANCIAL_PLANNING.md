# Prévisionnel et Pilotage Financier - Guide Utilisateur

**Date :** 2025-01-29  
**Version :** 1.0

## Vue d'ensemble

Le module de prévisionnel et pilotage financier permet de gérer les budgets, dépenses, prévisions et rapports financiers de l'association. Il offre une vision complète de la situation financière avec des comparaisons entre réel et prévu.

## Accès

Le module est accessible uniquement aux **super administrateurs** via le menu **Finances** dans l'interface d'administration.

## Fonctionnalités principales

### 1. Tableau de bord financier

**Route :** `/admin/finance/dashboard`

Le tableau de bord offre une vue d'ensemble avec :
- **KPIs étendus** : Revenus et dépenses réels vs prévus/budgétés avec écarts
- **Graphiques d'évolution** : Tendances sur plusieurs périodes
- **Écarts et variances** : Alertes visuelles pour les écarts significatifs
- **Prévisions** : Projections pour les périodes à venir

### 2. Gestion des budgets

**Route :** `/admin/finance/budgets`

#### Créer un budget

1. Cliquer sur **"Nouveau budget"**
2. Remplir le formulaire :
   - **Nom** : Nom du budget (ex: "Budget Q1 2025")
   - **Catégorie** : Catégorie budgétaire (revenus ou dépenses)
   - **Période** : Mois, trimestre ou année
   - **Année** : Année concernée
   - **Montant** : Montant en euros
   - **Description** : Description optionnelle
3. Cliquer sur **"Créer"**

#### Modifier un budget

1. Cliquer sur le budget dans la liste
2. Modifier les champs souhaités
3. Cliquer sur **"Enregistrer"**

#### Supprimer un budget

1. Cliquer sur **"Supprimer"** dans les actions du budget
2. Confirmer la suppression

#### Filtrer les budgets

- **Période** : Filtrer par mois, trimestre ou année
- **Catégorie** : Filtrer par catégorie budgétaire
- **Année** : Filtrer par année
- **Recherche** : Recherche textuelle dans les noms et descriptions

### 3. Gestion des dépenses

**Route :** `/admin/finance/expenses`

#### Créer une dépense

1. Cliquer sur **"Nouvelle dépense"**
2. Remplir le formulaire :
   - **Catégorie** : Catégorie de dépense
   - **Description** : Description de la dépense
   - **Montant** : Montant en euros
   - **Date** : Date de la dépense
   - **Méthode de paiement** : Espèces, chèque, virement, carte
   - **Fournisseur** : Nom du fournisseur (optionnel)
   - **Budget associé** : Lier à un budget existant (optionnel)
   - **Justificatif** : Upload d'un fichier (reçu, facture, etc.)
3. Cliquer sur **"Créer"**

#### Modifier une dépense

1. Cliquer sur la dépense dans la liste
2. Modifier les champs souhaités
3. Cliquer sur **"Enregistrer"**

#### Supprimer une dépense

1. Cliquer sur **"Supprimer"** dans les actions de la dépense
2. Confirmer la suppression

#### Filtrer les dépenses

- **Période** : Filtrer par période
- **Catégorie** : Filtrer par catégorie
- **Budget** : Filtrer par budget associé
- **Recherche** : Recherche textuelle dans les descriptions

### 4. Gestion des prévisions

**Route :** `/admin/finance/forecasts`

#### Générer des prévisions automatiques

1. Cliquer sur **"Générer les prévisions"**
2. Sélectionner la **période** (mois, trimestre, année)
3. Sélectionner l'**année**
4. Cliquer sur **"Générer"**

Le système analyse l'historique (souscriptions, sponsorings, dépenses) et génère des prévisions avec :
- **Niveau de confiance** : High, Medium, Low
- **Base de calcul** : Historical (historique) ou Estimate (estimation)

#### Ajuster manuellement une prévision

1. Cliquer sur une prévision dans la liste
2. Modifier le montant prévu
3. Ajuster le niveau de confiance si nécessaire
4. Ajouter des notes
5. Cliquer sur **"Enregistrer"**

### 5. Rapports financiers

**Route :** `/admin/finance/reports`

#### Générer un rapport

1. Sélectionner le **type de rapport** :
   - **Mensuel** : Rapport pour un mois
   - **Trimestriel** : Rapport pour un trimestre
   - **Annuel** : Rapport pour une année
2. Sélectionner la **période** et l'**année**
3. Cliquer sur **"Générer le rapport"**

#### Contenu des rapports

Les rapports incluent :
- **Revenus détaillés** : Souscriptions, sponsorings, autres revenus
- **Dépenses par catégorie** : Détail des dépenses
- **Écarts budget vs réel** : Comparaison avec les budgets
- **Prévisions période suivante** : Projections

#### Exporter un rapport

1. Générer le rapport
2. Cliquer sur **"Exporter en PDF"** ou **"Exporter en CSV"**
3. Le fichier sera téléchargé

## Catégories financières

Les catégories sont organisées hiérarchiquement :
- **Revenus** : Souscriptions, Sponsorings, Autres revenus
- **Dépenses** : Personnel, Matériel, Communication, Événements, Autres

Les catégories par défaut sont créées automatiquement lors de la migration.

## Calculs et métriques

### Écarts (Variances)

- **Écart revenus** = Revenus réels - Revenus prévus
- **Écart dépenses** = Dépenses réelles - Dépenses budgétées
- **Écart solde** = Solde réel - Solde prévu

### Taux de réalisation

Le taux de réalisation est calculé comme suit :
```
Taux de réalisation = (Revenus réels / Revenus prévus) * 100
```

### Niveaux de confiance des prévisions

- **High** : Données historiques suffisantes (> 6 mois)
- **Medium** : Données historiques partielles (3-6 mois)
- **Low** : Données historiques insuffisantes (< 3 mois) ou estimation

## Bonnes pratiques

1. **Créer les budgets en début de période** : Définir les budgets avant le début de la période concernée
2. **Enregistrer les dépenses régulièrement** : Saisir les dépenses au fur et à mesure pour un suivi précis
3. **Associer les dépenses aux budgets** : Lier les dépenses aux budgets pour un suivi automatique
4. **Générer les prévisions régulièrement** : Mettre à jour les prévisions chaque mois/trimestre
5. **Analyser les écarts** : Examiner les écarts significatifs pour comprendre les variations
6. **Exporter les rapports** : Sauvegarder les rapports pour archivage et communication

## Permissions

- **super_admin** : Accès complet (création, modification, suppression, consultation)
- **finance_reader** : Consultation uniquement (lecture des budgets, dépenses, prévisions, rapports)

## Support

Pour toute question ou problème, consulter la documentation technique ou contacter l'administrateur système.




