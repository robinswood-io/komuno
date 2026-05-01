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

const createPool = (connect: PoolLike['connect']): PoolLike => ({
  connect,
  totalCount: 4,
  idleCount: 2,
  waitingCount: 0,
});

describe('server/lib/db-resilience.js', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete cjsRequire.cache[dbResilienceModulePath];
    delete cjsRequire.cache[circuitBreakerModulePath];
    delete cjsRequire.cache[loggerModulePath];
  });

  it('retries a transient failure and succeeds on a later attempt', async () => {
    const { module, loggerMock } = loadDbResilienceModule();

    const connectMock = vi.fn<PoolLike['connect']>(async () => {
      throw new Error('unused-connect');
    });
    const pool = createPool(connectMock);

    const resilience = new module.DatabaseResilience(pool, 'retry-flow');
    const sleepSpy = vi.spyOn(resilience, 'sleep').mockResolvedValue(undefined);

    const queryFn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('transient-db-error'))
      .mockResolvedValueOnce('query-ok');

    const result = await resilience.executeQuery(queryFn, {
      retry: true,
      retryConfig: {
        maxAttempts: 2,
        initialDelay: 25,
        maxDelay: 25,
        backoffMultiplier: 2,
      },
    });

    expect(result).toBe('query-ok');
    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalledWith(25);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[DB Resilience] Retry attempt 1/2 after 25ms',
      expect.objectContaining({
        error: 'transient-db-error',
      }),
    );
    expect(loggerMock.info).toHaveBeenCalledWith(
      '[DB Resilience] Query succeeded after 2 attempts',
    );
  });

  it('opens the circuit after repeated failures and blocks following calls', async () => {
    const { module, loggerMock } = loadDbResilienceModule();

    const connectMock = vi.fn<PoolLike['connect']>(async () => {
      throw new Error('unused-connect');
    });
    const pool = createPool(connectMock);

    const resilience = new module.DatabaseResilience(pool, 'circuit-flow');

    const failingQuery = vi.fn<() => Promise<string>>(async () => {
      throw new Error('persistent-db-error');
    });

    for (let index = 0; index < 5; index += 1) {
      await expect(
        resilience.executeQuery(failingQuery, {
          retry: false,
        }),
      ).rejects.toThrow('persistent-db-error');
    }

    const blockedQuery = vi.fn<() => Promise<string>>(async () => 'should-not-run');

    await expect(
      resilience.executeQuery(blockedQuery, {
        retry: false,
      }),
    ).rejects.toThrow('Circuit breaker is OPEN for circuit-flow');

    expect(blockedQuery).not.toHaveBeenCalled();
    expect(loggerMock.error).toHaveBeenCalledWith(
      '[DB Resilience] Query failed after 1 attempts',
      expect.objectContaining({
        circuitState: 'OPEN',
      }),
    );
  });

  it('returns a stale cached warning when health check fails after cache expiration', async () => {
    vi.useFakeTimers();
    const baseTime = new Date('2026-01-01T00:00:00.000Z');
    vi.setSystemTime(baseTime);

    const { module, loggerMock } = loadDbResilienceModule();

    const releaseMock = vi.fn<() => void>();
    const queryMock = vi.fn<(sql: string) => Promise<number>>(async () => {
      return 1;
    });

    const connectMock = vi
      .fn<PoolLike['connect']>()
      .mockResolvedValueOnce({ query: queryMock, release: releaseMock })
      .mockRejectedValueOnce(new Error('database-unreachable'));

    const pool = createPool(connectMock);
    const resilience = new module.DatabaseResilience(pool, 'health-flow');

    const firstStatus = await resilience.healthCheck('db-cache', 100);

    expect(firstStatus.status).toMatch(/healthy|warning/);

    vi.setSystemTime(new Date(baseTime.getTime() + 101));

    const secondStatus = await resilience.healthCheck('db-cache', 100);

    expect(secondStatus.status).toBe('warning');
    expect(secondStatus.message).toBe('Utilise le dernier statut connu (DB inaccessible)');
    expect(secondStatus.error).toBe('database-unreachable');
    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(queryMock).toHaveBeenCalledWith('SELECT 1');
    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.warn).toHaveBeenCalledWith(
      '[DB Resilience] Health check failed, using stale cache for db-cache',
      expect.objectContaining({
        error: 'database-unreachable',
      }),
    );
  });

  it('throws an explicit unknown error when maxAttempts is configured to 0', async () => {
    const { module } = loadDbResilienceModule();

    const connectMock = vi.fn<PoolLike['connect']>(async () => {
      throw new Error('unused-connect');
    });
    const pool = createPool(connectMock);

    const resilience = new module.DatabaseResilience(pool, 'zero-attempts-flow');

    await expect(
      resilience.executeQuery(async () => 'unreachable', {
        retry: true,
        retryConfig: {
          maxAttempts: 0,
          initialDelay: 1,
          maxDelay: 1,
          backoffMultiplier: 2,
        },
      }),
    ).rejects.toThrow('Query failed with unknown error');
  });
});
