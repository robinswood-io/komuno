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
  databaseUrl?: string;
  nodeEnv?: string;
  neonStats?: PoolStats;
  pgStats?: PoolStats;
};

type LoadResult = {
  module: DbJsModule;
  createdNeonPools: MockPool[];
  createdPgPools: MockPool[];
  drizzleNeonMock: ReturnType<typeof vi.fn>;
  drizzlePgMock: ReturnType<typeof vi.fn>;
  neonConfigMock: {
    webSocketConstructor?: unknown;
    poolQueryViaFetch?: boolean;
    fetchEndpoint?: (host: string) => string;
  };
  executeQueryMock: ReturnType<
    typeof vi.fn<(queryFn: QueryFunction<unknown>, options: QueryExecutionOptions) => Promise<unknown>>
  >;
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
const dbResilienceModulePath = cjsRequire.resolve('../../../server/lib/db-resilience.js');

const injectedPaths = [
  dbModulePath,
  neonModulePath,
  pgModulePath,
  drizzleNeonModulePath,
  drizzlePgModulePath,
  wsModulePath,
  schemaModulePath,
  loggerModulePath,
  dbResilienceModulePath,
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

  const neonConfigMock: {
    webSocketConstructor?: unknown;
    poolQueryViaFetch?: boolean;
    fetchEndpoint?: (host: string) => string;
  } = {};

  const drizzleNeonMock = vi.fn(() => ({ mode: 'neon' }));
  const drizzlePgMock = vi.fn(() => ({ mode: 'pg' }));
  const executeQueryMock = vi.fn(
    async (queryFn: QueryFunction<unknown>, _options: QueryExecutionOptions): Promise<unknown> => queryFn(),
  );

  vi.spyOn(process, 'on').mockImplementation(() => process);

  setCjsMock(neonModulePath, {
    neonConfig: neonConfigMock,
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
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  });
  setCjsMock(dbResilienceModulePath, {
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
    drizzleNeonMock,
    drizzlePgMock,
    neonConfigMock,
    executeQueryMock,
  };
}

describe('server/db.js iteration13c', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    injectedPaths.forEach((modulePath) => {
      delete cjsRequire.cache[modulePath];
    });
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('uses production pool limits for standard provider', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      pgStats: { totalCount: 7, idleCount: 2, waitingCount: 0 },
    });

    expect(setup.createdPgPools).toHaveLength(1);
    expect(setup.createdNeonPools).toHaveLength(0);
    expect(setup.createdPgPools[0]?.options).toMatchObject({
      connectionString: 'postgresql://user:pass@localhost:5432/appdb',
      max: 20,
      min: 5,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 600000,
      application_name: 'cjd-amiens-app',
    });
  });

  it('reports healthy utilization with no threshold breach', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      pgStats: { totalCount: 3, idleCount: 1, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.provider).toBe('standard');
    expect(stats.activeCount).toBe(2);
    expect(stats.utilization).toEqual({ percent: 40, status: 'healthy' });
    expect(stats.warning.breached).toBe(false);
    expect(stats.critical.breached).toBe(false);
    expect(stats.availableConnections).toBe(2);
    expect(stats.availableFromIdle).toBe(1);
  });

  it('enables drizzle query logger in development for standard provider', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      pgStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
    });

    const drizzleCall = setup.drizzlePgMock.mock.calls[0]?.[0] as {
      logger?: { logQuery: (query: string, params: unknown) => void } | false;
    };

    expect(drizzleCall?.logger).toBeTypeOf('object');
    if (drizzleCall?.logger && drizzleCall.logger !== false) {
      drizzleCall.logger.logQuery('select * from users where id = 1', []);
    }

    expect(logSpy).toHaveBeenCalledWith('[DB Query] select * from users where id = 1...');
  });

  it('enables drizzle query logger and neon fetch config in development for neon provider', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'development',
      neonStats: { totalCount: 2, idleCount: 1, waitingCount: 0 },
    });

    expect(setup.neonConfigMock.poolQueryViaFetch).toBe(true);
    expect(setup.neonConfigMock.fetchEndpoint?.('host.neon.tech')).toBe('https://host.neon.tech/sql');
    expect(setup.neonConfigMock.webSocketConstructor).toEqual({ kind: 'ws-constructor' });

    const drizzleCall = setup.drizzleNeonMock.mock.calls[0]?.[0] as {
      logger?: { logQuery: (query: string, params: unknown) => void } | false;
    };
    expect(drizzleCall?.logger).not.toBe(false);
  });
});

