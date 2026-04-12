# Documents Maintenus (Source De Verite)

Derniere verification: 2026-04-10.

Les documents ci-dessous sont ceux a maintenir en priorite pour l'exploitation courante du projet.

## Niveau projet

- [`../README.md`](../README.md) - Vue d'ensemble produit + demarrage local
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) - Regles de contribution
- [`../SECURITY.md`](../SECURITY.md) - Politique securite
- [`../CHANGELOG.md`](../CHANGELOG.md) - Historique des changements

## Niveau documentation technique

- [`./README.md`](./README.md) - Point d'entree documentation
- [`./INDEX.md`](./INDEX.md) - Index rapide
- [`./MIGRATIONS.md`](./MIGRATIONS.md) - Etat migration et references

## Niveau deploiement

- [`../deploy/README.md`](../deploy/README.md) - Installation et exploitation serveur

## Historique (non maintenu par defaut)

- [`./legacy/README.md`](./legacy/README.md) - Documentation archivee (reference historique uniquement)

## Regle de maintenance

Avant validation d'une mise a jour doc:

```bash
npm run docs:check
npm run docs:check:all
```
