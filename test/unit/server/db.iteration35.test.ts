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
  neonStats?: PoolStats;
  pgStats?: PoolStats;
};

type LoadResult = {
  module: DbJsModule;
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
  setCjsMock(schemaModulePath, {});
  setCjsMock(loggerModulePath, {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  });
  setCjsMock(resilienceModulePath, {
    DatabaseResilience: class {
      public executeQuery = vi.fn(async <T>(queryFn: () => Promise<T>) => queryFn());
    },
  });

  delete cjsRequire.cache[dbModulePath];
  const module = cjsRequire(dbModulePath) as DbJsModule;

  return {
    module,
    createdNeonPools,
    createdPgPools,
  };
}

describe('server/db.js iteration35 - remaining branch and edge paths', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearCaches();
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('throws when DATABASE_URL is an empty string', () => {
    expect(() =>
      loadDbJsModule({
        databaseUrl: '',
        nodeEnv: 'testing',
      }),
    ).toThrow('DATABASE_URL must be set');
  });

  it('treats uppercase NEON host as standard provider and keeps dev-only logs disabled in production', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.NEON.TECH/appdb',
      nodeEnv: 'production',
      pgStats: { totalCount: 3, idleCount: 1, waitingCount: 0 },
    });

    expect(setup.createdNeonPools).toHaveLength(0);
    expect(setup.createdPgPools).toHaveLength(1);

    const pool = setup.createdPgPools[0];
    pool?.emit('connect');
    pool?.emit('remove');

    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Nouvelle connexion établie'));
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Connexion fermée'));
  });

  it('keeps utilization healthy exactly at 70% active connections', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      pgStats: { totalCount: 14, idleCount: 0, waitingCount: 1 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.activeCount).toBe(14);
    expect(stats.utilization).toEqual({ percent: 70, status: 'healthy' });
    expect(stats.warning.breached).toBe(false);
    expect(stats.critical.breached).toBe(false);
  });

  it('keeps utilization warning exactly at 90% active connections', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      pgStats: { totalCount: 18, idleCount: 0, waitingCount: 0 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.activeCount).toBe(18);
    expect(stats.utilization).toEqual({ percent: 90, status: 'warning' });
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(false);
  });
});
