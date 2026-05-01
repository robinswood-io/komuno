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

  public constructor(options: Record<string, unknown>, stats: PoolStats, endRejects = false) {
    this.options = options;
    this.totalCount = stats.totalCount;
    this.idleCount = stats.idleCount;
    this.waitingCount = stats.waitingCount;
    this.end = vi.fn(async () => undefined);
    if (endRejects) {
      this.end.mockRejectedValue(new Error('pool end failed'));
    }
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
  createdNeonPools: MockPool[];
  createdPgPools: MockPool[];
  executeQueryMock: ReturnType<
    typeof vi.fn<(queryFn: QueryFunction<unknown>, options: QueryExecutionOptions) => Promise<unknown>>
  >;
  signalHandlers: Map<string, EventHandler>;
  neonConfigMock: {
    webSocketConstructor?: unknown;
    poolQueryViaFetch?: boolean;
    fetchEndpoint?: (host: string) => string;
  };
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
      super(options, params.neonStats ?? defaultStats, params.endRejects === true);
      createdNeonPools.push(this);
    }
  }

  class PgPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, params.pgStats ?? defaultStats, params.endRejects === true);
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

  setModuleCache(neonModulePath, {
    neonConfig: neonConfigMock,
    Pool: NeonPoolMock,
  });
  setModuleCache(pgModulePath, {
    Pool: PgPoolMock,
  });
  setModuleCache(drizzleNeonModulePath, {
    drizzle: vi.fn(() => ({ mode: 'neon' })),
  });
  setModuleCache(drizzlePgModulePath, {
    drizzle: vi.fn(() => ({ mode: 'pg' })),
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
    createdNeonPools,
    createdPgPools,
    executeQueryMock,
    signalHandlers,
    neonConfigMock,
  };
};

describe('server/db.js iteration 10', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearCache();
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('runDbQuery forwards complex profile timeout and retry to DatabaseResilience', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const expected = { done: true };
    const result = await setup.module.runDbQuery(async () => expected, 'complex');

    expect(result).toEqual(expected);
    expect(setup.executeQueryMock).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 10000,
      retry: true,
    });
  });

  it('logs connect/remove messages in development for neon provider and sets websocket constructor', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@project.neon.tech/appdb',
      nodeEnv: 'development',
      neonStats: { totalCount: 3, idleCount: 1, waitingCount: 0 },
    });

    expect(setup.createdNeonPools).toHaveLength(1);
    expect(setup.neonConfigMock.webSocketConstructor).toEqual({ kind: 'ws-constructor' });

    const neonPool = setup.createdNeonPools[0];
    neonPool?.emit('connect');
    neonPool?.emit('remove');

    expect(logSpy).toHaveBeenCalledWith(
      '[DB] Nouvelle connexion établie (provider: neon, pool: 3)',
    );
    expect(logSpy).toHaveBeenCalledWith(
      '[DB] Connexion fermée (provider: neon, pool: 3)',
    );
  });

  it('closes pool successfully on SIGINT and logs success path', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
      endRejects: false,
    });

    const intHandler = setup.signalHandlers.get('SIGINT');
    expect(intHandler).toBeTypeOf('function');

    if (intHandler) {
      await intHandler();
    }

    expect(setup.createdPgPools[0]?.end).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('[DB] Fermeture gracieuse du pool de connexions...');
    expect(logSpy).toHaveBeenCalledWith('[DB] Pool fermé');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('marks critical threshold as breached when active connections exceed computed critical limit', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      pgStats: { totalCount: 6, idleCount: 0, waitingCount: 2 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.maxConnections).toBe(5);
    expect(stats.activeCount).toBe(6);
    expect(stats.utilization).toEqual({ percent: 120, status: 'critical' });
    expect(stats.critical.threshold).toBe(5);
    expect(stats.critical.breached).toBe(true);
  });
});
