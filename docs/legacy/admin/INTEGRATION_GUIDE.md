# Guide d'Intégration - Composants Admin Standardisés

**Date :** 2025-01-29  
**Version :** 1.0

## Vue d'ensemble

Ce guide explique comment utiliser les nouveaux composants standardisés pour améliorer la cohérence et réduire les duplications de code dans les pages admin.

## Composants Disponibles

### 1. AdminPageLayout

Layout standardisé pour toutes les pages admin avec breadcrumbs.

```typescript
import AdminPageLayout from "@/components/admin/AdminPageLayout";
import { UserCircle } from "lucide-react";

export default function MyAdminPage() {
  return (
    <AdminPageLayout
      title="Titre de la page"
      description="Description de la page"
      breadcrumbs={[
        { label: "Module", path: "/admin/module" },
        { label: "Sous-page" },
      ]}
      icon={<UserCircle className="w-5 h-5 text-cjd-green" />}
    >
      {/* Contenu de la page */}
    </AdminPageLayout>
  );
}
```

**Note :** AdminPageLayout inclut déjà AdminHeader, ne pas le dupliquer.

### 2. AdminSearchBar

Barre de recherche standardisée.

```typescript
import AdminSearchBar from "@/components/admin/AdminSearchBar";

const [searchQuery, setSearchQuery] = useState("");

<AdminSearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Rechercher..."
  className="mb-4"
/>
```

**Avant :**
```typescript
<div className="relative">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
  <Input
    placeholder="Rechercher..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="pl-10"
  />
</div>
```

**Après :**
```typescript
<AdminSearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Rechercher..."
/>
```

### 3. AdminFilters

Composant de filtres réutilisable.

```typescript
import { AdminFilters, AdminFilter } from "@/components/admin/AdminFilters";

const [statusFilter, setStatusFilter] = useState("all");
const [typeFilter, setTypeFilter] = useState("all");

<AdminFilters
  filters={[
    {
      label: "Statut",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: "all", label: "Tous" },
        { value: "active", label: "Actifs" },
        { value: "inactive", label: "Inactifs" },
      ],
    },
    {
      label: "Type",
      value: typeFilter,
      onChange: setTypeFilter,
      options: [
        { value: "all", label: "Tous" },
        { value: "type1", label: "Type 1" },
      ],
    },
  ]}
/>
```

### 4. AdminDataTable

Tableau de données avec pagination, tri et recherche intégrés.

```typescript
import AdminDataTable, { Column } from "@/components/admin/AdminDataTable";

const columns: Column<MyDataType>[] = [
  {
    key: "name",
    label: "Nom",
    sortable: true,
  },
  {
    key: "email",
    label: "Email",
    sortable: true,
  },
  {
    key: "status",
    label: "Statut",
    render: (item) => <Badge>{item.status}</Badge>,
  },
];

<AdminDataTable
  data={items}
  columns={columns}
  searchable={true}
  searchPlaceholder="Rechercher..."
  getSearchValue={(item) => `${item.name} ${item.email}`}
  paginated={true}
  pageSize={20}
  onRowClick={(item) => handleSelect(item)}
/>
```

### 5. Mapping Statuts

Utiliser le mapping centralisé pour les badges de statut.

```typescript
import { getStatusConfig } from "@/lib/admin-status-mapping";
import { Badge } from "@/components/ui/badge";

const statusConfig = getStatusConfig(member.status, "member");

<Badge variant={statusConfig.variant} className={statusConfig.className}>
  {statusConfig.label}
</Badge>
```

**Avant :**
```typescript
const getStatusBadge = (status: string) => {
  if (status === "active") return "bg-green-500";
  if (status === "proposed") return "bg-yellow-500";
  // ...
};
```

**Après :**
```typescript
const statusConfig = getStatusConfig(status, "member");
// Utilisation standardisée
```

### 6. Formatage Monétaire

Utiliser la fonction standardisée pour formater les montants.

```typescript
import { formatEuros } from "@/lib/reports";

// Avant
const formatEuros = (cents: number) => `${(cents / 100).toFixed(2)} €`;

// Après
import { formatEuros } from "@/lib/reports";
formatEuros(12345); // "123,45 €"
```

### 7. Exports

Utiliser la bibliothèque standardisée pour les exports.

```typescript
import { exportToCSV, validateExportData } from "@/lib/reports";

const handleExport = () => {
  const validation = validateExportData(data);
  if (!validation.valid) {
    toast({ title: "Erreur", description: validation.error });
    return;
  }

  exportToCSV(
    data,
    ["Nom", "Email", "Statut"],
    "export-membres",
    (item) => [item.name, item.email, item.status]
  );
};
```

## Exemple Complet

### Page Admin Avant

```typescript
export default function AdminMembersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Membres</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Recherche personnalisée */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtres personnalisés */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
              </SelectContent>
            </Select>

            {/* Tableau personnalisé */}
            {/* ... */}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
```

### Page Admin Après

```typescript
import AdminPageLayout from "@/components/admin/AdminPageLayout";
import AdminSearchBar from "@/components/admin/AdminSearchBar";
import { AdminFilters } from "@/components/admin/AdminFilters";
import AdminDataTable, { Column } from "@/components/admin/AdminDataTable";
import { getStatusConfig } from "@/lib/admin-status-mapping";
import { UserCircle } from "lucide-react";

export default function AdminMembersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const columns: Column<Member>[] = [
    { key: "name", label: "Nom", sortable: true },
    { key: "email", label: "Email", sortable: true },
    {
      key: "status",
      label: "Statut",
      render: (item) => {
        const config = getStatusConfig(item.status, "member");
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
  ];

  return (
    <AdminPageLayout
      title="Gestion des Membres"
      description="Gérer les membres de la communauté"
      breadcrumbs={[
        { label: "CRM", path: "/admin/crm" },
        { label: "Membres" },
      ]}
      icon={<UserCircle className="w-5 h-5 text-cjd-green" />}
    >
      <AdminSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Rechercher par nom, email..."
      />

      <AdminFilters
        filters={[
          {
            label: "Statut",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "all", label: "Tous" },
              { value: "active", label: "Actifs" },
              { value: "proposed", label: "Proposés" },
            ],
          },
        ]}
        className="my-4"
      />

      <AdminDataTable
        data={filteredMembers}
        columns={columns}
        searchable={false} // Recherche déjà gérée par AdminSearchBar
        paginated={true}
        pageSize={20}
        onRowClick={(member) => handleSelect(member)}
      />
    </AdminPageLayout>
  );
}
```

## Migration Progressive

### Étape 1 : Utiliser AdminPageLayout

Remplacer le layout manuel par `AdminPageLayout` :

```typescript
// Avant
<div className="min-h-screen bg-gray-50">
  <AdminHeader />
  <main>...</main>
</div>

// Après
<AdminPageLayout title="..." description="..." breadcrumbs={[...]}>
  ...
</AdminPageLayout>
```

### Étape 2 : Remplacer les barres de recherche

Remplacer les barres de recherche personnalisées par `AdminSearchBar`.

### Étape 3 : Standardiser les filtres

Utiliser `AdminFilters` pour tous les filtres.

### Étape 4 : Utiliser AdminDataTable

Remplacer les tableaux personnalisés par `AdminDataTable` quand possible.

### Étape 5 : Utiliser le mapping statuts

Remplacer les fonctions de mapping statuts par `getStatusConfig()`.

## Avantages

1. **Cohérence** : Toutes les pages utilisent les mêmes composants
2. **Maintenabilité** : Modifications centralisées
3. **Réduction de code** : Moins de duplication
4. **UX améliorée** : Expérience utilisateur uniforme
5. **Performance** : Composants optimisés et réutilisables

## Notes

- Les composants sont rétrocompatibles
- La migration peut être progressive
- Les pages existantes continuent de fonctionner
- Les nouveaux composants peuvent être utilisés progressivement

