"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/utils/github-integration.ts
var github_integration_exports = {};
__export(github_integration_exports, {
  addGitHubComment: () => addGitHubComment,
  closeGitHubIssue: () => closeGitHubIssue,
  createGitHubIssue: () => createGitHubIssue,
  syncGitHubIssueStatus: () => syncGitHubIssueStatus,
  updateGitHubIssueDetails: () => updateGitHubIssueDetails,
  updateGitHubIssueStatus: () => updateGitHubIssueStatus
});
module.exports = __toCommonJS(github_integration_exports);
function resolveRepoOwner() {
  return process.env.GITHUB_REPO_OWNER || process.env.GITHUB_OWNER || "Aoleon";
}
function resolveRepoName() {
  return process.env.GITHUB_REPO_NAME || process.env.GITHUB_REPO || "cjd80";
}
function buildIssueBody(request) {
  return [
    `**Description:**`,
    request.description,
    ``,
    `**Type:** ${request.type === "bug" ? "\u{1F41B} Bug" : "\u2728 Fonctionnalit\xE9"}`,
    `**Priorit\xE9:** ${getPriorityEmoji(request.priority)} ${request.priority}`,
    `**Demand\xE9 par:** ${request.requestedByName} (${request.requestedBy})`,
    ``,
    `---`,
    `*Issue cr\xE9\xE9e automatiquement depuis l'interface d'administration*`
  ].join("\n");
}
async function createGitHubIssue(request) {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = resolveRepoOwner();
  const repoName = resolveRepoName();
  if (!token) {
    console.warn("[GitHub] GITHUB_TOKEN non configur\xE9 - cr\xE9ation d'issue ignor\xE9e");
    return null;
  }
  if (!repoOwner || !repoName) {
    console.warn("[GitHub] GITHUB_REPO_OWNER ou GITHUB_REPO_NAME non configur\xE9");
    return null;
  }
  try {
    console.log(`[GitHub] Test d'acc\xE8s au repository ${repoOwner}/${repoName}`);
    const repoResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });
    if (!repoResponse.ok) {
      const repoError = await repoResponse.json();
      console.error(`[GitHub] Erreur acc\xE8s repository (${repoResponse.status}):`, repoError);
      return null;
    }
    console.log(`[GitHub] Repository accessible - proc\xE9dure de cr\xE9ation d'issue`);
    const labels = [
      request.type === "bug" ? "bug" : "enhancement",
      `priority-${request.priority}`
    ];
    const body = buildIssueBody(request);
    const issuePayload = {
      title: request.title,
      body,
      labels
    };
    console.log(`[GitHub] Cr\xE9ation issue avec payload:`, JSON.stringify(issuePayload, null, 2));
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "Komuno-Bot/1.0"
      },
      body: JSON.stringify(issuePayload)
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("[GitHub] Erreur cr\xE9ation issue:", response.status, errorData);
      return null;
    }
    const issueData = await response.json();
    console.log(`[GitHub] Issue cr\xE9\xE9e avec succ\xE8s: #${issueData.number} - ${request.title}`);
    return issueData;
  } catch (error) {
    console.error("[GitHub] Erreur lors de la cr\xE9ation de l'issue:", error);
    return null;
  }
}
async function syncGitHubIssueStatus(issueNumber) {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = resolveRepoOwner();
  const repoName = resolveRepoName();
  if (!token || !repoOwner || !repoName) {
    return null;
  }
  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });
    if (!response.ok) {
      console.error(`[GitHub] Erreur r\xE9cup\xE9ration issue #${issueNumber}:`, response.status);
      return null;
    }
    const issueData = await response.json();
    const labels = Array.isArray(issueData.labels) ? issueData.labels.map((label) => label.name).filter((labelName) => Boolean(labelName)) : [];
    const normalizedState = issueData.state === "closed" ? "closed" : "open";
    return {
      status: normalizedState,
      closed: normalizedState === "closed",
      labels
    };
  } catch (error) {
    console.error(`[GitHub] Erreur synchronisation issue #${issueNumber}:`, error);
    return null;
  }
}
async function closeGitHubIssue(issueNumber, reason) {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = resolveRepoOwner();
  const repoName = resolveRepoName();
  if (!token || !repoOwner || !repoName) {
    return false;
  }
  try {
    const payload = {
      state: "closed"
    };
    if (reason) {
      payload.state_reason = reason === "completed" ? "completed" : "not_planned";
    }
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error(`[GitHub] Erreur fermeture issue #${issueNumber}:`, response.status);
      return false;
    }
    console.log(`[GitHub] Issue ferm\xE9e: #${issueNumber}`);
    return true;
  } catch (error) {
    console.error(`[GitHub] Erreur fermeture issue #${issueNumber}:`, error);
    return false;
  }
}
async function addGitHubComment(issueNumber, comment) {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = resolveRepoOwner();
  const repoName = resolveRepoName();
  if (!token || !repoOwner || !repoName) {
    return false;
  }
  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ body: comment })
    });
    if (!response.ok) {
      console.error(`[GitHub] Erreur ajout commentaire issue #${issueNumber}:`, response.status);
      return false;
    }
    console.log(`[GitHub] Commentaire ajout\xE9 \xE0 l'issue #${issueNumber}`);
    return true;
  } catch (error) {
    console.error(`[GitHub] Erreur ajout commentaire issue #${issueNumber}:`, error);
    return false;
  }
}
async function updateGitHubIssueStatus(issueNumber, state, labels) {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = resolveRepoOwner();
  const repoName = resolveRepoName();
  if (!token || !repoOwner || !repoName) {
    return null;
  }
  try {
    const payload = {
      title: "",
      body: "",
      labels,
      state
    };
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        state: payload.state,
        labels: payload.labels
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[GitHub] Erreur mise \xE0 jour issue #${issueNumber}:`, response.status, errorData);
      return null;
    }
    const issueData = await response.json();
    return issueData;
  } catch (error) {
    console.error(`[GitHub] Erreur mise \xE0 jour issue #${issueNumber}:`, error);
    return null;
  }
}
async function updateGitHubIssueDetails(issueNumber, payload) {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = resolveRepoOwner();
  const repoName = resolveRepoName();
  if (!token || !repoOwner || !repoName) {
    return null;
  }
  try {
    const updatePayload = {
      ...payload.title ? { title: payload.title } : {},
      ...payload.body ? { body: payload.body } : {},
      ...payload.labels ? { labels: payload.labels } : {},
      ...payload.state ? { state: payload.state } : {}
    };
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatePayload)
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[GitHub] Erreur mise \xE0 jour issue #${issueNumber}:`, response.status, errorData);
      return null;
    }
    const issueData = await response.json();
    return issueData;
  } catch (error) {
    console.error(`[GitHub] Erreur mise \xE0 jour issue #${issueNumber}:`, error);
    return null;
  }
}
function getPriorityEmoji(priority) {
  switch (priority) {
    case "critical":
      return "\u{1F525}";
    case "high":
      return "\u{1F6A8}";
    case "medium":
      return "\u26A0\uFE0F";
    case "low":
      return "\u2139\uFE0F";
    default:
      return "\u{1F4CB}";
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addGitHubComment,
  closeGitHubIssue,
  createGitHubIssue,
  syncGitHubIssueStatus,
  updateGitHubIssueDetails,
  updateGitHubIssueStatus
});
