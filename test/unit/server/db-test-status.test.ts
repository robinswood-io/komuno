import { afterEach, describe, expect, it, vi } from 'vitest';

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

type DbHealthModule = typeof import('../../../server/utils/db-health.ts');

type LoadModuleParams = {
  poolStats: PoolStats;
  queryError?: Error;
};

type LoadModuleResult = {
  module: DbHealthModule;
  dbSelectMock: ReturnType<typeof vi.fn>;
  getPoolStatsMock: ReturnType<typeof vi.fn<() => PoolStats>>;
};

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

const loadDbHealthModule = async (params: LoadModuleParams): Promise<LoadModuleResult> => {
  vi.resetModules();

  const dbSelectMock = vi.fn();
  const getPoolStatsMock = vi.fn<() => PoolStats>(() => params.poolStats);

  const limitMock = params.queryError
    ? vi.fn(async () => {
        throw params.queryError;
      })
    : vi.fn(async () => [{ id: 1 }]);

  const fromMock = vi.fn(() => ({ limit: limitMock }));
  dbSelectMock.mockReturnValue({ from: fromMock });

  const dbMock = {
    select: dbSelectMock,
  };

  const dbModuleMock = {
    pool: {},
    db: dbMock,
    getPoolStats: getPoolStatsMock,
  };

  vi.doMock('../../../server/db', () => dbModuleMock);
  vi.doMock('../../../server/db.js', () => dbModuleMock);
  vi.doMock('../../../server/db.ts', () => dbModuleMock);
  vi.doMock('../../../shared/schema', () => ({ admins: { table: 'admins' } }));

  const module = await import('../../../server/utils/db-health.ts');

  return {
    module,
    dbSelectMock,
    getPoolStatsMock,
  };
};

describe('server/utils/db-health.ts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  it('returns healthy status when query succeeds quickly with no wait queue', async () => {
    const setup = await loadDbHealthModule({ poolStats: basePoolStats });

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1200);

    const result = await setup.module.checkDatabaseHealth();

    expect(result.status).toBe('healthy');
    expect(result.connectionTest).toBe(true);
    expect(result.responseTime).toBe(200);
    expect(result.poolStats).toEqual(basePoolStats);
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
    expect(setup.dbSelectMock).toHaveBeenCalledTimes(1);
    expect(setup.getPoolStatsMock).toHaveBeenCalledTimes(1);
  });

  it('returns degraded status when queue remains below threshold and response is under 2s', async () => {
    const setup = await loadDbHealthModule({
      poolStats: {
        ...basePoolStats,
        waitingCount: 3,
      },
    });

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(2000).mockReturnValueOnce(3000);

    const result = await setup.module.checkDatabaseHealth();

    expect(result.status).toBe('degraded');
    expect(result.connectionTest).toBe(true);
    expect(result.poolStats.waitingCount).toBe(3);
  });

  it('returns unhealthy status for slow successful checks', async () => {
    const setup = await loadDbHealthModule({ poolStats: basePoolStats });

    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(5000).mockReturnValueOnce(8001);

    const result = await setup.module.checkDatabaseHealth();

    expect(result.status).toBe('unhealthy');
    expect(result.connectionTest).toBe(true);
    expect(result.responseTime).toBe(3001);
  });

  it('returns unhealthy status on query error and logs the failure', async () => {
    const setup = await loadDbHealthModule({
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

  it('logs optimizer details in development including warning and high-usage info branches', async () => {
    process.env.NODE_ENV = 'development';

    const stats: PoolStats = {
      ...basePoolStats,
      waitingCount: 7,
      totalCount: 19,
      maxConnections: 20,
    };

    const setup = await loadDbHealthModule({ poolStats: stats });

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

    const setup = await loadDbHealthModule({ poolStats: basePoolStats });

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    setup.module.optimizePoolUsage();

    expect(setup.getPoolStatsMock).toHaveBeenCalledTimes(1);
    expect(randomSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('starts pool monitoring with provided interval and logs startup', async () => {
    const setup = await loadDbHealthModule({ poolStats: basePoolStats });

    const intervalSpy = vi
      .spyOn(global, 'setInterval')
      .mockImplementation(() => 123 as unknown as NodeJS.Timeout);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    setup.module.startPoolMonitoring(15000);

    expect(intervalSpy).toHaveBeenCalledTimes(1);
    expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 15000);
    expect(logSpy).toHaveBeenCalledWith('[DB Monitor] Monitoring du pool démarré (interval: 15000ms)');
  });
});
