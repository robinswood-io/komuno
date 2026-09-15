# Guide contributeur maintenu

**Dernière revue :** 2026-09-10 — revue semestrielle

TypeScript est l’unique source canonique de l’application. Les rares fichiers JavaScript portant le même chemin sont des artefacts CommonJS historiques inscrits avec empreintes dans `docs/typescript-compatibility-artifacts.json`. `scripts/check-typescript-source-drift.mjs` bloque toute paire ou modification non déclarée.

## Avant une demande de fusion

1. Installer avec le verrou (`bun install --frozen-lockfile`).
2. Exécuter le contrôle TypeScript, les tests, les migrations sur PostgreSQL vierge et le build.
3. Exécuter `scripts/verify-audit-remediation.sh`.
4. Pour une interface, exécuter les parcours Playwright et les contrôles axe, clavier et mobile.
5. Documenter toute migration dans `docs/release-compatibility.json`.

Les contrôles de sécurité, dépendances, secrets, inventaire logiciel et provenance sont bloquants. Une dérogation de vulnérabilité haute doit nommer un responsable, une mesure compensatoire et une échéance.
