import { afterEach, describe, expect, it, vi } from 'vitest';

type DbTsModule = typeof import('../../../server/db.ts');

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

type DrizzleLogger = {
  logQuery: (query: string, params: unknown) => void;
};

type DrizzleConfig = {
  client: unknown;
  schema: Record<string, unknown>;
  logger: DrizzleLogger | false;
};

class MockPool {
  public totalCount: number;
  public idleCount: number;
  public waitingCount: number;
  public options: Record<string, unknown>;
  public end: ReturnType<typeof vi.fn<() => Promise<void>>>;

  private readonly handlers = new Map<string, EventHandler>();

  public constructor(options: Record<string, unknown>, stats: PoolStats, shouldEndFail: boolean) {
    this.options = options;
    this.totalCount = stats.totalCount;
    this.idleCount = stats.idleCount;
    this.waitingCount = stats.waitingCount;
    this.end = shouldEndFail
      ? vi.fn(async () => {
          throw new Error('end failed');
        })
      : vi.fn(async () => undefined);
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

type LoadResult = {
  module: DbTsModule;
  createdNeonPools: MockPool[];
  createdPgPools: MockPool[];
  drizzleNeonMock: ReturnType<typeof vi.fn<(config: DrizzleConfig) => { mode: string }>>;
  drizzlePgMock: ReturnType<typeof vi.fn<(config: DrizzleConfig) => { mode: string }>>;
  loggerErrorMock: ReturnType<typeof vi.fn>;
  processOnSpy: ReturnType<typeof vi.spyOn<typeof process, 'on'>>;
};

async function loadDbTsModule(params: {
  databaseUrl: string;
  nodeEnv: string;
  neonStats?: PoolStats;
  pgStats?: PoolStats;
  poolEndShouldFail?: boolean;
}): Promise<LoadResult> {
  vi.resetModules();

  process.env.DATABASE_URL = params.databaseUrl;
  process.env.NODE_ENV = params.nodeEnv;

  const defaultStats: PoolStats = { totalCount: 0, idleCount: 0, waitingCount: 0 };
  const createdNeonPools: MockPool[] = [];
  const createdPgPools: MockPool[] = [];

  const drizzleNeonMock = vi.fn<(config: DrizzleConfig) => { mode: string }>(() => ({ mode: 'neon' }));
  const drizzlePgMock = vi.fn<(config: DrizzleConfig) => { mode: string }>(() => ({ mode: 'pg' }));

  const loggerErrorMock = vi.fn();
  const processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);

  vi.doMock('@neondatabase/serverless', () => {
    class NeonPoolMock extends MockPool {
      public constructor(options: Record<string, unknown>) {
        super(options, params.neonStats ?? defaultStats, params.poolEndShouldFail ?? false);
        createdNeonPools.push(this);
      }
    }

    return {
      neonConfig: {},
      Pool: NeonPoolMock,
    };
  });

  vi.doMock('pg', () => {
    class PgPoolMock extends MockPool {
      public constructor(options: Record<string, unknown>) {
        super(options, params.pgStats ?? defaultStats, params.poolEndShouldFail ?? false);
        createdPgPools.push(this);
      }
    }

    return { Pool: PgPoolMock };
  });

  vi.doMock('drizzle-orm/neon-serverless', () => ({
    drizzle: drizzleNeonMock,
  }));

  vi.doMock('drizzle-orm/node-postgres', () => ({
    drizzle: drizzlePgMock,
  }));

  vi.doMock('ws', () => ({
    default: { kind: 'ws-constructor' },
  }));

  vi.doMock('@shared/schema', () => ({}));

  vi.doMock('../../../server/lib/logger', () => ({
    logger: {
      error: loggerErrorMock,
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  }));

  const executeQueryMock = vi.fn(
    async <T>(queryFn: QueryFunction<T>, _options: QueryExecutionOptions): Promise<T> => queryFn(),
  );

  vi.doMock('../../../server/lib/db-resilience', () => ({
    DatabaseResilience: class {
      public executeQuery = executeQueryMock;
    },
  }));

  const module = await import('../../../server/db.ts');

  return {
    module,
    createdNeonPools,
    createdPgPools,
    drizzleNeonMock,
    drizzlePgMock,
    loggerErrorMock,
    processOnSpy,
  };
}

describe('server/db.ts iteration27a uncovered branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('uses development fallback pool config when NODE_ENV is neither production nor testing', async () => {
    const setup = await loadDbTsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'staging',
    });

    const poolOptions = setup.createdPgPools[0]?.options;
    expect(poolOptions).toMatchObject({
      min: 2,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
    });
  });

  it('covers neon development handlers, neon error logging, drizzle logger, and warning pool status', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = await loadDbTsModule({
      databaseUrl: 'postgresql://user:pass@db.neon.tech/mydb',
      nodeEnv: 'development',
      neonStats: { totalCount: 5, idleCount: 1, waitingCount: 2 },
    });

    const neonPool = setup.createdNeonPools[0];
    expect(neonPool).toBeDefined();

    neonPool?.emit('connect');
    neonPool?.emit('remove');

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('provider: neon'));

    const dbError = new Error('neon failed');
    neonPool?.emit('error', dbError, { id: 'client-neon' });

    expect(setup.loggerErrorMock).toHaveBeenCalledWith(
      'CRITICAL: Database pool error',
      expect.objectContaining({
        provider: 'neon',
        message: 'neon failed',
      }),
    );

    const drizzleConfig = setup.drizzleNeonMock.mock.calls[0]?.[0];
    expect(drizzleConfig?.logger).not.toBe(false);

    if (drizzleConfig?.logger && drizzleConfig.logger !== false) {
      drizzleConfig.logger.logQuery('select * from users where id = 1', []);
    }

    expect(consoleLogSpy).toHaveBeenCalledWith('[DB Query] select * from users where id = 1...');

    const stats = setup.module.getPoolStats();
    expect(stats.provider).toBe('neon');
    expect(stats.utilization).toEqual({ percent: 80, status: 'warning' });
  });

  it('covers standard development pool event handlers and drizzle pg query logger', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = await loadDbTsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      pgStats: { totalCount: 4, idleCount: 2, waitingCount: 0 },
    });

    const pgPool = setup.createdPgPools[0];
    expect(pgPool).toBeDefined();

    pgPool?.emit('connect');
    pgPool?.emit('remove');

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('provider: standard'));

    const drizzleConfig = setup.drizzlePgMock.mock.calls[0]?.[0];
    expect(drizzleConfig?.logger).not.toBe(false);

    if (drizzleConfig?.logger && drizzleConfig.logger !== false) {
      drizzleConfig.logger.logQuery('select now()', []);
    }

    expect(consoleLogSpy).toHaveBeenCalledWith('[DB Query] select now()...');
  });

  it('closes pool once and returns early on repeated SIGINT handler calls', async () => {
    const setup = await loadDbTsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
    });

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const sigintRegistration = setup.processOnSpy.mock.calls.find((call) => call[0] === 'SIGINT');
    expect(sigintRegistration).toBeTruthy();

    const handler = sigintRegistration?.[1];
    expect(typeof handler).toBe('function');

    if (typeof handler === 'function') {
      await handler();
      await handler();
    }

    expect(setup.createdPgPools[0]?.end).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith('[DB] Fermeture gracieuse du pool de connexions...');
    expect(consoleLogSpy).toHaveBeenCalledWith('[DB] Pool fermé');
  });

  it('logs closePool errors when pool.end throws through SIGTERM handler', async () => {
    const setup = await loadDbTsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
      poolEndShouldFail: true,
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const sigtermRegistration = setup.processOnSpy.mock.calls.find((call) => call[0] === 'SIGTERM');
    expect(sigtermRegistration).toBeTruthy();

    const handler = sigtermRegistration?.[1];
    expect(typeof handler).toBe('function');

    if (typeof handler === 'function') {
      await handler();
    }

    expect(setup.createdPgPools[0]?.end).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[DB] Erreur lors de la fermeture du pool:',
      expect.objectContaining({ message: 'end failed' }),
    );
  });
});
