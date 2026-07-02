#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_DIR = path.join(__dirname, "..", "docs");
const STATE_FILE = path.join(DOCS_DIR, "AGENT_COORDINATION_STATE.json");
const EVENTS_FILE = path.join(DOCS_DIR, "AGENT_EVENTS.json");
const TASKS_FILE = path.join(DOCS_DIR, "AGENT_TASKS_QUEUE.json");
const METRICS_FILE = path.join(DOCS_DIR, "AGENT_METRICS.json");

const AUTO_PHASES = ["discover", "plan", "build", "test", "deploy", "retro"] as const;
const PHASE_ROLE_MAP: Record<string, string> = {
  discover: "architect",
  plan: "coordinator",
  build: "developer",
  test: "tester",
  deploy: "coordinator",
  retro: "architect",
};

type PhaseName = (typeof AUTO_PHASES)[number];

const roles = ["architect", "developer", "tester", "analyst", "coordinator"] as const;

interface EventEntry {
  id?: string;
  type: string;
  timestamp: string;
  role?: string;
  phase?: PhaseName;
  detail?: string;
}

function ensureFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier manquant: ${filePath}`);
  }
}

function loadJson<T>(filePath: string): T {
  ensureFile(filePath);
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function saveJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function toDate(value?: string | null) {
  return value ? new Date(value) : undefined;
}

function toMs(from?: Date, to?: Date) {
  if (!from || !to) return 0;
  return Math.max(0, to.getTime() - from.getTime());
}

function humanize(ms: number) {
  if (!ms) return "0s";
  const seconds = Math.floor(ms / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

export async function updateMetrics() {
  const state = loadJson<unknown>(STATE_FILE);
  const eventsData = loadJson<{ events: EventEntry[] }>(EVENTS_FILE);
  const tasksData = fs.existsSync(TASKS_FILE) ? loadJson<unknown>(TASKS_FILE) : null;
  const previousMetrics = fs.existsSync(METRICS_FILE)
    ? loadJson<unknown>(METRICS_FILE)
    : { history: { totalRuns: 0, successRuns: 0, lastSessionId: null } };

  const now = new Date().toISOString();
  const events = (eventsData.events ?? []).slice().sort((a, b) => {
    const t1 = new Date(a.timestamp).getTime();
    const t2 = new Date(b.timestamp).getTime();
    return t1 - t2;
  });

  const startTime = toDate(state.metadata?.startTime) ?? toDate(events[0]?.timestamp) ?? new Date();
  const lastActivity = toDate(state.metadata?.lastActivity) ?? toDate(events.at(-1)?.timestamp) ?? new Date();
  const runDurationMs = toMs(startTime, lastActivity);
  const sessionId = state.metadata?.sessionId ?? previousMetrics.summary?.sessionId ?? `session-${Date.now()}`;
  const hasSessionComplete = events.some((evt) => evt.type === "session-complete");

  // Phase timeline
  const timeline: Array<{ phase: PhaseName; timestamp: Date }> = [];
  timeline.push({ phase: "discover", timestamp: startTime });
  for (const evt of events) {
    if (evt.type === "phase-change" && evt.phase && AUTO_PHASES.includes(evt.phase)) {
      timeline.push({ phase: evt.phase, timestamp: new Date(evt.timestamp) });
    }
  }

  const phaseDurations: Record<string, { durationMs: number; durationHuman: string }> = {};
  for (let i = 0; i < timeline.length; i += 1) {
    const current = timeline[i];
    const next = timeline[i + 1];
    const end = next?.timestamp ?? lastActivity;
    const duration = toMs(current.timestamp, end);
    const entry = phaseDurations[current.phase] ?? { durationMs: 0, durationHuman: "0s" };
    entry.durationMs += duration;
    entry.durationHuman = humanize(entry.durationMs);
    phaseDurations[current.phase] = entry;
  }

  // Role stats
  const roleStats: Record<string, { events: number; completed: number; failed: number; totalDurationMs: number; averageLatencyMs: number; successRate: number }> =
    roles.reduce((acc, role) => {
      acc[role] = {
        events: 0,
        completed: 0,
        failed: 0,
        totalDurationMs: 0,
        averageLatencyMs: 0,
        successRate: 0,
      };
      return acc;
    }, {} as Record<string, { events: number; completed: number; failed: number; totalDurationMs: number; averageLatencyMs: number; successRate: number }>);

  const eventCounts: Record<string, number> = {};
  for (const evt of events) {
    eventCounts[evt.type] = (eventCounts[evt.type] ?? 0) + 1;
    if (evt.role && roleStats[evt.role]) {
      roleStats[evt.role].events += 1;
      if (evt.type.includes("error") || evt.type.includes("failure")) {
        roleStats[evt.role].failed += 1;
      }
    }
  }

  for (const [phase, entry] of Object.entries(phaseDurations)) {
    const role = PHASE_ROLE_MAP[phase as PhaseName];
    if (!role || !roleStats[role]) continue;
    roleStats[role].completed += 1;
    roleStats[role].totalDurationMs += entry.durationMs;
  }

  if (hasSessionComplete) {
    roleStats.architect.completed += 1;
    roleStats.coordinator.completed += 1;
  }

  for (const role of roles) {
    const stats = roleStats[role];
    const total = Math.max(stats.completed + stats.failed, 1);
    stats.averageLatencyMs = stats.completed ? Math.round(stats.totalDurationMs / stats.completed) : 0;
    stats.successRate = Number(((stats.completed / total) * 100).toFixed(2));
  }

  // History tracking
  const history = previousMetrics.history ?? { totalRuns: 0, successRuns: 0, lastSessionId: null };
  if (sessionId && sessionId !== history.lastSessionId) {
    history.totalRuns += 1;
    if (hasSessionComplete) {
      history.successRuns += 1;
    }
    history.lastSessionId = sessionId;
  }
  const failedRuns = Math.max(history.totalRuns - history.successRuns, 0);
  const successRate = history.totalRuns ? Number(((history.successRuns / history.totalRuns) * 100).toFixed(2)) : 0;

  const metricsPayload = {
    version: "2.0.0",
    lastUpdated: now,
    summary: {
      sessionId,
      status: state.state?.status ?? "unknown",
      startTime: startTime.toISOString(),
      lastActivity: lastActivity.toISOString(),
      runDurationMs,
      runDurationHuman: humanize(runDurationMs),
      syncedConversations: state.historyIntelligence?.syncedConversations ?? 0,
      queues: tasksData?.metadata ?? null,
    },
    metrics: {
      phases: phaseDurations,
      byRole: roleStats,
      events: {
        total: events.length,
        byType: eventCounts,
      },
      historyIntelligence: {
        lastSync: state.historyIntelligence?.lastSync ?? null,
        totalSynced: state.historyIntelligence?.syncedConversations ?? 0,
      },
    },
    history: {
      totalRuns: history.totalRuns,
      successRuns: history.successRuns,
      failedRuns,
      successRate,
      lastSessionId: history.lastSessionId,
    },
  };

  saveJson(METRICS_FILE, metricsPayload);
  console.log("📈 AGENT_METRICS mis à jour");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  updateMetrics().catch((err) => {
    console.error("❌ Erreur lors de la mise à jour des métriques:", err);
    process.exit(1);
  });
}
