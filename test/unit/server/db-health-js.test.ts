import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type PoolStats = {
  waitingCount: number;
  totalCount: number;
  idleCount: number;
  activeCount: number;
  maxConnections: number;
  minConnections: number;
  provider: 'neon' | 'standard';
  utilization: { percent: number; status: string };
  availableConnections: number;
  availableFromIdle: number;
  warning: { threshold: number; current: number; breached: boolean };
  critical: { threshold: number; current: number; breached: boolean };
};

type DbHealthJsModule = typeof import('../../../server/utils/db-health.js');

type LoadModuleParams = {
  poolStats: PoolStats;
  queryError?: Error;
};

type LoadModuleResult = {
  module: DbHealthJsModule;
  dbSelectMock: ReturnType<typeof vi.fn>;
  getPoolStatsMock: ReturnType<typeof vi.fn<() => PoolStats>>;
};

const cjsRequire = createRequire(import.meta.url);
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');
const dbHealthModulePath = cjsRequire.resolve('../../../server/utils/db-health.js');

const basePoolStats: PoolStats = {
  waitingCount: 0,
  totalCount: 4,
  idleCount: 2,
  activeCount: 2,
  maxConnections: 20,
  minConnections: 2,
  provider: 'standard',
  utilization: { percent: 10, status: 'healthy' },
  availableConnections: 16,
  availableFromIdle: 2,
  warning: { threshold: 14, current: 2, breached: false },
  critical: { threshold: 18, current: 2, breached: false },
};

const loadDbHealthJsModule = async (params: LoadModuleParams): Promise<LoadModuleResult> => {
  const dbSelectMock = vi.fn();
  const getPoolStatsMock = vi.fn<() => PoolStats>(() => params.poolStats);

  const limitMock = params.queryError
    ? vi.fn(async () => {
        throw params.queryError;
      })
    : vi.fn(async () => [{ id: 1 }]);

  const fromMock = vi.fn(() => ({ limit: limitMock }));
  dbSelectMock.mockReturnValue({ from: fromMock });

  const dbModuleMock = {
    pool: {},
    db: {
      select: dbSelectMock,
    },
    getPoolStats: getPoolStatsMock,
  };

  const schemaModuleMock = {
    admins: { table: 'admins' },
  };

  const previousDbModule = cjsRequire.cache[dbModulePath];
  const previousSchemaModule = cjsRequire.cache[schemaModulePath];

  cjsRequire.cache[dbModulePath] = {
    ...(previousDbModule ?? {
      id: dbModulePath,
      filename: dbModulePath,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: dbModuleMock,
  };

  cjsRequire.cache[schemaModulePath] = {
    ...(previousSchemaModule ?? {
      id: schemaModulePath,
      filename: schemaModulePath,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: schemaModuleMock,
  };

  delete cjsRequire.cache[dbHealthModulePath];
  const module = cjsRequire(dbHealthModulePath) as DbHealthJsModule;

  return {
    module,
    dbSelectMock,
    getPoolStatsMock,
  };
};

describe('server/utils/db-health.js', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
    delete cjsRequire.cache[dbHealthModulePath];
    delete cjsRequire.cache[dbModulePath];
    delete cjsRequire.cache[schemaModulePath];
  });

  it('returns healthy status when query succeeds quickly and no waiting connections', async () => {
    const setup = await loadDbHealthJsModule({ poolStats: basePoolStats });

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1100);

    const result = await setup.module.checkDatabaseHealth();

    expect(result.status).toBe('healthy');
    expect(result.connectionTest).toBe(true);
    expect(result.responseTime).toBe(100);
    expect(result.poolStats).toEqual(basePoolStats);
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
    expect(setup.dbSelectMock).toHaveBeenCalledTimes(1);
    expect(setup.getPoolStatsMock).toHaveBeenCalledTimes(1);
  });

  it('returns degraded status when response stays under 2s with a low wait queue', async () => {
    const setup = await loadDbHealthJsModule({
      poolStats: {
        ...basePoolStats,
        waitingCount: 4,
      },
    });

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(2000).mockReturnValueOnce(3100);

    const result = await setup.module.checkDatabaseHealth();

    expect(result.status).toBe('degraded');
    expect(result.connectionTest).toBe(true);
    expect(result.poolStats.waitingCount).toBe(4);
  });

  it('returns unhealthy status when waiting queue is too high despite a successful query', async () => {
    const setup = await loadDbHealthJsModule({
      poolStats: {
        ...basePoolStats,
        waitingCount: 6,
      },
    });

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(3000).mockReturnValueOnce(3200);

    const result = await setup.module.checkDatabaseHealth();

    expect(result.status).toBe('unhealthy');
    expect(result.connectionTest).toBe(true);
    expect(result.responseTime).toBe(200);
  });

  it('returns unhealthy status on query error and logs the failure', async () => {
    const setup = await loadDbHealthJsModule({
      poolStats: basePoolStats,
      queryError: new Error('db down'),
    });

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(7000).mockReturnValueOnce(7050);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await setup.module.checkDatabaseHealth();

    expect(result.status).toBe('unhealthy');
    expect(result.connectionTest).toBe(false);
    expect(result.responseTime).toBe(50);
    expect(setup.getPoolStatsMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      '[DB Health] Erreur lors du check de santé:',
      expect.any(Error),
    );
  });

  it('logs development optimizer diagnostics including warning and high-usage info branches', async () => {
    process.env.NODE_ENV = 'development';

    const stats: PoolStats = {
      ...basePoolStats,
      waitingCount: 7,
      totalCount: 19,
      maxConnections: 20,
    };

    const setup = await loadDbHealthJsModule({ poolStats: stats });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    setup.module.optimizePoolUsage();

    expect(logSpy).toHaveBeenCalledWith('[DB Optimizer] Statistiques actuelles:', stats);
    expect(warnSpy).toHaveBeenCalledWith(
      '[DB Optimizer] 7 connexions en attente - possible goulot d\'étranglement',
    );
    expect(infoSpy).toHaveBeenCalledWith('[DB Optimizer] Pool presque plein: 19/20 connexions');
  });

  it('returns early in non-development mode when random gate is above threshold', async () => {
    process.env.NODE_ENV = 'production';

    const setup = await loadDbHealthJsModule({ poolStats: basePoolStats });

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    setup.module.optimizePoolUsage();

    expect(setup.getPoolStatsMock).toHaveBeenCalledTimes(1);
    expect(randomSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('continues in production mode when random gate is below threshold without dev-only logs', async () => {
    process.env.NODE_ENV = 'production';

    const setup = await loadDbHealthJsModule({ poolStats: basePoolStats });

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    setup.module.optimizePoolUsage();

    expect(setup.getPoolStatsMock).toHaveBeenCalledTimes(1);
    expect(randomSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logs base development diagnostics without warning/info when thresholds are not reached', async () => {
    process.env.NODE_ENV = 'development';

    const stats: PoolStats = {
      ...basePoolStats,
      waitingCount: 1,
      totalCount: 10,
      maxConnections: 20,
    };

    const setup = await loadDbHealthJsModule({ poolStats: stats });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    setup.module.optimizePoolUsage();

    expect(logSpy).toHaveBeenCalledWith('[DB Optimizer] Statistiques actuelles:', stats);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('uses default monitoring interval when not provided', async () => {
    const setup = await loadDbHealthJsModule({ poolStats: basePoolStats });

    const intervalSpy = vi
      .spyOn(global, 'setInterval')
      .mockImplementation(() => 456 as unknown as NodeJS.Timeout);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    setup.module.startPoolMonitoring();

    expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
    expect(logSpy).toHaveBeenCalledWith(
      '[DB Monitor] Monitoring du pool démarré (interval: 60000ms)',
    );
  });

  it('starts pool monitoring and executes optimizer through the interval callback', async () => {
    process.env.NODE_ENV = 'development';

    const setup = await loadDbHealthJsModule({ poolStats: basePoolStats });

    const intervalSpy = vi
      .spyOn(global, 'setInterval')
      .mockImplementation(() => 123 as unknown as NodeJS.Timeout);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    setup.module.startPoolMonitoring(15000);

    expect(intervalSpy).toHaveBeenCalledTimes(1);
    expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 15000);
    expect(logSpy).toHaveBeenCalledWith(
      '[DB Monitor] Monitoring du pool démarré (interval: 15000ms)',
    );

    const intervalCallback = intervalSpy.mock.calls[0]?.[0];
    expect(intervalCallback).toBeTypeOf('function');

    if (intervalCallback) {
      intervalCallback();
    }

    expect(setup.getPoolStatsMock).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('[DB Optimizer] Statistiques actuelles:', basePoolStats);
  });
});
