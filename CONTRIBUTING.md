# Guide de Contribution - Komuno

Merci de votre intérêt pour contribuer à Komuno ! Ce document explique comment participer au développement du projet.

## Code de Conduite

En participant à ce projet, vous acceptez de respecter notre [Code de Conduite](CODE_OF_CONDUCT.md).

## Comment Contribuer

### Signaler un Bug

1. Vérifiez que le bug n'a pas déjà été signalé dans les [Issues](https://github.com/robinswood-io/komuno/issues)
2. Créez une nouvelle issue avec le template "Bug Report"
3. Incluez :
   - Description claire du problème
   - Étapes pour reproduire
   - Comportement attendu vs observé
   - Screenshots si applicable
   - Environnement (navigateur, OS, version)

### Proposer une Fonctionnalité

1. Ouvrez une issue avec le template "Feature Request"
2. Décrivez le problème que vous souhaitez résoudre
3. Proposez votre solution
4. Attendez la validation avant de commencer le développement

### Soumettre du Code

#### Prérequis

- Node.js 20+
- Docker & Docker Compose
- Git

#### Installation locale

```bash
git clone https://github.com/robinswood-io/komuno.git
cd komuno
npm install --legacy-peer-deps
cp .env.example .env
npm run dev
```

#### Workflow Git

1. **Fork** le repository
2. **Clone** votre fork :
   ```bash
   git clone https://github.com/VOTRE-USERNAME/komuno.git
   ```
3. **Créez une branche** depuis `main` :
   ```bash
   git checkout -b feat/ma-fonctionnalite
   # ou
   git checkout -b fix/mon-bugfix
   ```
4. **Développez** en respectant les standards (voir ci-dessous)
5. **Committez** avec des messages clairs :
   ```bash
   git commit -m "feat: ajoute la fonctionnalité X"
   ```
6. **Push** votre branche :
   ```bash
   git push origin feat/ma-fonctionnalite
   ```
7. **Ouvrez une Pull Request** vers `main`

#### Convention de Commits

Nous utilisons [Conventional Commits](https://www.conventionalcommits.org/) :

| Type | Description |
|------|-------------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation uniquement |
| `style` | Formatage (pas de changement de code) |
| `refactor` | Refactoring sans changement fonctionnel |
| `test` | Ajout ou modification de tests |
| `chore` | Maintenance, dépendances, config |

**Format :** `type: description courte en français`

**Exemples :**
```
feat: ajoute l'export PDF des inscriptions
fix: corrige l'affichage du graphe sur mobile
docs: met à jour le README avec les nouvelles instructions
refactor: simplifie la logique de validation des formulaires
```

## Standards de Code

### TypeScript

- **Strict mode** obligatoire
- **Pas de `any`** - Utiliser `unknown` avec guards
- **Types explicites** pour les fonctions publiques
- Vérifier : `npx tsc --noEmit`

### Style

- ESLint + Prettier configurés
- Indentation : 2 espaces
- Guillemets simples pour les strings
- Point-virgule obligatoire

### Structure des fichiers

```
components/           # Composants React réutilisables
├── ui/              # Composants UI de base (shadcn)
├── layout/          # Composants de layout (header, footer)
└── [feature]/       # Composants par fonctionnalité

app/                 # Next.js App Router
├── (auth)/          # Routes d'authentification
├── (protected)/     # Routes protégées (admin)
└── (public)/        # Routes publiques

server/src/          # Backend NestJS
├── [module]/        # Un dossier par module
│   ├── dto/         # Data Transfer Objects
│   ├── entities/    # Entités Drizzle
│   └── *.service.ts # Services
└── shared/          # Code partagé backend
```

### Tests

- Écrire des tests pour les nouvelles fonctionnalités
- Exécuter : `npm test`
- Couverture minimale : 70%

## Revue de Code

Toute PR sera revue par un mainteneur. Critères :

- [ ] Code conforme aux standards
- [ ] Tests passent (`npm test`)
- [ ] TypeScript compile (`npx tsc --noEmit`)
- [ ] Pas de régression
- [ ] Documentation mise à jour si nécessaire
- [ ] Commits bien formatés

## Questions ?

- Ouvrez une [Discussion](https://github.com/robinswood-io/komuno/discussions)
- Contactez l'équipe : contact@robinswood.io

---

Merci de contribuer à Komuno ! 🎉
