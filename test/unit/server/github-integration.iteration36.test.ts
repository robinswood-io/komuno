import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addGitHubComment,
  closeGitHubIssue,
  createGitHubIssue,
  syncGitHubIssueStatus,
} from '../../../server/utils/github-integration.js';

type FetchInput = string | URL | Request;
type FetchFn = (input: FetchInput, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

type IntegrationRequest = {
  title: string;
  description: string;
  type: 'bug' | 'feature';
  priority: string;
  requestedByName: string;
  requestedBy: string;
};

function makeResponse(ok: boolean, status: number, data: unknown): Awaited<ReturnType<FetchFn>> {
  return {
    ok,
    status,
    json: async () => data,
  };
}

function setGitHubEnv(): void {
  process.env.GITHUB_TOKEN = 'ghp_test_token_123456789';
  process.env.GITHUB_REPO_OWNER = 'test-owner';
  process.env.GITHUB_REPO_NAME = 'test-repo';
}

function clearGitHubEnv(): void {
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_REPO_OWNER;
  delete process.env.GITHUB_REPO_NAME;
}

describe('server/utils/github-integration.js iteration 36', () => {
  const fetchMock = vi.fn<FetchFn>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    clearGitHubEnv();
  });

  it('createGitHubIssue returns null and warns when token is missing', async () => {
    const request: IntegrationRequest = {
      title: 'Missing token',
      description: 'Should not call network',
      type: 'bug',
      priority: 'high',
      requestedByName: 'Admin',
      requestedBy: 'admin@example.com',
    };

    const result = await createGitHubIssue(request);

    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('createGitHubIssue returns null when repository access fails', async () => {
    setGitHubEnv();
    fetchMock.mockResolvedValueOnce(makeResponse(false, 404, { message: 'Not Found' }));

    const request: IntegrationRequest = {
      title: 'Repo fail',
      description: 'Repository should be checked first',
      type: 'feature',
      priority: 'low',
      requestedByName: 'Admin',
      requestedBy: 'admin@example.com',
    };

    const result = await createGitHubIssue(request);

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.github.com/repos/test-owner/test-repo');
  });

  it('createGitHubIssue returns null when issue creation API fails after repo check', async () => {
    setGitHubEnv();
    fetchMock.mockResolvedValueOnce(makeResponse(true, 200, { id: 1 }));
    fetchMock.mockResolvedValueOnce(makeResponse(false, 422, { message: 'Validation Failed' }));

    const request: IntegrationRequest = {
      title: 'Validation fail',
      description: 'Payload validation error expected',
      type: 'feature',
      priority: 'medium',
      requestedByName: 'Ops',
      requestedBy: 'ops@example.com',
    };

    const result = await createGitHubIssue(request);

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const secondCallInit = fetchMock.mock.calls[1]?.[1];
    expect(secondCallInit?.method).toBe('POST');
    const payload = JSON.parse((secondCallInit?.body as string) ?? '{}') as {
      labels: string[];
      body: string;
    };
    expect(payload.labels).toContain('enhancement');
    expect(payload.labels).toContain('priority-medium');
    expect(payload.body).toContain('⚠️ medium');
  });

  it('createGitHubIssue maps labels and priority emojis and returns created issue', async () => {
    setGitHubEnv();
    const priorities: Array<{ priority: string; emoji: string; type: 'bug' | 'feature'; label: string }> = [
      { priority: 'critical', emoji: '🔥', type: 'bug', label: 'bug' },
      { priority: 'high', emoji: '🚨', type: 'feature', label: 'enhancement' },
      { priority: 'medium', emoji: '⚠️', type: 'feature', label: 'enhancement' },
      { priority: 'low', emoji: 'ℹ️', type: 'bug', label: 'bug' },
      { priority: 'unknown-priority', emoji: '📋', type: 'feature', label: 'enhancement' },
    ];

    for (const [index, item] of priorities.entries()) {
      fetchMock.mockResolvedValueOnce(makeResponse(true, 200, { id: `repo-${index}` }));
      fetchMock.mockResolvedValueOnce(
        makeResponse(true, 201, {
          number: index + 1,
          title: `Issue ${index + 1}`,
        }),
      );

      const request: IntegrationRequest = {
        title: `Issue ${index + 1}`,
        description: `Description ${index + 1}`,
        type: item.type,
        priority: item.priority,
        requestedByName: 'System',
        requestedBy: 'system@example.com',
      };

      const created = await createGitHubIssue(request);
      expect(created).toEqual({
        number: index + 1,
        title: `Issue ${index + 1}`,
      });

      const callIndex = index * 2 + 1;
      const init = fetchMock.mock.calls[callIndex]?.[1];
      const payload = JSON.parse((init?.body as string) ?? '{}') as {
        labels: string[];
        body: string;
      };

      expect(payload.labels).toContain(item.label);
      expect(payload.labels).toContain(`priority-${item.priority}`);
      expect(payload.body).toContain(`${item.emoji} ${item.priority}`);
    }
  });

  it('createGitHubIssue handles thrown fetch errors and returns null', async () => {
    setGitHubEnv();
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const request: IntegrationRequest = {
      title: 'Network error',
      description: 'Should be caught',
      type: 'bug',
      priority: 'high',
      requestedByName: 'Admin',
      requestedBy: 'admin@example.com',
    };

    const result = await createGitHubIssue(request);
    expect(result).toBeNull();
  });

  it('syncGitHubIssueStatus returns null when configuration is missing', async () => {
    const result = await syncGitHubIssueStatus(42);
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('syncGitHubIssueStatus handles non-ok, open, closed and thrown fetch cases', async () => {
    setGitHubEnv();

    fetchMock.mockResolvedValueOnce(makeResponse(false, 500, { message: 'server error' }));
    const nonOk = await syncGitHubIssueStatus(1);
    expect(nonOk).toBeNull();

    fetchMock.mockResolvedValueOnce(makeResponse(true, 200, { state: 'open' }));
    const openStatus = await syncGitHubIssueStatus(2);
    expect(openStatus).toEqual({ status: 'open', closed: false });

    fetchMock.mockResolvedValueOnce(makeResponse(true, 200, { state: 'closed' }));
    const closedStatus = await syncGitHubIssueStatus(3);
    expect(closedStatus).toEqual({ status: 'closed', closed: true });

    fetchMock.mockRejectedValueOnce(new Error('sync network error'));
    const thrown = await syncGitHubIssueStatus(4);
    expect(thrown).toBeNull();
  });

  it('closeGitHubIssue returns false when configuration is missing', async () => {
    const result = await closeGitHubIssue(10);
    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('closeGitHubIssue handles reason mapping, API failures and thrown errors', async () => {
    setGitHubEnv();

    fetchMock.mockResolvedValueOnce(makeResponse(true, 200, { ok: true }));
    const completed = await closeGitHubIssue(10, 'completed');
    expect(completed).toBe(true);
    const completedPayload = JSON.parse((fetchMock.mock.calls[0]?.[1]?.body as string) ?? '{}') as {
      state: string;
      state_reason?: string;
    };
    expect(completedPayload).toEqual({ state: 'closed', state_reason: 'completed' });

    fetchMock.mockResolvedValueOnce(makeResponse(true, 200, { ok: true }));
    const notPlanned = await closeGitHubIssue(11, 'duplicate');
    expect(notPlanned).toBe(true);
    const notPlannedPayload = JSON.parse((fetchMock.mock.calls[1]?.[1]?.body as string) ?? '{}') as {
      state: string;
      state_reason?: string;
    };
    expect(notPlannedPayload).toEqual({ state: 'closed', state_reason: 'not_planned' });

    fetchMock.mockResolvedValueOnce(makeResponse(true, 200, { ok: true }));
    const withoutReason = await closeGitHubIssue(12);
    expect(withoutReason).toBe(true);
    const noReasonPayload = JSON.parse((fetchMock.mock.calls[2]?.[1]?.body as string) ?? '{}') as {
      state: string;
      state_reason?: string;
    };
    expect(noReasonPayload).toEqual({ state: 'closed' });

    fetchMock.mockResolvedValueOnce(makeResponse(false, 403, { message: 'forbidden' }));
    const nonOk = await closeGitHubIssue(13, 'completed');
    expect(nonOk).toBe(false);

    fetchMock.mockRejectedValueOnce(new Error('close network error'));
    const thrown = await closeGitHubIssue(14, 'completed');
    expect(thrown).toBe(false);
  });

  it('addGitHubComment returns false when configuration is missing', async () => {
    const result = await addGitHubComment(20, 'hello');
    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('addGitHubComment handles success, API errors and thrown errors', async () => {
    setGitHubEnv();

    fetchMock.mockResolvedValueOnce(makeResponse(true, 201, { id: 100 }));
    const success = await addGitHubComment(20, 'Done.');
    expect(success).toBe(true);

    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe('https://api.github.com/repos/test-owner/test-repo/issues/20/comments');
    expect(call?.[1]?.method).toBe('POST');
    expect(JSON.parse((call?.[1]?.body as string) ?? '{}')).toEqual({ body: 'Done.' });

    fetchMock.mockResolvedValueOnce(makeResponse(false, 400, { message: 'bad request' }));
    const nonOk = await addGitHubComment(21, 'Bad');
    expect(nonOk).toBe(false);

    fetchMock.mockRejectedValueOnce(new Error('comment network error'));
    const thrown = await addGitHubComment(22, 'Thrown');
    expect(thrown).toBe(false);
  });
});
