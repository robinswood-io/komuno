import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
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

describe('http-exception.filter iteration 98', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  it('redacte les champs sensibles top-level avec variantes de clé', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);

    const filter = new HttpExceptionFilter();
    const response = createResponse();
    const request: RequestShape = {
      method: 'POST',
      path: '/api/auth',
      query: {
        access_token: 'query-token',
        bearerToken: 'bearer-value',
        search: 'hello',
      },
      body: {
        pass_word: 'secret-password',
        'api-key': 'api-secret',
        'session.id': 'session-secret',
        note: 'safe-value',
      },
    };

    filter.catch(new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED), createHost(request, response));

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    const loggedQuery = metadata.query as Record<string, unknown>;
    const loggedBody = metadata.body as Record<string, unknown>;

    expect(loggedQuery.access_token).toBe('[REDACTED]');
    expect(loggedQuery.bearerToken).toBe('[REDACTED]');
    expect(loggedQuery.search).toBe('hello');

    expect(loggedBody.pass_word).toBe('[REDACTED]');
    expect(loggedBody['api-key']).toBe('[REDACTED]');
    expect(loggedBody['session.id']).toBe('[REDACTED]');
    expect(loggedBody.note).toBe('safe-value');
  });
});
