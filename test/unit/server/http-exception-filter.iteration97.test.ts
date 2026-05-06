import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from '../../../server/src/common/filters/http-exception.filter';
import { logger } from '../../../server/lib/logger';

type RequestShape = {
  method: string;
  path: string;
  query: unknown;
  body: unknown;
  user?: { email?: string };
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

describe('http-exception.filter iteration 97', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  it('loggue anonymous quand request.user est absent', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);

    const filter = new HttpExceptionFilter();
    const response = createResponse();
    const request: RequestShape = {
      method: 'DELETE',
      path: '/api/tasks/1',
      query: {},
      body: {},
    };

    filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), createHost(request, response));

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(metadata.user).toBe('anonymous');
  });
});
