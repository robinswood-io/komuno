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

describe('http-exception.filter iteration 93', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  it('n’ajoute pas le champ code quand ApiError.code est absent', () => {
    vi.spyOn(logger, 'error').mockImplementation(() => logger);

    const filter = new HttpExceptionFilter();
    const response = createResponse();
    const request: RequestShape = { method: 'PUT', path: '/api/tasks/1', query: {}, body: {} };

    filter.catch(new ApiError(409, 'Conflict'), createHost(request, response));

    expect(response.status).toHaveBeenCalledWith(409);

    const payload = response.json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ success: false, message: 'Conflict' });
    expect(payload).not.toHaveProperty('code');
    expect(typeof payload.errorId).toBe('string');
  });
});
