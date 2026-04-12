# Guide de Démarrage Rapide - Suivi Transversal

## 🚀 Accès rapide

**URL** : `/admin/tracking`  
**Menu** : "Suivi" dans le header admin  
**Permissions** : `admin.view` minimum

## 📊 Vue d'ensemble

Le dashboard de suivi transversal se compose de deux onglets :

1. **Dashboard** : Statistiques, graphiques et activité récente
2. **Alertes** : Liste des alertes avec filtres et recherche

## ⌨️ Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl/Cmd + K` | Rafraîchir toutes les données |
| `Ctrl/Cmd + E` | Exporter (métriques ou alertes selon l'onglet) |
| `Ctrl/Cmd + G` | Générer les alertes (onglet alertes uniquement) |
| `Échap` | Réinitialiser tous les filtres et la recherche |

## 🎯 Cas d'usage courants

### 1. Identifier les membres prioritaires

**Objectif** : Trouver les membres à haut potentiel qui nécessitent un suivi immédiat.

**Étapes** :
1. Accéder au dashboard `/admin/tracking`
2. Consulter la carte "Membres" → "Haut potentiel"
3. Aller dans l'onglet "Alertes"
4. Filtrer par :
   - Type d'alerte : `high_potential`
   - Sévérité : `high`
5. Examiner les alertes pour identifier les membres prioritaires
6. Marquer comme "lu" après traitement

**Résultat** : Liste des membres à fort potentiel avec leurs informations.

---

### 2. Analyser les conversions

**Objectif** : Comprendre le taux de conversion et identifier les opportunités.

**Étapes** :
1. Consulter le taux de conversion dans le dashboard
   - Excellent : ≥50% (vert)
   - Bon : 25-49% (jaune)
   - À améliorer : <25% (orange)
2. Si le taux est faible, examiner les alertes "conversion_opportunity"
3. Exporter les métriques de conversion :
   - Sélectionner une plage de dates (ex: dernier mois)
   - Cliquer sur "Exporter métriques"
4. Analyser le fichier CSV pour identifier les patterns

**Résultat** : Compréhension des taux de conversion et identification des opportunités.

---

### 3. Suivre les membres inactifs

**Objectif** : Identifier les membres inactifs pour planifier des actions de relance.

**Étapes** :
1. Générer les alertes manuellement (`Ctrl/Cmd + G`)
2. Filtrer les alertes par :
   - Type d'alerte : `stale`
   - Sévérité : `medium`
3. Examiner les membres inactifs depuis plus de 90 jours
4. Exporter la liste pour planifier des actions de relance
5. Résoudre les alertes après traitement

**Résultat** : Liste des membres inactifs avec leurs dernières activités.

---

### 4. Analyser les tendances d'engagement

**Objectif** : Comprendre l'évolution de l'engagement sur une période.

**Étapes** :
1. Consulter le graphique "Tendances d'engagement" (7 derniers jours)
2. Identifier les jours avec le plus d'activité (survoler les barres)
3. Examiner l'activité récente pour comprendre les patterns
4. Utiliser les filtres de dates pour analyser des périodes spécifiques
5. Exporter les métriques pour analyse approfondie

**Résultat** : Compréhension des patterns d'engagement et identification des tendances.

---

### 5. Gérer les alertes critiques

**Objectif** : Traiter rapidement les alertes les plus importantes.

**Étapes** :
1. Aller dans l'onglet "Alertes"
2. Filtrer par sévérité : `critical`
3. Trier par date (les plus récentes en premier)
4. Examiner chaque alerte et prendre les actions nécessaires
5. Marquer comme "lu" après examen
6. Résoudre les alertes après traitement complet

**Résultat** : Toutes les alertes critiques sont traitées et suivies.

---

## 🔄 Workflow recommandé

### Quotidien (5-10 minutes)

1. **Vérifier les alertes critiques** :
   - Filtrer par sévérité `critical`
   - Traiter les alertes non lues
   - Résoudre après traitement

2. **Examiner les nouveaux membres/mécènes** :
   - Filtrer par type `high_potential`
   - Examiner les nouvelles propositions
   - Planifier les actions de suivi

### Hebdomadaire (15-20 minutes)

1. **Analyser les tendances** :
   - Consulter le graphique d'engagement
   - Examiner l'activité récente
   - Identifier les patterns

2. **Gérer les inactifs** :
   - Filtrer par type `stale`
   - Exporter la liste
   - Planifier les actions de relance

3. **Examiner les conversions** :
   - Consulter le taux de conversion
   - Analyser les métriques de conversion
   - Identifier les opportunités

### Mensuel (30 minutes)

1. **Exporter les données** :
   - Exporter les métriques du mois
   - Exporter les alertes résolues
   - Archiver pour historique

2. **Analyser les performances** :
   - Comparer les taux de conversion
   - Examiner les tendances sur le mois
   - Identifier les améliorations possibles

## 💡 Conseils et astuces

### Optimisation de la recherche

- Utiliser des mots-clés spécifiques (email, nom, type d'alerte)
- Combiner recherche et filtres pour des résultats précis
- Utiliser `Échap` pour réinitialiser rapidement

### Gestion des alertes

- Marquer comme "lu" après examen (même si non traité)
- Résoudre uniquement après traitement complet
- Utiliser les filtres pour organiser le travail

### Export de données

- Utiliser des plages de dates raisonnables (< 1 an)
- Exporter régulièrement pour archivage
- Filtrer avant export pour réduire la taille des fichiers

### Performance

- Les données se rafraîchissent automatiquement
- Utiliser `Ctrl/Cmd + K` pour forcer un rafraîchissement
- Les filtres réduisent la charge serveur

## 🆘 Dépannage

### Les données ne se chargent pas

1. Vérifier la connexion réseau
2. Utiliser `Ctrl/Cmd + K` pour rafraîchir
3. Vérifier les permissions (`admin.view` minimum)
4. Consulter les messages d'erreur affichés

### Les alertes ne se génèrent pas

1. Vérifier les permissions (`admin.manage` requis)
2. Vérifier que le scheduler est actif (logs serveur)
3. Générer manuellement avec `Ctrl/Cmd + G`
4. Vérifier la configuration `TRACKING_ALERTS_INTERVAL_MINUTES`

### L'export échoue

1. Vérifier la plage de dates (début < fin, max 1 an)
2. Vérifier qu'il y a des données à exporter
3. Vérifier les permissions d'écriture du navigateur
4. Consulter les messages d'erreur affichés

## 📚 Ressources

- **Guide complet** : `docs/features/TRACKING.md`
- **Résumé technique** : `docs/features/TRACKING-SUMMARY.md`
- **API Documentation** : Voir les routes dans `server/routes.ts`

## 🔗 Liens utiles

- Dashboard : `/admin/tracking`
- API Dashboard : `GET /api/tracking/dashboard`
- API Alertes : `GET /api/tracking/alerts`
- API Métriques : `GET /api/tracking/metrics`

