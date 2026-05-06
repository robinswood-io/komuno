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

describe('http-exception.filter iteration 95', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  it('ne masque pas un HttpException non-500 en production', () => {
    process.env.NODE_ENV = 'production';
    vi.spyOn(logger, 'error').mockImplementation(() => logger);

    const filter = new HttpExceptionFilter();
    const response = createResponse();
    const request: RequestShape = { method: 'PATCH', path: '/api/tasks/1', query: {}, body: {} };

    filter.catch(new HttpException('Invalid payload', HttpStatus.BAD_REQUEST), createHost(request, response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);

    const payload = response.json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.message).toBe('Invalid payload');
    expect(payload.success).toBe(false);
  });
});
