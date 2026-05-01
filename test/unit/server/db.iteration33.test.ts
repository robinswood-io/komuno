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
  nodeEnv?: string;
  neonStats?: PoolStats;
  pgStats?: PoolStats;
};

type LoggerMock = {
  error: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
};

type LoadResult = {
  module: DbJsModule;
  createdNeonPools: MockPool[];
  createdPgPools: MockPool[];
  signalHandlers: Map<string, EventHandler>;
  executeQueryMock: ReturnType<
    typeof vi.fn<(queryFn: QueryFunction<unknown>, options: QueryExecutionOptions) => Promise<unknown>>
  >;
  drizzleNeonMock: ReturnType<typeof vi.fn>;
  drizzlePgMock: ReturnType<typeof vi.fn>;
  loggerMock: LoggerMock;
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

  process.env.DATABASE_URL = params.databaseUrl;
  if (params.nodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = params.nodeEnv;
  }

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

  const executeQueryMock = vi.fn(
    async (queryFn: QueryFunction<unknown>, _options: QueryExecutionOptions): Promise<unknown> => queryFn(),
  );

  const signalHandlers = new Map<string, EventHandler>();
  vi.spyOn(process, 'on').mockImplementation((signal: NodeJS.Signals, listener: EventHandler) => {
    signalHandlers.set(signal, listener);
    return process;
  });

  const drizzleNeonMock = vi.fn(() => ({ mode: 'neon' }));
  const drizzlePgMock = vi.fn(() => ({ mode: 'pg' }));

  const loggerMock: LoggerMock = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  setCjsMock(neonModulePath, {
    neonConfig: {},
    Pool: NeonPoolMock,
  });
  setCjsMock(pgModulePath, {
    Pool: PgPoolMock,
  });
  setCjsMock(drizzleNeonModulePath, {
    drizzle: drizzleNeonMock,
  });
  setCjsMock(drizzlePgModulePath, {
    drizzle: drizzlePgMock,
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
    signalHandlers,
    executeQueryMock,
    drizzleNeonMock,
    drizzlePgMock,
    loggerMock,
  };
}

describe('server/db.js iteration33 targeted branch coverage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearCaches();
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('logs connect/remove in development and emits structured pool error for standard provider', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      pgStats: { totalCount: 4, idleCount: 2, waitingCount: 1 },
    });

    const pool = setup.createdPgPools[0];
    expect(pool).toBeDefined();

    pool?.emit('connect');
    pool?.emit('remove');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nouvelle connexion établie'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Connexion fermée'));

    const emittedError = new Error('pool runtime failure');
    pool?.emit('error', emittedError, null);

    expect(setup.loggerMock.error).toHaveBeenCalledWith(
      'CRITICAL: Database pool error',
      expect.objectContaining({
        provider: 'standard',
        message: 'pool runtime failure',
        poolStats: {
          totalCount: 4,
          idleCount: 2,
          waitingCount: 1,
        },
      }),
    );
  });

  it('wires neon pool error handler and uses development drizzle logger callback', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'development',
      neonStats: { totalCount: 5, idleCount: 1, waitingCount: 2 },
    });

    const pool = setup.createdNeonPools[0];
    expect(pool).toBeDefined();

    const neonDrizzleArg = setup.drizzleNeonMock.mock.calls[0]?.[0] as {
      logger?: { logQuery: (query: string, params: unknown[]) => void };
    };

    expect(neonDrizzleArg.logger).toBeDefined();
    neonDrizzleArg.logger?.logQuery('select * from events where id = 1', []);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[DB Query] select * from events where id = 1...'));

    const emittedError = new Error('neon pool crash');
    pool?.emit('error', emittedError, null);

    expect(setup.loggerMock.error).toHaveBeenCalledWith(
      'CRITICAL: Database pool error',
      expect.objectContaining({
        provider: 'neon',
        message: 'neon pool crash',
        poolStats: {
          totalCount: 5,
          idleCount: 1,
          waitingCount: 2,
        },
      }),
    );
  });

  it('applies default normal profile in runDbQuery when no profile is provided', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const response = await setup.module.runDbQuery(async () => ({ ok: true }));

    expect(response).toEqual({ ok: true });
    expect(setup.executeQueryMock).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 5000,
      retry: true,
    });
  });

  it('returns critical utilization stats when active connections exceed 90 percent threshold', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      pgStats: { totalCount: 20, idleCount: 1, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.activeCount).toBe(19);
    expect(stats.utilization).toEqual({ percent: 95, status: 'critical' });
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(true);
  });

  it('closes pool successfully on SIGINT and remains idempotent on repeated signal', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 2, idleCount: 2, waitingCount: 0 },
    });

    const intHandler = setup.signalHandlers.get('SIGINT');
    expect(intHandler).toBeTypeOf('function');

    if (intHandler) {
      await intHandler();
      await intHandler();
    }

    const pool = setup.createdPgPools[0];
    expect(pool?.end).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('[DB] Fermeture gracieuse du pool de connexions...');
    expect(logSpy).toHaveBeenCalledWith('[DB] Pool fermé');
  });
});
