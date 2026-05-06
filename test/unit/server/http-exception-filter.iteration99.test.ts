import { ArgumentsHost } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from '../../../server/src/common/filters/http-exception.filter';
import { logger } from '../../../server/lib/logger';

type RequestShape = {
  method: string;
  path: string;
  query: unknown;
  body: unknown;
};

type ResponseShape = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

const createResponse = (): ResponseShape => {
  const response: ResponseShape = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
};

const createHost = (request: RequestShape, response: ResponseShape): ArgumentsHost => {
  return {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response, getNext: () => undefined }),
  } as unknown as ArgumentsHost;
};

describe('http-exception.filter iteration 99', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  it('redacte récursivement objets imbriqués et tableaux', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);

    const filter = new HttpExceptionFilter();
    const response = createResponse();
    const request: RequestShape = {
      method: 'POST',
      path: '/api/upload',
      query: [{ passwordHash: 'hash-value' }, { page: 2 }],
      body: {
        nested: {
          refreshToken: 'refresh-secret',
          profile: {
            secretValue: 'secret-value',
          },
        },
        items: [{ token: 'token-1' }, { label: 'ok' }],
      },
    };

    filter.catch(new Error('boom'), createHost(request, response));

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    const loggedQuery = metadata.query as Array<Record<string, unknown>>;
    const loggedBody = metadata.body as {
      nested: { refreshToken: string; profile: { secretValue: string } };
      items: Array<Record<string, unknown>>;
    };

    expect(loggedQuery[0]?.passwordHash).toBe('[REDACTED]');
    expect(loggedQuery[1]?.page).toBe(2);
    expect(loggedBody.nested.refreshToken).toBe('[REDACTED]');
    expect(loggedBody.nested.profile.secretValue).toBe('[REDACTED]');
    expect(loggedBody.items[0]?.token).toBe('[REDACTED]');
    expect(loggedBody.items[1]?.label).toBe('ok');
  });
});
