# Contribuer a Komuno

Merci de votre interet pour Komuno.

## Avant de commencer

- Lisez le [Code de conduite](CODE_OF_CONDUCT.md)
- Verifiez si une issue existe deja
- Ouvrez une issue pour discuter des changements importants

## Setup local

```bash
git clone https://github.com/robinswood-io/komuno.git
cd komuno
npm install --legacy-peer-deps
cp .env.example .env
npm run dev
```

## Workflow recommande

1. Fork du repository
2. Branche depuis `main`
3. Implementation + tests
4. Pull Request

```bash
git checkout -b feat/ma-fonctionnalite
# ou
git checkout -b fix/mon-correctif
```

## Convention de commit

Format Conventional Commits:

- `feat:` nouvelle fonctionnalite
- `fix:` correction de bug
- `docs:` documentation
- `refactor:` refactor sans changement fonctionnel
- `test:` ajout/modif de tests
- `chore:` maintenance

Exemple:

```text
feat: ajoute le filtre avance des membres
```

## Qualite minimale requise

Avant de soumettre votre PR:

```bash
npx tsc --noEmit
npm test
```

Si vous modifiez l'UI, ajoutez une preuve de validation navigateur (Playwright ou equivalent).

## Recommandations de contribution

- Preferez des PR petites et ciblees
- Documentez les changements impactants
- Ajoutez des tests de regression pour les bugs
- Evitez les changements hors perimetre

## Pull Request checklist

- [ ] Le code compile (`npx tsc --noEmit`)
- [ ] Les tests passent (`npm test`)
- [ ] La documentation est a jour
- [ ] Aucun secret n'est committe
- [ ] Le scope de la PR est clair

## Questions

- Issues: https://github.com/robinswood-io/komuno/issues
- Discussions: https://github.com/robinswood-io/komuno/discussions
