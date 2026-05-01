import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';

vi.mock('../../../../shared/schema', () => ({
  ADMIN_ROLES: {
    SUPER_ADMIN: 'super_admin',
    IDEAS_READER: 'ideas_reader',
    IDEAS_MANAGER: 'ideas_manager',
    EVENTS_READER: 'events_reader',
    EVENTS_MANAGER: 'events_manager',
  },
}));

import { AdminGuard } from './admin.guard';

type GuardUser = {
  id?: string;
  email?: string;
  role?: string;
};

type GuardRequest = {
  user?: GuardUser;
  isAuthenticated?: (() => boolean) | unknown;
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

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
    vi.clearAllMocks();
  });

  it('allows access for authenticated super_admin', () => {
    const request: GuardRequest = {
      user: { id: '1', email: 'admin@example.com', role: 'super_admin' },
      isAuthenticated: () => true,
    };

    expect(guard.canActivate(createExecutionContext(request))).toBe(true);
  });

  it('allows access when isAuthenticated is missing but user has admin role', () => {
    const request: GuardRequest = {
      user: { id: '2', email: 'manager@example.com', role: 'ideas_manager' },
      isAuthenticated: undefined,
    };

    expect(guard.canActivate(createExecutionContext(request))).toBe(true);
  });

  it('denies access for authenticated non-admin role', () => {
    const request: GuardRequest = {
      user: { id: '3', email: 'reader@example.com', role: 'member' },
      isAuthenticated: () => true,
    };

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(createExecutionContext(request))).toThrow('Admin access required');
  });

  it('denies access when user is missing', () => {
    const request: GuardRequest = {
      user: undefined,
      isAuthenticated: () => true,
    };

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(createExecutionContext(request))).toThrow('Authentication required');
  });

  it('denies access when isAuthenticated returns false even if user exists', () => {
    const request: GuardRequest = {
      user: { id: '4', email: 'admin2@example.com', role: 'super_admin' },
      isAuthenticated: () => false,
    };

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(UnauthorizedException);
  });

  it('denies role with different casing (SUPER_ADMIN)', () => {
    const request: GuardRequest = {
      user: { id: '5', email: 'caps@example.com', role: 'SUPER_ADMIN' },
      isAuthenticated: () => true,
    };

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(ForbiddenException);
  });

  it('denies when role is missing on authenticated user', () => {
    const request: GuardRequest = {
      user: { id: '6', email: 'norole@example.com' },
      isAuthenticated: () => true,
    };

    expect(() => guard.canActivate(createExecutionContext(request))).toThrow(ForbiddenException);
  });
});

