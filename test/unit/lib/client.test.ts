import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '@/lib/api/client';

const mockFetch = vi.fn();

describe('lib/api/client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('builds GET query params and filters empty values', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ success: true }),
    });

    const result = await api.get<{ success: boolean }>('/api/items', {
      page: 2,
      limit: 10,
      search: '',
      active: true,
      ignored: undefined,
    });

    expect(result).toEqual({ success: true });
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/items?page=2&limit=10&active=true');
    expect(options.credentials).toBe('include');
  });

  it('returns empty object for empty response payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    });

    const result = await api.delete<Record<string, never>>('/api/items/1');
    expect(result).toEqual({});
  });

  it('throws ApiError with json message when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ message: 'Validation failed' }),
    });

    await expect(api.post('/api/items', { label: 'X' })).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Validation failed',
      status: 400,
    });
  });

  it('throws ApiError with statusText fallback when json parsing fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => {
        throw new Error('Invalid JSON');
      },
      text: async () => 'Raw internal error',
    });

    await expect(api.get('/api/fail')).rejects.toEqual(
      expect.objectContaining<ApiError>({
        message: 'Server Error',
        status: 500,
        data: 'Raw internal error',
      })
    );
  });

  it('throws ApiError with statusText when json payload has no message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: async () => ({ errors: ['invalid'] }),
    });

    await expect(api.post('/api/items', { label: '' })).rejects.toEqual(
      expect.objectContaining<ApiError>({
        message: 'Unprocessable Entity',
        status: 422,
        data: { errors: ['invalid'] },
      })
    );
  });

  it('throws ApiError with statusText when json payload is null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => null,
    });

    await expect(api.get('/api/missing')).rejects.toEqual(
      expect.objectContaining<ApiError>({
        message: 'Not Found',
        status: 404,
        data: null,
      })
    );
  });

  it('propagates fetch/network errors before receiving an HTTP response', async () => {
    const networkError = new Error('Network unavailable');
    mockFetch.mockRejectedValueOnce(networkError);

    await expect(api.get('/api/items')).rejects.toBe(networkError);
  });

  it('throws when successful response body is invalid JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '{invalid-json',
    });

    await expect(api.get('/api/items')).rejects.toBeInstanceOf(SyntaxError);
  });

  it('sends JSON content-type and body on post', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: '42' }),
    });

    await api.post('/api/items', { label: 'Created' });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(options.body).toBe(JSON.stringify({ label: 'Created' }));
  });
});
