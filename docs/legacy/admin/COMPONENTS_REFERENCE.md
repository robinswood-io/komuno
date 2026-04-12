# Référence des Composants Admin

**Date :** 2025-01-29  
**Version :** 1.0

## Composants Disponibles

### AdminPageLayout

Layout standardisé pour pages admin avec breadcrumbs et header.

**Props :**
- `title: string` - Titre de la page
- `description?: string` - Description optionnelle
- `breadcrumbs?: BreadcrumbItem[]` - Items de breadcrumb
- `children: ReactNode` - Contenu de la page
- `icon?: ReactNode` - Icône optionnelle
- `showHeader?: boolean` - Afficher AdminHeader (défaut: true)
- `showCard?: boolean` - Wrapper dans Card (défaut: true)

**Exemple :**
```typescript
<AdminPageLayout
  title="Gestion des Membres"
  description="Gérer les membres"
  breadcrumbs={[
    { label: "CRM", path: "/admin/crm" },
    { label: "Membres" },
  ]}
  icon={<UserCircle className="w-5 h-5" />}
>
  {/* Contenu */}
</AdminPageLayout>
```

### AdminSearchBar

Barre de recherche standardisée avec icône.

**Props :**
- `value: string` - Valeur de recherche
- `onChange: (value: string) => void` - Callback de changement
- `placeholder?: string` - Placeholder (défaut: "Rechercher...")
- `className?: string` - Classes CSS additionnelles

**Exemple :**
```typescript
<AdminSearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Rechercher par nom..."
/>
```

### AdminFilters

Composant de filtres réutilisable.

**Props :**
- `filters: AdminFilterProps[]` - Tableau de filtres
- `className?: string` - Classes CSS additionnelles

**AdminFilterProps :**
- `label: string` - Label du filtre
- `value: string` - Valeur actuelle
- `onChange: (value: string) => void` - Callback
- `options: FilterOption[]` - Options disponibles
- `className?: string` - Classes CSS

**FilterOption :**
- `value: string` - Valeur de l'option
- `label: string` - Label affiché

**Exemple :**
```typescript
<AdminFilters
  filters={[
    {
      label: "Statut",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: "all", label: "Tous" },
        { value: "active", label: "Actifs" },
      ],
    },
  ]}
/>
```

### AdminDataTable

Tableau de données avec pagination, tri et recherche.

**Props :**
- `data: T[]` - Données à afficher
- `columns: Column<T>[]` - Colonnes du tableau
- `searchable?: boolean` - Activer recherche (défaut: true)
- `searchPlaceholder?: string` - Placeholder recherche
- `getSearchValue?: (item: T) => string` - Fonction de recherche personnalisée
- `paginated?: boolean` - Activer pagination (défaut: true)
- `pageSize?: number` - Taille de page (défaut: 20)
- `onRowClick?: (item: T) => void` - Callback clic sur ligne
- `className?: string` - Classes CSS

**Column :**
- `key: string` - Clé de la colonne
- `label: string` - Label affiché
- `render?: (item: T) => ReactNode` - Fonction de rendu personnalisée
- `sortable?: boolean` - Colonne triable (défaut: false)

**Exemple :**
```typescript
<AdminDataTable
  data={members}
  columns={[
    { key: "name", label: "Nom", sortable: true },
    { key: "email", label: "Email", sortable: true },
    {
      key: "status",
      label: "Statut",
      render: (item) => <Badge>{item.status}</Badge>,
    },
  ]}
  searchable={true}
  paginated={true}
  pageSize={20}
  onRowClick={(member) => handleSelect(member)}
/>
```

### AdminBreadcrumbs

Breadcrumbs pour navigation hiérarchique.

**Props :**
- `items: BreadcrumbItem[]` - Items de breadcrumb

**BreadcrumbItem :**
- `label: string` - Label affiché
- `path?: string` - Chemin optionnel (si fourni, cliquable)

**Exemple :**
```typescript
<AdminBreadcrumbs
  items={[
    { label: "Dashboard", path: "/admin/dashboard" },
    { label: "CRM", path: "/admin/crm" },
    { label: "Membres" },
  ]}
/>
```

### AdminKPIsWidgets

Widgets pour afficher les KPIs.

#### FinancialKPIsWidget

Affiche les KPIs financiers (super_admin uniquement).

**Props :**
- `userRole?: string` - Rôle de l'utilisateur

**Exemple :**
```typescript
<FinancialKPIsWidget userRole={user?.role} />
```

#### EngagementKPIsWidget

Affiche les KPIs d'engagement.

**Props :**
- `userRole?: string` - Rôle de l'utilisateur

**Exemple :**
```typescript
<EngagementKPIsWidget userRole={user?.role} />
```

### AdminTrackingWidget

Widget pour métriques de tracking.

**Props :**
- `userRole?: string` - Rôle de l'utilisateur

**Exemple :**
```typescript
<AdminTrackingWidget userRole={user?.role} />
```

## Utilitaires

### formatEuros

Formate un montant en euros depuis des centimes.

```typescript
import { formatEuros } from "@/lib/reports";

formatEuros(12345); // "123,45 €"
```

### getStatusConfig

Récupère la configuration d'un statut (label, variant, className).

```typescript
import { getStatusConfig } from "@/lib/admin-status-mapping";

const config = getStatusConfig("active", "member");
// { label: "Actif", variant: "default", className: "bg-success..." }
```

### exportToCSV

Exporte des données en CSV.

```typescript
import { exportToCSV } from "@/lib/reports";

exportToCSV(
  data,
  ["Colonne1", "Colonne2"],
  "nom-fichier",
  (item) => [item.field1, item.field2]
);
```

### useAdminQuery

Hook pour requêtes admin avec cache et permissions.

```typescript
import { useAdminQuery } from "@/hooks/use-admin-query";

const { data, isLoading } = useAdminQuery(
  ["/api/admin/endpoint"],
  async () => {
    const res = await fetch("/api/admin/endpoint");
    return res.json();
  }
);
```

## Mapping Statuts

### Types Supportés

- `"member"` - Statuts de membres
- `"patron"` - Statuts de mécènes
- `"idea"` - Statuts d'idées
- `"event"` - Statuts d'événements
- `"sponsorship"` - Statuts de sponsorings
- `"sponsorship-level"` - Niveaux de sponsoring
- `"alert-severity"` - Sévérités d'alertes

### Utilisation

```typescript
import { getStatusConfig } from "@/lib/admin-status-mapping";
import { Badge } from "@/components/ui/badge";

const statusConfig = getStatusConfig(item.status, "member");

<Badge variant={statusConfig.variant} className={statusConfig.className}>
  {statusConfig.label}
</Badge>
```

## Bonnes Pratiques

1. **Toujours utiliser AdminPageLayout** pour les nouvelles pages
2. **Utiliser AdminSearchBar** au lieu de barres de recherche personnalisées
3. **Utiliser AdminFilters** pour tous les filtres
4. **Utiliser getStatusConfig()** pour les badges de statut
5. **Utiliser formatEuros()** pour formater les montants
6. **Utiliser useAdminQuery** pour les requêtes admin

## Migration

Voir `docs/admin/INTEGRATION_GUIDE.md` pour un guide de migration détaillé.

