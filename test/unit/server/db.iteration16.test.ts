import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type DbJsModule = typeof import('../../../server/db.js');
type EventHandler = (...args: unknown[]) => void;

type PoolStats = {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
};

type LoggerLike = {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
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

  public constructor(options: Record<string, unknown>, stats: PoolStats, endImpl?: () => Promise<void>) {
    this.options = options;
    this.totalCount = stats.totalCount;
    this.idleCount = stats.idleCount;
    this.waitingCount = stats.waitingCount;
    this.end = vi.fn(endImpl ?? (async () => undefined));
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
  databaseUrl: string;
  nodeEnv: 'development' | 'testing' | 'production';
  neonStats?: PoolStats;
  pgStats?: PoolStats;
  poolEndReject?: boolean;
};

type LoadResult = {
  module: DbJsModule;
  createdNeonPools: MockPool[];
  createdPgPools: MockPool[];
  processOnSpy: ReturnType<typeof vi.spyOn>;
  consoleLogSpy: ReturnType<typeof vi.spyOn>;
  consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  loggerMock: LoggerLike;
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
  process.env.DATABASE_URL = params.databaseUrl;
  process.env.NODE_ENV = params.nodeEnv;

  const defaultStats: PoolStats = { totalCount: 0, idleCount: 0, waitingCount: 0 };
  const createdNeonPools: MockPool[] = [];
  const createdPgPools: MockPool[] = [];

  const endImpl = params.poolEndReject
    ? async () => {
        throw new Error('end failed');
      }
    : undefined;

  class NeonPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, params.neonStats ?? defaultStats, endImpl);
      createdNeonPools.push(this);
    }
  }

  class PgPoolMock extends MockPool {
    public constructor(options: Record<string, unknown>) {
      super(options, params.pgStats ?? defaultStats, endImpl);
      createdPgPools.push(this);
    }
  }

  const loggerMock: LoggerLike = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

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
      public executeQuery = vi.fn();
    },
  });

  delete cjsRequire.cache[dbModulePath];
  const module = cjsRequire(dbModulePath) as DbJsModule;

  return {
    module,
    createdNeonPools,
    createdPgPools,
    processOnSpy,
    consoleLogSpy,
    consoleErrorSpy,
    loggerMock,
  };
}

describe('server/db.js iteration16 runtime handlers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    injectedPaths.forEach((modulePath) => {
      delete cjsRequire.cache[modulePath];
    });
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('registers SIGTERM/SIGINT handlers and closes pool once on repeated signal (standard provider)', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'development',
      pgStats: { totalCount: 2, idleCount: 1, waitingCount: 0 },
    });

    const pool = setup.createdPgPools[0];
    expect(pool).toBeDefined();

    pool?.emit('connect');
    pool?.emit('remove');

    expect(setup.consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Nouvelle connexion établie'));
    expect(setup.consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Connexion fermée'));

    const sigtermCall = setup.processOnSpy.mock.calls.find((call) => call[0] === 'SIGTERM');
    const sigintCall = setup.processOnSpy.mock.calls.find((call) => call[0] === 'SIGINT');

    expect(sigtermCall).toBeDefined();
    expect(sigintCall).toBeDefined();

    const sigtermHandler = sigtermCall?.[1] as (() => Promise<void>) | undefined;
    const sigintHandler = sigintCall?.[1] as (() => Promise<void>) | undefined;
    expect(sigtermHandler).toBeDefined();
    expect(sigintHandler).toBeDefined();

    await sigtermHandler?.();
    await sigintHandler?.();

    expect(pool?.end).toHaveBeenCalledTimes(1);
    expect(setup.consoleLogSpy).toHaveBeenCalledWith('[DB] Fermeture gracieuse du pool de connexions...');
    expect(setup.consoleLogSpy).toHaveBeenCalledWith('[DB] Pool fermé');
  });

  it('handles pool.end failure path and logs console error (neon provider)', async () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@cluster.neon.tech/appdb',
      nodeEnv: 'testing',
      neonStats: { totalCount: 1, idleCount: 1, waitingCount: 0 },
      poolEndReject: true,
    });

    const pool = setup.createdNeonPools[0];
    expect(pool).toBeDefined();

    const sigtermCall = setup.processOnSpy.mock.calls.find((call) => call[0] === 'SIGTERM');
    expect(sigtermCall).toBeDefined();

    const sigtermHandler = sigtermCall?.[1] as (() => Promise<void>) | undefined;
    await sigtermHandler?.();

    expect(pool?.end).toHaveBeenCalledTimes(1);
    expect(setup.consoleErrorSpy).toHaveBeenCalledWith(
      '[DB] Erreur lors de la fermeture du pool:',
      expect.objectContaining({ message: 'end failed' }),
    );
  });
});
