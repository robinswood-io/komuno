import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, queryKeys } from '@/lib/api/client';

const mockFetch = vi.fn();

describe('lib/api/client iteration2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('propagates network errors for PUT requests', async () => {
    const networkError = new TypeError('connection reset');
    mockFetch.mockRejectedValueOnce(networkError);

    await expect(api.put('/api/items/1', { title: 'X' })).rejects.toBe(networkError);
  });

  it('falls back to statusText when json parsing fails and text fallback is empty', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new Error('invalid json payload');
      },
      text: async () => '',
    });

    await expect(api.patch('/api/items/1', { enabled: true })).rejects.toEqual(
      expect.objectContaining<ApiError>({
        message: 'Bad Gateway',
        status: 502,
        data: '',
      }),
    );
  });

  it('throws SyntaxError on successful PATCH invalid json response parsing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '{broken-json',
    });

    await expect(api.patch('/api/items/2', { enabled: false })).rejects.toBeInstanceOf(SyntaxError);
  });

  it('does not serialize falsy payload for PUT helper (fallback body undefined)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ success: true }),
    });

    const result = await api.put<{ success: boolean }>('/api/items/2', 0);

    expect(result).toEqual({ success: true });
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe('PUT');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(options.body).toBeUndefined();
  });

  it('builds query key factories for all domains', () => {
    expect(queryKeys.ideas.list({ page: 1, limit: 20 })).toEqual(['ideas', 'list', { page: 1, limit: 20 }]);
    expect(queryKeys.ideas.detail('idea-1')).toEqual(['ideas', 'detail', 'idea-1']);
    expect(queryKeys.ideas.votes('idea-1')).toEqual(['ideas', 'votes', 'idea-1']);
    expect(queryKeys.ideas.stats()).toEqual(['ideas', 'stats']);

    expect(queryKeys.events.list({ page: 2, limit: 5 })).toEqual(['events', 'list', { page: 2, limit: 5 }]);
    expect(queryKeys.events.detail('event-1')).toEqual(['events', 'detail', 'event-1']);
    expect(queryKeys.events.inscriptions('event-1')).toEqual(['events', 'inscriptions', 'event-1']);
    expect(queryKeys.events.stats()).toEqual(['events', 'stats']);

    expect(queryKeys.loans.list({ page: 1, limit: 10, search: 'abc' })).toEqual([
      'loans',
      'list',
      { page: 1, limit: 10, search: 'abc' },
    ]);
    expect(queryKeys.loans.listAll({ page: 1, limit: 10, search: 'all' })).toEqual([
      'loans',
      'listAll',
      { page: 1, limit: 10, search: 'all' },
    ]);
    expect(queryKeys.loans.detail('loan-1')).toEqual(['loans', 'detail', 'loan-1']);

    expect(queryKeys.members.list({ status: 'active' })).toEqual(['members', 'list', { status: 'active' }]);
    expect(queryKeys.members.detail('x@example.com')).toEqual(['members', 'detail', 'x@example.com']);
    expect(queryKeys.members.tags.list({ q: 'vip' })).toEqual(['members', 'tags', 'list', { q: 'vip' }]);
    expect(queryKeys.members.tags.detail('tag-1')).toEqual(['members', 'tags', 'detail', 'tag-1']);
    expect(queryKeys.members.tasks.list({ done: false })).toEqual(['members', 'tasks', 'list', { done: false }]);
    expect(queryKeys.members.tasks.byMember('x@example.com')).toEqual(['members', 'tasks', 'byMember', 'x@example.com']);
    expect(queryKeys.members.tasks.detail('task-1')).toEqual(['members', 'tasks', 'detail', 'task-1']);
    expect(queryKeys.members.relations.list({ type: 'peer' })).toEqual([
      'members',
      'relations',
      'list',
      { type: 'peer' },
    ]);
    expect(queryKeys.members.relations.detail('rel-1')).toEqual(['members', 'relations', 'detail', 'rel-1']);

    expect(queryKeys.patrons.list({ level: 'gold' })).toEqual(['patrons', 'list', { level: 'gold' }]);
    expect(queryKeys.patrons.detail('patron-1')).toEqual(['patrons', 'detail', 'patron-1']);

    expect(queryKeys.financial.budgets({ year: 2026 })).toEqual(['financial', 'budgets', { year: 2026 }]);
    expect(queryKeys.financial.expenses({ month: 4 })).toEqual(['financial', 'expenses', { month: 4 }]);
    expect(queryKeys.financial.categories({ active: true })).toEqual(['financial', 'categories', { active: true }]);
    expect(queryKeys.financial.forecasts({ quarter: 2 })).toEqual(['financial', 'forecasts', { quarter: 2 }]);
    expect(queryKeys.financial.kpis({ view: 'global' })).toEqual(['financial', 'kpis', { view: 'global' }]);
    expect(queryKeys.financial.budgetStats({ period: 'year' })).toEqual(['financial', 'budgetStats', { period: 'year' }]);
    expect(queryKeys.financial.expenseStats({ period: 'month' })).toEqual(['financial', 'expenseStats', { period: 'month' }]);

    expect(queryKeys.admin.stats()).toEqual(['admin', 'stats']);
    expect(queryKeys.admin.users()).toEqual(['admin', 'users']);
    expect(queryKeys.admin.administrators.list()).toEqual(['admin', 'administrators', 'list']);
    expect(queryKeys.admin.memberStatuses({ category: 'active', isActive: true })).toEqual([
      'admin',
      'memberStatuses',
      { category: 'active', isActive: true },
    ]);

    expect(queryKeys.auth.user()).toEqual(['auth', 'user']);

    expect(queryKeys.tracking.dashboard()).toEqual(['tracking', 'dashboard']);
    expect(queryKeys.tracking.metrics({ page: 1 })).toEqual(['tracking', 'metrics', { page: 1 }]);
    expect(queryKeys.tracking.alerts({ severity: 'high' })).toEqual(['tracking', 'alerts', { severity: 'high' }]);
  });
});
