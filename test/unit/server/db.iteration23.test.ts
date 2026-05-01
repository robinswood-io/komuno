import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type DbJsModule = typeof import('../../../server/db.js');
type EventHandler = (...args: unknown[]) => void;

type PoolStats = {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
};

type QueryExecutionOptions = {
  timeout: number;
  retry: boolean;
};

type QueryFunction<T> = () => Promise<T>;

type LoadParams = {
  databaseUrl: string;
  nodeEnv: 'development' | 'testing' | 'production';
  pgStats?: PoolStats;
  executeQueryError?: Error;
};

type LoadResult = {
  module: DbJsModule;
  createdPgPools: MockPool[];
  executeQueryMock: ReturnType<
    typeof vi.fn<(queryFn: QueryFunction<unknown>, options: QueryExecutionOptions) => Promise<unknown>>
  >;
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

function loadDbJsModule(params: LoadParams): LoadResult {
  process.env.DATABASE_URL = params.databaseUrl;
  process.env.NODE_ENV = params.nodeEnv;

  const stats = params.pgStats ?? { totalCount: 0, idleCount: 0, waitingCount: 0 };
  const createdPgPools: MockPool[] = [];

  class PgPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, stats);
      createdPgPools.push(this);
    }
  }

  const executeQueryMock = params.executeQueryError
    ? vi.fn(async () => {
        throw params.executeQueryError;
      })
    : vi.fn(async (queryFn: QueryFunction<unknown>) => queryFn());

  vi.spyOn(process, 'on').mockImplementation(() => process);

  setCjsMock(neonModulePath, {
    neonConfig: {},
    Pool: class {
      public constructor(_options: Record<string, unknown>) {}
    },
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
  setCjsMock(schemaModulePath, {});
  setCjsMock(loggerModulePath, {
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
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
    createdPgPools,
    executeQueryMock,
  };
}

describe('server/db.js iteration23 runtime branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    injectedPaths.forEach((modulePath) => {
      delete cjsRequire.cache[modulePath];
    });
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('marks pool as critical and breaches warning/critical thresholds when active count exceeds both', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      pgStats: { totalCount: 20, idleCount: 0, waitingCount: 3 },
    });

    expect(setup.createdPgPools).toHaveLength(1);

    const stats = setup.module.getPoolStats();

    expect(stats.activeCount).toBe(20);
    expect(stats.utilization).toEqual({ percent: 100, status: 'critical' });
    expect(stats.warning).toEqual({ threshold: 14, current: 20, breached: true });
    expect(stats.critical).toEqual({ threshold: 18, current: 20, breached: true });
    expect(stats.availableConnections).toBe(0);
  });

  it('returns negative availableConnections when runtime pool count is above configured max', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      pgStats: { totalCount: 22, idleCount: 1, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.maxConnections).toBe(20);
    expect(stats.activeCount).toBe(21);
    expect(stats.availableConnections).toBe(-2);
    expect(stats.utilization.status).toBe('critical');
  });

  it('propagates DatabaseResilience execution failures from runDbQuery', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      executeQueryError: new Error('resilience failure'),
    });

    await expect(setup.module.runDbQuery(async () => ({ ok: true }), 'normal')).rejects.toThrow('resilience failure');

    expect(setup.executeQueryMock).toHaveBeenCalledTimes(1);
    expect(setup.executeQueryMock).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 5000,
      retry: true,
    });
  });
});
