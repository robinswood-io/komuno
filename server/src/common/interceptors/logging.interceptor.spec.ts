import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoggingInterceptor } from './logging.interceptor';

const loggerMocks = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../../../lib/logger', () => ({
  logger: loggerMocks,
}));

type MockRequest = {
  method: string;
  path: string;
};

type MockResponse = {
  statusCode: number;
};

const createExecutionContext = (
  request: MockRequest,
  response: MockResponse,
): ExecutionContext => {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
};

describe('LoggingInterceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('returns handler result and calls call handler on success', async () => {
    const interceptor = new LoggingInterceptor();
    const request: MockRequest = { method: 'GET', path: '/health' };
    const response: MockResponse = { statusCode: 200 };
    const context = createExecutionContext(request, response);

    const payload = { ok: true };
    const handleSpy = vi.fn(() => of(payload));
    const next: CallHandler = { handle: handleSpy };

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual(payload);
    expect(handleSpy).toHaveBeenCalledTimes(1);
    expect(loggerMocks.info).not.toHaveBeenCalled();
  });

  it('logs successful API requests and redacts sensitive values', async () => {
    const interceptor = new LoggingInterceptor();
    const request: MockRequest = { method: 'POST', path: '/api/x' };
    const response: MockResponse = { statusCode: 201 };
    const context = createExecutionContext(request, response);

    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1034);

    const payload = { token: 'jwt-secret' };
    const next: CallHandler = { handle: () => of(payload) };

    await firstValueFrom(interceptor.intercept(context, next));

    expect(loggerMocks.info).toHaveBeenCalledTimes(1);

    const loggedMessage = loggerMocks.info.mock.calls[0]?.[0];
    expect(typeof loggedMessage).toBe('string');
    expect(loggedMessage).toContain('POST /api/x 201 in 34ms');
    expect(loggedMessage).toContain('[REDACTED]');
    expect(loggedMessage).not.toContain('top-secret');
    expect(loggedMessage).not.toContain('jwt-secret');
  });

  it('propagates errors and logs them with context', async () => {
    const interceptor = new LoggingInterceptor();
    const request: MockRequest = { method: 'PATCH', path: '/api/members/42' };
    const response: MockResponse = { statusCode: 500 };
    const context = createExecutionContext(request, response);

    vi.spyOn(Date, 'now').mockReturnValueOnce(2000).mockReturnValueOnce(2061);

    const boom = new Error('boom');
    const next: CallHandler = {
      handle: () => throwError(() => boom),
    };

    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toBe(boom);

    expect(loggerMocks.error).toHaveBeenCalledTimes(1);

    const errorMessage = loggerMocks.error.mock.calls[0]?.[0];
    const errorMeta = loggerMocks.error.mock.calls[0]?.[1];

    expect(errorMessage).toContain('[API] PATCH /api/members/42 - Error in 61ms');
    expect(errorMeta).toEqual({ error: boom });
  });

  it('logs API request without payload when handler emits null', async () => {
    const interceptor = new LoggingInterceptor();
    const request: MockRequest = { method: 'GET', path: '/api/no-data' };
    const response: MockResponse = { statusCode: 204 };
    const context = createExecutionContext(request, response);

    vi.spyOn(Date, 'now').mockReturnValueOnce(3000).mockReturnValueOnce(3008);

    const next: CallHandler = { handle: () => of(null) };

    await firstValueFrom(interceptor.intercept(context, next));

    expect(loggerMocks.info).toHaveBeenCalledTimes(1);
    const loggedMessage = loggerMocks.info.mock.calls[0]?.[0];
    expect(loggedMessage).toContain('GET /api/no-data 204 in 8ms');
    expect(loggedMessage).not.toContain('::');
  });

  it('sanitizes nested array/object secrets and truncates long log lines', async () => {
    const interceptor = new LoggingInterceptor();
    const request: MockRequest = { method: 'POST', path: '/api/truncation-check' };
    const response: MockResponse = { statusCode: 200 };
    const context = createExecutionContext(request, response);

    vi.spyOn(Date, 'now').mockReturnValueOnce(4000).mockReturnValueOnce(4042);

    const payload = {
      access_token: 'should-not-leak',
      nested: [{ profile: { 'bearer-token': 'hide-me' } }],
      description: 'x'.repeat(250),
    };

    const next: CallHandler = { handle: () => of(payload) };

    await firstValueFrom(interceptor.intercept(context, next));

    expect(loggerMocks.info).toHaveBeenCalledTimes(1);
    const loggedMessage = loggerMocks.info.mock.calls[0]?.[0] as string;
    expect(loggedMessage).toContain('[REDACTED]');
    expect(loggedMessage).not.toContain('should-not-leak');
    expect(loggedMessage).not.toContain('hide-me');
    expect(loggedMessage.endsWith('…')).toBe(true);
    expect(loggedMessage.length).toBe(80);
  });
});
