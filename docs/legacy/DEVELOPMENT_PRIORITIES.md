# Plan de Priorisation des Développements CJD80

## Résumé de l'Audit

### Application
- **Stack**: NestJS + React 19 + PostgreSQL + Redis + MinIO
- **30 tables** dans la base de données
- **11 modules backend** (auth, admin, ideas, events, loans, patrons, members, tracking, financial, setup, branding)
- **40+ composants React** / **13 hooks personnalisés**

### État Actuel de la Qualité
- **Tests**: 177 tests passent sur 182 (97% de taux de réussite)
- **Couverture**: Estimée à ~60-70% des services critiques
- **Auth**: Migration Authentik → Form-based complète ✅
- **CI/CD**: Pipeline Gitea fonctionnel ✅

---

## Phase 1 : Stabilisation (Priorité CRITIQUE)

### 1.1 Compléter la couverture de tests (90%+)
**Effort estimé**: 2-3 jours

| Module | État actuel | Cible |
|--------|-------------|-------|
| auth.service | 80% | 95% |
| password.service | 95% | 100% |
| admin.service | 70% | 95% |
| ideas.service | 75% | 95% |
| events.service | 70% | 95% |
| storage.ts | 50% | 90% |

**Actions**:
- [ ] Corriger les 5 tests en échec (escape characters, mocks)
- [ ] Ajouter tests d'intégration pour les flux critiques
- [ ] Ajouter tests E2E pour login, inscription, création d'événement

### 1.2 Corriger l'incohérence SMTP
**Effort**: 1 heure

**Problème identifié**:
- `/server/email-service.ts` utilise `SMTP_PASS`
- `/server/src/config/configuration.ts` utilise `SMTP_PASSWORD`

**Solution**: Standardiser sur `SMTP_PASSWORD` partout

### 1.3 Refactoring du storage.ts
**Effort estimé**: 2-3 jours

**Problème**: Fichier monolithique de 5593 lignes avec `// @ts-nocheck`

**Actions**:
- [ ] Découper en sous-modules (AdminStorage, IdeaStorage, EventStorage, etc.)
- [ ] Supprimer le `@ts-nocheck`
- [ ] Ajouter les types stricts

---

## Phase 2 : Fonctionnalités Manquantes (Priorité HAUTE)

### 2.1 Système de permissions granulaires
**Effort**: 3-5 jours

**Situation actuelle**: Rôles statiques (super_admin, ideas_manager, etc.)

**Amélioration proposée**:
```typescript
// permissions.ts
const PERMISSIONS = {
  'ideas.view': ['super_admin', 'ideas_reader', 'ideas_manager'],
  'ideas.edit': ['super_admin', 'ideas_manager'],
  'ideas.delete': ['super_admin', 'ideas_manager'],
  'events.view': ['super_admin', 'events_reader', 'events_manager'],
  // ...
};
```

### 2.2 Dashboard Analytics Amélioré
**Effort**: 2-3 jours

**Métriques à ajouter**:
- Évolution du nombre de membres actifs
- Taux de participation aux événements
- Performance des idées (votes, conversions en événements)
- Suivi des parrainages

### 2.3 Système de notifications push
**Effort**: 2 jours

**Fonctionnalités**:
- Notifications navigateur (Web Push API)
- Alertes email configurables
- Préférences utilisateur

### 2.4 Export de données
**Effort**: 1-2 jours

**Formats**:
- Export CSV des listes (membres, événements, idées)
- Export PDF des rapports financiers
- Export Excel pour les sponsors

---

## Phase 3 : Améliorations UX/UI (Priorité MOYENNE)

### 3.1 Mode sombre
**Effort**: 1-2 jours

### 3.2 Interface mobile-first
**Effort**: 2-3 jours

**Améliorations**:
- Navigation bottom-bar sur mobile
- Cards swipables pour les listes
- Pull-to-refresh

### 3.3 Recherche globale
**Effort**: 1-2 jours

**Fonctionnalité**: Barre de recherche uniforme pour:
- Membres
- Événements
- Idées
- Parrains

---

## Phase 4 : Optimisations Techniques (Priorité NORMALE)

### 4.1 Performance backend
**Effort**: 2-3 jours

**Actions**:
- [ ] Index base de données optimisés
- [ ] Cache Redis pour les listes fréquentes
- [ ] Pagination optimisée avec cursors

### 4.2 SSR / SEO
**Effort**: 3-5 jours

**Pour les pages publiques**:
- Page d'accueil
- Liste des événements
- Page de proposition d'idées

### 4.3 PWA Complète
**Effort**: 2-3 jours

**Améliorations**:
- Service Worker optimisé
- Stratégie cache-first pour les assets
- Offline mode pour la consultation

---

## Ordre de Priorité Recommandé

| Priorité | Phase | Estimation |
|----------|-------|------------|
| 🔴 1 | Corriger inconsistance SMTP | 1h |
| 🔴 2 | Compléter tests >90% | 2-3j |
| 🟠 3 | Refactoring storage.ts | 2-3j |
| 🟠 4 | Dashboard Analytics | 2-3j |
| 🟡 5 | Export de données | 1-2j |
| 🟡 6 | Notifications push | 2j |
| 🟢 7 | Mode sombre | 1-2j |
| 🟢 8 | Interface mobile | 2-3j |
| 🔵 9 | Performance backend | 2-3j |
| 🔵 10 | PWA Complète | 2-3j |

---

## Métriques de Succès

### Phase 1 (Stabilisation)
- [ ] 0 erreurs TypeScript
- [ ] >90% couverture de tests
- [ ] 0 incidents email

### Phase 2 (Fonctionnalités)
- [ ] Permissions granulaires actives
- [ ] Dashboard avec 5+ KPIs
- [ ] Exports fonctionnels

### Phase 3 (UX)
- [ ] Score Lighthouse >90
- [ ] Mode sombre disponible
- [ ] Navigation mobile fluide

### Phase 4 (Technique)
- [ ] Temps de réponse API <200ms
- [ ] PWA installable
- [ ] SEO pages publiques optimisé

---

## Fichiers Critiques à Surveiller

| Fichier | Lignes | Risque | Action |
|---------|--------|--------|--------|
| server/storage.ts | 5593 | ÉLEVÉ | Refactorer |
| client/src/pages/onboarding-page.tsx | 113739 | ÉLEVÉ | Découper |
| client/src/pages/admin-patrons-page.tsx | 90495 | MOYEN | Optimiser |
| server/src/admin/admin.service.ts | ~800 | MOYEN | Tests |

---

## Commandes Utiles

```bash
# Tests
npm run test              # Tests unitaires
npm run test:coverage     # Avec couverture
npm run test:playwright   # Tests E2E

# Qualité
npm run check            # TypeScript
npm run build            # Build complet

# Déploiement
git push gitea main      # Trigger CI/CD
```

---

Dernière mise à jour: 2025-12-10
