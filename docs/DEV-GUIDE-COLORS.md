# Guide Développeur - Utilisation des Couleurs

Guide rapide pour utiliser correctement les couleurs dans l'application CJD.

---

## 🎯 Règle d'Or

**Toujours utiliser les classes Tailwind sémantiques.**

```tsx
// ✅ CORRECT
<Button className="bg-primary text-white">
  Action
</Button>

// ❌ INCORRECT
<Button style={{ backgroundColor: "#00a844" }}>
  Action
</Button>
```

---

## 📚 Palette Rapide

### Couleurs Principales

```tsx
// Couleur de marque (CJD Green)
<div className="bg-primary text-primary-foreground">
  Primaire
</div>

// Secondaire (noir)
<div className="bg-secondary text-secondary-foreground">
  Secondaire
</div>

// Accent (vert clair)
<div className="bg-accent text-accent-foreground">
  Accent
</div>
```

### Couleurs de Statut

```tsx
// Succès
<Badge className="bg-success">Validé</Badge>
<Badge className="bg-success-light text-success-dark">En cours</Badge>

// Avertissement
<Badge className="bg-warning">Attention</Badge>
<Badge className="bg-warning-light text-warning-dark">Pending</Badge>

// Erreur
<Badge className="bg-error">Erreur</Badge>
<Badge className="bg-error-light text-error-dark">Échoué</Badge>

// Information
<Badge className="bg-info">Info</Badge>
<Badge className="bg-info-light text-info-dark">Note</Badge>
```

---

## 🎨 Patterns Courants

### Boutons

```tsx
// Bouton primaire
<Button className="bg-primary text-white hover:bg-primary/90">
  Action Principale
</Button>

// Bouton secondaire
<Button className="bg-secondary text-white hover:bg-secondary/90">
  Action Secondaire
</Button>

// Bouton outline
<Button className="border-2 border-primary text-primary hover:bg-primary hover:text-white">
  Outline
</Button>

// Bouton ghost
<Button className="text-primary hover:bg-primary/10">
  Ghost
</Button>
```

### Cartes

```tsx
// Carte standard
<Card className="bg-card text-card-foreground">
  <CardHeader className="border-b border-border">
    <CardTitle className="text-primary">Titre</CardTitle>
  </CardHeader>
  <CardContent>Contenu</CardContent>
</Card>

// Carte accentuée
<Card className="border-l-4 border-primary bg-accent/10">
  <CardContent>Mise en avant</CardContent>
</Card>
```

### Alertes

```tsx
// Succès
<Alert className="bg-success-light border-success">
  <AlertTitle className="text-success-dark">Succès</AlertTitle>
  <AlertDescription>Opération réussie</AlertDescription>
</Alert>

// Erreur
<Alert className="bg-error-light border-error">
  <AlertTitle className="text-error-dark">Erreur</AlertTitle>
  <AlertDescription>Une erreur est survenue</AlertDescription>
</Alert>

// Avertissement
<Alert className="bg-warning-light border-warning">
  <AlertTitle className="text-warning-dark">Attention</AlertTitle>
  <AlertDescription>Vérifier les données</AlertDescription>
</Alert>
```

### Liens

```tsx
// Lien primaire
<a className="text-primary hover:text-primary/80 underline">
  Lien
</a>

// Lien dans texte
<p className="text-foreground">
  Texte normal avec un{' '}
  <a className="text-primary hover:underline">lien coloré</a>
</p>
```

### Badges

```tsx
// Badge de statut
<Badge className="bg-success text-white">Actif</Badge>
<Badge className="bg-warning text-black">En attente</Badge>
<Badge className="bg-error text-white">Inactif</Badge>

// Badge outline
<Badge variant="outline" className="border-primary text-primary">
  Tag
</Badge>
```

### Icônes

```tsx
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

// Icône de succès
<CheckCircle className="text-success" />

// Icône d'avertissement
<AlertTriangle className="text-warning" />

// Icône d'erreur
<XCircle className="text-error" />

// Icône d'information
<Info className="text-info" />

// Icône primaire
<Icon className="text-primary" />
```

---

## 🌈 Modificateurs

### Opacité

```tsx
// 100% opacité (par défaut)
<div className="bg-primary">100%</div>

// 90% opacité
<div className="bg-primary/90">90%</div>

// 50% opacité
<div className="bg-primary/50">50%</div>

// 20% opacité
<div className="bg-primary/20">20%</div>

// 10% opacité
<div className="bg-primary/10">10%</div>
```

### États Interactifs

```tsx
// Hover
<button className="bg-primary hover:bg-primary/90">
  Hover
</button>

// Focus
<input className="border-2 border-input focus:border-primary focus:ring-2 focus:ring-primary" />

// Active
<button className="bg-primary active:bg-primary/80">
  Active
</button>

// Disabled
<button className="bg-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled>
  Disabled
</button>
```

### Responsive

```tsx
// Couleur change selon breakpoint
<div className="bg-muted md:bg-primary lg:bg-accent">
  Responsive
</div>

// Texte responsive
<h1 className="text-foreground md:text-primary">
  Titre Responsive
</h1>
```

### Dark Mode

```tsx
// S'adapte au dark mode
<div className="bg-background text-foreground">
  Auto dark mode
</div>

// Couleur spécifique dark mode
<div className="bg-primary dark:bg-accent">
  Custom dark
</div>
```

---

## 🎯 Cas d'Usage Spécifiques

### Formulaires

```tsx
<form className="space-y-4">
  {/* Input normal */}
  <Input
    className="border-input focus:border-primary focus:ring-primary"
    placeholder="Texte"
  />

  {/* Input avec erreur */}
  <Input
    className="border-error focus:border-error focus:ring-error"
    placeholder="Erreur"
  />

  {/* Input avec succès */}
  <Input
    className="border-success focus:border-success focus:ring-success"
    placeholder="Valide"
  />

  {/* Bouton submit */}
  <Button type="submit" className="bg-primary text-white hover:bg-primary/90">
    Envoyer
  </Button>
</form>
```

### Tableaux

```tsx
<Table>
  <TableHeader>
    <TableRow className="bg-muted">
      <TableHead className="text-primary">Nom</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Statut</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-accent/10">
      <TableCell className="font-medium">Jean Dupont</TableCell>
      <TableCell>jean@example.com</TableCell>
      <TableCell>
        <Badge className="bg-success">Actif</Badge>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Navigation

```tsx
<nav className="bg-primary text-white">
  <ul className="flex gap-4">
    <li>
      <a className="hover:text-primary-foreground/80 transition">
        Accueil
      </a>
    </li>
    <li>
      <a className="hover:text-primary-foreground/80 transition">
        Idées
      </a>
    </li>
  </ul>
</nav>
```

### Sections

```tsx
// Section mise en avant
<section className="bg-primary text-white py-16">
  <h2>Hero Section</h2>
</section>

// Section avec gradient
<section className="bg-gradient-to-r from-primary to-accent py-16">
  <h2>Gradient Section</h2>
</section>

// Section légère
<section className="bg-accent/10 py-8">
  <h2>Light Section</h2>
</section>
```

---

## ⚠️ Erreurs à Éviter

### ❌ NE PAS FAIRE

```tsx
// Valeurs hardcodées
<div style={{ color: "#00a844" }}>NON</div>
<div className="text-[#00a844]">NON</div>

// Classes inexistantes
<div className="bg-green-500">NON (utiliser bg-primary)</div>
<div className="text-cjd">NON (utiliser text-primary)</div>

// Import de couleurs
import { colors } from '@/lib/theme/colors';
<div style={{ color: colors.primary }}>NON</div>
```

### ✅ FAIRE

```tsx
// Classes Tailwind sémantiques
<div className="text-primary">OUI</div>
<div className="bg-success">OUI</div>
<div className="border-primary">OUI</div>

// Avec modificateurs
<div className="bg-primary/50 hover:bg-primary/80">OUI</div>
```

---

## 🔍 Debug

### Vérifier les CSS Variables

```javascript
// Console navigateur (DevTools)
const root = document.documentElement;
const style = getComputedStyle(root);

console.log('Primary:', style.getPropertyValue('--primary'));
// Devrait afficher: "144 100% 33%"

console.log('Success:', style.getPropertyValue('--success'));
// Devrait afficher: "145 100% 39%"
```

### Vérifier qu'une classe Tailwind fonctionne

```tsx
// Ajouter temporairement data-testid
<div data-testid="test" className="bg-primary">
  Test
</div>

// Console navigateur
const el = document.querySelector('[data-testid="test"]');
console.log(getComputedStyle(el).backgroundColor);
// Devrait afficher: "rgb(0, 168, 67)"
```

---

## 📖 Référence Complète

Voir: [`docs/THEME-SYSTEM-V2.md`](./THEME-SYSTEM-V2.md)

---

**Dernière mise à jour:** 2026-02-05
