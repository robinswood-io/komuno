import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type DbTsModule = typeof import('../../../server/db.ts');
type DbJsModule = typeof import('../../../server/db.js');

type QueryExecutionOptions = {
  timeout: number;
  retry: boolean;
};

type QueryFunction<T> = () => Promise<T>;

type EventHandler = (...args: unknown[]) => void;

type PoolStats = {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
};

type CjsCacheModule = {
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

type TsLoadResult = {
  module: DbTsModule;
  executeQueryMock: ReturnType<
    typeof vi.fn<(queryFn: QueryFunction<unknown>, options: QueryExecutionOptions) => Promise<unknown>>
  >;
};

async function loadDbTsModule(params: {
  databaseUrl: string;
  nodeEnv: 'development' | 'testing' | 'production';
  pgStats: PoolStats;
  executeQueryError?: Error;
}): Promise<TsLoadResult> {
  vi.resetModules();
  process.env.DATABASE_URL = params.databaseUrl;
  process.env.NODE_ENV = params.nodeEnv;

  class PgPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, params.pgStats);
    }
  }

  const executeQueryMock = params.executeQueryError
    ? vi.fn(async () => {
        throw params.executeQueryError;
      })
    : vi.fn(async (queryFn: QueryFunction<unknown>) => queryFn());

  vi.doMock('@neondatabase/serverless', () => ({
    neonConfig: {},
    Pool: class {
      public constructor(_options: Record<string, unknown>) {}
    },
  }));

  vi.doMock('pg', () => ({ Pool: PgPoolMock }));
  vi.doMock('drizzle-orm/neon-serverless', () => ({ drizzle: vi.fn(() => ({ mode: 'neon' })) }));
  vi.doMock('drizzle-orm/node-postgres', () => ({ drizzle: vi.fn(() => ({ mode: 'pg' })) }));
  vi.doMock('ws', () => ({ default: { kind: 'ws-constructor' } }));
  vi.doMock('../../../shared/schema', () => ({}));
  vi.doMock('../../../server/lib/logger', () => ({
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  }));
  vi.doMock('../../../server/lib/db-resilience', () => ({
    DatabaseResilience: class {
      public executeQuery = executeQueryMock;
    },
  }));

  const module = await import('../../../server/db.ts');
  return { module, executeQueryMock };
}

const cjsRequire = createRequire(import.meta.url);
const dbJsModulePath = cjsRequire.resolve('../../../server/db.js');
const neonModulePath = cjsRequire.resolve('@neondatabase/serverless');
const pgModulePath = cjsRequire.resolve('pg');
const drizzleNeonModulePath = cjsRequire.resolve('drizzle-orm/neon-serverless');
const drizzlePgModulePath = cjsRequire.resolve('drizzle-orm/node-postgres');
const wsModulePath = cjsRequire.resolve('ws');
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const resilienceModulePath = cjsRequire.resolve('../../../server/lib/db-resilience.js');

const injectedPaths = [
  dbJsModulePath,
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
  const previous = cjsRequire.cache[modulePath] as CjsCacheModule | undefined;
  cjsRequire.cache[modulePath] = {
    ...(previous ?? {
      id: modulePath,
      filename: modulePath,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: moduleExports,
  } as CjsCacheModule;
}

type JsLoadResult = {
  module: DbJsModule;
};

function loadDbJsModule(params: {
  databaseUrl: string;
  nodeEnv: 'development' | 'testing' | 'production';
  neonStats: PoolStats;
}): JsLoadResult {
  process.env.DATABASE_URL = params.databaseUrl;
  process.env.NODE_ENV = params.nodeEnv;

  class NeonPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, params.neonStats);
    }
  }

  vi.spyOn(process, 'on').mockImplementation(() => process);

  setCjsMock(neonModulePath, {
    neonConfig: {},
    Pool: NeonPoolMock,
  });
  setCjsMock(pgModulePath, {
    Pool: class {
      public constructor(_options: Record<string, unknown>) {}
    },
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
      public executeQuery = vi.fn(async (queryFn: QueryFunction<unknown>) => queryFn());
    },
  });

  delete cjsRequire.cache[dbJsModulePath];
  const module = cjsRequire(dbJsModulePath) as DbJsModule;
  return { module };
}

describe('server/db.ts iteration17 runtime/error branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('propagates DatabaseResilience errors in runDbQuery with complex profile options', async () => {
    const setup = await loadDbTsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
      executeQueryError: new Error('execute failed'),
    });

    await expect(setup.module.runDbQuery(async () => ({ ok: true }), 'complex')).rejects.toThrow('execute failed');

    expect(setup.executeQueryMock).toHaveBeenCalledTimes(1);
    expect(setup.executeQueryMock).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 10000,
      retry: true,
    });
  });

  it('reports breached critical threshold and negative available connections when pool exceeds max', async () => {
    const setup = await loadDbTsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      pgStats: { totalCount: 22, idleCount: 1, waitingCount: 4 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.provider).toBe('standard');
    expect(stats.maxConnections).toBe(20);
    expect(stats.activeCount).toBe(21);
    expect(stats.utilization).toEqual({ percent: 105, status: 'critical' });
    expect(stats.warning).toEqual({ threshold: 14, current: 21, breached: true });
    expect(stats.critical).toEqual({ threshold: 18, current: 21, breached: true });
    expect(stats.availableConnections).toBe(-2);
  });
});

describe('server/db.js iteration17 runtime branch for neon saturation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    injectedPaths.forEach((modulePath) => {
      delete cjsRequire.cache[modulePath];
    });
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('marks neon pool critical with warning/critical thresholds breached above 90%', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
      neonStats: { totalCount: 21, idleCount: 0, waitingCount: 2 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.provider).toBe('neon');
    expect(stats.maxConnections).toBe(20);
    expect(stats.activeCount).toBe(21);
    expect(stats.utilization).toEqual({ percent: 105, status: 'critical' });
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(true);
    expect(stats.availableConnections).toBe(-1);
  });
});
