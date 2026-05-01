import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryExecutionOptions = {
  timeout: number;
  retry: boolean;
};

type QueryFunction<T> = () => Promise<T>;

type EventHandler = (...args: unknown[]) => void;

class MockPool {
  public totalCount: number;
  public idleCount: number;
  public waitingCount: number;
  public options: Record<string, unknown>;
  public end = vi.fn(async () => undefined);

  private readonly handlers = new Map<string, EventHandler>();

  public constructor(
    options: Record<string, unknown>,
    stats: { totalCount: number; idleCount: number; waitingCount: number },
  ) {
    this.options = options;
    this.totalCount = stats.totalCount;
    this.idleCount = stats.idleCount;
    this.waitingCount = stats.waitingCount;
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

type ModuleSetupResult = {
  module: typeof import('../../../server/db.ts');
  neonConfigMock: {
    webSocketConstructor?: unknown;
    poolQueryViaFetch?: boolean;
    fetchEndpoint?: (host: string) => string;
  };
  executeQueryMock: ReturnType<typeof vi.fn>;
  loggerErrorMock: ReturnType<typeof vi.fn>;
  createdNeonPools: MockPool[];
  createdPgPools: MockPool[];
};

const loadDbModule = async (params: {
  databaseUrl?: string;
  nodeEnv?: string;
  neonStats?: { totalCount: number; idleCount: number; waitingCount: number };
  pgStats?: { totalCount: number; idleCount: number; waitingCount: number };
}): Promise<ModuleSetupResult> => {
  vi.resetModules();

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

  const defaultStats = { totalCount: 0, idleCount: 0, waitingCount: 0 };
  const createdNeonPools: MockPool[] = [];
  const createdPgPools: MockPool[] = [];

  vi.doMock('@neondatabase/serverless', () => {
    class NeonPoolMock extends MockPool {
      public constructor(options: Record<string, unknown>) {
        super(options, params.neonStats ?? defaultStats);
        createdNeonPools.push(this);
      }
    }

    return {
      neonConfig: neonConfigMock,
      Pool: NeonPoolMock,
    };
  });

  vi.doMock('pg', () => {
    class PgPoolMock extends MockPool {
      public constructor(options: Record<string, unknown>) {
        super(options, params.pgStats ?? defaultStats);
        createdPgPools.push(this);
      }
    }

    return { Pool: PgPoolMock };
  });

  vi.doMock('drizzle-orm/neon-serverless', () => ({
    drizzle: vi.fn(() => ({ mode: 'neon' })),
  }));

  vi.doMock('drizzle-orm/node-postgres', () => ({
    drizzle: vi.fn(() => ({ mode: 'pg' })),
  }));

  vi.doMock('ws', () => ({
    default: { kind: 'ws-constructor' },
  }));

  vi.doMock('../../../shared/schema', () => ({}));

  const loggerErrorMock = vi.fn();
  vi.doMock('../../../server/lib/logger', () => ({
    logger: {
      error: loggerErrorMock,
      info: vi.fn(),
      warn: vi.fn(),
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
    neonConfigMock,
    executeQueryMock,
    loggerErrorMock,
    createdNeonPools,
    createdPgPools,
  };
};

describe('server/db.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when DATABASE_URL is missing', async () => {
    await expect(loadDbModule({ databaseUrl: undefined, nodeEnv: 'testing' })).rejects.toThrow(
      'DATABASE_URL must be set',
    );
  });

  it('initializes Neon provider and configures neonConfig', async () => {
    const setup = await loadDbModule({
      databaseUrl: 'postgresql://user:pass@db.neon.tech/mydb',
      nodeEnv: 'production',
      neonStats: { totalCount: 12, idleCount: 2, waitingCount: 1 },
    });

    expect(setup.createdNeonPools).toHaveLength(1);
    expect(setup.createdPgPools).toHaveLength(0);

    expect(setup.neonConfigMock.poolQueryViaFetch).toBe(true);
    expect(setup.neonConfigMock.fetchEndpoint?.('example.neon.tech')).toBe('https://example.neon.tech/sql');
    expect(setup.neonConfigMock.webSocketConstructor).toEqual({ kind: 'ws-constructor' });

    const poolOptions = setup.createdNeonPools[0]?.options;
    expect(poolOptions).toMatchObject({
      max: 20,
      min: 5,
      allowExitOnIdle: false,
      connectionString: 'postgresql://user:pass@db.neon.tech/mydb',
    });
  });

  it('initializes standard PostgreSQL provider with testing pool limits', async () => {
    const setup = await loadDbModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
    });

    expect(setup.createdPgPools).toHaveLength(1);
    expect(setup.createdNeonPools).toHaveLength(0);

    const poolOptions = setup.createdPgPools[0]?.options;
    expect(poolOptions).toMatchObject({
      max: 2,
      min: 1,
      application_name: 'cjd-amiens-app',
      connectionString: 'postgresql://user:pass@localhost:5432/appdb',
    });
  });

  it('runDbQuery forwards timeout profile to DatabaseResilience', async () => {
    const setup = await loadDbModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const queryResult = { ok: true };
    const result = await setup.module.runDbQuery(async () => queryResult, 'quick');

    expect(result).toEqual(queryResult);
    expect(setup.executeQueryMock).toHaveBeenCalledTimes(1);
    expect(setup.executeQueryMock).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 2000,
      retry: false,
    });
  });

  it('getPoolStats returns critical utilization status at 100% usage', async () => {
    const setup = await loadDbModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 2, idleCount: 0, waitingCount: 3 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.provider).toBe('standard');
    expect(stats.activeCount).toBe(2);
    expect(stats.utilization).toEqual({ percent: 100, status: 'critical' });
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(false);
  });

  it('logs critical pool errors through logger.error handler', async () => {
    const setup = await loadDbModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 2, idleCount: 1, waitingCount: 0 },
    });

    const pool = setup.createdPgPools[0];
    expect(pool).toBeDefined();

    const testError = new Error('pool exploded');
    pool?.emit('error', testError, { id: 'mock-client' });

    expect(setup.loggerErrorMock).toHaveBeenCalledTimes(1);
    expect(setup.loggerErrorMock).toHaveBeenCalledWith(
      'CRITICAL: Database pool error',
      expect.objectContaining({
        provider: 'standard',
        message: 'pool exploded',
        type: 'dbPoolError',
      }),
    );
  });
});
