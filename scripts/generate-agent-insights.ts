#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_DIR = path.join(__dirname, "..", "docs");

const METRICS_FILE = path.join(DOCS_DIR, "AGENT_METRICS.json");
const EVENTS_FILE = path.join(DOCS_DIR, "AGENT_EVENTS.json");
const INSIGHTS_FILE = path.join(DOCS_DIR, "AGENT_INSIGHTS.md");

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatDuration(ms: number) {
  if (!ms) return "0s";
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

function sparkline(values: number[]) {
  const ticks = "▁▂▃▄▅▆▇█";
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return ticks[0].repeat(values.length);
  return values
    .map((v) => {
      const ratio = (v - min) / (max - min);
      const idx = Math.min(ticks.length - 1, Math.floor(ratio * ticks.length));
      return ticks[idx];
    })
    .join("");
}

function buildInsights() {
  const metrics = loadJson<unknown>(METRICS_FILE);
  const events = loadJson<{ events: Array<{ type: string; timestamp: string }> }>(EVENTS_FILE);
  const now = new Date().toISOString();

  const summary = metrics.summary ?? {};
  const history = metrics.history ?? {};
  const roleStats = metrics.metrics?.byRole ?? {};
  const phaseDurations = metrics.metrics?.phases ?? {};

  const eventsPerDay = events.events.reduce<Record<string, number>>((acc, evt) => {
    const day = evt.timestamp.slice(0, 10);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});
  const recentDays = Object.keys(eventsPerDay).sort().slice(-7);
  const series = recentDays.map((day) => eventsPerDay[day]);

  const topRoles = Object.entries(roleStats)
    .map(([role, stats]: unknown) => ({
      role,
      completed: stats.completed ?? 0,
      successRate: stats.successRate ?? 0,
      averageLatencyMs: stats.averageLatencyMs ?? 0,
    }))
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 5);

  const phaseTable = Object.entries(phaseDurations)
    .map(([phase, entry]: unknown) => {
      const durationMs = entry.durationMs ?? 0;
      return `| ${phase} | ${formatDuration(durationMs)} |`;
    })
    .join("\n");

  const markdown = `# Agent Insights – ${now}

- **Session courante** : ${summary.sessionId ?? "n/a"}
- **Statut** : ${summary.status ?? "n/a"}
- **Durée du run** : ${summary.runDurationHuman ?? formatDuration(summary.runDurationMs ?? 0)}
- **Runs totaux** : ${history.totalRuns ?? 0} (succès: ${history.successRuns ?? 0}, échecs: ${history.failedRuns ?? 0}, taux: ${formatPercent(history.successRate ?? 0)})
- **Conversations synchronisées** : ${summary.syncedConversations ?? 0}

## Activité récente
- **Événements (7 derniers jours)** : ${sparkline(series)} (${recentDays.join(", ")})
- **Total événements** : ${metrics.metrics?.events?.total ?? 0}

## Phases
| Phase | Durée |
| --- | --- |
${phaseTable || "| n/a | n/a |"}

## Rôles principaux
| Rôle | Tâches complétées | Taux de succès | Latence moyenne |
| --- | --- | --- | --- |
${topRoles
  .map((r) => `| ${r.role} | ${r.completed} | ${formatPercent(r.successRate)} | ${formatDuration(r.averageLatencyMs)} |`)
  .join("\n") || "| n/a | n/a | n/a | n/a |"}

## Recommandations next run
- Vérifier les rôles avec latence moyenne élevée (> 5 min) et ajuster la matrice des modèles si nécessaire.
- Surveiller les jours avec activité faible (sparkline plate) pour identifier les fenêtres de maintenance.
- Utiliser \`scripts/autonomous-cron.sh\` pour maintenir la synchronisation quotidienne.
`;

  fs.writeFileSync(INSIGHTS_FILE, markdown);
  console.log(`📝 Rapport généré dans ${INSIGHTS_FILE}`);
}

buildInsights();
