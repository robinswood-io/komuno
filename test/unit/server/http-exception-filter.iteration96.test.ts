import { ArgumentsHost, HttpStatus } from '@nestjs/common';
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

describe('http-exception.filter iteration 96', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  it('gère une exception non Error/non HttpException avec fallback 500', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);

    const filter = new HttpExceptionFilter();
    const response = createResponse();
    const request: RequestShape = { method: 'GET', path: '/api/unknown', query: {}, body: {} };

    filter.catch({ type: 'mystery' }, createHost(request, response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);

    const payload = response.json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      success: false,
      message: 'Internal server error',
    });

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(metadata.errorName).toBe('Unknown');
    expect(metadata.stack).toBeUndefined();
  });
});
