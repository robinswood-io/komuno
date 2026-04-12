# 🎨 Système de Thème Unifié - CJD Amiens

## Vue d'Ensemble

Le système de thème unifié centralise toute la gestion des styles, couleurs et apparence de l'application dans une configuration unique.

### Avantages

✅ **Source de vérité unique** - Tous les styles définis dans `lib/config/branding-core.ts`
✅ **Dark mode intégré** - Support automatique du mode sombre
✅ **Type-safe** - Types TypeScript pour toutes les couleurs
✅ **Maintenable** - Changer une couleur se fait en un seul endroit
✅ **Cohérent** - Toute l'application utilise les mêmes valeurs

## Architecture

```
lib/
├── config/
│   └── branding-core.ts        # Configuration centrale (MODIFIER ICI)
└── theme/
    ├── theme-generator.ts      # Convertisseur HEX → HSL
    ├── theme-provider.tsx      # Provider React dark mode
    ├── index.ts                # Exports centralisés
    └── README.md               # Documentation détaillée

app/
└── globals.css                 # Variables CSS générées

components/
└── theme/
    └── theme-toggle.tsx        # Composant toggle dark/light
```

## 🚀 Quick Start

### 1. Modifier le Thème

Éditez **un seul fichier** :

```typescript
// lib/config/branding-core.ts

export const brandingCore = {
  colors: {
    primary: "#00a844",      // ← Changez ici pour tout le site
    success: "#00c853",
    error: "#f44336",
    // ...
  },
  fonts: {
    primary: "Lato",         // ← Police principale
  },
};
```

### 2. Utiliser les Couleurs

**Dans les composants React :**

```tsx
import { useThemeColors } from '@/lib/theme';

function MyComponent() {
  const colors = useThemeColors();

  return (
    <div style={{ color: colors.primary }}>
      Texte en vert CJD
    </div>
  );
}
```

**Avec les classes Tailwind :**

```tsx
<button className="bg-primary text-primary-foreground">
  Bouton Principal
</button>

<div className="bg-success-light text-success-dark">
  Message de succès
</div>
```

### 3. Activer le Dark Mode

**Ajouter le toggle :**

```tsx
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function Header() {
  return (
    <header>
      {/* ... */}
      <ThemeToggle />
    </header>
  );
}
```

**Utiliser le hook :**

```tsx
import { useTheme } from '@/lib/theme';

function MyComponent() {
  const { theme, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Mode: {theme}
    </button>
  );
}
```

## 📚 Classes CSS Disponibles

### Couleurs de Base

| Classe | Description |
|--------|-------------|
| `bg-background` | Fond principal |
| `bg-foreground` | Texte principal |
| `bg-card` | Fond des cartes |
| `bg-primary` | Couleur principale (vert CJD) |
| `bg-secondary` | Couleur secondaire |
| `bg-muted` | Couleur discrète |
| `bg-accent` | Couleur d'accent |

### Couleurs de Statut

| Classe | Variantes | Usage |
|--------|-----------|-------|
| `bg-success` | `bg-success-dark`, `bg-success-light` | Succès |
| `bg-warning` | `bg-warning-dark`, `bg-warning-light` | Avertissement |
| `bg-error` | `bg-error-dark`, `bg-error-light` | Erreur |
| `bg-info` | `bg-info-dark`, `bg-info-light` | Information |

### Couleurs de Marque

| Classe | Description |
|--------|-------------|
| `bg-cjd-green` | Vert CJD (alias de primary) |
| `bg-cjd-green-dark` | Variante sombre |
| `bg-cjd-green-light` | Variante claire |

### Modificateurs de Texte

Remplacez `bg-` par `text-` pour les couleurs de texte :

```tsx
<p className="text-primary">Texte vert CJD</p>
<p className="text-error">Message d'erreur</p>
<p className="text-muted-foreground">Texte discret</p>
```

### Modificateurs de Bordure

Remplacez `bg-` par `border-` pour les bordures :

```tsx
<div className="border border-primary">
  Bordure verte CJD
</div>
```

## 🎯 Variables CSS

### Accès Direct

```css
.custom-element {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
}
```

### Liste Complète

```css
/* Couleurs de base */
--background, --foreground
--card, --card-foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --destructive-foreground

/* Couleurs de statut */
--success, --success-dark, --success-light
--warning, --warning-dark, --warning-light
--error, --error-dark, --error-light
--info, --info-dark, --info-light

/* UI Elements */
--border, --input, --ring

/* Charts */
--chart-1 à --chart-5, --chart-grid

/* Sidebar */
--sidebar-background, --sidebar-foreground
--sidebar-primary, --sidebar-accent

/* Typographie */
--font-sans, --font-serif, --font-mono

/* Effets */
--radius
--shadow-2xs, --shadow-xs, --shadow-sm
--shadow, --shadow-md, --shadow-lg
--shadow-xl, --shadow-2xl

/* Couleurs utilitaires */
--white, --chart-grid
```

## 🧪 Page de Test

Une page de test est disponible pour visualiser toutes les couleurs :

**URL :** `http://localhost:3000/theme-test`

Cette page affiche :
- ✅ Toutes les couleurs en light et dark mode
- ✅ Composants UI avec les différentes variantes
- ✅ Typographie et styles de texte
- ✅ Toggle pour basculer entre les modes

## 🔧 Cas d'Usage Avancés

### Ajouter une Nouvelle Couleur

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

**2. Dans le générateur :**

```typescript
// lib/theme/theme-generator.ts
export function generateLightThemeVars() {
  return {
    // ...
    '--tertiary': `hsl(${formatHSL(colors.tertiary)})`,
    '--tertiary-foreground': 'hsl(0 0% 100%)',
  };
}
```

**3. Dans globals.css :**

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

### Créer un Thème Personnalisé

Pour un client différent, dupliquez `branding-core.ts` :

```typescript
// lib/config/branding-custom.ts
export const brandingCustom = {
  colors: {
    primary: "#ff5722",  // Orange au lieu de vert
    // ...
  },
};
```

Puis mettez à jour `theme-generator.ts` pour utiliser `brandingCustom`.

### Thème Conditionnel

```typescript
import { brandingCore } from '@/lib/config/branding-core';
import { brandingCustom } from '@/lib/config/branding-custom';

const branding = process.env.NEXT_PUBLIC_THEME === 'custom'
  ? brandingCustom
  : brandingCore;
```

## 📊 Mapping Couleurs

### De brandingCore vers CSS

```
brandingCore.colors.primary → --primary → hsl(140 69% 33%)
  ↓ Utilisé par
  - .bg-primary
  - .text-primary
  - .border-primary
  - .hover:bg-primary
  - --cjd-green (alias)
```

### Variantes Automatiques

| Source | Light Mode | Dark Mode |
|--------|------------|-----------|
| `background` | Blanc | Noir |
| `foreground` | Noir | Blanc |
| `card` | Gris très clair | Gris très sombre |
| `primary` | **Identique** | **Identique** |
| `success-light` | Vert clair | Vert sombre |

## 🛡️ Bonnes Pratiques

### ✅ À Faire

- Utiliser les variables CSS (`var(--primary)`) plutôt que des valeurs en dur
- Tester systématiquement en dark mode
- Respecter les contrastes WCAG AA (4.5:1 pour le texte)
- Documenter les nouvelles couleurs ajoutées
- Utiliser les classes sémantiques (`bg-success` plutôt que `bg-green-500`)

### ❌ À Éviter

- Hardcoder des couleurs directement (`#00a844`)
- Créer des variables CSS sans passer par `brandingCore`
- Oublier les variantes dark mode
- Utiliser Tailwind colors directes (`bg-green-500`)
- Dupliquer les définitions de couleurs

## 🔍 Debugging

### Vérifier les Variables CSS

**DevTools Console :**

```javascript
// Récupérer une variable CSS
getComputedStyle(document.documentElement)
  .getPropertyValue('--primary')
  .trim();

// Toutes les variables
Array.from(document.styleSheets)
  .flatMap(sheet => Array.from(sheet.cssRules))
  .filter(rule => rule.selectorText === ':root')
  .forEach(rule => console.log(rule.cssText));
```

**Avec le hook getCSSVar :**

```tsx
import { getCSSVar } from '@/lib/theme';

function DebugComponent() {
  const primaryColor = getCSSVar('--primary');
  console.log('Primary color:', primaryColor);

  return <div>Primary: {primaryColor}</div>;
}
```

### CSS Non Appliqué

**Vérifier :**

1. Le fichier `globals.css` est bien importé dans `app/layout.tsx`
2. Les classes Tailwind sont dans les paths de `tailwind.config.ts`
3. Le serveur dev est redémarré après modification du config
4. Pas de conflits de classes CSS (inspectez dans DevTools)

## 📖 Documentation Complète

Pour plus de détails, consultez :

- **README du système** : `lib/theme/README.md`
- **Configuration branding** : `lib/config/branding-core.ts`
- **Générateur** : `lib/theme/theme-generator.ts`
- **Page de test** : `app/(authenticated)/theme-test/page.tsx`

## 🤝 Contribution

Pour contribuer au système de thème :

1. Modifier `lib/config/branding-core.ts`
2. Tester en light et dark mode
3. Vérifier la page `/theme-test`
4. Documenter les changements dans ce fichier
5. Créer une PR avec captures d'écran

## 📝 Changelog

### v1.0.0 (2026-01-26)

- ✨ Système de thème unifié
- 🎨 Configuration centralisée dans `brandingCore`
- 🌓 Support dark mode complet
- 📊 Page de test des couleurs
- 📚 Documentation complète
- 🔧 Générateur HEX → HSL automatique

---

**Dernière mise à jour :** 26 janvier 2026
**Version :** 1.0.0
**Mainteneur :** Équipe CJD Amiens
