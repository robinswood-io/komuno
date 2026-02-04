# Quick Start - Visualisation Relations Inter-Membres

**Lire ceci en PREMIER (5 minutes)**

---

## C'est quoi?

Implémentation d'une **visualisation interactive de graphe** pour voir les relations entre membres du CRM.

**Avant**: Tableau statique
**Après**: Graphe interactif avec filtres, search, ego-network

---

## Recommandation

**Utilisez: Reagraph** (WebGL, React-native, 10k+ nœuds sans lag)

Score: **9.2/10** (meilleur choix)

---

## Timeline

**9-13 jours** en 4 phases:
1. Setup (2-3j) - Hooks + composants base
2. Intégration (2-3j) - Page maître + tests
3. Avancé (3-4j) - Ego-network + exports
4. Polish (2-3j) - Perf + UX + a11y

---

## Fichiers à lire

### Pour la prise de décision (5 min)
📄 **RELATIONS-VISUALIZATION-SUMMARY.md** - Synthèse exécutive

### Pour comprendre complètement (30 min)
📄 **docs/features/RELATIONS-VISUALIZATION.md** - Document principal (1368 lignes)

### Pour implémenter (par phase)
📄 **IMPLEMENTATION-CHECKLIST.md** - Checklist détaillée, heure par heure

### Pour les sources utilisées
📄 **SOURCES-RELATIONS-VISUALIZATION.md** - 100+ références hyperlinquées

---

## Architecture

```
API → React Query → useRelationGraph Hook → Reagraph
                                      ↓
                              Filtres + Sélection
                                      ↓
                              Détails du membre
```

## Composants à créer

- `RelationGraphView.tsx` - Wrapper Reagraph
- `RelationFilters.tsx` - Sidebar filtres
- `MemberDetailPanel.tsx` - Sidebar détails
- `SearchBar.tsx` - Recherche
- `ExportButton.tsx` - Export PNG/JSON/CSV
- `EgoNetworkView.tsx` - Vue ego-network (Phase 3)

Plus 3 hooks (`useRelationGraph`, `useGraphFilters`, `useGraphSelection`)

---

## Exemples de code

4 exemples TypeScript complets dans le document principal:
1. RelationGraphView avec Reagraph
2. useGraphFilters hook
3. RelationFilters component
4. MemberDetailPanel component

Tous prêts à copier-coller.

---

## Prochaines étapes

1. **Manager/PM**: Lire SUMMARY.md et approuver timeline
2. **Dev**: Lire docs/features/RELATIONS-VISUALIZATION.md
3. **Dev**: Consulter IMPLEMENTATION-CHECKLIST.md
4. **Dev**: Démarrer Phase 1 (Setup)

---

## Questions fréquentes

**Q: Combien de temps?**
R: 9-13 jours (36-52 heures)

**Q: Quel coût?**
R: 0€ (open-source)

**Q: Peut-on garder le tableau?**
R: Oui, comme fallback/alternative

**Q: Performance?**
R: Fluidement 10k+ nœuds (WebGL)

**Q: Réutilisable?**
R: Oui, pour autres graphes (idées, événements)

---

## Cheat Sheet

### Installation
```bash
npm install reagraph
```

### Structure de fichiers
```
/relations/
  page.tsx (adapter)
  components/
    ├── RelationGraphView.tsx
    ├── RelationFilters.tsx
    └── MemberDetailPanel.tsx
  hooks/
    ├── useRelationGraph.ts
    ├── useGraphFilters.ts
    └── useGraphSelection.ts
```

### Data flow
```
/api/admin/members → Query
/api/admin/relations → Query
                        ↓
                useRelationGraph
                        ↓
                { nodes, edges }
                        ↓
                  Reagraph Canvas
                        ↓
                Filtres + Sélection
```

### Phases
1. **Setup** - Hooks, composants, Reagraph integration
2. **Intégration** - Page maître, interactions, BETA deploy
3. **Avancé** - Ego-network, exports, context menu
4. **Polish** - Perf, animations, a11y, docs

---

## Ressources

- [Reagraph Docs](https://reagraph.dev/)
- [Main Doc](./docs/features/RELATIONS-VISUALIZATION.md)
- [Sources](./docs/SOURCES-RELATIONS-VISUALIZATION.md)
- [Checklist](./docs/IMPLEMENTATION-CHECKLIST.md)

---

**Ready?** Start reading RELATIONS-VISUALIZATION-SUMMARY.md →

---

Créé: 2026-02-04
