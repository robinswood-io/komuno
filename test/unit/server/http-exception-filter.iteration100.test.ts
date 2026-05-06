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

describe('http-exception.filter iteration 100', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  it('conserve les valeurs primitives/null dans les logs', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);

    const filter = new HttpExceptionFilter();
    const response = createResponse();
    const request: RequestShape = {
      method: 'GET',
      path: '/api/raw',
      query: 'page=1&limit=10',
      body: null,
    };

    filter.catch(new Error('primitive branches'), createHost(request, response));

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(metadata.query).toBe('page=1&limit=10');
    expect(metadata.body).toBeNull();
  });
});
