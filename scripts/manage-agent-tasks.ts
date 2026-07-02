#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCS_DIR = path.join(__dirname, "..", "docs");
const TASKS_FILE = path.join(DOCS_DIR, "AGENT_TASKS_QUEUE.json");
const EVENTS_FILE = path.join(DOCS_DIR, "AGENT_EVENTS.json");

type TaskStatus = "pending" | "in-progress" | "completed" | "blocked" | "failed";
type Priority = "high" | "medium" | "low";
type Role = "architect" | "developer" | "tester" | "analyst" | "coordinator";

interface TaskEntry {
  id: string;
  title: string;
  description?: string;
  projectPath?: string | null;
  role: Role;
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  notes?: string;
  dueAt?: string | null;
  slaHours?: number | null;
  dependencies?: string[];
  labels?: string[];
}

interface CliOptions {
  action: "list" | "add" | "update" | "complete" | "clear";
  id?: string;
  title?: string;
  description?: string;
  role?: Role;
  priority?: Priority;
  project?: string;
  status?: TaskStatus;
  notes?: string;
  due?: string;
  sla?: number;
  depends?: string[];
  labels?: string[];
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: Record<string, string> = {};
  let action: CliOptions["action"] = "list";

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.replace(/^--/, "").split("=");
      if (key === "action") {
        action = (value as CliOptions["action"]) ?? "list";
      } else {
        opts[key] = value ?? "";
      }
    }
  }

  const parseList = (value?: string) =>
    value
      ?.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  return {
    action,
    id: opts.id,
    title: opts.title,
    description: opts.description,
    role: (opts.role as Role) ?? undefined,
    priority: (opts.priority as Priority) ?? undefined,
    project: opts.project,
    status: (opts.status as TaskStatus) ?? undefined,
    notes: opts.notes,
    due: opts.due,
    sla: opts.sla ? Number(opts.sla) : undefined,
    depends: parseList(opts.depends),
    labels: parseList(opts.labels),
  };
}

function loadJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function saveJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function updateEvents(event: { type: string; role?: string; detail?: string; payload?: Record<string, unknown> }) {
  const data = loadJson<{
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
  }>(EVENTS_FILE, {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    events: [],
    metadata: {
      totalEvents: 0,
      eventsByType: {},
      eventsByRole: {},
      eventsBySeverity: {},
      lastEventId: null,
      lastEventTimestamp: null,
    },
  });

  const timestamp = new Date().toISOString();
  const id = `evt-${timestamp}-${Math.random().toString(36).slice(2, 7)}`;

  data.events.push({
    id,
    timestamp,
    ...event,
  });

  data.metadata.totalEvents += 1;
  data.metadata.eventsByType[event.type] = (data.metadata.eventsByType[event.type] ?? 0) + 1;
  if (event.role) {
    data.metadata.eventsByRole[event.role] = (data.metadata.eventsByRole[event.role] ?? 0) + 1;
  }
  data.metadata.lastEventId = id;
  data.metadata.lastEventTimestamp = timestamp;
  data.lastUpdated = timestamp;

  saveJson(EVENTS_FILE, data);
}

function recalcMetadata(queue: TaskEntry[]) {
  const now = Date.now();
  const byId = new Map(queue.map((task) => [task.id, task]));
  const isBlocked = (task: TaskEntry) => {
    if (!task.dependencies || task.dependencies.length === 0) {
      return false;
    }
    return task.dependencies.some((depId) => {
      const dep = byId.get(depId);
      return !dep || dep.status !== "completed";
    });
  };

  const isOverdue = (task: TaskEntry) => {
    if (!task.dueAt || task.status === "completed") return false;
    const dateValue = new Date(task.dueAt).getTime();
    return Number.isFinite(dateValue) && dateValue < now;
  };

  const hasSlaBreach = (task: TaskEntry) => {
    if (!task.slaHours) return false;
    const startedAt = new Date(task.createdAt).getTime();
    const endAt = task.completedAt ? new Date(task.completedAt).getTime() : now;
    if (!Number.isFinite(startedAt) || !Number.isFinite(endAt)) return false;
    const hoursElapsed = (endAt - startedAt) / 3600000;
    return hoursElapsed > task.slaHours;
  };

  const meta = {
    totalTasks: queue.length,
    pendingTasks: queue.filter((t) => t.status === "pending").length,
    inProgressTasks: queue.filter((t) => t.status === "in-progress").length,
    completedTasks: queue.filter((t) => t.status === "completed").length,
    failedTasks: queue.filter((t) => t.status === "failed").length,
    blockedTasks: queue.filter(isBlocked).length,
    overdueTasks: queue.filter(isOverdue).length,
    slaBreaches: queue.filter(hasSlaBreach).length,
    priority: {
      high: queue.filter((t) => t.priority === "high").length,
      medium: queue.filter((t) => t.priority === "medium").length,
      low: queue.filter((t) => t.priority === "low").length,
    },
  };
  return meta;
}

function listTasks(queue: TaskEntry[]) {
  if (!queue.length) {
    console.log("📋 Aucune tâche dans la file.");
    return;
  }

  console.log("| ID | Titre | Rôle | Statut | Priorité | Échéance | Créé |");
  console.log("| --- | --- | --- | --- | --- | --- | --- |");
  for (const task of queue) {
    const dueLabel = task.dueAt ? new Date(task.dueAt).toISOString() : "—";
    console.log(
      `| ${task.id} | ${task.title} | ${task.role} | ${task.status} | ${task.priority} | ${dueLabel} | ${task.createdAt} |`
    );
  }
}

function addTask(options: CliOptions) {
  if (!options.title) {
    throw new Error("Veuillez spécifier --title");
  }
  const now = new Date().toISOString();
  let dueAt: string | undefined;
  if (options.due) {
    const parsed = new Date(options.due);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Impossible de parser la date ${options.due}`);
    }
    dueAt = parsed.toISOString();
  }
  const dependencies = options.depends ?? [];
  const labels = options.labels ?? [];

  const newTask: TaskEntry = {
    id: options.id ?? `task-${randomUUID()}`,
    title: options.title,
    description: options.description,
    projectPath: options.project ?? null,
    role: options.role ?? "developer",
    priority: options.priority ?? "high",
    status: "pending",
    createdAt: now,
    updatedAt: now,
    dueAt: dueAt ?? null,
    slaHours: options.sla ?? null,
    dependencies,
    labels,
  };
  return newTask;
}

function updateTask(task: TaskEntry, options: CliOptions) {
  if (options.title) task.title = options.title;
  if (options.description) task.description = options.description;
  if (options.role) task.role = options.role;
  if (options.priority) task.priority = options.priority;
  if (options.project) task.projectPath = options.project;
  if (options.status) task.status = options.status;
  if (options.notes) {
    task.notes = task.notes ? `${task.notes}\n${options.notes}` : options.notes;
  }
  if (options.due) {
    const parsed = new Date(options.due);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Impossible de parser la date ${options.due}`);
    }
    task.dueAt = parsed.toISOString();
  }
  if (options.sla !== undefined) {
    task.slaHours = Number.isFinite(options.sla) ? options.sla : null;
  }
  if (options.depends) {
    task.dependencies = options.depends;
  }
  if (options.labels) {
    task.labels = options.labels;
  }
  if (task.status === "completed") {
    task.completedAt = new Date().toISOString();
  }
  task.updatedAt = new Date().toISOString();
}

function completeTask(task: TaskEntry, options: CliOptions) {
  task.status = "completed";
  if (options.notes) {
    task.notes = task.notes ? `${task.notes}\n${options.notes}` : options.notes;
  }
  task.completedAt = new Date().toISOString();
  task.updatedAt = task.completedAt;
}

function main() {
  const options = parseArgs();
  const data = loadJson<{
    version: string;
    lastUpdated: string;
    queue: TaskEntry[];
    metadata: ReturnType<typeof recalcMetadata>;
  }>(TASKS_FILE, {
    version: "2.0.0",
    lastUpdated: new Date().toISOString(),
    queue: [],
    metadata: recalcMetadata([]),
  });

  const now = new Date().toISOString();

  switch (options.action) {
    case "list":
      listTasks(data.queue);
      return;
    case "add": {
      const task = addTask(options);
      data.queue.push(task);
      data.metadata = recalcMetadata(data.queue);
      data.lastUpdated = now;
      saveJson(TASKS_FILE, data);
      updateEvents({
        type: "task-add",
        role: task.role,
        detail: `Tâche créée (${task.title})`,
        payload: task,
      });
      console.log(`✅ Tâche ajoutée (${task.id})`);
      return;
    }
    case "update": {
      if (!options.id) throw new Error("Veuillez spécifier --id");
      const task = data.queue.find((t) => t.id === options.id);
      if (!task) throw new Error(`Tâche ${options.id} introuvable`);
      updateTask(task, options);
      data.metadata = recalcMetadata(data.queue);
      data.lastUpdated = now;
      saveJson(TASKS_FILE, data);
      updateEvents({
        type: "task-update",
        role: task.role,
        detail: `Tâche mise à jour (${task.id})`,
        payload: { status: task.status },
      });
      console.log(`📝 Tâche mise à jour (${task.id})`);
      return;
    }
    case "complete": {
      if (!options.id) throw new Error("Veuillez spécifier --id");
      const task = data.queue.find((t) => t.id === options.id);
      if (!task) throw new Error(`Tâche ${options.id} introuvable`);
      completeTask(task, options);
      data.metadata = recalcMetadata(data.queue);
      data.lastUpdated = now;
      saveJson(TASKS_FILE, data);
      updateEvents({
        type: "task-complete",
        role: task.role,
        detail: `Tâche complétée (${task.id})`,
        payload: { completedAt: task.completedAt },
      });
      console.log(`🏁 Tâche complétée (${task.id})`);
      return;
    }
    case "clear": {
      data.queue = [];
      data.metadata = recalcMetadata(data.queue);
      data.lastUpdated = now;
      saveJson(TASKS_FILE, data);
      updateEvents({
        type: "task-clear",
        role: "coordinator",
        detail: "File des tâches réinitialisée",
      });
      console.log("🧹 File des tâches réinitialisée");
      return;
    }
    default:
      console.error(`Action inconnue: ${options.action}`);
      process.exit(1);
  }
}

main();
