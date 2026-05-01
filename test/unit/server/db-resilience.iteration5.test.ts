import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type DbResilienceJsModule = typeof import('../../../server/lib/db-resilience');

type LoggerMethod = (message: string, metadata?: unknown) => void;
type LoggerMock = {
  info: ReturnType<typeof vi.fn<LoggerMethod>>;
  warn: ReturnType<typeof vi.fn<LoggerMethod>>;
  error: ReturnType<typeof vi.fn<LoggerMethod>>;
  debug: ReturnType<typeof vi.fn<LoggerMethod>>;
};

type DbClient = {
  query: (sql: string) => Promise<unknown>;
  release: () => void;
};

type PoolLike = {
  connect: () => Promise<DbClient>;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
};

type LoadModuleResult = {
  module: DbResilienceJsModule;
  loggerMock: LoggerMock;
};

const cjsRequire = createRequire(import.meta.url);
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const circuitBreakerModulePath = cjsRequire.resolve('../../../server/lib/circuit-breaker.js');
const dbResilienceModulePath = cjsRequire.resolve('../../../server/lib/db-resilience.js');

const loadDbResilienceModule = (): LoadModuleResult => {
  const loggerMock: LoggerMock = {
    info: vi.fn<LoggerMethod>(),
    warn: vi.fn<LoggerMethod>(),
    error: vi.fn<LoggerMethod>(),
    debug: vi.fn<LoggerMethod>(),
  };

  const previousLoggerModule = cjsRequire.cache[loggerModulePath];
  cjsRequire.cache[loggerModulePath] = {
    ...(previousLoggerModule ?? {
      id: loggerModulePath,
      filename: loggerModulePath,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: { logger: loggerMock },
  };

  delete cjsRequire.cache[circuitBreakerModulePath];
  delete cjsRequire.cache[dbResilienceModulePath];

  const module = cjsRequire(dbResilienceModulePath) as DbResilienceJsModule;

  return { module, loggerMock };
};

const createPool = (
  connect: PoolLike['connect'],
  counts?: Partial<Pick<PoolLike, 'totalCount' | 'idleCount' | 'waitingCount'>>,
): PoolLike => ({
  connect,
  totalCount: counts?.totalCount ?? 4,
  idleCount: counts?.idleCount ?? 2,
  waitingCount: counts?.waitingCount ?? 0,
});

describe('server/lib/db-resilience.js - iteration 5 coverage additions', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete cjsRequire.cache[dbResilienceModulePath];
    delete cjsRequire.cache[circuitBreakerModulePath];
    delete cjsRequire.cache[loggerModulePath];
  });

  it('returns cached health status when cache entry is still fresh', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-02-01T10:00:00.000Z');
    vi.setSystemTime(now);

    const { module, loggerMock } = loadDbResilienceModule();

    const queryMock = vi.fn<(sql: string) => Promise<number>>(async () => 1);
    const releaseMock = vi.fn<() => void>();
    const connectMock = vi.fn<PoolLike['connect']>(async () => ({
      query: queryMock,
      release: releaseMock,
    }));

    const pool = createPool(connectMock);
    const resilience = new module.DatabaseResilience(pool, 'cached-health');

    const first = await resilience.healthCheck('cache-key', 5000);
    const second = await resilience.healthCheck('cache-key', 5000);

    expect(first.status).toMatch(/healthy|warning/);
    expect(second).toEqual(first);
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.debug).toHaveBeenCalledWith(
      '[DB Resilience] Using cached health status for cache-key',
    );
  });

  it('returns unhealthy status with failure details when health check fails without cache', async () => {
    const { module } = loadDbResilienceModule();

    const connectMock = vi.fn<PoolLike['connect']>(async () => {
      throw new Error('no-db-connection');
    });

    const pool = createPool(connectMock);
    const resilience = new module.DatabaseResilience(pool, 'unhealthy-health');

    const status = await resilience.healthCheck('no-cache', 3000);

    expect(status.status).toBe('unhealthy');
    expect(status.message).toBe('Échec de connexion');
    expect(status.error).toBe('no-db-connection');
    expect(status.details).toEqual(
      expect.objectContaining({
        circuitState: expect.any(String),
        failures: expect.any(Number),
      }),
    );
  });

  it('reports healthy, warning and unhealthy pool utilization states', async () => {
    const { module } = loadDbResilienceModule();
    const connectNeverUsed = vi.fn<PoolLike['connect']>(async () => {
      throw new Error('not-used');
    });

    const healthy = new module.DatabaseResilience(
      createPool(connectNeverUsed, { totalCount: 8, idleCount: 6, waitingCount: 0 }),
      'pool-healthy',
    );
    const warning = new module.DatabaseResilience(
      createPool(connectNeverUsed, { totalCount: 18, idleCount: 3, waitingCount: 1 }),
      'pool-warning',
    );
    const unhealthy = new module.DatabaseResilience(
      createPool(connectNeverUsed, { totalCount: 20, idleCount: 1, waitingCount: 4 }),
      'pool-unhealthy',
    );

    const healthyStatus = await healthy.poolHealthCheck();
    const warningStatus = await warning.poolHealthCheck();
    const unhealthyStatus = await unhealthy.poolHealthCheck();

    expect(healthyStatus.status).toBe('healthy');
    expect(warningStatus.status).toBe('warning');
    expect(warningStatus.message).toContain('Pool chargé');
    expect(unhealthyStatus.status).toBe('unhealthy');
    expect(unhealthyStatus.message).toContain('Pool saturé');
  });

  it('returns unknown pool status when pool stats access throws', async () => {
    const { module } = loadDbResilienceModule();

    const connectNeverUsed = vi.fn<PoolLike['connect']>(async () => {
      throw new Error('not-used');
    });

    const faultyPool = {
      connect: connectNeverUsed,
      get totalCount(): number {
        throw new Error('stats-unavailable');
      },
      get idleCount(): number {
        return 0;
      },
      get waitingCount(): number {
        return 0;
      },
    } as unknown as PoolLike;

    const resilience = new module.DatabaseResilience(faultyPool, 'pool-faulty');

    const status = await resilience.poolHealthCheck();

    expect(status.status).toBe('unknown');
    expect(status.message).toBe('Impossible de récupérer les stats');
    expect(status.error).toBe('stats-unavailable');
  });

  it('clears a single cache key and then clears all cache with expected logs', async () => {
    const { module, loggerMock } = loadDbResilienceModule();

    const queryMock = vi.fn<(sql: string) => Promise<number>>(async () => 1);
    const releaseMock = vi.fn<() => void>();
    const connectMock = vi.fn<PoolLike['connect']>(async () => ({
      query: queryMock,
      release: releaseMock,
    }));

    const resilience = new module.DatabaseResilience(createPool(connectMock), 'cache-clear');

    await resilience.healthCheck('cache-a', 5000);
    await resilience.healthCheck('cache-b', 5000);
    expect(resilience.getMetrics().cachedKeys.sort()).toEqual(['cache-a', 'cache-b']);

    resilience.clearCache('cache-a');
    expect(resilience.getMetrics().cachedKeys).toEqual(['cache-b']);
    expect(loggerMock.info).toHaveBeenCalledWith('[DB Resilience] Cache cleared for cache-a');

    resilience.clearCache();
    expect(resilience.getMetrics().cacheSize).toBe(0);
    expect(loggerMock.info).toHaveBeenCalledWith('[DB Resilience] All cache cleared');
  });

  it('resetCircuitBreaker resets breaker state and clears cached entries', async () => {
    const { module } = loadDbResilienceModule();

    const queryMock = vi.fn<(sql: string) => Promise<number>>(async () => 1);
    const releaseMock = vi.fn<() => void>();
    const connectMock = vi.fn<PoolLike['connect']>(async () => ({
      query: queryMock,
      release: releaseMock,
    }));

    const resilience = new module.DatabaseResilience(createPool(connectMock), 'reset-flow');

    await resilience.healthCheck('reset-key', 5000);
    expect(resilience.getMetrics().cacheSize).toBe(1);

    const breaker = (resilience as { circuitBreaker: { reset: () => void } }).circuitBreaker;
    const resetSpy = vi.spyOn(breaker, 'reset');

    resilience.resetCircuitBreaker();

    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(resilience.getMetrics().cacheSize).toBe(0);
  });

  it('executeWithTimeout rejects with timeout error when operation exceeds deadline', async () => {
    vi.useFakeTimers();

    const { module } = loadDbResilienceModule();
    const connectMock = vi.fn<PoolLike['connect']>(async () => {
      throw new Error('not-used');
    });
    const resilience = new module.DatabaseResilience(createPool(connectMock), 'timeout-flow');

    const neverResolving = (): Promise<string> => new Promise(() => undefined);
    const pending = resilience.executeWithTimeout(neverResolving, 50);
    const rejectionAssertion = expect(pending).rejects.toThrow(
      'Query timeout after 50ms',
    );

    await vi.advanceTimersByTimeAsync(51);

    await rejectionAssertion;
  });

  it('sleep resolves after timer advances', async () => {
    vi.useFakeTimers();

    const { module } = loadDbResilienceModule();
    const connectMock = vi.fn<PoolLike['connect']>(async () => {
      throw new Error('not-used');
    });
    const resilience = new module.DatabaseResilience(createPool(connectMock), 'sleep-flow');

    const sleeper = resilience.sleep(30);
    await vi.advanceTimersByTimeAsync(30);

    await expect(sleeper).resolves.toBeUndefined();
  });
});
