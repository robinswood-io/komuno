# KPIs et Rapports - Documentation Technique

**Date :** 2025-01-29  
**Version :** 1.0

## KPIs Financiers

### Endpoint

`GET /api/admin/kpis/financial`

### Réponse

```typescript
{
  success: true,
  data: {
    subscriptions: {
      totalRevenue: number; // en centimes
      activeSubscriptions: number;
      totalSubscriptions: number;
      averageAmount: number; // en centimes
      monthlyRevenue: number; // en centimes (30 derniers jours)
    };
    sponsorships: {
      totalRevenue: number; // en centimes
      activeSponsorships: number;
      totalSponsorships: number;
      averageAmount: number; // en centimes
      byLevel: { level: string; count: number; totalAmount: number }[];
    };
    totalRevenue: number; // en centimes (souscriptions + sponsorings)
  }
}
```

### Calculs

- **totalRevenue** : Somme de tous les montants
- **activeSubscriptions** : Souscriptions dont la date actuelle est entre startDate et endDate
- **monthlyRevenue** : Souscriptions créées dans les 30 derniers jours
- **averageAmount** : Moyenne des montants

## KPIs Financiers Étendus

### Endpoint

`GET /api/admin/finance/kpis/extended`

### Réponse

```typescript
{
  success: true,
  data: {
    revenues: {
      actual: number; // en centimes
      forecasted: number; // en centimes
      variance: number; // en centimes (actual - forecasted)
      variancePercent: number; // % ((variance / forecasted) * 100)
    };
    expenses: {
      actual: number; // en centimes
      budgeted: number; // en centimes
      variance: number; // en centimes (actual - budgeted)
      variancePercent: number; // % ((variance / budgeted) * 100)
    };
    balance: {
      actual: number; // en centimes (revenues.actual - expenses.actual)
      forecasted: number; // en centimes (revenues.forecasted - expenses.budgeted)
      variance: number; // en centimes (actual - forecasted)
    };
    realizationRate: number; // % ((revenues.actual / revenues.forecasted) * 100)
  }
}
```

### Calculs

- **Revenus réels** : Somme des revenus effectifs (souscriptions + sponsorings actifs)
- **Revenus prévus** : Somme des prévisions de revenus pour la période
- **Dépenses réelles** : Somme des dépenses enregistrées pour la période
- **Dépenses budgétées** : Somme des budgets de dépenses pour la période
- **Écart revenus** : Revenus réels - Revenus prévus
- **Écart dépenses** : Dépenses réelles - Dépenses budgétées
- **Taux de réalisation** : (Revenus réels / Revenus prévus) * 100

### Utilisation Frontend

```typescript
import { useAdminQuery } from "@/hooks/use-admin-query";
import { ExtendedFinancialKPIsWidget } from "@/components/admin/AdminKPIsWidgets";

// Dans un composant
const { user } = useAuth();

<ExtendedFinancialKPIsWidget userRole={user?.role} />
```

## KPIs d'Engagement

### Endpoint

`GET /api/admin/kpis/engagement`

### Réponse

```typescript
{
  success: true,
  data: {
    members: {
      total: number;
      active: number;
      averageScore: number;
      conversionRate: number; // proposed -> active (%)
      retentionRate: number; // actifs sur 30j / total actifs (%)
      churnRate: number; // inactifs > 90j / total actifs (%)
    };
    patrons: {
      total: number;
      active: number;
      conversionRate: number;
    };
    activities: {
      total: number;
      averagePerMember: number;
      byType: { type: string; count: number }[];
    };
  }
}
```

### Calculs

- **conversionRate** : `(actifs / (proposés + actifs)) * 100`
- **retentionRate** : `(actifs 30j / total actifs) * 100`
- **churnRate** : `(inactifs > 90j / total actifs) * 100`
- **averageScore** : Moyenne des scores d'engagement
- **averagePerMember** : Nombre moyen d'activités par membre actif

## Utilisation Frontend

```typescript
import { useQuery } from "@tanstack/react-query";

// KPIs financiers
const { data: financialKPIs } = useQuery({
  queryKey: ["/api/admin/kpis/financial"],
  queryFn: async () => {
    const res = await fetch("/api/admin/kpis/financial");
    return res.json();
  },
});

// KPIs d'engagement
const { data: engagementKPIs } = useQuery({
  queryKey: ["/api/admin/kpis/engagement"],
  queryFn: async () => {
    const res = await fetch("/api/admin/kpis/engagement");
    return res.json();
  },
});
```

## Exports

### Format CSV

Les exports CSV utilisent la bibliothèque `client/src/lib/reports.ts` :

```typescript
import { exportToCSV } from "@/lib/reports";

exportToCSV(
  data,
  ["Colonne1", "Colonne2", "Colonne3"],
  "nom-fichier",
  (item) => [item.field1, item.field2, item.field3]
);
```

### Validation

Avant export, valider les données :

```typescript
import { validateExportData } from "@/lib/reports";

const validation = validateExportData(data);
if (!validation.valid) {
  toast({ title: "Erreur", description: validation.error });
  return;
}
```

## Comparaisons Financières

### Endpoint

`GET /api/admin/finance/comparison`

**Paramètres de requête :**
- `period1` : Première période (format: `YYYY-MM` pour mensuel, `YYYY-Q` pour trimestriel, `YYYY` pour annuel)
- `period2` : Deuxième période (même format)

**Exemple :**
```
GET /api/admin/finance/comparison?period1=2024-01&period2=2025-01
GET /api/admin/finance/comparison?period1=2024-Q1&period2=2025-Q1
```

**Réponse :**
```typescript
{
  success: true,
  data: {
    period1: {
      period: string;
      revenues: number; // en centimes
      expenses: number; // en centimes
      balance: number; // en centimes
    };
    period2: {
      period: string;
      revenues: number; // en centimes
      expenses: number; // en centimes
      balance: number; // en centimes
    };
    variations: {
      revenues: {
        absolute: number; // en centimes
        percent: number; // %
      };
      expenses: {
        absolute: number; // en centimes
        percent: number; // %
      };
      balance: {
        absolute: number; // en centimes
        percent: number; // %
      };
    };
  }
}
```

### Utilisation Frontend

```typescript
import { useAdminQuery } from "@/hooks/use-admin-query";
import { AdminComparisonWidget } from "@/components/admin/AdminComparisonWidget";

// Dans un composant
const { data: comparison } = useAdminQuery(
  ["/api/admin/finance/comparison", { period1: "2024-01", period2: "2025-01" }],
  async () => {
    const res = await fetch("/api/admin/finance/comparison?period1=2024-01&period2=2025-01");
    if (!res.ok) throw new Error('Failed to fetch comparison');
    return res.json();
  }
);

<AdminComparisonWidget comparison={comparison?.data} />
```

## Rapports Financiers

Voir la documentation complète dans `docs/admin/FINANCIAL_REPORTS.md` pour :
- Génération de rapports mensuels, trimestriels, annuels
- Export PDF et CSV
- Structure détaillée des rapports

## Rapports Automatisés

**Statut :** ⚠️ À implémenter

Les rapports automatisés (mensuels, trimestriels) nécessitent :
- Planificateur de tâches (cron)
- Génération PDF
- Envoi par email

**Recommandation :** Utiliser `node-cron` côté serveur et `jsPDF` ou `puppeteer` pour génération PDF.

## Documentation Complémentaire

- **Prévisionnel et Pilotage Financier** : `docs/admin/FINANCIAL_PLANNING.md`
- **Rapports Financiers** : `docs/admin/FINANCIAL_REPORTS.md`

