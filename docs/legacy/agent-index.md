# Agent Index — CJD80

Référence rapide pour l’agent Cursor (spécifique à ce repo).

## Fichiers de contexte à charger
- `@activeContext.md`, `@projectbrief.md`, `@systemPatterns.md`, `@techContext.md`, `@progress.md`
- Backend : `@server/README.md` si présent
- Frontend : guides/README dans `@client/` ou `@docs/`

## Commandes essentielles
- Dév Nest : `npm run dev`
- Dév Express : `npm run dev:express`
- Build : `npm run build` (ou `build:express`)
- Démarrage prod : `npm run start` (ou `start:express`)
- Qualité : `npm run check`
- DB : `npm run db:push`, scripts `db:*` (create tables, stats)
- SSH/Docker : scripts `ssh:*`, `docker:*`
- Tests Playwright : `npm run test:playwright` (+ variantes analyze/maintenance)

## Intégrations autorisées (repo-scoped)
- Postgres/Minio, Playwright E2E, SSH/remote ops, GitHub scripts
- Pas d’intégration Monday ici

## Intégrations à exclure
- Monday (réservé à jlm-app), autres intégrations spécifiques à d’autres projets

## MCP à privilégier avant le shell
- Code/PR : `mcp-github-server`, contexte : `cursor-chat-history`
- DB/stockage : `mcp-postgres-server`, `mcp-minio-server`, `mcp-redis-server`, `mcp-graphql-server`
- Ops/infra : `mcp-ssh-server`, `mcp-docker-server`, `mcp-devtools-server`
- Tests E2E : `mcp-playwright-server`

## Variables/Secrets
- Voir `.env`/exemples pour Postgres/Minio/Redis/SSH/GitHub tokens ; ne pas commit.

## Rappels qualité
- Ajouter un timeout aux commandes longues (`request-timeout-prevention.md`)
- Charger `quick-start.md` + `mcp-usage.md` (bundle central) avant action
- Ne pas importer d’intégrations d’autres projets
