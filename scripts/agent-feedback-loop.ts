#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { cursorConversationStorageService } from "../server/services/CursorConversationStorageService";

const DOCS_DIR = path.join(process.cwd(), "docs");
const TASKS_FILE = path.join(DOCS_DIR, "AGENT_TASKS_QUEUE.json");
const EVENTS_FILE = path.join(DOCS_DIR, "AGENT_EVENTS.json");
const FEEDBACK_FILE = path.join(DOCS_DIR, "AGENT_AUTOMATED_FEEDBACK.md");

interface TaskEntry {
  id: string;
  title: string;
  description?: string;
  projectPath?: string | null;
  role: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  dueAt?: string | null;
  slaHours?: number | null;
  dependencies?: string[];
  labels?: string[];
}

interface FeedbackItem {
  title: string;
  detail: string;
  severity: "info" | "medium" | "high";
  recommendedRole: string;
  recommendedAction: string;
  dueAt?: string;
  labels?: string[];
}

function loadJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function saveJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function recalcMetadata(queue: TaskEntry[]) {
  const now = Date.now();
  const blockedTasks = queue.filter((task) => {
    if (!task?.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some((id) => {
      const dep = queue.find((q) => q.id === id);
      return !dep || dep.status !== "completed";
    });
  }).length;
  const overdueTasks = queue.filter((task) => {
    if (!task?.dueAt || task.status === "completed") return false;
    const due = new Date(task.dueAt).getTime();
    return Number.isFinite(due) && due < now;
  }).length;
  const slaBreaches = queue.filter((task) => {
    if (!task?.slaHours) return false;
    const started = new Date(task.createdAt).getTime();
    const end = task.completedAt ? new Date(task.completedAt).getTime() : now;
    if (!Number.isFinite(started) || !Number.isFinite(end)) return false;
    const hours = (end - started) / 3600000;
    return hours > task.slaHours;
  }).length;
  return {
    totalTasks: queue.length,
    pendingTasks: queue.filter((t) => t.status === "pending").length,
    inProgressTasks: queue.filter((t) => t.status === "in-progress").length,
    completedTasks: queue.filter((t) => t.status === "completed").length,
    failedTasks: queue.filter((t) => t.status === "failed").length,
    blockedTasks,
    overdueTasks,
    slaBreaches,
    priority: {
      high: queue.filter((t) => t.priority === "high").length,
      medium: queue.filter((t) => t.priority === "medium").length,
      low: queue.filter((t) => t.priority === "low").length,
    },
  };
}

function ensureTask(queueData: unknown, item: FeedbackItem) {
  if (queueData.queue.some((task: TaskEntry) => task.title === item.title)) {
    return;
  }
  const now = new Date().toISOString();
  queueData.queue.push({
    id: `task-${randomUUID()}`,
    title: item.title,
    description: item.detail,
    role: (item.recommendedRole as TaskEntry["role"]) ?? "architect",
    priority: item.severity === "high" ? "high" : item.severity === "medium" ? "medium" : "low",
    status: "pending",
    createdAt: now,
    updatedAt: now,
    dueAt: item.dueAt ?? null,
    slaHours: null,
    dependencies: [],
    labels: item.labels ?? [],
  });
}

async function collectFeedback(): Promise<FeedbackItem[]> {
  const feedback: FeedbackItem[] = [];
  const events = loadJson<{
    events: Array<{ type: string; role?: string; detail?: string; timestamp?: string }>;
  }>(EVENTS_FILE, { events: [] });
  const last7Days = Date.now() - 7 * 24 * 3600 * 1000;
  const recentEvents = events.events.filter((evt) => {
    if (!evt.timestamp) return false;
    return new Date(evt.timestamp).getTime() >= last7Days;
  });
  const failures = recentEvents.filter((evt) => evt.type === "test-failure");
  if (failures.length >= 2) {
    feedback.push({
      title: "Stabiliser la suite Playwright",
      detail: `${failures.length} échecs Playwright détectés sur les 7 derniers jours. Déclencher un audit de flakiness et renforcer la couverture.`,
      severity: "high",
      recommendedRole: "tester",
      recommendedAction: "Analyser les rapports générés (MinIO) et corriger les tests les plus fragiles",
      dueAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      labels: ["playwright", "quality"],
    });
  }

  try {
    const { conversations } = await cursorConversationStorageService.getStoredConversations({ limit: 200 });
    const topicCounts = new Map<string, number>();
    const unresolvedErrors: Record<string, number> = {};
    for (const conv of conversations) {
      if (Array.isArray(conv.topics)) {
        for (const topic of conv.topics) {
          topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
        }
      }
      if (conv.hasErrors && !conv.hasSolutions) {
        const key = conv.projectPath || "global";
        unresolvedErrors[key] = (unresolvedErrors[key] ?? 0) + 1;
      }
    }

    const topTopic = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topTopic && topTopic[1] >= 5) {
      feedback.push({
        title: `Documenter le sujet critique: ${topTopic[0]}`,
        detail: `Le sujet « ${topTopic[0]} » apparaît ${topTopic[1]} fois dans l'historique récent. Consolider une note d'architecture / recette.`,
        severity: "medium",
        recommendedRole: "architect",
        recommendedAction: "Créer ou mettre à jour la documentation dans docs/analysis pour éviter les redondances",
        dueAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        labels: ["knowledge-base"],
      });
    }

    for (const [project, count] of Object.entries(unresolvedErrors)) {
      if (count >= 3) {
        feedback.push({
          title: `Corriger les erreurs récurrentes (${project})`,
          detail: `${count} conversations contiennent des erreurs non résolues sur ${project}.`,
          severity: "high",
          recommendedRole: "developer",
          recommendedAction: "Prioriser les correctifs et ajouter des tests ciblés",
          dueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          labels: ["bugfix", project],
        });
      }
    }
  } catch (error) {
    console.warn(`⚠️ Impossible d'analyser les conversations Cursor: ${String(error)}`);
  } finally {
    cursorConversationStorageService.cleanup();
  }

  return feedback;
}

async function main() {
  const feedbackItems = await collectFeedback();
  const queueData = loadJson<unknown>(TASKS_FILE, {
    version: "2.0.0",
    lastUpdated: new Date().toISOString(),
    queue: [],
    metadata: recalcMetadata([]),
  });

  for (const item of feedbackItems) {
    ensureTask(queueData, item);
  }
  queueData.metadata = recalcMetadata(queueData.queue as TaskEntry[]);
  queueData.lastUpdated = new Date().toISOString();
  saveJson(TASKS_FILE, queueData);

  const lines: string[] = [];
  lines.push("# AGENT – Boucle de feedback automatisée");
  lines.push(`Dernière mise à jour : ${new Date().toISOString()}`);
  lines.push("");
  if (!feedbackItems.length) {
    lines.push("Aucun signal critique détecté lors de la dernière passe.");
  } else {
    lines.push("| Titre | Sévérité | Rôle recommandé | Résumé | Action proposée |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const item of feedbackItems) {
      lines.push(
        `| ${item.title} | ${item.severity} | ${item.recommendedRole} | ${item.detail} | ${item.recommendedAction} |`
      );
    }
  }
  fs.writeFileSync(FEEDBACK_FILE, `${lines.join("\n")}\n`);
  console.log(`✅ Feedback généré (${feedbackItems.length} proposition(s))`);
}

main();
