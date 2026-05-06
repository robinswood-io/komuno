import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../../../shared/errors';
import { HttpExceptionFilter } from './http-exception.filter';

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock('../../../lib/logger', () => ({
  logger: loggerMocks,
}));

vi.mock('nanoid', () => ({
  nanoid: () => 'iter-error-id',
}));

type MockRequest = {
  method: string;
  path: string;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
  user?: { email: string };
};

type MockResponse = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

function createResponse(): MockResponse {
  const response: MockResponse = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

function createArgumentsHost(request: MockRequest, response: MockResponse): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as unknown as ArgumentsHost;
}

function getLoggerPayload(): Record<string, unknown> {
  const payload = loggerMocks.error.mock.calls[0]?.[1];
  return (payload ?? {}) as Record<string, unknown>;
}

describe('HttpExceptionFilter iteration102-111', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NODE_ENV;
  });

  it('iteration102: returns ApiError status and code in non-production', () => {
    const filter = new HttpExceptionFilter();
    const req: MockRequest = { method: 'GET', path: '/api/x', query: {}, body: {} };
    const res = createResponse();
    const host = createArgumentsHost(req, res);

    filter.catch(new ApiError(422, 'Invalid domain state', 'DOMAIN_INVALID'), host);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid domain state',
      errorId: 'iter-error-id',
      code: 'DOMAIN_INVALID',
    });
  });

  it('iteration103: masks ApiError 500 message in production while keeping code', () => {
    process.env.NODE_ENV = 'production';

    const filter = new HttpExceptionFilter();
    const req: MockRequest = { method: 'POST', path: '/api/y', query: {}, body: {} };
    const res = createResponse();
    const host = createArgumentsHost(req, res);

    filter.catch(new ApiError(500, 'Sensitive DB error', 'DB_FAILURE'), host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
      errorId: 'iter-error-id',
      code: 'DB_FAILURE',
    });
  });

  it('iteration104: masks HttpException 500 message in production', () => {
    process.env.NODE_ENV = 'production';

    const filter = new HttpExceptionFilter();
    const req: MockRequest = { method: 'PUT', path: '/api/z', query: {}, body: {} };
    const res = createResponse();
    const host = createArgumentsHost(req, res);

    filter.catch(new HttpException('Low-level SQL details', HttpStatus.INTERNAL_SERVER_ERROR), host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
      errorId: 'iter-error-id',
    });
  });

  it('iteration105: handles non-Error exception values with fallback message and unknown errorName', () => {
    const filter = new HttpExceptionFilter();
    const req: MockRequest = { method: 'DELETE', path: '/api/value', query: {}, body: {} };
    const res = createResponse();
    const host = createArgumentsHost(req, res);

    filter.catch(12345, host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
      errorId: 'iter-error-id',
    });

    const payload = getLoggerPayload();
    expect(payload.errorName).toBe('Unknown');
    expect(payload.stack).toBeUndefined();
  });

  it('iteration106: keeps HttpException 500 message outside production', () => {
    const filter = new HttpExceptionFilter();
    const req: MockRequest = { method: 'PATCH', path: '/api/plain', query: {}, body: {} };
    const res = createResponse();
    const host = createArgumentsHost(req, res);

    filter.catch(new HttpException('Readable debug message', HttpStatus.INTERNAL_SERVER_ERROR), host);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Readable debug message',
      errorId: 'iter-error-id',
    });
  });

  it('iteration107: redacts top-level sensitive fields in query and body logs', () => {
    const filter = new HttpExceptionFilter();
    const req: MockRequest = {
      method: 'POST',
      path: '/api/sanitize',
      query: { token: 'abc', page: '1' },
      body: { password: 'secret', title: 'safe' },
      user: { email: 'owner@example.com' },
    };
    const res = createResponse();
    const host = createArgumentsHost(req, res);

    filter.catch(new Error('Boom'), host);

    const payload = getLoggerPayload();
    expect(payload.query).toEqual({ token: '[REDACTED]', page: '1' });
    expect(payload.body).toEqual({ password: '[REDACTED]', title: 'safe' });
  });

  it('iteration108: redacts nested and array sensitive fields with normalized keys', () => {
    const filter = new HttpExceptionFilter();
    const req: MockRequest = {
      method: 'POST',
      path: '/api/nested',
      query: {
        nested: { 'access-token': 'a', keep: 'ok' },
      },
      body: {
        items: [
          { session_id: 'sid-1', value: 1 },
          { bearerToken: 'bt-1', value: 2 },
        ],
      },
    };
    const res = createResponse();
    const host = createArgumentsHost(req, res);

    filter.catch(new Error('Nested error'), host);

    const payload = getLoggerPayload();
    expect(payload.query).toEqual({ nested: { 'access-token': '[REDACTED]', keep: 'ok' } });
    expect(payload.body).toEqual({
      items: [
        { session_id: '[REDACTED]', value: 1 },
        { bearerToken: '[REDACTED]', value: 2 },
      ],
    });
  });

  it('iteration109: preserves non-object query/body values without transformation', () => {
    const filter = new HttpExceptionFilter();
    const req: MockRequest = {
      method: 'GET',
      path: '/api/primitive',
      query: 'q' as unknown as Record<string, unknown>,
      body: 0 as unknown as Record<string, unknown>,
    };
    const res = createResponse();
    const host = createArgumentsHost(req, res);

    filter.catch(new Error('Primitive fields'), host);

    const payload = getLoggerPayload();
    expect(payload.query).toBe('q');
    expect(payload.body).toBe(0);
  });

  it('iteration110: logs anonymous user when request user is missing', () => {
    const filter = new HttpExceptionFilter();
    const req: MockRequest = { method: 'GET', path: '/api/no-user', query: {}, body: {} };
    const res = createResponse();
    const host = createArgumentsHost(req, res);

    filter.catch(new Error('No user'), host);

    const payload = getLoggerPayload();
    expect(payload.user).toBe('anonymous');
  });

  it('iteration111: logs request metadata and status code for ApiError without code', () => {
    const filter = new HttpExceptionFilter();
    const req: MockRequest = {
      method: 'POST',
      path: '/api/meta',
      query: { q: '1' },
      body: { a: 'b' },
      user: { email: 'meta@example.com' },
    };
    const res = createResponse();
    const host = createArgumentsHost(req, res);

    filter.catch(new ApiError(409, 'Conflict happened'), host);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Conflict happened',
      errorId: 'iter-error-id',
    });

    const payload = getLoggerPayload();
    expect(payload.method).toBe('POST');
    expect(payload.path).toBe('/api/meta');
    expect(payload.statusCode).toBe(409);
    expect(typeof payload.timestamp).toBe('string');
  });
});
