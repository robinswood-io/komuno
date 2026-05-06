import { ArgumentsHost } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpExceptionFilter } from '../../../server/src/common/filters/http-exception.filter';
import { logger } from '../../../server/lib/logger';
import { ApiError } from '../../../shared/errors';

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
  const response: ResponseShape = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
};

const createHost = (request: RequestShape, response: ResponseShape): ArgumentsHost => {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as unknown as ArgumentsHost;
};

describe('http-exception.filter iteration 92', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  it('retourne status/code/message pour ApiError avec code', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const filter = new HttpExceptionFilter();
    const response = createResponse();
    const request: RequestShape = {
      method: 'POST',
      path: '/api/tasks',
      query: {},
      body: { title: 'task' },
      user: { email: 'owner@example.com' },
    };

    filter.catch(new ApiError(422, 'Validation failed', 'VALIDATION_FAILED'), createHost(request, response));

    expect(response.status).toHaveBeenCalledWith(422);

    const payload = response.json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_FAILED',
    });
    expect(typeof payload.errorId).toBe('string');

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(metadata.statusCode).toBe(422);
    expect(metadata.errorName).toBe('ApiError');
    expect(metadata.message).toBe('Validation failed');
  });
});
