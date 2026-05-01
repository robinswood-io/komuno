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

function setSuccessfulResponse(payloadText: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: async () => payloadText,
  });
}

function firstCall(): [RequestInfo | URL, RequestInit | undefined] {
  const call = mockFetch.mock.calls[0];
  return [call[0], call[1]];
}

describe('lib/api/client iteration10', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('n’ajoute pas de query string quand params est absent', async () => {
    setSuccessfulResponse('{"ok":true}');

    await api.get<{ ok: boolean }>('/api/no-params');

    const [url, options] = firstCall();
    expect(url).toBe('/api/no-params');
    expect(options?.method).toBe('GET');
    expect(options?.credentials).toBe('include');
  });

  it('parse un JSON primitif en réponse succès', async () => {
    setSuccessfulResponse('42');

    const value = await api.get<number>('/api/primitive');

    expect(value).toBe(42);
  });

  it('retourne statusText si message JSON est une chaîne vide', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ message: '' }),
      text: async () => '{"message":""}',
    });

    let captured: unknown;
    try {
      await api.get('/api/conflict');
    } catch (error: unknown) {
      captured = error;
    }

    expect(captured).toBeInstanceOf(ApiError);
    const apiError = captured as ApiError;
    expect(apiError.message).toBe('Conflict');
    expect(apiError.status).toBe(409);
    expect(apiError.data).toEqual({ message: '' });
  });

  it('retourne statusText si json échoue et text est vide', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: async () => {
        throw new Error('invalid-json');
      },
      text: async () => '',
    });

    await expect(api.get('/api/down')).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        message: 'Service Unavailable',
        status: 503,
        data: '',
      }),
    );
  });

  it('post ignore un payload numérique falsy (body undefined)', async () => {
    setSuccessfulResponse('{"ok":true}');

    await api.post<{ ok: boolean }>('/api/post-falsy', 0);

    const [, options] = firstCall();
    expect(options?.method).toBe('POST');
    expect(options?.body).toBeUndefined();
  });

  it('put ignore un payload booléen falsy (body undefined)', async () => {
    setSuccessfulResponse('{"ok":true}');

    await api.put<{ ok: boolean }>('/api/put-falsy', false);

    const [, options] = firstCall();
    expect(options?.method).toBe('PUT');
    expect(options?.body).toBeUndefined();
  });

  it('patch ignore un payload string vide (body undefined)', async () => {
    setSuccessfulResponse('{"ok":true}');

    await api.patch<{ ok: boolean }>('/api/patch-falsy', '');

    const [, options] = firstCall();
    expect(options?.method).toBe('PATCH');
    expect(options?.body).toBeUndefined();
  });
});
