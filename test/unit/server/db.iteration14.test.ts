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

type LoggerLike = {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
};

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
  signalHandlers: Map<string, EventHandler>;
  loggerMock: LoggerLike;
};

type CjsModule = {
  id: string;
  filename: string;
  loaded: boolean;
  children: unknown[];
  paths: string[];
  exports: unknown;
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

  const loggerMock: LoggerLike = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  };

  const executeQueryMock = vi.fn(
    async (queryFn: QueryFunction<unknown>, _options: QueryExecutionOptions): Promise<unknown> => queryFn(),
  );

  const signalHandlers = new Map<string, EventHandler>();
  vi.spyOn(process, 'on').mockImplementation((signal: NodeJS.Signals, listener: EventHandler) => {
    signalHandlers.set(signal, listener);
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
    loggerMock,
  };
}

describe('server/db.js iteration14', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    injectedPaths.forEach((modulePath) => {
      delete cjsRequire.cache[modulePath];
    });
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('handles SIGTERM closePool error path and logs console.error', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
      endRejects: true,
    });

    const termHandler = setup.signalHandlers.get('SIGTERM');
    expect(termHandler).toBeTypeOf('function');

    if (termHandler) {
      await termHandler();
    }

    expect(setup.createdPgPools[0]?.end).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('[DB] Fermeture gracieuse du pool de connexions...');
    expect(errorSpy).toHaveBeenCalledWith(
      '[DB] Erreur lors de la fermeture du pool:',
      expect.any(Error),
    );
  });

  it('closePool is idempotent on repeated SIGINT calls (second call is no-op)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      pgStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
    });

    const intHandler = setup.signalHandlers.get('SIGINT');
    expect(intHandler).toBeTypeOf('function');

    if (intHandler) {
      await intHandler();
      await intHandler();
    }

    expect(setup.createdPgPools[0]?.end).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('[DB] Pool fermé');
  });

  it('logs connect/remove messages in development for standard provider', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      pgStats: { totalCount: 4, idleCount: 2, waitingCount: 0 },
    });

    const pgPool = setup.createdPgPools[0];
    expect(pgPool).toBeDefined();
    pgPool?.emit('connect');
    pgPool?.emit('remove');

    expect(logSpy).toHaveBeenCalledWith(
      '[DB] Nouvelle connexion établie (provider: standard, pool: 4)',
    );
    expect(logSpy).toHaveBeenCalledWith(
      '[DB] Connexion fermée (provider: standard, pool: 4)',
    );
  });

  it('logs critical pool error with neon provider metadata', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'testing',
      neonStats: { totalCount: 9, idleCount: 3, waitingCount: 2 },
    });

    const neonPool = setup.createdNeonPools[0];
    expect(neonPool).toBeDefined();

    const poolError = new Error('neon pool exploded');
    neonPool?.emit('error', poolError, { id: 'client-1' });

    expect(setup.loggerMock.error).toHaveBeenCalledWith(
      'CRITICAL: Database pool error',
      expect.objectContaining({
        provider: 'neon',
        message: 'neon pool exploded',
        poolStats: {
          totalCount: 9,
          idleCount: 3,
          waitingCount: 2,
        },
      }),
    );
  });
});
