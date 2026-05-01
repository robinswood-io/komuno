import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DbMonitoringInterceptor } from './db-monitoring.interceptor';

type PoolStats = {
  idleCount: number;
  totalCount: number;
  waitingCount: number;
};

const dbMocks = vi.hoisted(() => ({
  getPoolStats: vi.fn<() => PoolStats>(),
}));

vi.mock('../../../db', () => ({
  getPoolStats: dbMocks.getPoolStats,
}));

type MockRequest = {
  method: string;
  path: string;
};

const createExecutionContext = (request: MockRequest): ExecutionContext => {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
};

describe('DbMonitoringInterceptor', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();

    dbMocks.getPoolStats.mockReturnValue({
      idleCount: 2,
      totalCount: 5,
      waitingCount: 1,
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns handler result and logs pool metrics in development on success', async () => {
    process.env.NODE_ENV = 'development';

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    vi.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(1_050);

    const interceptor = new DbMonitoringInterceptor();
    const context = createExecutionContext({ method: 'GET', path: '/health' });

    const payload = { ok: true };
    const next: CallHandler = { handle: () => of(payload) };

    const result = await firstValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual(payload);
    expect(dbMocks.getPoolStats).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      '[DB Monitor] Pool stats: 2/5 connexions (1 en attente)',
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns on slow request in success path', async () => {
    process.env.NODE_ENV = 'production';

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    vi.spyOn(Date, 'now').mockReturnValueOnce(2_000).mockReturnValueOnce(3_120);

    const interceptor = new DbMonitoringInterceptor();
    const context = createExecutionContext({ method: 'POST', path: '/api/orders' });
    const next: CallHandler = { handle: () => of({ created: true }) };

    await firstValueFrom(interceptor.intercept(context, next));

    expect(dbMocks.getPoolStats).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[DB Monitor] Requête lente détectée: POST /api/orders - 1120ms',
    );
  });

  it('propagates error and warns on slow request with error', async () => {
    process.env.NODE_ENV = 'production';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    vi.spyOn(Date, 'now').mockReturnValueOnce(4_000).mockReturnValueOnce(5_250);

    const interceptor = new DbMonitoringInterceptor();
    const context = createExecutionContext({ method: 'DELETE', path: '/api/orders/42' });

    const boom = new Error('db failed');
    const next: CallHandler = {
      handle: () => throwError(() => boom),
    };

    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toBe(boom);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[DB Monitor] Requête lente avec erreur: DELETE /api/orders/42 - 1250ms',
    );
  });
});
