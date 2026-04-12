# Documentation Komuno

Ce document est le point d'entree de la documentation maintenue.

## Statut de fiabilite

Mise a jour et verification effectuees le 2026-04-10.

La liste canonique des documents consideres comme **source de verite** est maintenue ici:

- [`./MAINTAINED_DOCS.md`](./MAINTAINED_DOCS.md)

## Structure projet (actuelle)

```text
komuno/
├── app/                 # Next.js App Router
├── components/          # Composants UI
├── server/src/          # API NestJS
├── shared/              # Types/schemas partages
├── deploy/              # Fichiers de deploiement
├── docs/                # Documentation
├── tests/               # Tests integration / validation API
└── test/                # Tests unitaires
```

## Verification automatique de la documentation maintenue

Depuis la racine du projet:

```bash
npm run docs:check
npm run docs:check:all
```

`docs:check` couvre les documents prioritaires.

`docs:check:all` couvre tous les fichiers Markdown dans `docs/` ainsi que `README.md` et `deploy/README.md`.

## Documents historiques

Le dossier `docs/` contient encore des documents techniques historiques (anciennes iterations, anciens contextes projet, anciens workflows de deploiement).

Ces documents sont conserves pour trace dans [`./legacy/README.md`](./legacy/README.md), mais **ne sont pas garantis a jour** tant qu'ils ne sont pas references dans la section "Statut de fiabilite" ci-dessus.

## Documents operationnels (agents/autonomie)

Les fichiers `docs/AGENT_*` sont utilises par les scripts d'orchestration autonome (`scripts/autonomous-run.ts`, `scripts/update-agent-metrics.ts`, etc.).

Ils sont operationnels, mais leur cycle de vie est different des guides utilisateur/deploiement. Toute modification doit rester compatible avec ces scripts.
