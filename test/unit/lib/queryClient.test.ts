import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiRequest,
  getQueryFn,
  invalidateAndRefetch,
  queryClient,
} from '@/lib/queryClient';

const mockFetch = vi.fn();

describe('lib/queryClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('apiRequest returns response on success', async () => {
    const response = {
      ok: true,
      statusText: 'OK',
      text: async () => '',
    } as unknown as Response;
    mockFetch.mockResolvedValueOnce(response);

    const result = await apiRequest('POST', '/api/auth/login', { email: 'a@b.c' });

    expect(result).toBe(response);
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.credentials).toBe('include');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(options.body).toBe(JSON.stringify({ email: 'a@b.c' }));
  });

  it('apiRequest throws formatted error on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'Access denied',
    });

    await expect(apiRequest('GET', '/api/admin')).rejects.toThrow('403: Access denied');
  });

  it('getQueryFn returns null on 401 when configured with returnNull', async () => {
    const queryFn = getQueryFn<{ id: string } | null>({ on401: 'returnNull' });
    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false,
      text: async () => '',
    });

    const result = await queryFn({ queryKey: ['/api/auth/user'] } as { queryKey: string[] });
    expect(result).toBeNull();
  });

  it('getQueryFn unwraps backend envelope data on success', async () => {
    const queryFn = getQueryFn<{ id: string }>({ on401: 'throw' });
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      text: async () => '',
      json: async () => ({ success: true, data: { id: 'u-1' } }),
    });

    const result = await queryFn({ queryKey: ['/api/auth/user'] } as { queryKey: string[] });
    expect(result).toEqual({ id: 'u-1' });
  });

  it('queryClient exposes retries config for queries and mutations', () => {
    const defaults = queryClient.getDefaultOptions();

    expect(defaults.queries?.retry).toBe(2);
    expect(defaults.mutations?.retry).toBe(1);

    const retryDelay = defaults.queries?.retryDelay;
    expect(typeof retryDelay).toBe('function');

    if (typeof retryDelay === 'function') {
      expect(retryDelay(0)).toBe(1000);
      expect(retryDelay(2)).toBe(4000);
      expect(retryDelay(10)).toBe(30000);
    }
  });

  it('invalidateAndRefetch invalidates then refetches target query key', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    const refetchSpy = vi.spyOn(queryClient, 'refetchQueries').mockResolvedValue(undefined);

    invalidateAndRefetch(['/api/loan-items']);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['/api/loan-items'] });
    expect(refetchSpy).toHaveBeenCalledWith({ queryKey: ['/api/loan-items'] });
  });
});
