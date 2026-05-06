import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
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

describe('http-exception.filter iteration112-121', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  it('iteration112: fallback 500/internal message when exception is a primitive string', () => {
    vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const filter = new HttpExceptionFilter();
    const response = createResponse();

    filter.catch('boom', createHost({ method: 'GET', path: '/x', query: {}, body: {} }, response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Internal server error',
      }),
    );
  });

  it('iteration113: user fallback to anonymous when email is empty string', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const filter = new HttpExceptionFilter();
    const response = createResponse();

    filter.catch(
      new HttpException('Forbidden', HttpStatus.FORBIDDEN),
      createHost({ method: 'GET', path: '/x', query: {}, body: {}, user: { email: '' } }, response),
    );

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(metadata.user).toBe('anonymous');
  });

  it('iteration114: sanitization does not mutate original query/body objects', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const filter = new HttpExceptionFilter();
    const response = createResponse();

    const query = { accessToken: 'query-secret', keep: 'safe' };
    const body = { nested: { refreshToken: 'body-secret' }, keep: true };

    filter.catch(new Error('sanitize'), createHost({ method: 'POST', path: '/x', query, body }, response));

    expect(query.accessToken).toBe('query-secret');
    expect(body.nested.refreshToken).toBe('body-secret');

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    const loggedQuery = metadata.query as Record<string, unknown>;
    const loggedBody = metadata.body as { nested: Record<string, unknown> };
    expect(loggedQuery.accessToken).toBe('[REDACTED]');
    expect(loggedBody.nested.refreshToken).toBe('[REDACTED]');
  });

  it('iteration115: sanitization returns new top-level objects in logs', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const filter = new HttpExceptionFilter();
    const response = createResponse();

    const query = { token: 'abc' };
    const body = { secret: 'xyz' };

    filter.catch(new Error('copy'), createHost({ method: 'POST', path: '/x', query, body }, response));

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(metadata.query).not.toBe(query);
    expect(metadata.body).not.toBe(body);
  });

  it('iteration116: sanitization handles arrays while preserving primitive entries', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const filter = new HttpExceptionFilter();
    const response = createResponse();

    const body = [{ token: 't1' }, 'plain', 7, { label: 'ok' }];

    filter.catch(new Error('array'), createHost({ method: 'POST', path: '/x', query: {}, body }, response));

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    const loggedBody = metadata.body as unknown[];
    expect(loggedBody[0]).toEqual({ token: '[REDACTED]' });
    expect(loggedBody[1]).toBe('plain');
    expect(loggedBody[2]).toBe(7);
    expect(loggedBody[3]).toEqual({ label: 'ok' });
  });

  it('iteration117: masks ApiError 500 message in production but keeps error code', () => {
    process.env.NODE_ENV = 'production';
    vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const filter = new HttpExceptionFilter();
    const response = createResponse();

    filter.catch(
      new ApiError(500, 'DB exploded', 'DB_FAILURE'),
      createHost({ method: 'GET', path: '/x', query: {}, body: {} }, response),
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Internal server error',
        code: 'DB_FAILURE',
      }),
    );
  });

  it('iteration118: keeps ApiError 500 message in non-production', () => {
    vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const filter = new HttpExceptionFilter();
    const response = createResponse();

    filter.catch(
      new ApiError(500, 'Detailed dev error', 'DEV_500'),
      createHost({ method: 'GET', path: '/x', query: {}, body: {} }, response),
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Detailed dev error',
        code: 'DEV_500',
      }),
    );
  });

  it('iteration119: calls status/json exactly once and keeps chaining behavior', () => {
    vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const filter = new HttpExceptionFilter();
    const response = createResponse();

    filter.catch(
      new HttpException('Bad request', HttpStatus.BAD_REQUEST),
      createHost({ method: 'PATCH', path: '/x', query: {}, body: {} }, response),
    );

    expect(response.status).toHaveBeenCalledTimes(1);
    expect(response.json).toHaveBeenCalledTimes(1);
  });

  it('iteration120: logs an ISO timestamp string', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const filter = new HttpExceptionFilter();
    const response = createResponse();

    filter.catch(new Error('time check'), createHost({ method: 'GET', path: '/x', query: {}, body: {} }, response));

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    const timestamp = metadata.timestamp;
    expect(typeof timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(timestamp as string))).toBe(false);
    expect((timestamp as string).includes('T')).toBe(true);
  });

  it('iteration121: uses same errorId in log metadata and HTTP response payload', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const filter = new HttpExceptionFilter();
    const response = createResponse();

    filter.catch(new Error('id check'), createHost({ method: 'GET', path: '/x', query: {}, body: {} }, response));

    const metadata = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    const payload = response.json.mock.calls[0]?.[0] as Record<string, unknown>;

    expect(typeof metadata.errorId).toBe('string');
    expect(metadata.errorId).toBe(payload.errorId);
  });
});
