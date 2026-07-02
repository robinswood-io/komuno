#!/usr/bin/env tsx

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveProjectTargets } from "./utils/projectTargets";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(path.join(__dirname, ".."));
const CENTRAL_FILE = path.join(repoRoot, "config", "ssh_connections.json");
const LOCAL_FILENAME = path.join("config", "ssh_connections.local.json");

type Connection = {
  id: string;
  host: string;
  port?: number;
  username: string;
  authMethod?: "key" | "password" | "agent";
  privateKeyPath?: string;
  passwordHint?: string;
  passphraseHint?: string;
  tags?: string[];
  projects?: string[];
  description?: string;
};

interface CentralFile {
  version: string;
  lastUpdated: string;
  connections: Connection[];
}

function loadCentralFile(): CentralFile {
  if (!fs.existsSync(CENTRAL_FILE)) {
    const fallback: CentralFile = { version: "1.0.0", lastUpdated: new Date().toISOString(), connections: [] };
    fs.mkdirSync(path.dirname(CENTRAL_FILE), { recursive: true });
    fs.writeFileSync(CENTRAL_FILE, JSON.stringify(fallback, null, 2));
    return fallback;
  }
  return JSON.parse(fs.readFileSync(CENTRAL_FILE, "utf8")) as CentralFile;
}

function normalizeConnection(raw: Partial<Connection>, projectPath: string): Connection | null {
  const host = raw.host?.trim();
  const username = raw.username?.trim();
  if (!host || !username) {
    return null;
  }
  const id = raw.id?.trim() || `${host}-${username}`.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
  return {
    id,
    host,
    username,
    port: raw.port,
    authMethod: raw.authMethod,
    privateKeyPath: raw.privateKeyPath,
    passwordHint: raw.passwordHint,
    passphraseHint: raw.passphraseHint,
    tags: raw.tags ?? [],
    description: raw.description,
    projects: raw.projects ?? [projectPath],
  };
}

function parseLocalFile(projectPath: string): Connection[] {
  const localPath = path.join(projectPath, LOCAL_FILENAME);
  if (!fs.existsSync(localPath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(localPath, "utf8")) as { connections?: Partial<Connection>[] };
    return (parsed.connections ?? [])
      .map((conn) => normalizeConnection(conn, projectPath))
      .filter((conn): conn is Connection => Boolean(conn));
  } catch (error) {
    console.warn(`⚠️  Impossible de lire ${localPath}: ${String(error)}`);
    return [];
  }
}

function mergeConnections(central: CentralFile, additions: Connection[]) {
  const map = new Map<string, Connection>();
  for (const existing of central.connections) {
    map.set(existing.id, existing);
  }

  let added = 0;
  let updated = 0;
  for (const incoming of additions) {
    const current = map.get(incoming.id);
    if (!current) {
      map.set(incoming.id, { ...incoming, projects: [...new Set(incoming.projects ?? [])] });
      added++;
      continue;
    }

    let changed = false;
    const mergedProjects = new Set([...(current.projects ?? []), ...(incoming.projects ?? [])]);
    if (mergedProjects.size !== (current.projects ?? []).length) {
      current.projects = Array.from(mergedProjects).sort();
      changed = true;
    }

    const fields: (keyof Connection)[] = ["host", "port", "username", "authMethod", "privateKeyPath", "passwordHint", "passphraseHint", "description"];
    for (const field of fields) {
      const incomingValue = incoming[field];
      if (incomingValue && !current[field]) {
        current[field] = incomingValue as unknown;
        changed = true;
      }
    }

    if (incoming.tags && incoming.tags.length) {
      const tags = new Set([...(current.tags ?? []), ...incoming.tags]);
      current.tags = Array.from(tags).sort();
      changed = true;
    }

    if (changed) {
      updated++;
    }
  }

  central.connections = Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  central.lastUpdated = new Date().toISOString();
  fs.writeFileSync(CENTRAL_FILE, JSON.stringify(central, null, 2));

  console.log(`🔐 SSH connections sync: +${added} ajout(s), ${updated} mise(s) à jour, total=${central.connections.length}`);
}

function parseCliTargets(): string[] | undefined {
  const entries: string[] = [];
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--targets=")) {
      entries.push(
        ...arg
          .replace("--targets=", "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      );
    }
  }
  return entries.length ? entries : undefined;
}

function main() {
  const targets = resolveProjectTargets({ cliTargets: parseCliTargets() });
  if (!targets.length) {
    console.warn("⚠️ Aucun projet détecté pour l'agrégation SSH");
    return;
  }

  const central = loadCentralFile();
  const additions: Connection[] = [];
  for (const target of targets) {
    additions.push(...parseLocalFile(target));
  }
  if (!additions.length) {
    console.log("ℹ️  Aucun nouveau profil SSH trouvé");
    return;
  }
  mergeConnections(central, additions);
}

main();
