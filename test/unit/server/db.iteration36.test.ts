import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type DbJsModule = typeof import('../../../server/db.js');

type EventHandler = (...args: unknown[]) => void;

type PoolStats = {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
};

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

  private readonly handlers = new Map<string, EventHandler>();

  public constructor(options: Record<string, unknown>, stats: PoolStats) {
    this.options = options;
    this.totalCount = stats.totalCount;
    this.idleCount = stats.idleCount;
    this.waitingCount = stats.waitingCount;
    this.end = vi.fn(async () => undefined);
  }

  public on(event: string, handler: EventHandler): this {
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
  databaseUrl: string | undefined;
  nodeEnv?: string;
  schemaAsEsModule?: boolean;
  neonStats?: PoolStats;
  pgStats?: PoolStats;
};

type LoadResult = {
  module: DbJsModule;
  executeQueryMock: ReturnType<typeof vi.fn>;
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

function clearCaches(): void {
  injectedPaths.forEach((modulePath) => {
    delete cjsRequire.cache[modulePath];
  });
}

function loadDbJsModule(params: LoadParams): LoadResult {
  clearCaches();

  if (params.databaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = params.databaseUrl;
  }

  if (params.nodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = params.nodeEnv;
  }

  const createdNeonPools: MockPool[] = [];
  const createdPgPools: MockPool[] = [];
  const defaultStats: PoolStats = { totalCount: 0, idleCount: 0, waitingCount: 0 };

  class NeonPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, params.neonStats ?? defaultStats);
      createdNeonPools.push(this);
    }
  }

  class PgPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, params.pgStats ?? defaultStats);
      createdPgPools.push(this);
    }
  }

  const executeQueryMock = vi.fn(
    async <T>(queryFn: () => Promise<T>): Promise<T> => queryFn(),
  );

  vi.spyOn(process, 'on').mockImplementation((signal: NodeJS.Signals, listener: EventHandler) => {
    void signal;
    void listener;
    return process;
  });

  setCjsMock(neonModulePath, {
    neonConfig: {},
    Pool: NeonPoolMock,
  });
  setCjsMock(pgModulePath, {
    Pool: PgPoolMock,
  });
  setCjsMock(drizzleNeonModulePath, {
    drizzle: vi.fn(() => ({ mode: 'neon' })),
  });
  setCjsMock(drizzlePgModulePath, {
    drizzle: vi.fn(() => ({ mode: 'pg' })),
  });
  setCjsMock(wsModulePath, {
    __esModule: true,
    default: { kind: 'ws-constructor' },
  });
  setCjsMock(
    schemaModulePath,
    params.schemaAsEsModule
      ? { __esModule: true, default: { marker: 'schema-default' }, marker: 'schema-esm' }
      : {},
  );
  setCjsMock(loggerModulePath, {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  });
  setCjsMock(resilienceModulePath, {
    DatabaseResilience: class {
      public executeQuery = executeQueryMock;
    },
  });

  delete cjsRequire.cache[dbModulePath];
  const module = cjsRequire(dbModulePath) as DbJsModule;

  return {
    module,
    executeQueryMock,
    createdNeonPools,
    createdPgPools,
  };
}

describe('server/db.js iteration36 - branch lift around module helpers and pool status', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearCaches();
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('loads with schema mocked as __esModule and keeps neon execution path functional', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
      schemaAsEsModule: true,
      neonStats: { totalCount: 4, idleCount: 3, waitingCount: 0 },
    });

    expect(setup.createdNeonPools).toHaveLength(1);
    expect(setup.createdPgPools).toHaveLength(0);

    const result = await setup.module.runDbQuery(async () => ({ ok: true }), 'background');
    expect(result).toEqual({ ok: true });
    expect(setup.executeQueryMock).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 15000,
      retry: true,
    });
  });

  it('returns healthy utilization when active connections are <= 70% of max', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      schemaAsEsModule: false,
      pgStats: { totalCount: 12, idleCount: 2, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.activeCount).toBe(10);
    expect(stats.utilization).toEqual({ percent: 50, status: 'healthy' });
    expect(stats.warning.breached).toBe(false);
    expect(stats.critical.breached).toBe(false);
  });

  it('returns critical utilization when active connections are above 90% of max', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      schemaAsEsModule: false,
      pgStats: { totalCount: 20, idleCount: 1, waitingCount: 2 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.activeCount).toBe(19);
    expect(stats.utilization).toEqual({ percent: 95, status: 'critical' });
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(true);
  });
});
