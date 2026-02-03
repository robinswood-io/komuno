export type DevRequestStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';
export type DevRequestStorageStatus = 'open' | 'in_progress' | 'closed' | 'cancelled';

type GitHubIssueState = 'open' | 'closed';

const STATUS_LABEL_PREFIX = 'status-';

const statusLabelMap: Record<DevRequestStatus, string> = {
  pending: 'status-pending',
  in_progress: 'status-in_progress',
  done: 'status-done',
  cancelled: 'status-cancelled',
};

export function toStorageStatus(status: DevRequestStatus | 'open' | 'closed'): DevRequestStorageStatus {
  if (status === 'pending' || status === 'open') return 'open';
  if (status === 'done' || status === 'closed') return 'closed';
  if (status === 'in_progress') return 'in_progress';
  return 'cancelled';
}

export function toApiStatus(status: string): DevRequestStatus {
  if (status === 'open' || status === 'pending') return 'pending';
  if (status === 'closed' || status === 'done') return 'done';
  if (status === 'in_progress') return 'in_progress';
  return 'cancelled';
}

export function statusFromGitHub(state: GitHubIssueState, labels: string[] = []): DevRequestStatus {
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  const statusLabel = normalizedLabels.find((label) => label.startsWith(STATUS_LABEL_PREFIX));

  if (statusLabel) {
    const rawStatus = statusLabel.replace(STATUS_LABEL_PREFIX, '');
    if (rawStatus === 'pending') return 'pending';
    if (rawStatus === 'in_progress') return 'in_progress';
    if (rawStatus === 'done') return 'done';
    if (rawStatus === 'cancelled') return 'cancelled';
  }

  if (normalizedLabels.includes('in_progress')) return 'in_progress';
  if (normalizedLabels.includes('done')) return 'done';
  if (normalizedLabels.includes('cancelled')) return 'cancelled';
  if (normalizedLabels.includes('pending')) return 'pending';

  return state === 'closed' ? 'done' : 'pending';
}

export function buildGitHubLabels(params: {
  status: DevRequestStatus;
  type: 'bug' | 'feature';
  priority: string;
}): string[] {
  const labels = [
    params.type === 'bug' ? 'bug' : 'enhancement',
    `priority-${params.priority}`,
    statusLabelMap[params.status],
  ];

  return labels;
}
