#!/usr/bin/env tsx

/**
 * Utilitaire CLI pour piloter les runs autonomes (init, phases, completion)
 * Usage:
 *   npx tsx scripts/autonomous-run.ts --action start --task "Nouvelle fonctionnalité"
 *   npx tsx scripts/autonomous-run.ts --action phase --phase build
 *   npx tsx scripts/autonomous-run.ts --action complete
 */

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { spawnSync } from "child_process";
import { updateMetrics } from "./update-agent-metrics";
import { cursorConversationStorageService } from "../server/services/CursorConversationStorageService";

type Action = "start" | "phase" | "complete" | "status";

const DOCS_DIR = path.join(process.cwd(), "docs");
const STATE_FILE = path.join(DOCS_DIR, "AGENT_COORDINATION_STATE.json");
const TASKS_FILE = path.join(DOCS_DIR, "AGENT_TASKS_QUEUE.json");
const EVENTS_FILE = path.join(DOCS_DIR, "AGENT_EVENTS.json");
const AUTONOMY_PHASES = ["discover", "plan", "build", "test", "deploy", "retro"] as const;
const PHASE_ROLE_MAP: Record<string, string> = {
  discover: "architect",
  plan: "coordinator",
  build: "developer",
  test: "tester",
  deploy: "coordinator",
  retro: "architect",
};

interface CliOptions {
  action: Action;
  task?: string;
  taskId?: string;
  project?: string;
  priority?: "high" | "medium" | "low";
  phase?: (typeof AUTONOMY_PHASES)[number];
  sessionId?: string;
  historySync?: boolean;
  historyLimit?: number;
  skipTests?: boolean;
  updateMetrics?: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: Record<string, string | boolean> = {};

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.replace(/^--/, "").split("=");
      opts[key] = value ?? true;
    }
  }

  const parseBoolean = (value: string | boolean | undefined) => {
    if (value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    const normalized = value.toLowerCase();
    if (["false", "0", "no"].includes(normalized)) return false;
    return true;
  };

  const disableMetrics = opts["no-update-metrics"] !== undefined;
  const updateMetricsFlag = disableMetrics ? false : parseBoolean((opts["update-metrics"] ?? opts["updateMetrics"]) as unknown);
  const historyLimit = opts["history-limit"] ? Number(opts["history-limit"]) : undefined;
  const skipTests = parseBoolean((opts["skip-tests"] ?? opts["skipTests"]) as unknown);

  return {
    action: (opts.action as Action) ?? "status",
    task: opts.task as string | undefined,
    taskId: opts["task-id"] as string | undefined,
    project: opts.project as string | undefined,
    priority: (opts.priority as CliOptions["priority"]) ?? "high",
    phase: opts.phase as CliOptions["phase"],
    sessionId: opts.sessionId as string | undefined,
    historySync: parseBoolean((opts["history-sync"] ?? opts["historySync"]) as unknown),
    historyLimit: Number.isFinite(historyLimit) ? historyLimit : undefined,
    skipTests,
    updateMetrics: updateMetricsFlag,
  };
}

const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function recalcQueueMetadata(queue: unknown[]) {
  const now = Date.now();
  const byId = new Map(queue.map((task: unknown) => [task.id, task]));
  const isBlocked = (task: unknown) => {
    if (!task?.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some((depId: string) => {
      const dep = byId.get(depId);
      return !dep || dep.status !== "completed";
    });
  };
  const isOverdue = (task: unknown) => {
    if (!task?.dueAt || task.status === "completed") return false;
    const dueDate = new Date(task.dueAt).getTime();
    return Number.isFinite(dueDate) && dueDate < now;
  };
  const slaBreaches = (task: unknown) => {
    if (!task?.slaHours) return false;
    const start = new Date(task.createdAt).getTime();
    const end = task.completedAt ? new Date(task.completedAt).getTime() : now;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    const hours = (end - start) / 3600000;
    return hours > task.slaHours;
  };

  return {
    totalTasks: queue.length,
    pendingTasks: queue.filter((t) => t.status === "pending").length,
    inProgressTasks: queue.filter((t) => t.status === "in-progress").length,
    completedTasks: queue.filter((t) => t.status === "completed").length,
    failedTasks: queue.filter((t) => t.status === "failed").length,
    blockedTasks: queue.filter(isBlocked).length,
    overdueTasks: queue.filter(isOverdue).length,
    slaBreaches: queue.filter(slaBreaches).length,
    priority: {
      high: queue.filter((t) => t.priority === "high").length,
      medium: queue.filter((t) => t.priority === "medium").length,
      low: queue.filter((t) => t.priority === "low").length,
    },
  };
}

function readTasksData() {
  const fallback = {
    version: "2.0.0",
    lastUpdated: new Date().toISOString(),
    queue: [],
    metadata: recalcQueueMetadata([]),
  };
  if (!fs.existsSync(TASKS_FILE)) {
    return fallback;
  }
  const data = loadJson<unknown>(TASKS_FILE);
  if (!Array.isArray(data.queue)) {
    data.queue = [];
  }
  data.metadata = recalcQueueMetadata(data.queue);
  if (!data.version) data.version = "2.0.0";
  return data;
}

function saveTasksData(data: unknown) {
  data.metadata = recalcQueueMetadata(data.queue);
  data.lastUpdated = new Date().toISOString();
  saveJson(TASKS_FILE, data);
}

function selectPendingTask(queueData: unknown) {
  const pending = queueData.queue.filter((task: unknown) => task.status === "pending");
  if (!pending.length) return null;
  const now = Date.now();
  const byId = new Map(queueData.queue.map((task: unknown) => [task.id, task]));

  const isReady = (task: unknown) => {
    if (!task?.dependencies || task.dependencies.length === 0) return true;
    return task.dependencies.every((depId: string) => {
      const dep = byId.get(depId);
      return dep && dep.status === "completed";
    });
  };

  const readyTasks = pending.filter((task: unknown) => isReady(task));
  if (!readyTasks.length) return null;

  const isOverdue = (task: unknown) => {
    if (!task?.dueAt) return false;
    const dueDate = new Date(task.dueAt).getTime();
    return Number.isFinite(dueDate) && dueDate <= now;
  };

  readyTasks.sort((a: unknown, b: unknown) => {
    const overdueDiff = Number(isOverdue(b)) - Number(isOverdue(a));
    if (overdueDiff !== 0) return overdueDiff;

    const dueA = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
    const dueB = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
    if (dueA !== dueB) return dueA - dueB;

    const weightDiff =
      (PRIORITY_WEIGHT[b.priority as Priority] || 0) - (PRIORITY_WEIGHT[a.priority as Priority] || 0);
    if (weightDiff !== 0) return weightDiff;

    const createdA = new Date(a.createdAt || 0).getTime();
    const createdB = new Date(b.createdAt || 0).getTime();
    return createdA - createdB;
  });

  return readyTasks[0];
}

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function saveJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function updateEvents(event: { type: string; role?: string; phase?: string; detail?: string; payload?: Record<string, unknown> }) {
  if (!fs.existsSync(EVENTS_FILE)) {
    throw new Error("AGENT_EVENTS.json est introuvable");
  }
  const events = loadJson<{
    version: string;
    lastUpdated: string;
    events: unknown[];
    metadata: {
      totalEvents: number;
      eventsByType: Record<string, number>;
      eventsByRole: Record<string, number>;
      eventsBySeverity: Record<string, number>;
      lastEventId: string | null;
      lastEventTimestamp: string | null;
    };
  }>(EVENTS_FILE);

  const timestamp = new Date().toISOString();
  const id = `evt-${timestamp}-${Math.random().toString(36).slice(2, 7)}`;

  events.events.push({
    id,
    timestamp,
    ...event,
  });

  events.metadata.totalEvents += 1;
  events.metadata.eventsByType[event.type] = (events.metadata.eventsByType[event.type] ?? 0) + 1;
  if (event.role) {
    events.metadata.eventsByRole[event.role] = (events.metadata.eventsByRole[event.role] ?? 0) + 1;
  }
  events.metadata.lastEventId = id;
  events.metadata.lastEventTimestamp = timestamp;
  events.lastUpdated = timestamp;

  saveJson(EVENTS_FILE, events);
}

function requireState() {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error("AGENT_COORDINATION_STATE.json est introuvable");
  }
}

async function maybeSyncHistory(options: CliOptions, state: unknown) {
  if (options.historySync === false) {
    return;
  }

  const limit = Math.max(10, Math.min(options.historyLimit ?? 50, 500));

  try {
    const result = await cursorConversationStorageService.syncConversations({
      limit,
      onlyNew: true,
      projectPath: options.project,
    });

    state.historyIntelligence = state.historyIntelligence ?? {};
    state.historyIntelligence.lastSync = new Date().toISOString();
    state.historyIntelligence.syncedConversations =
      (state.historyIntelligence.syncedConversations ?? 0) + (result?.stored ?? 0);

    updateEvents({
      type: "history-sync",
      role: "coordinator",
      detail: `Synchronisation de ${result?.stored ?? 0} conversations`,
      payload: {
        limit,
        projectPath: options.project ?? null,
      },
    });
  } catch (error) {
    console.warn("⚠️  Impossible de synchroniser l'historique Cursor:", error);
  } finally {
    cursorConversationStorageService.cleanup();
  }
}

function runPlaywrightTests(projectPath: string) {
  console.log(`🎭 Exécution Playwright (runner avancé) pour ${projectPath}...`);
  const result = spawnSync("npx", ["tsx", "scripts/playwright-runner.ts", `--project=${projectPath}`], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Playwright tests failed");
  }
}

async function startRun(options: CliOptions) {
  requireState();
  const state = loadJson<unknown>(STATE_FILE);
  const now = new Date().toISOString();
  const sessionId = options.sessionId ?? `auto-${randomUUID()}`;
  const defaultTitle = options.task ?? `Autonomous run ${sessionId}`;

  await maybeSyncHistory(options, state);

  const tasksData = readTasksData();
  let queueEntry = options.taskId
    ? tasksData.queue.find((task: unknown) => task.id === options.taskId)
    : undefined;

  if (!queueEntry && !options.task) {
    queueEntry = selectPendingTask(tasksData);
    if (!queueEntry) {
      throw new Error(
        "Aucune tâche prête à être exécutée (toutes les tâches sont bloquées ou complétées). Utilisez --task pour en créer une ou débloquez les dépendances."
      );
    }
  }

  let createdNewTask = false;
  if (!queueEntry) {
    queueEntry = {
      id: options.taskId ?? sessionId,
      title: defaultTitle,
      projectPath: options.project ?? null,
      priority: options.priority ?? "high",
      status: "pending",
      createdAt: now,
      updatedAt: now,
      assignedRoles: ["coordinator", "architect", "developer", "tester", "analyst"],
    };
    tasksData.queue.push(queueEntry);
    createdNewTask = true;
  }

  const projectPath = options.project ?? queueEntry.projectPath ?? null;
  queueEntry.projectPath = projectPath;
  queueEntry.status = "in-progress";
  queueEntry.updatedAt = now;
  if (!queueEntry.createdAt) queueEntry.createdAt = now;
  if (!queueEntry.priority) queueEntry.priority = options.priority ?? "high";
  if (!queueEntry.assignedRoles) {
    queueEntry.assignedRoles = ["coordinator", "architect", "developer", "tester", "analyst"];
  }
  if (!queueEntry.dependencies) queueEntry.dependencies = [];
  if (!queueEntry.labels) queueEntry.labels = [];

  saveTasksData(tasksData);

  state.state.currentTask = queueEntry.title;
  state.state.currentTaskId = queueEntry.id;
  state.state.currentProject = projectPath;
  state.state.activeRoles = ["coordinator"];
  state.state.status = "discover";
  state.state.results = {};
  state.state.dependencies = {};
  state.state.conflicts = [];

  state.metadata.sessionId = sessionId;
  state.metadata.startTime = now;
  state.metadata.lastActivity = now;
  if (createdNewTask) {
    state.metadata.totalTasks = (state.metadata.totalTasks ?? 0) + 1;
  }

  state.autonomy.currentPhase = "discover";
  state.autonomy.lastValidated = now;

  if (options.historySync) {
    state.historyIntelligence.lastSync = now;
  }

  state.state.results = {};
  state.metadata.completedTasks = state.metadata.completedTasks ?? 0;

  saveJson(STATE_FILE, state);
  updateEvents({
    type: "session-start",
    role: "coordinator",
    detail: `Session ${sessionId} démarrée`,
    payload: { taskId: queueEntry.id, task: queueEntry.title, project: projectPath },
  });

  console.log(`🚀 Run autonome démarré (${sessionId})`);
}

function advancePhase(options: CliOptions) {
  if (!options.phase) {
    throw new Error("Veuillez spécifier --phase=<discover|plan|build|test|deploy|retro>");
  }
  const phase = options.phase;
  if (!AUTONOMY_PHASES.includes(phase)) {
    throw new Error(`Phase ${phase} inconnue`);
  }
  requireState();
  const state = loadJson<unknown>(STATE_FILE);
  const now = new Date().toISOString();

  state.autonomy.currentPhase = phase;
  state.state.status = phase;
  state.metadata.lastActivity = now;

  if (phase === "build") {
    state.state.activeRoles = ["developer"];
  } else if (phase === "test") {
    state.state.activeRoles = ["tester"];
  } else if (phase === "deploy") {
    state.state.activeRoles = ["coordinator", "architect"];
  } else if (phase === "retro") {
    state.state.activeRoles = ["architect"];
  } else {
    state.state.activeRoles = ["coordinator"];
  }

  saveJson(STATE_FILE, state);
  updateEvents({
    type: "phase-change",
    role: PHASE_ROLE_MAP[phase] ?? "coordinator",
    phase,
    detail: `Passage à la phase ${phase}`,
  });

  if (phase === "test" && state.state?.currentProject && options.skipTests !== true) {
    try {
      runPlaywrightTests(state.state.currentProject);
      updateEvents({
        type: "test-success",
        role: "tester",
        detail: `Playwright OK (${state.state.currentProject})`,
      });
    } catch (error) {
      updateEvents({
        type: "test-failure",
        role: "tester",
        detail: `Playwright KO (${state.state.currentProject})`,
      });
      throw error;
    }
  }

  console.log(`🔄 Phase mise à jour: ${phase}`);
}

async function completeRun(options: CliOptions) {
  requireState();
  const state = loadJson<unknown>(STATE_FILE);
  const tasksData = readTasksData();
  const now = new Date().toISOString();

  state.state.status = "retro";
  state.autonomy.currentPhase = "retro";
  state.metadata.lastActivity = now;
  state.metadata.completedTasks = (state.metadata.completedTasks ?? 0) + 1;
  state.state.activeRoles = ["architect", "coordinator"];
  state.state.currentTask = null;
  state.state.currentProject = null;
  const taskId = state.state.currentTaskId;
  state.state.currentTaskId = null;

  if (taskId) {
    const entry = tasksData.queue.find((task: unknown) => task.id === taskId);
    if (entry) {
      entry.status = "completed";
      entry.completedAt = now;
      entry.updatedAt = now;
    }
  }

  saveTasksData(tasksData);

  saveJson(STATE_FILE, state);
  updateEvents({
    type: "session-complete",
    role: "architect",
    detail: "Run autonome finalisé",
    payload: { taskId },
  });

  if (options.updateMetrics !== false) {
    await updateMetrics();
  }

  console.log("✅ Run autonome complété");
}

function showStatus() {
  requireState();
  const state = loadJson<unknown>(STATE_FILE);
  console.log("📊 État actuel de l'autonomie:");
  console.log(JSON.stringify(state, null, 2));
}

async function main() {
  const options = parseArgs();
  switch (options.action) {
    case "start":
  await startRun(options);
      break;
    case "phase":
      advancePhase(options);
      break;
    case "complete":
      await completeRun(options);
      break;
    default:
      showStatus();
      break;
  }
}

main();
