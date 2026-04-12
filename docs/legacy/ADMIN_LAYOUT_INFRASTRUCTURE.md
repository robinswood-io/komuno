# Infrastructure de Layout Admin

## Vue d'ensemble

L'infrastructure de layout et navigation pour les pages admin protégées a été mise en place avec Next.js 15 App Router.

## Structure des fichiers

```
app/(protected)/
├── layout.tsx                    # Auth guard - vérifie l'authentification
├── error.tsx                     # Error boundary pour les routes protégées
└── admin/
    ├── layout.tsx                # Layout admin avec sidebar + header
    ├── page.tsx                  # Redirection vers /admin/dashboard
    ├── dashboard/
    │   └── page.tsx             # Page dashboard avec stats
    ├── members/
    │   └── page.tsx             # Gestion des membres
    ├── patrons/
    │   └── page.tsx             # Gestion des mécènes
    ├── ideas/
    ├── events/
    ├── loans/
    ├── financial/
    └── settings/

components/admin/
├── admin-sidebar.tsx            # Sidebar de navigation
├── admin-breadcrumbs.tsx        # Fil d'Ariane auto-généré
└── index.ts                     # Exports
```

## Composants créés

### 1. Protected Layout (`app/(protected)/layout.tsx`)

**Responsabilités:**
- Vérification de l'authentification via `useAuth()`
- Redirection vers `/login` si non authentifié
- Affichage d'un loader pendant la vérification
- Protection de toutes les routes enfants

**Code:**
```tsx
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) return <LoadingScreen />;
  if (!user) return null;

  return <>{children}</>;
}
```

### 2. Admin Layout (`app/(protected)/admin/layout.tsx`)

**Responsabilités:**
- Structure 2 colonnes: Sidebar fixe + Contenu scrollable
- Header avec titre de page et breadcrumbs
- Extraction du titre depuis l'URL
- Responsive design

**Caractéristiques:**
- Sidebar fixe sur toute la hauteur
- Contenu scrollable indépendamment
- Header sticky en haut du contenu
- Container centré avec padding

### 3. AdminSidebar (`components/admin/admin-sidebar.tsx`)

**Fonctionnalités:**
- Navigation vers toutes les sections admin:
  - Dashboard
  - Membres
  - Mécènes
  - Idées
  - Événements
  - Prêts
  - Finance
  - Paramètres
- Highlight de la route active
- Avatar et nom de l'utilisateur en haut
- Bouton de déconnexion en bas
- **Collapsible:** Bouton pour réduire/agrandir la sidebar
- Responsive: sidebar réduite sur mobile

**Navigation items:**
```tsx
const navItems = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Membres', href: '/admin/members', icon: Users },
  { title: 'Mécènes', href: '/admin/patrons', icon: Heart },
  { title: 'Idées', href: '/admin/ideas', icon: Lightbulb },
  { title: 'Événements', href: '/admin/events', icon: Calendar },
  { title: 'Prêts', href: '/admin/loans', icon: Package },
  { title: 'Finance', href: '/admin/financial', icon: DollarSign },
  { title: 'Paramètres', href: '/admin/settings', icon: Settings },
];
```

**États de la sidebar:**
- Étendue (w-64): Logo + nom + avatar + labels de navigation
- Réduite (w-20): Icônes uniquement + avatar

### 4. AdminBreadcrumbs (`components/admin/admin-breadcrumbs.tsx`)

**Fonctionnalités:**
- Auto-génération depuis le pathname
- Mapping personnalisé des segments URL → labels français
- Icône Home pour la racine admin
- Liens cliquables vers les niveaux parents
- Dernier segment non cliquable (page actuelle)

**Mapping des labels:**
```tsx
const pathLabels = {
  admin: 'Administration',
  dashboard: 'Tableau de bord',
  members: 'Membres',
  patrons: 'Mécènes',
  ideas: 'Idées',
  events: 'Événements',
  loans: 'Prêts',
  financial: 'Finance',
  settings: 'Paramètres',
  // ...
};
```

**Exemple:**
- URL: `/admin/members/details`
- Breadcrumb: `🏠 > Membres > Détails`

### 5. Error Boundary (`app/(protected)/error.tsx`)

**Fonctionnalités:**
- Catch les erreurs dans les routes protégées
- Affichage UI friendly avec icône d'erreur
- Message d'erreur technique (si disponible)
- ID d'erreur pour le tracking
- Actions:
  - Bouton "Réessayer" (reset)
  - Bouton "Retour à l'accueil" (dashboard)

### 6. Dashboard Page (`app/(protected)/admin/dashboard/page.tsx`)

Page de démonstration avec:
- Message de bienvenue personnalisé
- 4 cartes de statistiques (Membres, Mécènes, Idées, Événements)
- Section "Activité récente" avec timeline
- Section "Actions rapides" avec raccourcis

## Utilisation des couleurs

Le système utilise les couleurs sémantiques définies dans `globals.css`:

**Sidebar:**
- `bg-sidebar` - Fond de la sidebar
- `text-sidebar-foreground` - Texte
- `bg-sidebar-primary` - Item actif
- `bg-sidebar-accent` - Hover

**Sémantiques:**
- `text-success` / `bg-success-light` - Succès (vert)
- `text-warning` / `bg-warning-light` - Avertissement (orange)
- `text-error` / `bg-error-light` - Erreur (rouge)
- `text-info` / `bg-info-light` - Information (bleu)

**Branding:**
- `bg-primary` - Couleur principale CJD (vert)
- `text-primary-foreground` - Texte sur fond primaire

## Flow d'authentification

```
User accède à /admin/dashboard
    ↓
Protected Layout vérifie l'auth
    ↓
Si non authentifié → Redirect /login
    ↓
Si authentifié → Affiche Admin Layout
    ↓
Admin Layout affiche Sidebar + Content
    ↓
Page dashboard s'affiche
```

## Responsive Design

**Desktop (>= 1024px):**
- Sidebar fixe à gauche (w-64 ou w-20 si collapsed)
- Contenu flexible à droite

**Tablet/Mobile (< 1024px):**
- Sidebar peut être réduite via bouton toggle
- Sidebar réduite par défaut pour gagner de l'espace
- Navigation via icônes avec tooltips

## Ajout d'une nouvelle page admin

1. **Créer le fichier de page:**
```bash
mkdir -p app/(protected)/admin/mon-module
touch app/(protected)/admin/mon-module/page.tsx
```

2. **Code minimal de la page:**
```tsx
'use client';

export default function MonModulePage() {
  return (
    <div className="space-y-6">
      <h2>Mon Module</h2>
      <p>Contenu de la page...</p>
    </div>
  );
}
```

3. **Ajouter la route dans la sidebar:**
```tsx
// Dans components/admin/admin-sidebar.tsx
const navItems = [
  // ... autres items
  {
    title: 'Mon Module',
    href: '/admin/mon-module',
    icon: MonIcon,
  },
];
```

4. **Ajouter le label dans les breadcrumbs:**
```tsx
// Dans components/admin/admin-breadcrumbs.tsx
const pathLabels = {
  // ... autres labels
  'mon-module': 'Mon Module',
};
```

C'est tout! Le layout, sidebar, breadcrumbs et auth guard sont automatiquement appliqués.

## Intégration avec tRPC

Les pages existantes utilisent tRPC pour les données:

```tsx
'use client';

import { trpc } from '@/app/providers';

export default function MembersPage() {
  const { data, isLoading } = trpc.members.list.useQuery();

  // ...
}
```

## Tests recommandés

1. **Navigation:**
   - Cliquer sur chaque item de la sidebar
   - Vérifier que la route active est highlightée
   - Tester le toggle collapse/expand de la sidebar

2. **Authentification:**
   - Accéder à `/admin` sans être connecté → doit rediriger vers `/login`
   - Se connecter → doit permettre l'accès
   - Se déconnecter via le bouton → doit rediriger vers `/login`

3. **Breadcrumbs:**
   - Vérifier l'affichage correct sur différentes pages
   - Tester les liens des breadcrumbs
   - Vérifier les labels français

4. **Error Boundary:**
   - Provoquer une erreur dans une page
   - Vérifier l'affichage de l'error boundary
   - Tester le bouton "Réessayer"

5. **Responsive:**
   - Tester sur mobile/tablet
   - Vérifier le comportement de la sidebar collapsible
   - Vérifier le scroll du contenu

## Prochaines étapes

1. **Créer les pages manquantes:**
   - `/admin/ideas/page.tsx`
   - `/admin/events/page.tsx`
   - `/admin/loans/page.tsx`
   - `/admin/financial/page.tsx`
   - `/admin/settings/page.tsx`

2. **Améliorer le dashboard:**
   - Connecter les stats à de vraies données tRPC
   - Ajouter des graphiques (recharts)
   - Ajouter des actions cliquables

3. **Ajouter des permissions:**
   - Intégrer les rôles utilisateur
   - Cacher les sections selon les permissions
   - Ajouter des guards de permissions

4. **Mobile menu:**
   - Ajouter un drawer mobile pour la sidebar
   - Bouton hamburger sur mobile
   - Overlay pour fermer le menu

## Dépendances utilisées

- `next` - Framework
- `react` - UI library
- `lucide-react` - Icônes
- `@/components/ui/*` - shadcn/ui components
- `@/hooks/use-auth` - Hook d'authentification
- `next/navigation` - Routing Next.js
- `tailwindcss` - Styling

## Notes importantes

- Tous les composants sont en `'use client'` car ils utilisent des hooks
- Les layouts imbriqués permettent de partager l'état de la sidebar
- Les breadcrumbs sont auto-générés, pas besoin de les configurer manuellement
- Le système de couleurs est centralisé dans `globals.css`
- L'authentification est gérée par Authentik (OAuth2)

## Support

Pour toute question ou problème, consulter:
- `/srv/workspace/cjd80/CLAUDE.md` - Documentation projet
- `/srv/workspace/cjd80/README.md` - Documentation complète
- Hook d'auth: `/srv/workspace/cjd80/hooks/use-auth.tsx`
