# Automatisation des runs autonomes

Ce document décrit comment intégrer la configuration Cursor multi-agents dans
un cron local ou un pipeline CI afin de garder tous les dépôts synchronisés et
de collecter les métriques automatiquement.

## Script de maintenance

Le script `scripts/autonomous-cron.sh` enchaîne :

1. `npx tsx scripts/ensure-shared-env.ts` – injection des variables MinIO + GraphQL/Redis + Authentik + Listmonk (à partir de `config/shared-env.defaults`) dans chaque `.env`.
2. `npx tsx scripts/aggregate-ssh-connections.ts` – agrégation des profils SSH déclarés dans `config/ssh_connections.local.json` de chaque dépôt vers `config/ssh_connections.json`.
3. `npx tsx scripts/sync-central-cursor-config.ts` – réplication des règles/docs.
4. `npx tsx scripts/audit-autonomous-config.ts --fix --json` – audit + correction.
5. `npx tsx scripts/update-agent-metrics.ts` – consolidation des métriques.
6. `npx tsx scripts/agent-feedback-loop.ts` – génération automatique des insights (`docs/AGENT_AUTOMATED_FEEDBACK.md`) et ajout des tâches correctives.

### Exemple cron (macOS / launchd)

```
0 * * * * cd /Users/thibault/Dev/JLM\ App/jlm-app && ./scripts/autonomous-cron.sh --targets=/Users/thibault/Dev/AdminAgents,/Users/thibault/Dev/CJD80/cjd80 >> ~/logs/autonomy.log 2>&1
```

### Exemple GitHub Actions

```yaml
name: Cursor Autonomy Maintenance
on:
  schedule:
    - cron: "0 3 * * *"
  workflow_dispatch:

jobs:
  autonomy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Synchronize config & metrics
        run: |
          npm install --global tsx
          ./scripts/autonomous-cron.sh --targets=${{ secrets.CURSOR_TARGETS }}
```

## Rapport d'état

Après chaque exécution du script, vérifiez :

- `docs/AGENT_METRICS.json` et `docs/AGENT_INSIGHTS.md` (généré par `generate-agent-insights.ts`).
- `docs/AGENT_EVENTS.json` pour confirmer les handoffs.
- `docs/AGENT_COORDINATION_STATE.json` pour valider que la phase courante est `idle`.
- `docs/AGENT_AUTOMATED_FEEDBACK.md` afin d'examiner les signaux remontés automatiquement (tests instables, sujets récurrents, dette technique).

## Recommandations

- Planifier la routine au minimum 1 fois par jour pour s'assurer que tous les
  dépôts restent alignés.
- Conserver les logs (`~/logs/autonomy.log`) pour analyser les échecs
  éventuels.
- Coupler l’exécution à `scripts/autonomous-run.ts` lorsque des runs E2E sont
  lancés automatiquement (ex: workflows de tests).
- Alimenter la file des sub-agents avec `npx tsx scripts/manage-agent-tasks.ts`
  afin de garder `AGENT_TASKS_QUEUE.json` aligné avec les objectifs métier.
