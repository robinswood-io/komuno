import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type DbJsModule = typeof import('../../../server/db.js');
type EventHandler = (...args: unknown[]) => void;
type PoolStats = { totalCount: number; idleCount: number; waitingCount: number };
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
  public registeredEvents: string[] = [];
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
    this.registeredEvents.push(event);
    this.handlers.set(event, handler);
    return this;
  }
}

type LoadParams = {
  databaseUrl: string;
  nodeEnv?: string;
  stats?: PoolStats;
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

function clearInjectedCaches(): void {
  injectedPaths.forEach((modulePath) => {
    delete cjsRequire.cache[modulePath];
  });
}

function loadDbJsModule(params: LoadParams): { module: DbJsModule; pgPools: MockPool[] } {
  clearInjectedCaches();
  process.env.DATABASE_URL = params.databaseUrl;
  if (params.nodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = params.nodeEnv;
  }

  const stats = params.stats ?? { totalCount: 0, idleCount: 0, waitingCount: 0 };
  const pgPools: MockPool[] = [];

  class NeonPoolMock extends MockPool {}
  class PgPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, stats);
      pgPools.push(this);
    }
  }

  vi.spyOn(process, 'on').mockImplementation(() => process);
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  void consoleSpy;

  setCjsMock(neonModulePath, { neonConfig: {}, Pool: NeonPoolMock });
  setCjsMock(pgModulePath, { Pool: PgPoolMock });
  setCjsMock(drizzleNeonModulePath, { drizzle: vi.fn(() => ({ mode: 'neon' })) });
  setCjsMock(drizzlePgModulePath, { drizzle: vi.fn(() => ({ mode: 'pg' })) });
  setCjsMock(wsModulePath, { __esModule: true, default: { kind: 'ws' } });
  setCjsMock(schemaModulePath, {});
  setCjsMock(loggerModulePath, {
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  });
  setCjsMock(resilienceModulePath, {
    DatabaseResilience: class {
      public executeQuery = vi.fn(async <T>(queryFn: () => Promise<T>) => queryFn());
    },
  });

  delete cjsRequire.cache[dbModulePath];
  const module = cjsRequire(dbModulePath) as DbJsModule;
  return { module, pgPools };
}

describe('server/db.js iteration39 remaining env/default/development paths', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearInjectedCaches();
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('falls back to development pool limits when NODE_ENV is unset', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: undefined,
      stats: { totalCount: 2, idleCount: 2, waitingCount: 0 },
    });

    const pgPool = setup.pgPools[0];
    expect(pgPool?.options).toMatchObject({
      min: 2,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
    });
    // Listener "connect/remove" n'est branché que si NODE_ENV === 'development' strict.
    expect(pgPool?.registeredEvents).toEqual(['error']);
  });

  it('keeps healthy pool status when utilization stays at or below 70%', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      stats: { totalCount: 14, idleCount: 0, waitingCount: 1 },
    });

    const stats = setup.module.getPoolStats();
    expect(stats.utilization.percent).toBe(70);
    expect(stats.utilization.status).toBe('healthy');
    expect(stats.warning.breached).toBe(false);
    expect(stats.critical.breached).toBe(false);
  });
});
