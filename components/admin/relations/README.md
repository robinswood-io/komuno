# Visualisation des Relations Inter-Membres

## Vue d'ensemble

Visualisation interactive des relations entre membres du CJD80 avec Reagraph.

## Composants

### RelationGraphView
Composant principal affichant le graphe avec Reagraph.
- Layout: Force-Directed 2D
- Interactions: zoom, pan, drag, sélection de nœuds
- Thème adaptatif (light/dark)

### RelationFilters
Panneau de filtres permettant:
- Filtrage par type de relation (sponsor, team, custom)
- Filtrage par statut membre (actif, inactif)
- Recherche par nom ou email
- Indicateur du mode Ego Network

### MemberDetailPanel
Panneau latéral affichant:
- Informations du membre sélectionné
- Score d'engagement (barre de progression)
- Liste des connexions groupées par type
- Action "Voir Ego Network"

### RelationsTable
Tableau CRUD existant conservé pour:
- Créer des relations
- Supprimer des relations
- Filtrer et trier
- Compatibilité avec workflow existant

## Hooks

### useRelationGraph
Transform les données API en format Reagraph:
- Fetch membres et relations depuis API
- Calcule les connexions par membre
- Génère nodes et edges avec métadonnées

### useGraphFilters
Gère l'état des filtres et filtre les données:
- Filtres par type, statut, score, recherche
- Mode Ego Network (centré sur un membre)
- Actions de réinitialisation

## Utilisation

La page est accessible via: `/admin/members/relations`

### Onglet Graphe
1. Visualiser le réseau complet
2. Appliquer des filtres dans le panneau gauche
3. Cliquer sur un nœud pour voir ses détails
4. Utiliser "Voir Ego Network" pour centrer sur un membre
5. Zoomer/panner/dragger pour explorer

### Onglet Tableau
1. Vue CRUD classique
2. Créer/supprimer des relations
3. Filtrer par type et membre

## Performance

- Reagraph utilise WebGL pour le rendu
- Fluide avec 500+ membres
- Hot reload actif (pas de restart Docker nécessaire)

## URLs de test

Production: https://cjd80.rbw.ovh/admin/members/relations

## Structure des données

### Nœuds (membres)
- ID: email du membre
- Label: Prénom + Nom
- Taille: Score d'engagement (1-5)
- Couleur: Statut (actif=vert, inactif=gris)

### Arêtes (relations)
- ID: memberEmail-relatedMemberEmail
- Source/Target: emails des membres
- Label: Type de relation
- Couleur: Bleu (sponsor), Vert (team), Violet (custom)
- Épaisseur: 2 (sponsor), 1 (autres)

## Prochaines étapes

Phase 2 (optionnelle):
- Layouts alternatifs (hierarchical, radial)
- Context menu sur clic droit
- Export en PNG/SVG
- Détection de clusters
- Analyse de centralité
