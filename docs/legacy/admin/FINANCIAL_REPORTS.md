# Rapports Financiers - Documentation Technique

**Date :** 2025-01-29  
**Version :** 1.0

## Vue d'ensemble

Les rapports financiers permettent de générer des analyses détaillées de la situation financière pour différentes périodes (mensuelle, trimestrielle, annuelle).

## Endpoints API

### Générer un rapport

**Endpoint :** `GET /api/admin/finance/reports/:type`

**Paramètres de requête :**
- `type` : Type de rapport (`monthly`, `quarterly`, `yearly`)
- `period` : Période (mois 1-12 pour monthly, trimestre 1-4 pour quarterly, année pour yearly)
- `year` : Année (ex: 2025)

**Exemple :**
```
GET /api/admin/finance/reports/monthly?period=1&year=2025
GET /api/admin/finance/reports/quarterly?period=1&year=2025
GET /api/admin/finance/reports/yearly?year=2025
```

**Réponse :**
```typescript
{
  success: true,
  data: {
    period: {
      type: 'monthly' | 'quarterly' | 'yearly';
      period: number;
      year: number;
      startDate: string; // ISO date
      endDate: string; // ISO date
    };
    revenues: {
      subscriptions: {
        total: number; // en centimes
        count: number;
        average: number; // en centimes
      };
      sponsorships: {
        total: number; // en centimes
        count: number;
        average: number; // en centimes
      };
      other: {
        total: number; // en centimes
        count: number;
      };
      total: number; // en centimes
    };
    expenses: {
      byCategory: {
        categoryId: string;
        categoryName: string;
        total: number; // en centimes
        count: number;
      }[];
      total: number; // en centimes
    };
    budgets: {
      byCategory: {
        categoryId: string;
        categoryName: string;
        budgeted: number; // en centimes
        actual: number; // en centimes
        variance: number; // en centimes
        variancePercent: number; // %
      }[];
      totalBudgeted: number; // en centimes
      totalActual: number; // en centimes
      totalVariance: number; // en centimes
    };
    balance: {
      actual: number; // en centimes
      forecasted: number; // en centimes
      variance: number; // en centimes
    };
    forecasts: {
      nextPeriod: {
        revenues: number; // en centimes
        expenses: number; // en centimes
        balance: number; // en centimes
        confidence: 'high' | 'medium' | 'low';
      };
    };
  }
}
```

## Structure des rapports

### Rapport mensuel

**Période :** Du 1er au dernier jour du mois sélectionné

**Contenu :**
- Revenus du mois (souscriptions, sponsorings, autres)
- Dépenses du mois par catégorie
- Comparaison avec les budgets mensuels
- Prévisions pour le mois suivant

### Rapport trimestriel

**Période :** Du 1er jour du trimestre au dernier jour du trimestre

**Contenu :**
- Revenus du trimestre (souscriptions, sponsorings, autres)
- Dépenses du trimestre par catégorie
- Comparaison avec les budgets trimestriels
- Prévisions pour le trimestre suivant

### Rapport annuel

**Période :** Du 1er janvier au 31 décembre de l'année

**Contenu :**
- Revenus de l'année (souscriptions, sponsorings, autres)
- Dépenses de l'année par catégorie
- Comparaison avec les budgets annuels
- Prévisions pour l'année suivante

## Calculs

### Revenus

- **Total souscriptions** : Somme des montants des souscriptions actives dans la période
- **Total sponsorings** : Somme des montants des sponsorings actifs dans la période
- **Autres revenus** : Revenus non catégorisés (futur)

### Dépenses

- **Par catégorie** : Somme des dépenses de chaque catégorie dans la période
- **Total** : Somme de toutes les dépenses dans la période

### Budgets

- **Budgeté** : Montant budgété pour la période
- **Réel** : Montant réel (dépenses) pour la période
- **Écart** : Réel - Budgeté
- **Écart %** : (Écart / Budgeté) * 100

### Solde

- **Réel** : Revenus réels - Dépenses réelles
- **Prévu** : Revenus prévus - Dépenses budgétées
- **Écart** : Réel - Prévu

## Export

### Export PDF

**Format :** PDF avec mise en page professionnelle

**Contenu :**
- En-tête avec logo et informations de l'association
- Période du rapport
- Tableaux de revenus, dépenses, budgets
- Graphiques (si disponibles)
- Prévisions période suivante
- Pied de page avec date de génération

### Export CSV

**Format :** CSV avec séparateur virgule

**Contenu :**
- Ligne d'en-tête avec les colonnes
- Données structurées par sections :
  - Revenus
  - Dépenses
  - Budgets
  - Prévisions

**Exemple de structure CSV :**
```csv
Section,Category,Amount,Count,Average
Revenues,Subscriptions,100000,10,10000
Revenues,Sponsorships,50000,5,10000
Expenses,Personnel,30000,2,15000
Budgets,Personnel,35000,30000,5000
```

## Utilisation Frontend

```typescript
import { useAdminQuery } from "@/hooks/use-admin-query";

// Générer un rapport mensuel
const { data: report } = useAdminQuery(
  ["/api/admin/finance/reports/monthly", { period: 1, year: 2025 }],
  async () => {
    const res = await fetch("/api/admin/finance/reports/monthly?period=1&year=2025");
    if (!res.ok) throw new Error('Failed to fetch report');
    return res.json();
  }
);

// Exporter en PDF
const exportPDF = async () => {
  const res = await fetch("/api/admin/finance/reports/monthly?period=1&year=2025&export=pdf");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport-financier-2025-01.pdf`;
  a.click();
};

// Exporter en CSV
const exportCSV = async () => {
  const res = await fetch("/api/admin/finance/reports/monthly?period=1&year=2025&export=csv");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport-financier-2025-01.csv`;
  a.click();
};
```

## Permissions

- **super_admin** : Génération et export de tous les rapports
- **finance_reader** : Consultation des rapports (pas d'export)

## Performance

Les rapports sont générés à la demande. Pour de grandes quantités de données, la génération peut prendre quelques secondes. Un indicateur de chargement est affiché pendant la génération.

## Limitations

- Les rapports sont limités aux données disponibles dans la base de données
- Les prévisions sont basées sur l'historique disponible
- L'export PDF nécessite une bibliothèque de génération PDF côté serveur (à implémenter)

## Améliorations futures

- Mise en cache des rapports générés
- Génération asynchrone pour les rapports volumineux
- Templates personnalisables pour les exports PDF
- Graphiques intégrés dans les rapports
- Comparaisons avec périodes précédentes




