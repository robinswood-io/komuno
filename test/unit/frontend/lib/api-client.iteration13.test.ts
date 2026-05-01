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

function firstCall(): [RequestInfo | URL, RequestInit | undefined] {
  const call = mockFetch.mock.calls[0];
  return [call[0], call[1]];
}

describe('lib/api/client iteration13', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('n’ajoute pas de "?" quand params existe mais que toutes les valeurs sont filtrées', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '{"success":true}',
    });

    const nullValue = null as unknown as string | number | boolean | undefined;

    await api.get<{ success: boolean }>('/api/filter-empty', {
      search: '',
      ignoredUndefined: undefined,
      ignoredNull: nullValue,
    });

    const [url, options] = firstCall();
    expect(url).toBe('/api/filter-empty');
    expect(options?.method).toBe('GET');
  });

  it('propage l’erreur de text() quand json() et text() échouent sur une réponse HTTP KO', async () => {
    const textFailure = new Error('text read failed');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => {
        throw new Error('json read failed');
      },
      text: async () => {
        throw textFailure;
      },
    });

    await expect(api.get('/api/fallback-failure')).rejects.toBe(textFailure);
  });

  it('put sérialise le body quand la donnée est truthy', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '{"ok":true}',
    });

    await api.put<{ ok: boolean }>('/api/resource/put', {
      status: 'active',
      count: 2,
    });

    const [, options] = firstCall();
    expect(options?.method).toBe('PUT');
    expect(options?.body).toBe(JSON.stringify({ status: 'active', count: 2 }));
    expect(options?.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('retourne ApiError avec data objet sans message en utilisant statusText', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ reason: 'duplicate' }),
      text: async () => '{"reason":"duplicate"}',
    });

    let captured: unknown;
    try {
      await api.post('/api/conflict-object', { id: 'x-1' });
    } catch (error: unknown) {
      captured = error;
    }

    expect(captured).toBeInstanceOf(ApiError);
    const apiError = captured as ApiError;
    expect(apiError.message).toBe('Conflict');
    expect(apiError.status).toBe(409);
    expect(apiError.data).toEqual({ reason: 'duplicate' });
  });

  it('ApiError conserve message/status/data passés au constructeur', () => {
    const payload = { field: 'email', issue: 'invalid' };
    const error = new ApiError('Validation failed', 422, payload);

    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Validation failed');
    expect(error.status).toBe(422);
    expect(error.data).toEqual(payload);
  });
});
