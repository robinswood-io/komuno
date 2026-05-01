import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { createRequire } from 'node:module';

type QueryExecutionOptions = {
  timeout: number;
  retry: boolean;
};

type QueryFunction<T> = () => Promise<T>;

type EventHandler = (...args: unknown[]) => void;

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
  module: typeof import('../../../server/db.js');
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

const cjsRequire = createRequire(import.meta.url);
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const dbRequire = createRequire(dbModulePath);

const neonModulePath = dbRequire.resolve('@neondatabase/serverless');
const pgModulePath = dbRequire.resolve('pg');
const drizzleNeonModulePath = dbRequire.resolve('drizzle-orm/neon-serverless');
const drizzlePgModulePath = dbRequire.resolve('drizzle-orm/node-postgres');
const wsModulePath = dbRequire.resolve('ws');
const schemaModulePath = dbRequire.resolve('../shared/schema');
const loggerModulePath = dbRequire.resolve('./lib/logger');
const dbResilienceModulePath = dbRequire.resolve('./lib/db-resilience');

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

const loadDbModule = async (params: {
  databaseUrl?: string;
  nodeEnv?: string;
  neonStats?: { totalCount: number; idleCount: number; waitingCount: number };
  pgStats?: { totalCount: number; idleCount: number; waitingCount: number };
}): Promise<ModuleSetupResult> => {
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

  const loggerErrorMock = vi.fn();

  const executeQueryMock = vi.fn(
    async <T>(queryFn: QueryFunction<T>, _options: QueryExecutionOptions): Promise<T> => queryFn(),
  );

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
    default: { kind: 'ws-constructor' },
  });

  setCjsMock(schemaModulePath, {});

  setCjsMock(loggerModulePath, {
    logger: {
      error: loggerErrorMock,
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  });

  setCjsMock(dbResilienceModulePath, {
    DatabaseResilience: class {
      public executeQuery = executeQueryMock;
    },
  });

  delete cjsRequire.cache[dbModulePath];
  const module = (cjsRequire(dbModulePath) as typeof import('../../../server/db.js'));

  return {
    module,
    neonConfigMock,
    executeQueryMock,
    loggerErrorMock,
    createdNeonPools,
    createdPgPools,
  };
};

describe('server/db.js iteration9', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    injectedPaths.forEach((modulePath) => {
      delete cjsRequire.cache[modulePath];
    });
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('applique la config development par défaut pour provider standard', async () => {
    const setup = await loadDbModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: undefined,
      pgStats: { totalCount: 2, idleCount: 1, waitingCount: 0 },
    });

    expect(setup.createdPgPools).toHaveLength(1);
    const poolOptions = setup.createdPgPools[0]?.options;

    expect(poolOptions).toMatchObject({
      max: 5,
      min: 2,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
      application_name: 'cjd-amiens-app',
      connectionString: 'postgresql://user:pass@localhost:5432/appdb',
    });
  });

  it('runDbQuery utilise le profil normal par défaut', async () => {
    const setup = await loadDbModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const payload = { ok: true };
    const result = await setup.module.runDbQuery(async () => payload);

    expect(result).toEqual(payload);
    expect(setup.executeQueryMock).toHaveBeenCalledTimes(1);
    const firstCall = setup.executeQueryMock.mock.calls[0];
    expect(typeof firstCall?.[0]).toBe('function');
    expect(firstCall?.[1]).toEqual({
      timeout: 5000,
      retry: true,
    });
  });

  it('runDbQuery applique le profil background', async () => {
    const setup = await loadDbModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const payload = { done: true };
    const result = await setup.module.runDbQuery(async () => payload, 'background');

    expect(result).toEqual(payload);
    expect(setup.executeQueryMock).toHaveBeenCalledTimes(1);
    const firstCall = setup.executeQueryMock.mock.calls[0];
    expect(typeof firstCall?.[0]).toBe('function');
    expect(firstCall?.[1]).toEqual({
      timeout: 15000,
      retry: true,
    });
  });

  it('getPoolStats retourne un statut warning entre 70% et 90%', async () => {
    const setup = await loadDbModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      pgStats: { totalCount: 15, idleCount: 0, waitingCount: 2 },
    });

    const stats = setup.module.getPoolStats();

    expect(stats.provider).toBe('standard');
    expect(stats.activeCount).toBe(15);
    expect(stats.utilization).toEqual({ percent: 75, status: 'warning' });
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(false);
  });

  it('log les erreurs du pool Neon avec provider neon', async () => {
    const setup = await loadDbModule({
      databaseUrl: 'postgresql://user:pass@x.neon.tech/appdb',
      nodeEnv: 'testing',
      neonStats: { totalCount: 3, idleCount: 1, waitingCount: 1 },
    });

    expect(setup.createdNeonPools).toHaveLength(1);

    const testError = new Error('neon pool issue');
    setup.createdNeonPools[0]?.emit('error', testError, { id: 'client' });

    expect(setup.loggerErrorMock).toHaveBeenCalledTimes(1);
    expect(setup.loggerErrorMock).toHaveBeenCalledWith(
      'CRITICAL: Database pool error',
      expect.objectContaining({
        provider: 'neon',
        message: 'neon pool issue',
        type: 'dbPoolError',
      }),
    );
  });

  it('en mode development, les événements connect/remove déclenchent des logs', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = await loadDbModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      pgStats: { totalCount: 2, idleCount: 1, waitingCount: 0 },
    });

    const pool = setup.createdPgPools[0];
    expect(pool).toBeDefined();

    pool?.emit('connect');
    pool?.emit('remove');

    expect(logSpy).toHaveBeenCalledWith(
      '[DB] Nouvelle connexion établie (provider: standard, pool: 2)',
    );
    expect(logSpy).toHaveBeenCalledWith(
      '[DB] Connexion fermée (provider: standard, pool: 2)',
    );
  });

  it('enregistre les handlers de signaux SIGTERM et SIGINT', async () => {
    const processOnSpy = vi.spyOn(process, 'on');

    await loadDbModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
    });

    const signals = processOnSpy.mock.calls.map(([signal]) => signal);

    expect(signals).toContain('SIGTERM');
    expect(signals).toContain('SIGINT');
  });
});
