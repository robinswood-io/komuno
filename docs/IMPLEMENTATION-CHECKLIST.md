# Checklist d'Implémentation - Visualisation des Relations

**Status**: À utiliser avant de démarrer l'implémentation
**Format**: Checklist interactive pour suivi de progression

---

## Phase 1: Setup de Base (2-3 jours)

### 1.1 Installation et Configuration

- [ ] Installer dépendances
  ```bash
  npm install reagraph
  # Vérifier: npm ls reagraph
  ```
- [ ] Créer structure de dossiers
  ```
  /app/(protected)/admin/members/relations/
  ├── page.tsx (existant - à adapter)
  ├── components/
  │   ├── RelationGraphView.tsx (NOUVEAU)
  │   ├── RelationFilters.tsx (NOUVEAU)
  │   ├── MemberDetailPanel.tsx (NOUVEAU)
  │   ├── SearchBar.tsx (NOUVEAU)
  │   ├── ExportButton.tsx (NOUVEAU)
  │   └── EgoNetworkView.tsx (NOUVEAU)
  └── hooks/
      ├── useRelationGraph.ts (NOUVEAU)
      ├── useGraphFilters.ts (NOUVEAU)
      └── useGraphSelection.ts (NOUVEAU)
  ```
- [ ] Vérifier que React Query est déjà configuré
- [ ] Vérifier que Shadcn/UI + Tailwind sont disponibles

### 1.2 Création des Hooks

- [ ] **useRelationGraph.ts**
  - [ ] Query members via `/api/admin/members`
  - [ ] Query relations via `/api/admin/relations`
  - [ ] Transformer en `{ nodes: [], edges: [] }`
  - [ ] Tests: vérifier structure de sortie
  - [ ] Estimé: 2 heures

- [ ] **useGraphFilters.ts**
  - [ ] State pour filtres (types, statut, search)
  - [ ] Fonctions update (updateRelationTypeFilter, etc.)
  - [ ] Reset filters
  - [ ] Tests unitaires
  - [ ] Estimé: 1.5 heures

- [ ] **useGraphSelection.ts**
  - [ ] State pour nœud sélectionné
  - [ ] State pour arête sélectionnée
  - [ ] State pour nœud hoverá
  - [ ] Callbacks pour selection changes
  - [ ] Estimé: 1 heure

### 1.3 Composants de Base

- [ ] **RelationGraphView.tsx**
  - [ ] Wrapper Reagraph avec config
  - [ ] Transform nodes/edges avec filtres appliqués
  - [ ] Intégrer `useRelationGraph` hook
  - [ ] Intégrer `useGraphFilters` hook
  - [ ] Callback `onNodeSelect`
  - [ ] Styling (hauteur 600px min, border, bg)
  - [ ] Error boundary
  - [ ] Loading state avec spinner
  - [ ] Tests: click, zoom, pan
  - [ ] Estimé: 3 heures

- [ ] **RelationFilters.tsx**
  - [ ] Search input avec debounce
  - [ ] Checkboxes pour types de relations
  - [ ] Select pour statut (tous/actifs/inactifs)
  - [ ] Slider pour engagement score (optionnel)
  - [ ] Button "Reset filters"
  - [ ] Responsive design (sidebar)
  - [ ] Tests: filter changes trigger updates
  - [ ] Estimé: 2 heures

- [ ] **MemberDetailPanel.tsx**
  - [ ] Card avec détails du membre sélectionné
  - [ ] Affichage du statut (badge)
  - [ ] Info personnelles (email, entreprise, rôle)
  - [ ] Barre d'engagement (progress bar)
  - [ ] Connexions groupées par type
  - [ ] Button "Ego Network"
  - [ ] Fallback si aucun nœud sélectionné
  - [ ] Tests: selected member changes
  - [ ] Estimé: 2 heures

### 1.4 Composants Supplémentaires

- [ ] **SearchBar.tsx**
  - [ ] Input simple avec icon
  - [ ] Debounce 300ms
  - [ ] Clair/reset button
  - [ ] Estimé: 0.5 heure

- [ ] **ExportButton.tsx**
  - [ ] Button "Export PNG"
  - [ ] Utiliser html2canvas ou similar
  - [ ] Estimé: 1 heure (optionnel Phase 1)

### 1.5 Tests Phase 1

- [ ] Tests unitaires pour hooks
  ```bash
  npm test -- hooks/useRelationGraph
  npm test -- hooks/useGraphFilters
  ```
- [ ] Tests composants (renders, props)
- [ ] Type checking
  ```bash
  npx tsc --noEmit
  ```
- [ ] Lint
  ```bash
  npm run lint
  ```

### 1.6 Documentation Phase 1

- [ ] JSDoc sur tous les hooks
- [ ] JSDoc sur tous les composants
- [ ] README section "Phase 1 Setup"
- [ ] TODO comments pour Phase 2

**Effort estimé Phase 1**: 16-24 heures
**Dépendances**: Aucune

---

## Phase 2: Intégration et Tests (2-3 jours)

### 2.1 Adapter la page maître

- [ ] Modifier `/app/(protected)/admin/members/relations/page.tsx`
  - [ ] Importer nouveaux composants
  - [ ] Layout: Graphe (gauche 70%) + Panels (droite 30%)
  - [ ] State pour filters + selection
  - [ ] Props drilling ou Context (si trop profond)
  - [ ] Estimé: 2 heures

- [ ] Ajouter onglets / tabs
  - [ ] Onglet "Graphe" (nouveau)
  - [ ] Onglet "Tableau" (existant, fallback)
  - [ ] Switch fluide entre les deux
  - [ ] Estimé: 1.5 heures

### 2.2 Intégrations inter-composants

- [ ] Selection du graphe → Update details panel
  ```typescript
  onNodeSelect → setSelectedMember → MemberDetailPanel
  ```
- [ ] Filters → Update graphe
  ```typescript
  filters change → recalculate nodes/edges → redraw
  ```
- [ ] Search → Highlight dans graphe (optionnel Phase 1)
- [ ] Click "Ego Network" → Mode ego (Phase 3, mais préparer)

### 2.3 Tests E2E

- [ ] [ ] Test: Click sur un nœud affiche détails
- [ ] [ ] Test: Filter par type de relation update graphe
- [ ] [ ] Test: Filter par statut update graphe
- [ ] [ ] Test: Reset filters ramène à l'état initial
- [ ] [ ] Test: Search filtre les nœuds
- [ ] [ ] Test: Zoom/pan fonctionnent
- [ ] [ ] Test: Performance avec 500+ nœuds (doit rester <60fps)
- [ ] [ ] Test: Onglet "Tableau" affiche le tableau existant

### 2.4 Performance Testing

- [ ] [ ] Charger avec 100 membres, 500 relations
- [ ] [ ] Profiler avec Chrome DevTools
  - [ ] FPS dans graphe zone
  - [ ] Memory usage
  - [ ] CPU load
- [ ] [ ] Vérifier pas de memory leaks
- [ ] [ ] Vérifier pas de re-renders excessifs

### 2.5 Responsive Design (Basic)

- [ ] [ ] Tester sur desktop 1920x1080
- [ ] [ ] Tester sur desktop 1366x768
- [ ] [ ] Mobile: vérifier que c'est au moins utilisable (peut être amélioré Phase 4)

### 2.6 Accessibility Basics

- [ ] [ ] Vérifier que boutons sont accessibles (tabindex, keyboard)
- [ ] [ ] Vérifier contraste couleurs (WCAG AA)
- [ ] [ ] Vérifier labels sur inputs

### 2.7 Deploy BETA

- [ ] [ ] Merger en branch develop/staging
- [ ] [ ] Deploy sur environment de staging
- [ ] [ ] Tester sur URL: `https://cjd80.rbw.ovh/admin/members/relations` (BETA)
- [ ] [ ] Vérifier HTTPS, CORS, authentification
- [ ] [ ] Ajouter badge `[BETA]` si visible

### 2.8 Documentation Phase 2

- [ ] [ ] Update README avec étapes de la Phase 2
- [ ] [ ] Document architecture du state management
- [ ] [ ] Document props drilling / Context decisions
- [ ] [ ] TODO comments pour Phase 3

**Effort estimé Phase 2**: 16-24 heures
**Dépendances**: Phase 1 complète

---

## Phase 3: Fonctionnalités Avancées (3-4 jours)

### 3.1 Ego Network View

- [ ] [ ] Créer composant `EgoNetworkView.tsx`
  - [ ] Layout radial/circular pour ego
  - [ ] Distance 1: connexions directes
  - [ ] Distance 2: optionnel (toggle)
  - [ ] Estimé: 2 heures

- [ ] [ ] Ajouter view mode toggle
  - [ ] Switch "Network" ↔ "Ego Network"
  - [ ] Sauvegarder mode en state
  - [ ] Estimé: 1 heure

- [ ] [ ] Test: Click "Ego Network" depuis panel
  - [ ] Graphe change de layout
  - [ ] Membre est au centre
  - [ ] Connections visibles
  - [ ] Estimé: 1 heure

### 3.2 Vues Alternatives (Optionnel Phase 3)

- [ ] [ ] Hierarchical layout pour sponsorships
  - [ ] Tree top-down
  - [ ] Filter relations pour ne montrer que "sponsor"
  - [ ] Estimé: 2 heures

- [ ] [ ] Dropdown pour changer layouts
  - [ ] Selections: "Force-Directed", "Ego Network", "Sponsorship Tree"
  - [ ] Estimé: 1 heure

### 3.3 Context Menu

- [ ] [ ] Right-click sur nœud → Context menu
  - [ ] Options: "Voir détails", "Ego Network", "Créer relation", "Supprimer"
  - [ ] Estimé: 2 heures

- [ ] [ ] Intégration avec modals existants
  - [ ] "Créer relation" ouvre modal CREATE
  - [ ] "Supprimer" ouvre modal DELETE
  - [ ] Estimé: 1.5 heures

### 3.4 Export et Reporting

- [ ] [ ] **Export PNG**
  - [ ] Button "Download as PNG"
  - [ ] Utiliser `html2canvas` + `jspdf`
  - [ ] Estimé: 1 heure

- [ ] [ ] **Export JSON**
  - [ ] Button "Download as JSON"
  - [ ] Format: `{ nodes: [], edges: [] }`
  - [ ] Estimé: 0.5 heure

- [ ] [ ] **Export CSV** (relations filtrées)
  - [ ] Button "Download as CSV"
  - [ ] Columns: Member1, Type, Member2, Date
  - [ ] Estimé: 1 heure

### 3.5 Persistance

- [ ] [ ] LocalStorage pour mémoriser filtres
  - [ ] Sauvegarder après chaque changement
  - [ ] Restaurer au chargement de page
  - [ ] Estimé: 1 heure

- [ ] [ ] LocalStorage pour dernier nœud sélectionné
  - [ ] Estimé: 0.5 heure

### 3.6 Tests Phase 3

- [ ] [ ] E2E: Ego Network mode
- [ ] [ ] E2E: Context menu
- [ ] [ ] E2E: Exports (file downloads)
- [ ] [ ] E2E: Persistance filtres après reload

**Effort estimé Phase 3**: 24-32 heures
**Dépendances**: Phase 1-2 complètes

---

## Phase 4: Optimisation et Polish (2-3 jours)

### 4.1 Performance Optimizations

- [ ] [ ] Lazy load données
  - [ ] Implémenter pagination si 1000+ relations
  - [ ] Limit initial load à 500 relations
  - [ ] Estimé: 2 heures

- [ ] [ ] Memoization
  - [ ] useMemo pour nodes/edges transform
  - [ ] useCallback pour handlers
  - [ ] Vérifier React.memo sur composants leaf
  - [ ] Estimé: 1 heure

- [ ] [ ] Caching React Query
  - [ ] Ajuster staleTime (5-10 min?)
  - [ ] Prefetch au mount
  - [ ] Estimé: 1 heure

- [ ] [ ] Debouncing
  - [ ] Search: 300ms
  - [ ] Filters: 500ms
  - [ ] Estimé: 0.5 heure

### 4.2 UX Polish

- [ ] [ ] Animations
  - [ ] Smooth zoom/pan (< 500ms)
  - [ ] Fade-in/out pour nœuds
  - [ ] Highlight smooth sur hover
  - [ ] Estimé: 2 heures

- [ ] [ ] Loading states
  - [ ] Skeleton loader pour graphe
  - [ ] Spinner durant requêtes
  - [ ] Progress bar pour opérations longues
  - [ ] Estimé: 1.5 heures

- [ ] [ ] Error states
  - [ ] Error boundary autour du graphe
  - [ ] Toast notifications pour erreurs API
  - [ ] Fallback UI gracieux
  - [ ] Estimé: 1.5 heures

- [ ] [ ] Responsive design complet
  - [ ] Tablet: layout 50/50 ou 60/40
  - [ ] Mobile: mode fullscreen (graphe) + toggle panel
  - [ ] Touch interactions (si possible)
  - [ ] Estimé: 2-3 heures

### 4.3 Accessibility (WCAG AA)

- [ ] [ ] Keyboard navigation
  - [ ] Tab through buttons
  - [ ] Arrow keys zoom/pan (optionnel)
  - [ ] Enter pour select nœud
  - [ ] Estimé: 1 heure

- [ ] [ ] Screen reader support
  - [ ] aria-labels sur buttons
  - [ ] aria-live regions pour dynamique
  - [ ] Semantic HTML
  - [ ] Estimé: 1.5 heures

- [ ] [ ] Color contrast
  - [ ] Tous contrasts WCAG AA minimum
  - [ ] Test avec WebAIM
  - [ ] Estimé: 1 heure

### 4.4 Documentation Complète

- [ ] [ ] JSDoc complet sur tous fichiers
- [ ] [ ] Architecture diagram (Mermaid ou SVG)
- [ ] [ ] README pour futures évolutions
- [ ] [ ] Troubleshooting guide
- [ ] [ ] API usage examples
- [ ] [ ] Estimé: 3 heures

### 4.5 Tests complets

- [ ] [ ] Test coverage >= 80%
  ```bash
  npm run test:coverage
  ```
- [ ] [ ] Snapshot tests si applicable
- [ ] [ ] Integration tests complets
- [ ] [ ] Performance tests (Lighthouse?)
- [ ] [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] [ ] Estimé: 3 heures

### 4.6 Prepare pour Rollout

- [ ] [ ] Créer release notes
- [ ] [ ] Tester migration depuis tableau
- [ ] [ ] Training/documentation utilisateurs (optionnel)
- [ ] [ ] Rollback plan (au cas où)
- [ ] [ ] Monitoring (logs, errors)

**Effort estimé Phase 4**: 16-24 heures
**Dépendances**: Phase 1-3 complètes

---

## Checklist Globale

### Avant de démarrer Phase 1
- [ ] Équipe assignée (1-2 devs)
- [ ] Timeline validée (9-13 jours)
- [ ] Accès au repo et environments
- [ ] Node.js, npm à jour
- [ ] IDE (VS Code, Cursor, etc.) configuré

### Après Phase 1
- [ ] Code review complet
- [ ] Tests passent 100%
- [ ] Type checking: `npx tsc --noEmit` ✓
- [ ] Lint: `npm run lint` ✓
- [ ] Documentation à jour

### Après Phase 2 (Ready for BETA)
- [ ] E2E tests passent
- [ ] Performance acceptable (>30fps)
- [ ] Accessibility basics OK
- [ ] Deploy en staging/BETA
- [ ] Feedback utilisateurs collectés

### Après Phase 3
- [ ] Toutes features avancées implémentées
- [ ] Tests pour nouvelles features
- [ ] Feedback intégré

### Après Phase 4 (Ready for Production)
- [ ] Tous les tests passent
- [ ] Performance OK (Lighthouse score > 80)
- [ ] Accessibility: WCAG AA
- [ ] Documentation complète
- [ ] Rollout plan approuvé
- [ ] Monitoring en place

---

## Scripts Utiles

```bash
# Type checking
npx tsc --noEmit

# Lint
npm run lint

# Tests
npm test
npm run test:coverage

# Dev
npm run dev

# Build
npm run build

# Start production
npm start

# Performance
npm run analyze
```

---

## Risques et Contingencies

| Risque | Contingency | Effort |
|--------|-------------|--------|
| Reagraph a limitation | Fallback D3.js/Cytoscape | +2 jours |
| Performance bad | Pagination + clustering | +1 jour |
| API lente | Local cache/mock data | +1 jour |
| Estimation du temps | Buffer 20% déjà inclus | - |
| Utilisateurs préfèrent tableau | Garder les deux | - |

---

## Notes pour le Dev

- **Pas d'`any` type** - Utiliser types corrects ou `unknown` avec guards
- **Tests early and often** - Ne pas accumuler les tests à la fin
- **Commit régulièrement** - Petits commits avec messages clairs
- **PR reviews** - Demander review à chaque phase
- **Documentation en même temps** - Pas après
- **Performance profiling** - Utiliser DevTools, pas deviner

---

**Créé**: 2026-02-04
**À imprimer ou partager** avec l'équipe de développement avant de démarrer

