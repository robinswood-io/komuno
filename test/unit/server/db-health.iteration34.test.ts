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
};

type LoadModuleResult = {
  module: DbHealthJsModule;
  getPoolStatsMock: ReturnType<typeof vi.fn<() => PoolStats>>;
};

type CjsModule = {
  id: string;
  filename: string;
  loaded: boolean;
  children: unknown[];
  paths: string[];
  exports: unknown;
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

function setCjsMock(modulePath: string, moduleExports: unknown): void {
  const previous = cjsRequire.cache[modulePath] as CjsModule | undefined;
  cjsRequire.cache[modulePath] = {
    ...(previous ?? {
      id: modulePath,
      filename: modulePath,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: moduleExports,
  } as CjsModule;
}

async function loadDbHealthJsModule(params: LoadModuleParams): Promise<LoadModuleResult> {
  const dbSelectMock = vi.fn(() => ({ from: vi.fn(() => ({ limit: vi.fn(async () => [{ id: 1 }]) })) }));
  const getPoolStatsMock = vi.fn<() => PoolStats>(() => params.poolStats);

  setCjsMock(dbModulePath, {
    pool: {},
    db: {
      select: dbSelectMock,
    },
    getPoolStats: getPoolStatsMock,
  });

  setCjsMock(schemaModulePath, {
    admins: { table: 'admins' },
  });

  delete cjsRequire.cache[dbHealthModulePath];
  const module = cjsRequire(dbHealthModulePath) as DbHealthJsModule;

  return {
    module,
    getPoolStatsMock,
  };
}

describe('server/utils/db-health.js iteration34 boundary branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
    delete cjsRequire.cache[dbHealthModulePath];
    delete cjsRequire.cache[dbModulePath];
    delete cjsRequire.cache[schemaModulePath];
  });

  it('marks status degraded when response time is exactly 500ms', async () => {
    const setup = await loadDbHealthJsModule({ poolStats: basePoolStats });
    vi.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(1_500);

    const result = await setup.module.checkDatabaseHealth();

    expect(result.status).toBe('degraded');
    expect(result.responseTime).toBe(500);
    expect(result.connectionTest).toBe(true);
  });

  it('marks status unhealthy when response time is exactly 2000ms', async () => {
    const setup = await loadDbHealthJsModule({ poolStats: basePoolStats });
    vi.spyOn(Date, 'now').mockReturnValueOnce(2_000).mockReturnValueOnce(4_000);

    const result = await setup.module.checkDatabaseHealth();

    expect(result.status).toBe('unhealthy');
    expect(result.responseTime).toBe(2000);
    expect(result.connectionTest).toBe(true);
  });

  it('marks status unhealthy when wait queue is exactly 5', async () => {
    const setup = await loadDbHealthJsModule({
      poolStats: {
        ...basePoolStats,
        waitingCount: 5,
      },
    });

    vi.spyOn(Date, 'now').mockReturnValueOnce(3_000).mockReturnValueOnce(4_000);

    const result = await setup.module.checkDatabaseHealth();

    expect(result.status).toBe('unhealthy');
    expect(result.poolStats.waitingCount).toBe(5);
    expect(result.connectionTest).toBe(true);
  });

  it('does not early-return in production when random is exactly 0.05', async () => {
    process.env.NODE_ENV = 'production';

    const setup = await loadDbHealthJsModule({ poolStats: basePoolStats });
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.05);
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

  it('emits warning and info logs at exact development thresholds', async () => {
    process.env.NODE_ENV = 'development';

    const statsAtThreshold: PoolStats = {
      ...basePoolStats,
      waitingCount: 6,
      totalCount: 18,
      maxConnections: 20,
    };

    const setup = await loadDbHealthJsModule({ poolStats: statsAtThreshold });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    setup.module.optimizePoolUsage();

    expect(logSpy).toHaveBeenCalledWith('[DB Optimizer] Statistiques actuelles:', statsAtThreshold);
    expect(warnSpy).toHaveBeenCalledWith(
      '[DB Optimizer] 6 connexions en attente - possible goulot d\'étranglement',
    );
    expect(infoSpy).toHaveBeenCalledWith('[DB Optimizer] Pool presque plein: 18/20 connexions');
  });
});
