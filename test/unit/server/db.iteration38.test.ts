import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type DbJsModule = typeof import('../../../server/db.js');
type EventHandler = (...args: unknown[]) => void;
type PoolStats = { totalCount: number; idleCount: number; waitingCount: number };
type CjsModule = {
  id: string;
  filename: string;
  loaded: boolean;
  children: unknown[];
  paths: string[];
  exports: unknown;
};

class MockPool {
  public totalCount: number;
  public idleCount: number;
  public waitingCount: number;
  public options: Record<string, unknown>;
  public end: ReturnType<typeof vi.fn<() => Promise<void>>>;
  public registeredEvents: string[] = [];

  private readonly handlers = new Map<string, EventHandler>();

  public constructor(options: Record<string, unknown>, stats: PoolStats) {
    this.options = options;
    this.totalCount = stats.totalCount;
    this.idleCount = stats.idleCount;
    this.waitingCount = stats.waitingCount;
    this.end = vi.fn(async () => undefined);
  }

  public on(event: string, handler: EventHandler): this {
    this.registeredEvents.push(event);
    this.handlers.set(event, handler);
    return this;
  }

  public emit(event: string, ...args: unknown[]): void {
    const handler = this.handlers.get(event);
    if (handler) {
      handler(...args);
    }
  }
}

type LoadParams = {
  databaseUrl?: string;
  nodeEnv: string;
  stats?: PoolStats;
};

type LoadResult = {
  module: DbJsModule;
  createdNeonPools: MockPool[];
  createdPgPools: MockPool[];
};

const cjsRequire = createRequire(import.meta.url);
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const neonModulePath = cjsRequire.resolve('@neondatabase/serverless');
const pgModulePath = cjsRequire.resolve('pg');
const drizzleNeonModulePath = cjsRequire.resolve('drizzle-orm/neon-serverless');
const drizzlePgModulePath = cjsRequire.resolve('drizzle-orm/node-postgres');
const wsModulePath = cjsRequire.resolve('ws');
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const resilienceModulePath = cjsRequire.resolve('../../../server/lib/db-resilience.js');

const injectedPaths = [
  dbModulePath,
  neonModulePath,
  pgModulePath,
  drizzleNeonModulePath,
  drizzlePgModulePath,
  wsModulePath,
  schemaModulePath,
  loggerModulePath,
  resilienceModulePath,
] as const;

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

function clearInjectedCaches(): void {
  injectedPaths.forEach((modulePath) => {
    delete cjsRequire.cache[modulePath];
  });
}

function loadDbJsModule(params: LoadParams): LoadResult {
  clearInjectedCaches();

  if (params.databaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = params.databaseUrl;
  }
  process.env.NODE_ENV = params.nodeEnv;

  const createdNeonPools: MockPool[] = [];
  const createdPgPools: MockPool[] = [];
  const stats = params.stats ?? { totalCount: 0, idleCount: 0, waitingCount: 0 };

  class NeonPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, stats);
      createdNeonPools.push(this);
    }
  }

  class PgPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, stats);
      createdPgPools.push(this);
    }
  }

  vi.spyOn(process, 'on').mockImplementation(() => process);

  setCjsMock(neonModulePath, { neonConfig: {}, Pool: NeonPoolMock });
  setCjsMock(pgModulePath, { Pool: PgPoolMock });
  setCjsMock(drizzleNeonModulePath, { drizzle: vi.fn(() => ({ mode: 'neon' })) });
  setCjsMock(drizzlePgModulePath, { drizzle: vi.fn(() => ({ mode: 'pg' })) });
  setCjsMock(wsModulePath, { __esModule: true, default: { kind: 'ws' } });
  setCjsMock(schemaModulePath, {});
  setCjsMock(loggerModulePath, {
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  });
  setCjsMock(resilienceModulePath, {
    DatabaseResilience: class {
      public executeQuery = vi.fn(async <T>(queryFn: () => Promise<T>) => queryFn());
    },
  });

  delete cjsRequire.cache[dbModulePath];
  const module = cjsRequire(dbModulePath) as DbJsModule;
  return { module, createdNeonPools, createdPgPools };
}

describe('server/db.js iteration38 uncovered provider/env/status branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearInjectedCaches();
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => loadDbJsModule({ databaseUrl: undefined, nodeEnv: 'testing' })).toThrow(
      'DATABASE_URL must be set',
    );
  });

  it('uses standard provider with staging fallback pool config and no dev listeners', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'staging',
      stats: { totalCount: 3, idleCount: 1, waitingCount: 0 },
    });

    expect(setup.createdNeonPools).toHaveLength(0);
    expect(setup.createdPgPools).toHaveLength(1);

    const pgPool = setup.createdPgPools[0];
    expect(pgPool?.options).toMatchObject({
      min: 2,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
    });
    expect(pgPool?.registeredEvents).toEqual(['error']);
  });

  it('returns warning status when utilization is between 70% and 90%', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 17, idleCount: 2, waitingCount: 1 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.activeCount).toBe(15);
    expect(stats.utilization).toEqual({ percent: 75, status: 'warning' });
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(false);
  });
});
