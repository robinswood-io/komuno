import type { InsertDevelopmentRequest } from "@shared/schema";

interface GitHubIssueResponse {
  id: number;
  number: number;
  html_url: string;
  state: GitHubIssueState;
  labels?: Array<{ name?: string }>;
}

interface GitHubIssuePayload {
  title: string;
  body: string;
  labels: string[];
  state?: 'open' | 'closed';
}

interface GitHubErrorResponse {
  message: string;
  documentation_url?: string;
  errors?: Array<{ message: string }>;
}

type GitHubIssueState = 'open' | 'closed';

type GitHubIssueUpdatePayload = {
  title?: string;
  body?: string;
  labels?: string[];
  state?: GitHubIssueState;
};

function resolveRepoOwner(): string {
  return process.env.GITHUB_REPO_OWNER || process.env.GITHUB_OWNER || "Aoleon";
}

function resolveRepoName(): string {
  return process.env.GITHUB_REPO_NAME || process.env.GITHUB_REPO || "cjd80";
}

function buildIssueBody(request: {
  description: string;
  type: string;
  priority: string;
  requestedBy: string;
  requestedByName: string;
}): string {
  return [
    `**Description:**`,
    request.description,
    ``,
    `**Type:** ${request.type === "bug" ? "🐛 Bug" : "✨ Fonctionnalité"}`,
    `**Priorité:** ${getPriorityEmoji(request.priority)} ${request.priority}`,
    `**Demandé par:** ${request.requestedByName} (${request.requestedBy})`,
    ``,
    `---`,
    `*Issue créée automatiquement depuis l'interface d'administration CJD Amiens*`
  ].join('\n');
}

/**
 * Crée une issue GitHub à partir d'une demande de développement
 */
export async function createGitHubIssue(request: InsertDevelopmentRequest): Promise<GitHubIssueResponse | null> {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = resolveRepoOwner();
  const repoName = resolveRepoName();
  
  if (!token) {
    console.warn("[GitHub] GITHUB_TOKEN non configuré - création d'issue ignorée");
    return null;
  }
  
  if (!repoOwner || !repoName) {
    console.warn("[GitHub] GITHUB_REPO_OWNER ou GITHUB_REPO_NAME non configuré");
    return null;
  }

  try {
    // Debug: Vérifier d'abord si le repository existe
    console.log(`[GitHub] Test d'accès au repository ${repoOwner}/${repoName}`);
    const repoResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });
    
    if (!repoResponse.ok) {
      const repoError = await repoResponse.json() as GitHubErrorResponse;
      console.error(`[GitHub] Erreur accès repository (${repoResponse.status}):`, repoError);
      return null;
    }
    
    console.log(`[GitHub] Repository accessible - procédure de création d'issue`);

    const labels = [
      request.type === "bug" ? "bug" : "enhancement",
      `priority-${request.priority}`
    ];

    const body = buildIssueBody(request);

    const issuePayload: GitHubIssuePayload = {
      title: request.title,
      body,
      labels
    };

    console.log(`[GitHub] Création issue avec payload:`, JSON.stringify(issuePayload, null, 2));

    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'CJD-Amiens-Bot/1.0'
      },
      body: JSON.stringify(issuePayload)
    });

    if (!response.ok) {
      const errorData = await response.json() as GitHubErrorResponse;
      console.error("[GitHub] Erreur création issue:", response.status, errorData);
      
      // Debug supplémentaire
      console.error("[GitHub] Headers envoyés:", {
        'Authorization': `Bearer ${token.substring(0, 10)}...`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'CJD-Amiens-Bot/1.0'
      });
      
      return null;
    }

    const issueData = await response.json() as GitHubIssueResponse;
    console.log(`[GitHub] Issue créée avec succès: #${issueData.number} - ${request.title}`);
    
    return issueData;
  } catch (error) {
    console.error("[GitHub] Erreur lors de la création de l'issue:", error);
    return null;
  }
}

/**
 * Synchronise le statut d'une issue GitHub avec une demande locale
 */
export async function syncGitHubIssueStatus(
  issueNumber: number,
): Promise<{ status: GitHubIssueState; closed: boolean; labels: string[] } | null> {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = resolveRepoOwner();
  const repoName = resolveRepoName();
  
  if (!token || !repoOwner || !repoName) {
    return null;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!response.ok) {
      console.error(`[GitHub] Erreur récupération issue #${issueNumber}:`, response.status);
      return null;
    }

    const issueData = await response.json() as GitHubIssueResponse;
    const labels = Array.isArray(issueData.labels)
      ? issueData.labels.map((label) => label.name).filter((labelName): labelName is string => Boolean(labelName))
      : [];

    const normalizedState: GitHubIssueState =
      issueData.state === 'closed' ? 'closed' : 'open';
    
    return {
      status: normalizedState,
      closed: normalizedState === "closed",
      labels,
    };
  } catch (error) {
    console.error(`[GitHub] Erreur synchronisation issue #${issueNumber}:`, error);
    return null;
  }
}

/**
 * Ferme une issue GitHub
 */
export async function closeGitHubIssue(issueNumber: number, reason?: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = resolveRepoOwner();
  const repoName = resolveRepoName();
  
  if (!token || !repoOwner || !repoName) {
    return false;
  }

  try {
    const payload: { state: GitHubIssueState; state_reason?: 'completed' | 'not_planned' } = {
      state: "closed"
    };

    if (reason) {
      payload.state_reason = reason === "completed" ? "completed" : "not_planned";
    }

    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`[GitHub] Erreur fermeture issue #${issueNumber}:`, response.status);
      return false;
    }

    console.log(`[GitHub] Issue fermée: #${issueNumber}`);
    return true;
  } catch (error) {
    console.error(`[GitHub] Erreur fermeture issue #${issueNumber}:`, error);
    return false;
  }
}

/**
 * Ajoute un commentaire à une issue GitHub
 */
export async function addGitHubComment(issueNumber: number, comment: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = resolveRepoOwner();
  const repoName = resolveRepoName();
  
  if (!token || !repoOwner || !repoName) {
    return false;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: comment })
    });

    if (!response.ok) {
      console.error(`[GitHub] Erreur ajout commentaire issue #${issueNumber}:`, response.status);
      return false;
    }

    console.log(`[GitHub] Commentaire ajouté à l'issue #${issueNumber}`);
    return true;
  } catch (error) {
    console.error(`[GitHub] Erreur ajout commentaire issue #${issueNumber}:`, error);
    return false;
  }
}

/**
 * Met à jour le statut et les labels d'une issue GitHub
 */
export async function updateGitHubIssueStatus(
  issueNumber: number,
  state: GitHubIssueState,
  labels: string[],
): Promise<GitHubIssueResponse | null> {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = resolveRepoOwner();
  const repoName = resolveRepoName();

  if (!token || !repoOwner || !repoName) {
    return null;
  }

  try {
    const payload: GitHubIssuePayload = {
      title: '',
      body: '',
      labels,
      state,
    };

    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state: payload.state,
        labels: payload.labels,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json() as GitHubErrorResponse;
      console.error(`[GitHub] Erreur mise à jour issue #${issueNumber}:`, response.status, errorData);
      return null;
    }

    const issueData = await response.json() as GitHubIssueResponse;
    return issueData;
  } catch (error) {
    console.error(`[GitHub] Erreur mise à jour issue #${issueNumber}:`, error);
    return null;
  }
}

/**
 * Met à jour le contenu d'une issue GitHub (titre, description, labels, statut)
 */
export async function updateGitHubIssueDetails(
  issueNumber: number,
  payload: GitHubIssueUpdatePayload,
): Promise<GitHubIssueResponse | null> {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = resolveRepoOwner();
  const repoName = resolveRepoName();

  if (!token || !repoOwner || !repoName) {
    return null;
  }

  try {
    const updatePayload: GitHubIssueUpdatePayload = {
      ...(payload.title ? { title: payload.title } : {}),
      ...(payload.body ? { body: payload.body } : {}),
      ...(payload.labels ? { labels: payload.labels } : {}),
      ...(payload.state ? { state: payload.state } : {}),
    };

    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const errorData = await response.json() as GitHubErrorResponse;
      console.error(`[GitHub] Erreur mise à jour issue #${issueNumber}:`, response.status, errorData);
      return null;
    }

    const issueData = await response.json() as GitHubIssueResponse;
    return issueData;
  } catch (error) {
    console.error(`[GitHub] Erreur mise à jour issue #${issueNumber}:`, error);
    return null;
  }
}

/**
 * Retourne l'emoji correspondant à la priorité
 */
function getPriorityEmoji(priority: string): string {
  switch (priority) {
    case "critical": return "🔥";
    case "high": return "🚨";
    case "medium": return "⚠️";
    case "low": return "ℹ️";
    default: return "📋";
  }
}
