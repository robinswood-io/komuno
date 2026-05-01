import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '@/lib/api/client';

interface MockResponse {
  ok: boolean;
  status?: number;
  statusText?: string;
  text: () => Promise<string>;
  json?: () => Promise<unknown>;
}

const mockFetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<MockResponse>>();

function mockSuccessJson(payload: unknown): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: async () => JSON.stringify(payload),
  });
}

function getFirstFetchCall(): [RequestInfo | URL, RequestInit | undefined] {
  const firstCall = mockFetch.mock.calls[0];
  return [firstCall[0], firstCall[1]];
}

describe('lib/api/client iteration8', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('inclut les paramètres false et 0 dans la query string', async () => {
    mockSuccessJson({ success: true });

    await api.get<{ success: boolean }>('/api/search', {
      active: false,
      page: 0,
      q: '',
    });

    const [url] = getFirstFetchCall();
    expect(url).toBe('/api/search?active=false&page=0');
  });

  it('utilise PUT avec body undefined quand aucune donnée n’est fournie', async () => {
    mockSuccessJson({ ok: true });

    await api.put<{ ok: boolean }>('/api/resource/1');

    const [, options] = getFirstFetchCall();
    expect(options?.method).toBe('PUT');
    expect(options?.body).toBeUndefined();
    expect(options?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(options?.credentials).toBe('include');
  });

  it('utilise PATCH avec body JSON quand des données sont fournies', async () => {
    mockSuccessJson({ ok: true });

    await api.patch<{ ok: boolean }>('/api/resource/1', { status: 'inactive' });

    const [, options] = getFirstFetchCall();
    expect(options?.method).toBe('PATCH');
    expect(options?.body).toBe(JSON.stringify({ status: 'inactive' }));
    expect(options?.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('utilise DELETE sans body', async () => {
    mockSuccessJson({ deleted: true });

    await api.delete<{ deleted: boolean }>('/api/resource/1');

    const [, options] = getFirstFetchCall();
    expect(options?.method).toBe('DELETE');
    expect(options?.body).toBeUndefined();
  });

  it('utilise POST sans body quand data est absente', async () => {
    mockSuccessJson({ created: true });

    await api.post<{ created: boolean }>('/api/resource');

    const [, options] = getFirstFetchCall();
    expect(options?.method).toBe('POST');
    expect(options?.body).toBeUndefined();
  });

  it('retourne statusText quand la réponse d’erreur est un JSON scalaire', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => 'gateway-down',
      text: async () => 'gateway-down',
    });

    let capturedError: unknown;
    try {
      await api.get('/api/failure');
    } catch (error: unknown) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(ApiError);

    const apiError = capturedError as ApiError;
    expect(apiError.message).toBe('Bad Gateway');
    expect(apiError.status).toBe(502);
    expect(apiError.data).toBe('gateway-down');
    expect(apiError.name).toBe('ApiError');
  });
});
