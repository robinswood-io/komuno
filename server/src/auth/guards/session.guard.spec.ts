import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request } from 'express';
import { JwtAuthGuard } from './auth.guard';
import { logger } from '../../../lib/logger';

vi.mock('../../../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

type GuardRequest = Pick<Request, 'headers' | 'method' | 'url' | 'user' | 'isAuthenticated'> & {
  isAuthenticated?: Request['isAuthenticated'];
  session?: {
    id?: string;
  };
};

function createExecutionContext(request: Request): ExecutionContext {
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

function createRequest(overrides: Partial<GuardRequest> = {}): Request {
  const baseRequest: GuardRequest = {
    headers: {},
    method: 'GET',
    url: '/test',
    user: undefined,
    isAuthenticated: () => false,
    session: undefined,
  };

  return {
    ...baseRequest,
    ...overrides,
  } as unknown as Request;
}

describe('Session guard behavior (JwtAuthGuard)', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
    vi.clearAllMocks();
  });

  it('autorise quand la session est absente mais l’utilisateur est authentifié', () => {
    const request = createRequest({
      session: undefined,
      isAuthenticated: () => true,
      user: undefined,
    });

    const context = createExecutionContext(request);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('trace un sessionId tronqué et hasCookie=true dans le log debug', () => {
    const request = createRequest({
      user: { id: 'u-3', email: 'cookie@example.com' },
      isAuthenticated: () => false,
      headers: { cookie: 'sid=abc123' },
      session: { id: '1234567890abcdef' },
    });

    const context = createExecutionContext(request);

    expect(guard.canActivate(context)).toBe(true);

    expect(logger.debug).toHaveBeenCalledWith('[AuthGuard] Request check', {
      method: 'GET',
      url: '/test',
      isAuthenticated: false,
      hasUser: true,
      hasSession: true,
      sessionId: '12345678',
      hasCookie: true,
    });
  });

  it('rejette quand l’utilisateur est absent et non authentifié', () => {
    const request = createRequest({
      user: undefined,
      isAuthenticated: () => false,
    });

    const context = createExecutionContext(request);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(logger.warn).toHaveBeenCalledWith(
      '[AuthGuard] Rejected - not authenticated',
      expect.objectContaining({
        method: 'GET',
        url: '/test',
        hasSession: false,
        hasCookie: false,
        sessionId: 'none',
      }),
    );
  });

  it('autorise quand un user valide est présent', () => {
    const request = createRequest({
      user: { id: 'u-1', email: 'user@example.com' },
      isAuthenticated: () => false,
      session: { id: 'session-123' },
    });

    const context = createExecutionContext(request);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('autorise quand isAuthenticated est absent mais user présent', () => {
    const request = createRequest({
      user: { id: 'u-2', email: 'fallback@example.com' },
      isAuthenticated: undefined,
      session: { id: 'session-fallback' },
    });

    const context = createExecutionContext(request);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejette quand isAuthenticated existe mais n’est pas une fonction', () => {
    const request = createRequest({
      user: undefined,
      session: { id: '' },
      headers: { cookie: '' },
    }) as Request & { isAuthenticated: unknown };

    request.isAuthenticated = true;

    const context = createExecutionContext(request as Request);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(logger.debug).toHaveBeenCalledWith(
      '[AuthGuard] Request check',
      expect.objectContaining({
        isAuthenticated: false,
        hasSession: true,
        sessionId: 'none',
      }),
    );
  });

  it('propage les erreurs internes du check d’authentification', () => {
    const error = new Error('session store failure');
    const request = createRequest({
      isAuthenticated: () => {
        throw error;
      },
      user: undefined,
    });

    const context = createExecutionContext(request);

    expect(() => guard.canActivate(context)).toThrow(error);
  });

  it('rejette quand isAuthenticated est absent et qu’aucune session/user n’existe', () => {
    const request = createRequest({
      isAuthenticated: undefined,
      user: undefined,
      session: undefined,
      headers: {},
    });

    const context = createExecutionContext(request);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Authentication required');
    expect(logger.warn).toHaveBeenCalledWith(
      '[AuthGuard] Rejected - not authenticated',
      expect.objectContaining({
        method: 'GET',
        url: '/test',
        hasSession: false,
        hasCookie: false,
        sessionId: 'none',
      }),
    );
  });

  it('tronque correctement un sessionId court et garde le chemin succès', () => {
    const request = createRequest({
      user: { id: 'u-short', email: 'short@example.com' },
      isAuthenticated: () => false,
      session: { id: 'abc123' },
      headers: {},
    });

    const context = createExecutionContext(request);

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.debug).toHaveBeenCalledWith(
      '[AuthGuard] Request check',
      expect.objectContaining({
        hasSession: true,
        sessionId: 'abc123',
      }),
    );
  });

  it('lève une exception quand session.id n’expose pas substring (session malformée)', () => {
    const malformedRequest = createRequest({
      isAuthenticated: () => false,
      user: undefined,
      session: { id: undefined },
      headers: { cookie: 'sid=1' },
    }) as Request & {
      session?: {
        id?: number;
      };
    };

    malformedRequest.session = { id: 12345678 };
    const context = createExecutionContext(malformedRequest as Request);

    expect(() => guard.canActivate(context)).toThrow(TypeError);
  });

  it('autorise quand isAuthenticated retourne une valeur truthy non booléenne', () => {
    const request = createRequest({
      user: undefined,
      isAuthenticated: () => 'yes' as unknown as boolean,
      session: undefined,
      headers: {},
    });

    const context = createExecutionContext(request);

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('rejette quand user est falsy et isAuthenticated=false', () => {
    const request = createRequest({
      user: '' as unknown as Request['user'],
      isAuthenticated: () => false,
      session: { id: 'session-1234' },
      headers: { cookie: 'sid=abc' },
    });

    const context = createExecutionContext(request);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(logger.debug).toHaveBeenCalledWith(
      '[AuthGuard] Request check',
      expect.objectContaining({
        hasUser: false,
        hasSession: true,
        hasCookie: true,
        sessionId: 'session-',
      }),
    );
  });

  it('n’émet aucun log si isAuthenticated lève une exception', () => {
    const request = createRequest({
      user: undefined,
      isAuthenticated: () => {
        throw new Error('isAuthenticated crash');
      },
    });

    const context = createExecutionContext(request);

    expect(() => guard.canActivate(context)).toThrow('isAuthenticated crash');
    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('journalise sessionId=none quand session existe sans id et autorise via user', () => {
    const request = createRequest({
      user: { id: 'u-no-id', email: 'user@noid.test' },
      isAuthenticated: () => false,
      session: {},
      headers: {},
    });

    const context = createExecutionContext(request);

    expect(guard.canActivate(context)).toBe(true);
    expect(logger.debug).toHaveBeenCalledWith(
      '[AuthGuard] Request check',
      expect.objectContaining({
        hasSession: true,
        sessionId: 'none',
      }),
    );
  });

  it('lève une TypeError quand headers est absent (chemin exceptionnel)', () => {
    const request = createRequest({
      user: undefined,
      isAuthenticated: () => false,
      session: undefined,
      headers: undefined as unknown as Request['headers'],
    });

    const context = createExecutionContext(request);

    expect(() => guard.canActivate(context)).toThrow(TypeError);
  });

  it('appelle getRequest du contexte HTTP exactement une fois', () => {
    const request = createRequest({
      user: { id: 'u-ctx', email: 'ctx@example.com' },
      isAuthenticated: () => false,
    });
    const getRequest = vi.fn(() => request);
    const context = {
      switchToHttp: () => ({
        getRequest,
        getResponse: () => ({}),
        getNext: () => undefined,
      }),
      switchToRpc: () => ({ getContext: () => undefined, getData: () => undefined }),
      switchToWs: () => ({ getClient: () => undefined, getData: () => undefined, getPattern: () => undefined }),
      getClass: () => class TestClass {},
      getHandler: () => () => undefined,
      getArgs: () => [request],
      getArgByIndex: () => request,
      getType: () => 'http',
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(getRequest).toHaveBeenCalledTimes(1);
  });
});
