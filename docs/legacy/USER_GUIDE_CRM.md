# Guide Utilisateur - Gestion CRM des Membres

## Table des matières

1. [Introduction](#introduction)
2. [Affichage Détails des Membres](#affichage-détails-des-membres)
3. [Gestion des Tags](#gestion-des-tags)
4. [Gestion des Tâches](#gestion-des-tâches)
5. [Gestion des Relations](#gestion-des-relations)
6. [Export CSV](#export-csv)
7. [Tableau de Bord Statistiques](#tableau-de-bord-statistiques)
8. [Bonnes Pratiques](#bonnes-pratiques)

---

## Introduction

Le module CRM de gestion des membres offre six fonctionnalités puissantes pour maintenir et analyser votre base de données de membres. Ces outils permettent aux administrateurs de tracker les interactions, organiser les données et générer des rapports.

### Accès aux fonctionnalités

Seuls les administrateurs (rôle `admin`) ont accès à ces fonctionnalités. Naviguez vers **Menu Admin > Membres** pour accéder à :

- **Affichage Détails** : Vue complète des informations d'un membre
- **Tags** (`/admin/members/tags`) : Gestion des étiquettes personnalisées
- **Tâches** (`/admin/members/tasks`) : Gestion des tâches de suivi
- **Relations** (`/admin/members/relations`) : Gestion des relations entre membres
- **Export** : Télécharger les données en CSV
- **Statistiques** (`/admin/members/stats`) : Analyse et KPIs

---

## Affichage Détails des Membres

### Comment ouvrir le détail d'un membre

1. Accédez à la liste des membres (`/admin/members`)
2. Cherchez le membre souhaité avec la barre de recherche
3. Cliquez sur l'icône **œil** (👁️) à la fin de la ligne du membre
4. Une fenêtre (sheet) s'ouvre à droite de l'écran

### Contenu du détail

Le détail du membre affiche quatre onglets principalement :

#### Onglet Cotisations

Affiche toutes les cotisations enregistrées pour ce membre :
- Montant (en euros)
- Type de cotisation (ex: annuelle, mensuelle)
- Dates de début et fin
- Statut (active, expired)
- Méthode de paiement

**Utilité** : Vérifier l'historique de paiement et le statut de souscription.

#### Onglet Tags

Affiche tous les tags (étiquettes) assignés au membre avec leurs couleurs respectives.

**Utilité** : Voir rapidement les catégories auxquelles appartient ce membre sans basculer vers la gestion des tags.

#### Onglet Tâches

Affiche les tâches de suivi créées pour ce membre :
- Titre et type (appel, email, réunion, autre)
- Statut (À faire, En cours, Complété, Annulé)
- Échéance

**Utilité** : Consulter rapidement les suivis en attente pour ce membre.

#### Onglet Activités

Affiche l'historique complet des actions effectuées sur ce membre :
- Description de l'activité
- Date et heure

**Utilité** : Auditer les modifications et suivre l'historique complet.

### Informations de base affichées

- **Nom et Email** : Identifiants principaux
- **Statut** : Actif, Prospect, Inactif (avec badge coloré)
- **Score d'engagement** : Indicateur de sa participation
- **Entreprise** : Affiliation professionnelle
- **Téléphone** : Contact direct
- **Fonction** : Titre du poste
- **Rôle CJD** : Rôle spécifique dans l'organisation
- **Proposé par** : Qui a recommandé ce membre
- **Membre depuis** : Date d'adhésion
- **Notes** : Informations libres saisies

### Comment fermer

Cliquez en dehors de la fenêtre ou sur le bouton de fermeture (×) en haut à droite.

---

## Gestion des Tags

### Accès

Allez à **Admin > Membres > Tags** ou directement à `/admin/members/tags`

### Qu'est-ce qu'un tag ?

Un tag est une étiquette personnalisée et colorée permettant de catégoriser rapidement les membres. Exemples :
- **VIP** : Clients importants
- **Ambassadeur** : Représentants de la structure
- **Contributeur** : Membres engagés dans les projets
- **Donateur** : Supports financiers
- **Partenaire** : Collaborateurs externes

### Créer un tag

1. Cliquez sur **"Créer un tag"** (bouton bleu en haut à droite)
2. Complétez le formulaire :
   - **Nom** : 2 à 50 caractères (obligatoire)
   - **Couleur** : Choisissez parmi 8 couleurs prédéfinies ou entrez un code hex personnalisé
   - **Description** : Explique le but du tag (optionnel, max 500 caractères)
3. Regardez la prévisualisation en bas du formulaire
4. Cliquez **"Créer le tag"**

> **Conseil** : Les tags doivent être concis et immédiatement compréhensibles par tous les utilisateurs.

### Modifier un tag

1. Trouvez le tag dans la liste
2. Cliquez l'icône **crayon** (edit) à droite
3. Modifiez le nom, la couleur ou la description
4. Cliquez **"Modifier le tag"**

> **Important** : Modifier un tag affecte immédiatement tous les membres qui l'utilisent. Les changements apparaissent en temps réel.

### Supprimer un tag

1. Cliquez l'icône **poubelle** (delete) à droite
2. Une confirmation s'affiche
3. Si le tag est assigné à des membres, un avertissement s'affiche
4. Cliquez **"Supprimer"** pour confirmer

> **Attention** : La suppression est définitive et ne peut pas être annulée. Les assignations du tag aux membres ne seront pas affectées (le tag reste sur les membres mais n'existe plus comme référence).

### Colonne "Utilisations"

Affiche le nombre de membres ayant ce tag assigné.

**Utilité** : Identifier rapidement les tags peu utilisés que vous pourriez supprimer, ou les tags très utilisés qui sont essentiels.

### Couleur du tag

8 couleurs prédéfinies disponibles :
- **Bleu** : Standard, neutre
- **Rouge** : Urgent, critique
- **Vert** : Positif, validé
- **Ambre/Orange** : Attention, modéré
- **Violet** : Spécial, exception
- **Rose** : Marketing, engagement
- **Cyan** : Innovation, nouveau
- **Orange** : Énergie, action

Vous pouvez aussi entrer un code **#RRGGBB** personnalisé (ex: #FF5733).

---

## Gestion des Tâches

### Accès

Allez à **Admin > Membres > Tâches** ou directement à `/admin/members/tasks`

### Qu'est-ce qu'une tâche de suivi ?

Une tâche enregistre une action à effectuer auprès d'un membre : appeler, envoyer un email, planifier une réunion, etc. Elle aide à maintenir le contact régulier et structuré.

### 4 Types de tâches

| Type | Description | Utilisation |
|------|-------------|-----------|
| **Appel** | Appel téléphonique | Contact direct, discussion importante |
| **Email** | Communication par email | Envoyer des informations, rapport |
| **Réunion** | Rencontre en personne/visio | Discussions approfondies, négociations |
| **Autre** | Tâche personnalisée | Cas spécifiques (visite, déjeuner, etc.) |

### 4 Statuts de tâche

| Statut | Couleur | Signification |
|--------|--------|--------------|
| **À faire** | Orange | Tâche non commencée, en attente |
| **En cours** | Bleu | Tâche actuellement en cours de réalisation |
| **Complété** | Vert | Tâche terminée avec succès |
| **Annulé** | Gris | Tâche abandonnée ou non applicable |

### Créer une tâche

1. Cliquez **"Créer une tâche"** (bouton bleu)
2. Complétez le formulaire :
   - **Membre** : Sélectionnez le membre concerné (obligatoire)
   - **Titre** : Description courte de la tâche (obligatoire)
   - **Description** : Détails supplémentaires (optionnel)
   - **Type** : Appel, Email, Réunion ou Autre (obligatoire)
   - **Statut initial** : À faire, En cours, Complété ou Annulé (obligatoire)
   - **Échéance** : Date limite (optionnel)
3. Cliquez **"Créer la tâche"**

### Modifier une tâche

1. Trouvez la tâche dans la liste
2. Cliquez l'icône **crayon**
3. Modifiez les détails
4. Cliquez **"Modifier"**

### Supprimer une tâche

1. Cliquez l'icône **poubelle**
2. Confirmez la suppression

### Filtrer les tâches

La liste affiche les colonnes :
- **Membre** : Nom du membre concerné
- **Type** : Appel, Email, Réunion, Autre
- **Statut** : Visualisé par couleur
- **Échéance** : Date limite
- **Assigné à** : Responsable de la tâche

**Filtrer par statut** :
- Onglets en haut : "Tous", "À faire", "En cours", "Complété", "Annulé"
- Cliquez sur un onglet pour afficher uniquement les tâches de ce statut

**Filtrer par type** :
- Sélectionnez le type souhaité si une barre de filtre est disponible

### Détection des tâches en retard (Overdue)

Une tâche est marquée **en retard** si :
- Son statut est "À faire" ou "En cours"
- La date d'échéance est passée

**Apparence** : Badge rouge avec icône ⚠️

**Action** : Complétez rapidement les tâches en retard ou mettez-les à jour.

### Marquer une tâche comme complétée

1. Trouvez la tâche
2. Cliquez l'icône **crayon** ou directement sur le statut
3. Changez le statut à **"Complété"**
4. Confirmez

La tâche passera du bleu/orange au vert.

---

## Gestion des Relations

### Accès

Allez à **Admin > Membres > Relations** ou directement à `/admin/members/relations`

### Qu'est-ce qu'une relation ?

Une relation documente le lien entre deux membres : parrain, collègue, ami, partenaire, etc. C'est utile pour :
- Tracer les parrainages (CJD)
- Documenter les réseaux professionnels
- Identifier les influenceurs clés
- Gérer les groupes de travail

### 5 Types de relations

| Type | Signification | Utilisé pour |
|------|--------------|-------------|
| **Parrain/Marraine** | Relation de mentorat | Parrainages, mentorat, guidance |
| **Filleul/Filleule** | Inverse du parrain | Apprentissage, support à la croissance |
| **Collègue** | Relation de travail | Coéquipiers, projet commun |
| **Ami** | Relation personnelle | Amitié, confiance personnelle |
| **Partenaire d'affaires** | Relation commerciale | Collaboration, business joint ventures |

### Créer une relation

1. Cliquez **"Ajouter une relation"** (bouton bleu)
2. Complétez le formulaire :
   - **Membre A** : Premier membre (obligatoire)
   - **Membre B** : Deuxième membre (obligatoire)
   - **Type de relation** : Choisissez dans la liste (obligatoire)
   - **Description** : Contexte supplémentaire (optionnel)
3. Cliquez **"Créer"**

### Relations bidirectionnelles

Une relation **bidirectionnelle** signifie qu'elle est enregistrée dans les deux sens :

**Exemple** :
- Créez : "Alice est parrain de Bob"
- Résultat : Alice → Bob (parrain) et Bob ← Alice (filleul) automatiquement

> **Important** : Les relations créées avec les types parrain/filleul, collègue, ami, partenaire sont automatiquement bidirectionnelles. Elles s'affichent aux deux extrémités.

### Couleur des relations

Chaque type a une couleur distincte pour identification rapide :
- **Parrain/Marraine** : 👤 Bleu
- **Filleul/Filleule** : 👶 Rose/Violet
- **Collègue** : 🤝 Vert
- **Ami** : ❤️ Rouge
- **Partenaire d'affaires** : 💼 Orange

Les couleurs apparaissent dans :
- La liste des relations
- Le détail du membre (dans la section relations)

### Visualiser les relations

1. Accédez à la page Relations (`/admin/members/relations`)
2. La table affiche :
   - **Membre** : Qui a la relation
   - **Avec** : Relation vers qui
   - **Type** : Parrain, Collègue, etc.
   - **Depuis** : Date de création
   - **Actions** : Supprimer

3. Cliquez sur un nom pour voir plus de détails (si lien disponible)

### Supprimer une relation

1. Trouvez la relation à supprimer
2. Cliquez l'icône **poubelle**
3. Confirmez la suppression

> **Note** : Si c'est une relation bidirectionnelle, elle sera supprimée des deux côtés.

### Bonnes pratiques pour les relations

- **Soyez cohérent** : Utilisez toujours le même type pour des situations similaires
- **Documentez le contexte** : La description aide à comprendre l'origine de la relation
- **Maintenez à jour** : Supprimez les relations qui ne sont plus valides
- **Utilisez les parrainages** : Essentiel pour tracker le programme de mentorat

---

## Export CSV

### Accès

1. Allez à la liste des membres (`/admin/members`)
2. Cliquez le bouton **"Exporter en CSV"** (icône 📥 en haut de page)

### Comment fonctionne l'export

1. Tous les filtres actifs sont appliqués à l'export
2. Un fichier **`.csv`** est généré et téléchargé automatiquement
3. Le nom du fichier : `membres_export_YYYYMMDD.csv`

### Format du fichier

- **Encodage** : UTF-8 avec BOM (compatible Excel)
- **Séparateur** : Point-virgule `;`
- **Décimal** : Virgule `,` (français)

### 10 Colonnes exportées

| # | Colonne | Contenu | Format |
|---|---------|---------|--------|
| 1 | Prénom | Prénom du membre | Texte |
| 2 | Nom | Nom du membre | Texte |
| 3 | Email | Adresse email | Texte |
| 4 | Entreprise | Nom de l'entreprise | Texte |
| 5 | Téléphone | Numéro de contact | Texte |
| 6 | Fonction | Titre du poste | Texte |
| 7 | Rôle CJD | Rôle interne CJD | Texte |
| 8 | Statut | Active / Proposed / Inactive | Texte |
| 9 | Score d'engagement | Score numérique 0-100 | Nombre |
| 10 | Proposé par | Nom du prescripteur | Texte |

**Exemple** :
```
Prénom;Nom;Email;Entreprise;Téléphone;Fonction;Rôle CJD;Statut;Score d'engagement;Proposé par
Jean;Dupont;jean@example.com;Acme Inc;+33612345678;Manager;Trésorier;active;85;Marie Martin
```

### Ouvrir dans Excel

1. Téléchargez le fichier CSV
2. **Windows** : Double-cliquez sur le fichier (Excel l'ouvre automatiquement)
3. **Mac** : Ouvrez Excel → File → Open → Sélectionnez le fichier
4. **Excel vous propose un assistant d'import** :
   - Séparateur : Point-virgule ✓
   - Format du texte : UTF-8 ✓
   - Cliquez "Terminer"

> **Conseil** : Ne modifiez pas le fichier CSV exporté dans un éditeur texte. Utilisez Excel pour garder la structure intacte.

### Filtrer avant l'export

Les filtres actifs sur la liste des membres s'appliquent à l'export :
1. Filtrez la liste (par statut, tag, etc.)
2. Cliquez "Exporter en CSV"
3. Seuls les membres visibles sont exportés

**Exemple** : Exporter uniquement les membres actifs
1. Filtrez : Status = "Actif"
2. Export CSV → Fichier contient uniquement les actifs

### Cas d'usage courants

- **Rapports** : Générer des listes pour des bilans mensuels
- **Import externes** : Transférer des données vers un autre système
- **Analyses** : Ouvrir dans Excel pour des pivot tables
- **Mailchimp/CRM tiers** : Importer les contacts dans d'autres outils

---

## Tableau de Bord Statistiques

### Accès

Allez à **Admin > Membres > Statistiques** ou directement à `/admin/members/stats`

### 4 KPI Cards (Indicateurs clés)

En haut du tableau de bord, quatre cartes affichent les KPIs principaux :

#### 1. Nombre total de membres
- **Valeur** : Somme de tous les membres (actifs + prospects)
- **Utilité** : Taille globale de la base de données
- **Icône** : 👥 Users

#### 2. Membres actifs
- **Valeur** : Nombre de membres avec statut "Actif"
- **Utilité** : Mesurer la communauté active
- **Tendance** : Affiche la variation vs période précédente
- **Icône** : ✓ UserCheck

#### 3. Prospects
- **Valeur** : Nombre de membres avec statut "Proposé/Prospect"
- **Utilité** : Pipeline de nouveaux membres
- **Tendance** : Croissance ou décroissance
- **Icône** : 🎯 Target

#### 4. Taux de conversion
- **Valeur** : % de prospects devenant actifs
- **Calcul** : (Actifs / Total) × 100
- **Utilité** : Santé de l'acquisition (cible : >80%)
- **Icône** : 📈 TrendingUp

### 3 Graphiques

#### Graphique 1 : Évolution mensuelle des adhésions

- **Type** : Graphique en courbe avec zone (Area Chart)
- **Axes** :
  - Horizontal (X) : Mois de l'année (Jan, Fév, Mar, etc.)
  - Vertical (Y) : Nombre de membres
- **Deux courbes** :
  - **Actifs** : Ligne/zone verte
  - **Prospects** : Ligne/zone orange

**Lecture** :
- Visualisez les pics et creux d'adhésion
- Identifiez les meilleurs mois (ex: mai = 15 nouveaux)
- Voyez l'évolution de la conversion (écart actifs/prospects)

**Exemple** :
```
Mars : 8 actifs, 2 prospects
Avril : 12 actifs, 4 prospects
Mai : 15 actifs, 3 prospects ← pic d'activité
```

#### Graphique 2 : Top 5 des tags les plus utilisés

- **Type** : Graphique en barres (Bar Chart)
- **Axes** :
  - Horizontal (X) : Tags (VIP, Ambassadeur, Contributeur, etc.)
  - Vertical (Y) : Nombre de membres ayant ce tag

**Lecture** :
- Identifiez les catégorisations les plus importantes
- Les tags peu utilisés (bar très courte) peuvent être supprimés
- Les tags dominants (bar haute) sont essentiels

**Exemple** :
```
VIP : 45 membres ████████████
Ambassadeur : 28 membres ████████
Contributeur : 15 membres █████
```

#### Graphique 3 : Top 10 des membres par engagement

- **Type** : Tableau (Table)
- **Colonnes** :
  - **Rang** : Position 1 à 10
  - **Prénom / Nom** : Identité du membre
  - **Email** : Contact
  - **Score d'engagement** : Valeur numérique (0-100)

**Lecture** :
- Le score d'engagement réflète la participation et l'activité
- 100 = Très engagé (actif, beaucoup de tâches, relations)
- < 50 = Peu engagé (inactif, minimal)
- Cliquez sur un nom pour voir le détail du membre

**Actions** :
- Contacter les top 5 pour les remercier
- Relancer les membres en bas de liste

### Calcul des tendances

**Tendance** = Variation par rapport à la période précédente :
- ✓ **+15%** (en vert) = Croissance positive
- ✗ **-8%** (en rouge) = Décroissance
- **→ 0%** (neutre) = Stable

**Périodes** :
- Membres **ce mois** vs mois précédent
- Membres **ce trimestre** vs trimestre précédent

### Comment interpréter les données

**Scénario 1 : Croissance saine**
- KPI1 en hausse (plus de membres)
- KPI2 en hausse (plus d'actifs)
- KPI3 stable ou en baisse (moins de prospects)
- Taux de conversion stable ou en hausse
- Graphique 1 : Courbe verte au-dessus d'orange

**Scénario 2 : Trop de prospects**
- KPI1 stable
- KPI2 stable
- KPI3 en hausse (trop de prospects)
- Taux de conversion en baisse
- Action : Relancer les prospects pour conversion

**Scénario 3 : Stagnation**
- KPI1 stable ou décroissant
- KPI2 stable ou décroissant
- Graphique 1 : Courbe plate
- Action : Campagne d'acquisition nécessaire

### Export des statistiques

> Actuellement, l'export des statistiques n'est pas disponible via l'interface. Utilisez le CSV Export des membres pour analyser les données brutes dans Excel.

---

## Bonnes Pratiques

### 1. Conventions de nommage des tags

**À faire** :
- ✓ `VIP` - Clair et court
- ✓ `Ambassadeur CJD` - Descriptif
- ✓ `Ex-Président` - Spécifique au contexte

**À éviter** :
- ✗ `XX` - Incompréhensible
- ✗ `Clients importants qui doivent vraiment être contactés` - Trop long
- ✗ `à_vérifier` - Format incohérent

### 2. Gestion des tâches prioritaires

**Quotidien** :
1. Vérifiez les onglets "À faire" et "En cours"
2. Complétez les tâches en retard
3. Créez les nouvelles tâches du jour

**Hebdomadaire** :
1. Examinez les tâches de la semaine suivante
2. Priorisez par importance et urgence
3. Assignez les responsabilités

**Mensuel** :
1. Archivez les tâches complétées
2. Supprimez les tâches annulées
3. Planifiez les suivis du mois suivant

### 3. Suivi des relations et réseaux

**À l'onboarding** :
- Enregistrez le parrain/marraine du nouveau membre
- Documenter les présentateurs

**Au quotidien** :
- Notez les collègues qui travaillent ensemble
- Tracez les partenariats naissants

**Analysez régulièrement** :
- Identifiez les "hubs" (personnes bien connectées)
- Trouvez les groupes isolés à intégrer

### 4. Maintenance de la base de données

**Mensuellement** :
- Supprimez ou archivez les tags inutilisés
- Vérifiez les doublons de membres
- Mettez à jour les statuts (proposé → actif)

**Trimestriellement** :
- Revoyez les tâches annulées pour apprendre
- Nettoyez les relations expirées
- Mettez à jour les scores d'engagement

**Annuellement** :
- Auditez la qualité des données
- Supprimez les prospects inactifs depuis 2+ ans
- Archivez les anciens membres

### 5. Utilisation efficace des statistiques

**Suivi mensuel** :
- Note le nombre total de membres
- Comparez avec le mois précédent
- Ajustez votre stratégie si en baisse

**Identification des leaders** :
- Consultez le "Top 10 par engagement"
- Impliquez ces personnes dans les décisions
- Demandez-leur de mentorer les autres

**Analyse des tags** :
- Si un tag a > 50% des membres, c'est peut-être une norme (trop large)
- Si un tag a < 5% et peu utilisé, supprimez-le
- Créez des sous-catégories si trop de overlap

### 6. Collaboration en équipe

**Partage des responsabilités** :
- Attribuez les tâches à des personnes spécifiques
- Utilisez les descriptions pour clarifier le contexte
- Mise à jour régulière du statut

**Communication** :
- Utilisez les notes du membre pour documenter les appels importants
- Signalez les changements de statut via la colonne "Proposé par"
- Référencez les relations pour les coordinations

**Audit** :
- Consultez l'onglet "Activités" pour voir qui a modifié quoi
- Traçabilité complète des actions
- Identifiez les anomalies ou erreurs

---

## Checklist de mise en place

- [ ] J'ai accédé au module Admin > Membres
- [ ] J'ai visualisé un détail de membre avec les 4 onglets
- [ ] J'ai créé au moins 5 tags avec couleurs différentes
- [ ] J'ai créé une tâche de suivi pour un membre
- [ ] J'ai changé le statut d'une tâche
- [ ] J'ai créé une relation entre deux membres
- [ ] J'ai exporté la liste des membres en CSV
- [ ] J'ai ouvert l'export CSV dans Excel
- [ ] J'ai consulté le tableau de bord Statistiques
- [ ] Je comprends les 4 KPI cards et 3 graphiques

---

## Support et problèmes courants

### Je ne vois pas le module CRM
**Cause** : Vous n'êtes pas administrateur
**Solution** : Contactez un administrateur pour vous donner l'accès rôle admin

### Un tag créé n'apparaît pas
**Cause** : Rafraîchissement du cache
**Solution** : Actualiser la page (F5 ou Cmd+R)

### L'export CSV ne s'ouvre pas dans Excel
**Cause** : Format ou encodage non reconnu
**Solution** :
1. Ouvrez Excel d'abord
2. File → Open → Sélectionnez le CSV
3. Choisissez "Point-virgule" comme séparateur

### Les statistiques ne se mettent pas à jour
**Cause** : Les données se calculent à la demande
**Solution** : Attendez quelques secondes, puis rafraîchissez la page

### Je veux supprimer un tag utilisé par beaucoup de membres
**Cause** : Système de protection pour éviter la perte de données
**Solution** :
1. Vous pouvez quand même supprimer le tag
2. Les assignations restent sur les membres (données sauvegardées)
3. Le tag n'existe simplement plus comme référence

---

## Glossaire

- **KPI** : Indicateur clé de performance (Key Performance Indicator)
- **Taux de conversion** : % de prospects devenant membres actifs
- **Engagement score** : Score d'implication du membre (0-100)
- **Bidirectionnel** : Relation valide dans les deux sens
- **CSV** : Format de fichier texte (Comma/Semicolon Separated Values)
- **Sheet** : Panneau latéral qui glisse (comme un tiroir)
- **Badge** : Petite étiquette affichée sur l'interface
- **Mutation** : Action qui modifie les données (Create, Update, Delete)

---

**Version** : 1.0
**Dernière mise à jour** : Janvier 2026
**Pour les questions** : Contacter l'administrateur système
