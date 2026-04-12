# 🚫 Interdiction des Couleurs Hardcodées

## Règle Absolue

**AUCUNE couleur ne doit être hardcodée dans le code.**

Toutes les couleurs DOIVENT provenir de la configuration centralisée dans `lib/config/branding-core.ts`.

## ❌ Exemples INTERDITS

```tsx
// ❌ JAMAIS faire ça
<div style={{ color: '#00a844' }}>...</div>
<div style={{ backgroundColor: 'rgb(0, 168, 68)' }}>...</div>
<div style={{ borderColor: 'green' }}>...</div>

const style = {
  color: '#ff0000',
  background: 'rgba(0, 0, 0, 0.5)',
};

// ❌ Même en JavaScript
const primaryColor = '#00a844';
const errorColor = 'red';
```

## ✅ Méthodes APPROUVÉES

### 1. Classes Tailwind (Recommandé)

```tsx
// ✅ Utiliser les classes du thème
<div className="text-primary">Texte vert CJD</div>
<div className="bg-success-light text-success-dark">Succès</div>
<button className="bg-error hover:bg-error-dark">Erreur</button>
```

### 2. Utilitaires de Couleurs

```tsx
import { colors, getColor, getColorRgba } from '@/lib/theme/colors';

// ✅ Palette pré-calculée
<div style={{ color: colors.primary }}>...</div>

// ✅ Fonction getColor
<div style={{ backgroundColor: getColor('success') }}>...</div>

// ✅ Avec transparence
<div style={{
  backgroundColor: getColorRgba('primary', 0.1),
  borderColor: getColor('primaryDark')
}}>...</div>
```

### 3. Hook React (Composants Dynamiques)

```tsx
import { useThemeColors } from '@/lib/theme';

function MyComponent() {
  const colors = useThemeColors();

  return (
    <div style={{
      color: colors.primary,
      backgroundColor: colors.background
    }}>
      Contenu
    </div>
  );
}
```

### 4. Variables CSS (Style Avancé)

```tsx
// ✅ Utiliser les variables CSS
<div style={{
  color: 'hsl(var(--primary))',
  backgroundColor: 'hsl(var(--success-light))'
}}>...</div>

// ✅ En CSS/SCSS
.custom-element {
  color: hsl(var(--primary));
  background-color: hsl(var(--card));
  border-color: hsl(var(--border));
}
```

## 📊 Couleurs Disponibles

### Couleurs Principales

| Nom | Valeur | Usage |
|-----|--------|-------|
| `primary` | `#00a844` | Couleur principale (vert CJD) |
| `primaryDark` | `#008835` | Variante sombre |
| `primaryLight` | `#00c94f` | Variante claire |
| `secondary` | `#1a1a1a` | Couleur secondaire |
| `accent` | `#2196f3` | Couleur d'accent |

### Couleurs de Statut

| Nom | Valeur | Usage |
|-----|--------|-------|
| `success` | `#00c853` | Succès |
| `successDark` | `#00a844` | Succès sombre |
| `successLight` | `#e8f5e9` | Succès clair |
| `warning` | `#ffa726` | Avertissement |
| `warningDark` | `#f57c00` | Avertissement sombre |
| `warningLight` | `#fff3e0` | Avertissement clair |
| `error` | `#f44336` | Erreur |
| `errorDark` | `#d32f2f` | Erreur sombre |
| `errorLight` | `#ffebee` | Erreur clair |
| `info` | `#2196f3` | Information |
| `infoDark` | `#1976d2` | Information sombre |
| `infoLight` | `#e3f2fd` | Information clair |

### Couleurs Charts

| Nom | Valeur | Usage |
|-----|--------|-------|
| `chart1` | `#00a844` | Graphique 1 |
| `chart2` | `#00bfa5` | Graphique 2 |
| `chart3` | `#ffa726` | Graphique 3 |
| `chart4` | `#26c6da` | Graphique 4 |
| `chart5` | `#ec407a` | Graphique 5 |

## 🛠️ Cas d'Usage

### Composant avec Style Inline

```tsx
import { colors } from '@/lib/theme/colors';

function Badge({ status }: { status: 'success' | 'error' | 'warning' }) {
  const statusColors = {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
  };

  return (
    <span style={{
      backgroundColor: statusColors[status],
      color: colors.white
    }}>
      {status}
    </span>
  );
}
```

### Graphique avec Couleurs Dynamiques

```tsx
import { getColor } from '@/lib/theme/colors';

const chartConfig = {
  series: [{
    name: 'Ventes',
    data: [10, 20, 30],
    color: getColor('chart1'),
  }, {
    name: 'Achats',
    data: [5, 15, 25],
    color: getColor('chart2'),
  }],
};
```

### Couleur avec Transparence

```tsx
import { getColorRgba } from '@/lib/theme/colors';

function Overlay() {
  return (
    <div style={{
      backgroundColor: getColorRgba('primary', 0.1),
      backdropFilter: 'blur(8px)'
    }}>
      Contenu avec overlay semi-transparent
    </div>
  );
}
```

## 🔍 Vérification Automatique

Un script est disponible pour détecter les couleurs hardcodées :

```bash
npm run check:colors  # Scan du code
```

Ou manuellement :

```bash
bash scripts/find-hardcoded-colors.sh
```

## 🚨 Détection par ESLint

Le fichier `.eslintrc.hardcoded-colors.json` configure ESLint pour bloquer :
- Couleurs HEX (`#xxxxxx`)
- Fonctions `rgb()` et `rgba()`
- Noms de couleurs CSS hardcodés

## ✏️ Ajouter une Nouvelle Couleur

**1. Dans brandingCore :**

```typescript
// lib/config/branding-core.ts
export const brandingCore = {
  colors: {
    // ... couleurs existantes
    tertiary: "#9c27b0",  // Nouvelle couleur
  },
};
```

**2. Dans le générateur (si nécessaire pour CSS) :**

```typescript
// lib/theme/theme-generator.ts
export function generateLightThemeVars() {
  return {
    // ...
    '--tertiary': `hsl(${formatHSL(colors.tertiary)})`,
  };
}
```

**3. Ajouter les classes CSS :**

```css
/* app/globals.css */
@layer components {
  .bg-tertiary {
    background-color: hsl(var(--tertiary));
  }

  .text-tertiary {
    color: hsl(var(--tertiary));
  }
}
```

**4. Utiliser :**

```tsx
import { getColor } from '@/lib/theme/colors';

<div style={{ color: getColor('tertiary') }}>...</div>
// Ou
<div className="text-tertiary">...</div>
```

## 🎯 Avantages

✅ **Maintenance facile** - Changer une couleur partout en 1 seul endroit
✅ **Cohérence** - Toute l'app utilise les mêmes valeurs
✅ **Type-safety** - Autocomplétion et vérification TypeScript
✅ **Thèmes** - Support automatique du dark mode
✅ **Flexibilité** - Facile de créer des variantes par client

## 📚 Ressources

- **Configuration** : `lib/config/branding-core.ts`
- **Utilitaires** : `lib/theme/colors.ts`
- **Documentation** : `lib/theme/README.md`
- **Système complet** : `docs/THEME-SYSTEM.md`

## ⚖️ Exceptions

Les seules exceptions acceptables sont :

1. **Fichier de configuration** : `lib/config/branding-core.ts` (source de vérité)
2. **Générateur de thème** : `lib/theme/theme-generator.ts` (conversion HEX → HSL)
3. **Tests** : Fichiers `*.test.ts` ou `*.spec.ts` pour valider les couleurs

**Toute autre utilisation de couleur hardcodée sera rejetée en code review.**

---

**Dernière mise à jour :** 26 janvier 2026
**Version :** 1.0.0
**Maintenu par :** Équipe CJD Amiens
