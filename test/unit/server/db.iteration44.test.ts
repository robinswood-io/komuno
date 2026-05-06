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
  public registeredEvents: string[] = [];
  public end: ReturnType<typeof vi.fn<() => Promise<void>>>;

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
}

type LoadParams = {
  databaseUrl?: string;
  nodeEnv: string;
  stats?: PoolStats;
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

function loadDbJsModule(params: LoadParams): {
  module: DbJsModule;
  neonPools: MockPool[];
  pgPools: MockPool[];
} {
  clearInjectedCaches();
  if (params.databaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = params.databaseUrl;
  }
  process.env.NODE_ENV = params.nodeEnv;

  const stats = params.stats ?? { totalCount: 0, idleCount: 0, waitingCount: 0 };
  const neonPools: MockPool[] = [];
  const pgPools: MockPool[] = [];

  class NeonPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, stats);
      neonPools.push(this);
    }
  }
  class PgPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, stats);
      pgPools.push(this);
    }
  }

  vi.spyOn(process, 'on').mockImplementation(() => process);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);

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
  return { module, neonPools, pgPools };
}

describe('server/db.js iteration44 practical branch push', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearInjectedCaches();
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('throws when DATABASE_URL is unset', () => {
    expect(() => loadDbJsModule({ databaseUrl: undefined, nodeEnv: 'testing' })).toThrow(
      'DATABASE_URL must be set',
    );
  });

  it('loads standard provider in testing with testing pool limits', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      stats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
    });

    expect(setup.pgPools).toHaveLength(1);
    expect(setup.neonPools).toHaveLength(0);
    expect(setup.pgPools[0]?.options).toMatchObject({
      min: 1,
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
  });

  it('loads neon provider in development and wires dev listeners', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'development',
      stats: { totalCount: 2, idleCount: 1, waitingCount: 0 },
    });

    expect(setup.neonPools).toHaveLength(1);
    expect(setup.pgPools).toHaveLength(0);
    expect(setup.neonPools[0]?.registeredEvents).toEqual(['connect', 'remove', 'error']);
  });

  it('reports warning utilization band for neon provider in production', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 16, idleCount: 1, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.provider).toBe('neon');
    expect(stats.utilization).toEqual({ percent: 75, status: 'warning' });
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(false);
  });
});
