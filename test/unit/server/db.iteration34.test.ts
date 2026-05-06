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

  public constructor(options: Record<string, unknown>, stats: PoolStats) {
    this.options = options;
    this.totalCount = stats.totalCount;
    this.idleCount = stats.idleCount;
    this.waitingCount = stats.waitingCount;
    this.end = vi.fn(async () => undefined);
  }

  public on(_event: string, _handler: EventHandler): this {
    return this;
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

function injectModuleDependencies(params: LoadParams): {
  createdNeonPools: MockPool[];
  createdPgPools: MockPool[];
  neonConfigMock: {
    webSocketConstructor?: unknown;
    poolQueryViaFetch?: boolean;
    fetchEndpoint?: (host: string) => string;
  };
} {
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

  setCjsMock(neonModulePath, {
    neonConfig: neonConfigMock,
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
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  });
  setCjsMock(resilienceModulePath, {
    DatabaseResilience: class {
      public executeQuery = vi.fn(async <T>(queryFn: () => Promise<T>) => queryFn());
    },
  });

  return { createdNeonPools, createdPgPools, neonConfigMock };
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

  vi.spyOn(process, 'on').mockImplementation(
    (_signal: NodeJS.Signals, _listener: EventHandler) => process,
  );

  const deps = injectModuleDependencies(params);
  delete cjsRequire.cache[dbModulePath];
  const module = cjsRequire(dbModulePath) as DbJsModule;
  return { module, ...deps };
}

describe('server/db.js - iteration34 uncovered global branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearCaches();
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('throws immediately when DATABASE_URL is missing', () => {
    clearCaches();
    injectModuleDependencies({});
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;

    expect(() => cjsRequire(dbModulePath)).toThrowError(
      'DATABASE_URL must be set. Did you forget to provision a database?',
    );
  });

  it('returns warning utilization status when active connections are between 70% and 90%', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      pgStats: { totalCount: 16, idleCount: 1, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.utilization).toEqual({ percent: 75, status: 'warning' });
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(false);
  });

  it('uses testing pool configuration for standard provider', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/testingdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
    });

    const pgPool = setup.createdPgPools[0];
    expect(pgPool).toBeDefined();
    expect(pgPool?.options).toMatchObject({
      min: 1,
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      application_name: 'cjd-amiens-app',
    });
  });

  it('uses development fallback pool configuration when NODE_ENV is undefined', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/devdb',
      nodeEnv: undefined,
      pgStats: { totalCount: 2, idleCount: 2, waitingCount: 0 },
    });

    const pgPool = setup.createdPgPools[0];
    expect(pgPool).toBeDefined();
    expect(pgPool?.options).toMatchObject({
      min: 2,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
      application_name: 'cjd-amiens-app',
    });
  });
});

