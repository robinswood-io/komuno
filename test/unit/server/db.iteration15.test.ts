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

type LoggerLike = {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
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
  databaseUrl: string;
  nodeEnv: string;
  neonStats?: PoolStats;
  pgStats?: PoolStats;
};

type LoadResult = {
  module: DbJsModule;
  createdNeonPools: MockPool[];
  createdPgPools: MockPool[];
  loggerMock: LoggerLike;
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

function loadDbJsModule(params: LoadParams): LoadResult {
  process.env.DATABASE_URL = params.databaseUrl;
  process.env.NODE_ENV = params.nodeEnv;

  const defaultStats: PoolStats = { totalCount: 0, idleCount: 0, waitingCount: 0 };
  const createdNeonPools: MockPool[] = [];
  const createdPgPools: MockPool[] = [];

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

  const loggerMock: LoggerLike = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  const executeQueryMock = vi.fn(
    async (queryFn: QueryFunction<unknown>, _options: QueryExecutionOptions): Promise<unknown> => queryFn(),
  );

  vi.spyOn(process, 'on').mockImplementation(() => process);

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
  setCjsMock(schemaModulePath, {});
  setCjsMock(loggerModulePath, {
    logger: loggerMock,
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
    createdNeonPools,
    createdPgPools,
    loggerMock,
  };
}

describe('server/db.js iteration15', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    injectedPaths.forEach((modulePath) => {
      delete cjsRequire.cache[modulePath];
    });
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('logs standard provider pool errors with full metadata', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 4, idleCount: 1, waitingCount: 2 },
    });

    const standardPool = setup.createdPgPools[0];
    expect(standardPool).toBeDefined();

    const err = new Error('standard pool failed');
    standardPool?.emit('error', err, { id: 'client-std' });

    expect(setup.loggerMock.error).toHaveBeenCalledWith(
      'CRITICAL: Database pool error',
      expect.objectContaining({
        provider: 'standard',
        message: 'standard pool failed',
        type: 'dbPoolError',
        poolStats: {
          totalCount: 4,
          idleCount: 1,
          waitingCount: 2,
        },
      }),
    );
  });

  it('keeps utilization healthy at exact warning boundary (70%)', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      pgStats: { totalCount: 17, idleCount: 3, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.utilization).toEqual({ percent: 70, status: 'healthy' });
    expect(stats.warning.threshold).toBe(14);
    expect(stats.warning.current).toBe(14);
    expect(stats.warning.breached).toBe(false);
    expect(stats.critical.breached).toBe(false);
  });

  it('keeps utilization warning at exact critical boundary (90%) for neon provider', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'production',
      neonStats: { totalCount: 20, idleCount: 2, waitingCount: 1 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.provider).toBe('neon');
    expect(stats.utilization).toEqual({ percent: 90, status: 'warning' });
    expect(stats.critical.threshold).toBe(18);
    expect(stats.critical.current).toBe(18);
    expect(stats.critical.breached).toBe(false);
  });
});
