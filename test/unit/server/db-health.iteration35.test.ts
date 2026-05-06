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

function loadDbHealthJsModule(statsGetter: () => PoolStats): {
  module: DbHealthJsModule;
  getPoolStatsMock: ReturnType<typeof vi.fn<() => PoolStats>>;
} {
  const dbSelectMock = vi.fn(() => ({ from: vi.fn(() => ({ limit: vi.fn(async () => [{ id: 1 }]) })) }));
  const getPoolStatsMock = vi.fn<() => PoolStats>(() => statsGetter());

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

describe('server/utils/db-health.js iteration35 branch sweep', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.NODE_ENV;
    delete cjsRequire.cache[dbHealthModulePath];
    delete cjsRequire.cache[dbModulePath];
    delete cjsRequire.cache[schemaModulePath];
  });

  it('covers optimizePoolUsage branch combinations in one module instance', () => {
    let currentStats: PoolStats = { ...basePoolStats };
    const setup = loadDbHealthJsModule(() => currentStats);

    const randomSpy = vi.spyOn(Math, 'random');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    process.env.NODE_ENV = 'production';
    randomSpy.mockReturnValueOnce(0.9);
    setup.module.optimizePoolUsage();

    process.env.NODE_ENV = 'production';
    randomSpy.mockReturnValueOnce(0.01);
    currentStats = {
      ...basePoolStats,
      waitingCount: 0,
      totalCount: 10,
      maxConnections: 20,
    };
    setup.module.optimizePoolUsage();

    process.env.NODE_ENV = 'development';
    currentStats = {
      ...basePoolStats,
      waitingCount: 1,
      totalCount: 10,
      maxConnections: 20,
    };
    setup.module.optimizePoolUsage();

    process.env.NODE_ENV = 'development';
    currentStats = {
      ...basePoolStats,
      waitingCount: 6,
      totalCount: 19,
      maxConnections: 20,
    };
    setup.module.optimizePoolUsage();

    expect(setup.getPoolStatsMock).toHaveBeenCalledTimes(4);
    expect(randomSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith('[DB Optimizer] Statistiques actuelles:', expect.objectContaining({ waitingCount: 1 }));
    expect(logSpy).toHaveBeenCalledWith('[DB Optimizer] Statistiques actuelles:', expect.objectContaining({ waitingCount: 6 }));
    expect(warnSpy).toHaveBeenCalledWith(
      '[DB Optimizer] 6 connexions en attente - possible goulot d\'étranglement',
    );
    expect(infoSpy).toHaveBeenCalledWith('[DB Optimizer] Pool presque plein: 19/20 connexions');
  });
});
