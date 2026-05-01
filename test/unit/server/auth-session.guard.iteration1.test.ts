import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';

vi.mock('../../../server/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { JwtAuthGuard } from '../../../server/src/auth/guards/auth.guard';
import { logger } from '../../../server/lib/logger';

type GuardRequest = {
  headers: Record<string, string | undefined>;
  method: string;
  url: string;
  user?: { id?: string; email?: string } | undefined;
  isAuthenticated?: (() => boolean) | unknown;
  session?: {
    id?: string | number;
  };
};

type LoggerMock = {
  debug: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

function createExecutionContext(request: GuardRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    switchToRpc: () => ({
      getContext: () => undefined,
      getData: () => undefined,
    }),
    switchToWs: () => ({
      getClient: () => undefined,
      getData: () => undefined,
      getPattern: () => undefined,
    }),
    getClass: () => class TestClass {},
    getHandler: () => () => undefined,
    getArgs: () => [request],
    getArgByIndex: () => request,
    getType: () => 'http',
  } as unknown as ExecutionContext;
}

function createRequest(overrides: Partial<GuardRequest> = {}): GuardRequest {
  return {
    headers: {},
    method: 'GET',
    url: '/auth/check',
    user: undefined,
    isAuthenticated: () => false,
    session: undefined,
    ...overrides,
  };
}

function getLoggerMock(): LoggerMock {
  return logger as unknown as LoggerMock;
}

describe('auth session guard iteration 1 (JwtAuthGuard)', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
    vi.clearAllMocks();
  });

  it('allows request when isAuthenticated returns true', () => {
    const request = createRequest({
      isAuthenticated: () => true,
      user: undefined,
      session: { id: 'session-abcdef' },
      headers: { cookie: 'sid=abc' },
    });

    const result = guard.canActivate(createExecutionContext(request));

    expect(result).toBe(true);
    expect(getLoggerMock().debug).toHaveBeenCalledWith(
      '[AuthGuard] Request check',
      expect.objectContaining({
        isAuthenticated: true,
        hasUser: false,
        hasSession: true,
        hasCookie: true,
      }),
    );
  });

  it('allows request when user is present even if isAuthenticated is false', () => {
    const request = createRequest({
      isAuthenticated: () => false,
      user: { id: 'u-1', email: 'u1@example.com' },
      session: undefined,
    });

    const result = guard.canActivate(createExecutionContext(request));

    expect(result).toBe(true);
    expect(getLoggerMock().warn).not.toHaveBeenCalled();
  });

  it('denies request with UnauthorizedException when neither user nor auth flag exists', () => {
    const request = createRequest({
      isAuthenticated: () => false,
      user: undefined,
      session: undefined,
      headers: {},
    });

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(createExecutionContext(request))).toThrow('Authentication required');
    expect(getLoggerMock().warn).toHaveBeenCalledWith(
      '[AuthGuard] Rejected - not authenticated',
      expect.objectContaining({
        method: 'GET',
        url: '/auth/check',
        hasSession: false,
        hasCookie: false,
        sessionId: 'none',
      }),
    );
  });

  it('propagates internal error thrown by isAuthenticated callback', () => {
    const request = createRequest({
      isAuthenticated: () => {
        throw new Error('session store unavailable');
      },
      user: undefined,
    });

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow('session store unavailable');
  });

  it('throws when session id is malformed (non-string id without substring)', () => {
    const request = createRequest({
      isAuthenticated: () => false,
      user: undefined,
      session: { id: 12345 },
      headers: { cookie: 'sid=broken' },
    });

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow();
  });
});
