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
  databaseUrl?: string;
  nodeEnv?: string;
  neonStats?: PoolStats;
  pgStats?: PoolStats;
  endRejects?: boolean;
};

type LoadResult = {
  module: DbJsModule;
  neonConfigMock: {
    webSocketConstructor?: unknown;
    poolQueryViaFetch?: boolean;
    fetchEndpoint?: (host: string) => string;
  };
  createdNeonPools: MockPool[];
  createdPgPools: MockPool[];
  executeQueryMock: ReturnType<
    typeof vi.fn<(queryFn: QueryFunction<unknown>, options: QueryExecutionOptions) => Promise<unknown>>
  >;
  drizzleNeonMock: ReturnType<typeof vi.fn>;
  drizzlePgMock: ReturnType<typeof vi.fn>;
  signalHandlers: Map<string, EventHandler>;
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

const setModuleCache = (modulePath: string, exportsValue: unknown): void => {
  cjsRequire.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports: exportsValue,
    children: [],
    paths: [],
  } as NodeModule;
};

const clearCache = (): void => {
  delete cjsRequire.cache[dbModulePath];
  delete cjsRequire.cache[neonModulePath];
  delete cjsRequire.cache[pgModulePath];
  delete cjsRequire.cache[drizzleNeonModulePath];
  delete cjsRequire.cache[drizzlePgModulePath];
  delete cjsRequire.cache[wsModulePath];
  delete cjsRequire.cache[schemaModulePath];
  delete cjsRequire.cache[loggerModulePath];
  delete cjsRequire.cache[resilienceModulePath];
};

const loadDbJsModule = (params: LoadParams): LoadResult => {
  clearCache();

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

  const neonConfigMock: {
    webSocketConstructor?: unknown;
    poolQueryViaFetch?: boolean;
    fetchEndpoint?: (host: string) => string;
  } = {};

  const defaultStats: PoolStats = { totalCount: 0, idleCount: 0, waitingCount: 0 };
  const createdNeonPools: MockPool[] = [];
  const createdPgPools: MockPool[] = [];

  class NeonPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, params.neonStats ?? defaultStats);
      if (params.endRejects) {
        this.end.mockRejectedValue(new Error('end failed'));
      }
      createdNeonPools.push(this);
    }
  }

  class PgPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, params.pgStats ?? defaultStats);
      if (params.endRejects) {
        this.end.mockRejectedValue(new Error('end failed'));
      }
      createdPgPools.push(this);
    }
  }

  const drizzleNeonMock = vi.fn(() => ({ mode: 'neon' }));
  const drizzlePgMock = vi.fn(() => ({ mode: 'pg' }));
  const executeQueryMock = vi.fn(
    async (queryFn: QueryFunction<unknown>, _options: QueryExecutionOptions): Promise<unknown> => queryFn(),
  );

  const signalHandlers = new Map<string, EventHandler>();
  vi.spyOn(process, 'on').mockImplementation((signal: NodeJS.Signals, listener: EventHandler) => {
    signalHandlers.set(signal, listener);
    return process;
  });

  setModuleCache(neonModulePath, {
    neonConfig: neonConfigMock,
    Pool: NeonPoolMock,
  });
  setModuleCache(pgModulePath, {
    Pool: PgPoolMock,
  });
  setModuleCache(drizzleNeonModulePath, {
    drizzle: drizzleNeonMock,
  });
  setModuleCache(drizzlePgModulePath, {
    drizzle: drizzlePgMock,
  });
  setModuleCache(wsModulePath, {
    __esModule: true,
    default: { kind: 'ws-constructor' },
  });
  setModuleCache(schemaModulePath, {});
  setModuleCache(loggerModulePath, {
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  });
  setModuleCache(resilienceModulePath, {
    DatabaseResilience: class {
      public executeQuery = executeQueryMock;
    },
  });

  const module = cjsRequire(dbModulePath) as DbJsModule;

  return {
    module,
    neonConfigMock,
    createdNeonPools,
    createdPgPools,
    executeQueryMock,
    drizzleNeonMock,
    drizzlePgMock,
    signalHandlers,
  };
};

describe('server/db.js iteration 8', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
    clearCache();
  });

  it('throws when DATABASE_URL is not set', () => {
    expect(() => loadDbJsModule({ databaseUrl: undefined, nodeEnv: 'testing' })).toThrow(
      'DATABASE_URL must be set',
    );
  });

  it('uses standard provider with development fallback config when NODE_ENV is empty', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: '',
      pgStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
    });

    expect(setup.createdPgPools).toHaveLength(1);
    expect(setup.createdNeonPools).toHaveLength(0);
    expect(setup.createdPgPools[0]?.options).toMatchObject({
      min: 2,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
      application_name: 'cjd-amiens-app',
    });
    expect(setup.drizzlePgMock).toHaveBeenCalledWith(
      expect.objectContaining({
        logger: false,
      }),
    );
  });

  it('uses neon provider with testing pool limits and configured neon fetch endpoint', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@project.neon.tech/db',
      nodeEnv: 'testing',
      neonStats: { totalCount: 1, idleCount: 0, waitingCount: 0 },
    });

    expect(setup.createdNeonPools).toHaveLength(1);
    expect(setup.createdPgPools).toHaveLength(0);
    expect(setup.createdNeonPools[0]?.options).toMatchObject({
      min: 1,
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      allowExitOnIdle: false,
    });
    expect(setup.neonConfigMock.poolQueryViaFetch).toBe(true);
    expect(setup.neonConfigMock.fetchEndpoint?.('abc.neon.tech')).toBe('https://abc.neon.tech/sql');
    expect(setup.drizzleNeonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        logger: false,
      }),
    );
  });

  it('runDbQuery uses the normal profile by default', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const payload = { ok: true };
    const result = await setup.module.runDbQuery(async () => payload);

    expect(result).toEqual(payload);
    expect(setup.executeQueryMock).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 5000,
      retry: true,
    });
  });

  it('getPoolStats reports warning status for utilization between 70 and 90 percent', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      pgStats: { totalCount: 4, idleCount: 0, waitingCount: 1 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.provider).toBe('standard');
    expect(stats.maxConnections).toBe(5);
    expect(stats.activeCount).toBe(4);
    expect(stats.utilization).toEqual({ percent: 80, status: 'warning' });
    expect(stats.warning.breached).toBe(false);
    expect(stats.critical.breached).toBe(false);
  });

  it('gracefully closes pool on SIGTERM once and catches close errors', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 2, idleCount: 1, waitingCount: 0 },
      endRejects: true,
    });

    const termHandler = setup.signalHandlers.get('SIGTERM');
    expect(termHandler).toBeTypeOf('function');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    if (termHandler) {
      await termHandler();
      await termHandler();
    }

    expect(setup.createdPgPools[0]?.end).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('[DB] Fermeture gracieuse du pool de connexions...');
    expect(errorSpy).toHaveBeenCalledWith('[DB] Erreur lors de la fermeture du pool:', expect.any(Error));
  });
});
