import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type DbJsModule = typeof import('../../../server/db.js');

type EventHandler = (...args: unknown[]) => void;

type PoolStats = {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
};

type CjsCacheModule = {
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
  public end: ReturnType<typeof vi.fn<() => Promise<void>>>;

  public constructor(stats: PoolStats, endImpl?: () => Promise<void>) {
    this.totalCount = stats.totalCount;
    this.idleCount = stats.idleCount;
    this.waitingCount = stats.waitingCount;
    this.end = vi.fn(endImpl ?? (async () => undefined));
  }

  public on(_event: string, _handler: EventHandler): this {
    return this;
  }
}

const cjsRequire = createRequire(import.meta.url);
const dbJsModulePath = cjsRequire.resolve('../../../server/db.js');
const neonModulePath = cjsRequire.resolve('@neondatabase/serverless');
const pgModulePath = cjsRequire.resolve('pg');
const drizzleNeonModulePath = cjsRequire.resolve('drizzle-orm/neon-serverless');
const drizzlePgModulePath = cjsRequire.resolve('drizzle-orm/node-postgres');
const wsModulePath = cjsRequire.resolve('ws');
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const resilienceModulePath = cjsRequire.resolve('../../../server/lib/db-resilience.js');

const injectedPaths = [
  dbJsModulePath,
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
  const previous = cjsRequire.cache[modulePath] as CjsCacheModule | undefined;
  cjsRequire.cache[modulePath] = {
    ...(previous ?? {
      id: modulePath,
      filename: modulePath,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: moduleExports,
  } as CjsCacheModule;
}

function loadDbJsModule(params: {
  databaseUrl: string;
  nodeEnv: 'development' | 'testing' | 'production';
  provider: 'neon' | 'standard';
  stats: PoolStats;
  endReject?: Error;
  processOnSpy: ReturnType<typeof vi.spyOn<typeof process, 'on'>>;
}): { module: DbJsModule; poolInstance: MockPool } {
  process.env.DATABASE_URL = params.databaseUrl;
  process.env.NODE_ENV = params.nodeEnv;

  const poolInstance = new MockPool(
    params.stats,
    params.endReject ? async () => Promise.reject(params.endReject) : async () => undefined,
  );

  params.processOnSpy.mockImplementation(() => process);

  setCjsMock(neonModulePath, {
    neonConfig: {},
    Pool: class {
      public constructor(_options: Record<string, unknown>) {
        return poolInstance;
      }
    },
  });

  setCjsMock(pgModulePath, {
    Pool: class {
      public constructor(_options: Record<string, unknown>) {
        return poolInstance;
      }
    },
  });

  setCjsMock(drizzleNeonModulePath, { drizzle: vi.fn(() => ({ mode: 'neon' })) });
  setCjsMock(drizzlePgModulePath, { drizzle: vi.fn(() => ({ mode: 'pg' })) });
  setCjsMock(wsModulePath, { __esModule: true, default: { kind: 'ws-constructor' } });
  setCjsMock(schemaModulePath, {});
  setCjsMock(loggerModulePath, { logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } });
  setCjsMock(resilienceModulePath, {
    DatabaseResilience: class {
      public executeQuery = vi.fn(async (queryFn: () => Promise<unknown>) => queryFn());
    },
  });

  delete cjsRequire.cache[dbJsModulePath];
  const module = cjsRequire(dbJsModulePath) as DbJsModule;
  return { module, poolInstance };
}

describe('server/db.js iteration18 warning status and closePool catch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    injectedPaths.forEach((modulePath) => {
      delete cjsRequire.cache[modulePath];
    });
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('computes warning utilization status when utilization is between 70 and 90', () => {
    const processOnSpy = vi.spyOn(process, 'on');
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'production',
      provider: 'standard',
      stats: { totalCount: 16, idleCount: 1, waitingCount: 0 },
      processOnSpy,
    });

    const stats = setup.module.getPoolStats();

    expect(stats.provider).toBe('standard');
    expect(stats.utilization.status).toBe('warning');
    expect(stats.utilization.percent).toBe(75);
    expect(stats.warning.breached).toBe(true);
    expect(stats.critical.breached).toBe(false);
  });

  it('handles pool.end rejection in closePool through SIGTERM handler', async () => {
    const processOnSpy = vi.spyOn(process, 'on');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      provider: 'standard',
      stats: { totalCount: 2, idleCount: 1, waitingCount: 0 },
      endReject: new Error('pool close failed'),
      processOnSpy,
    });

    const sigtermRegistration = processOnSpy.mock.calls.find((call) => call[0] === 'SIGTERM');
    expect(sigtermRegistration).toBeTruthy();

    const handler = sigtermRegistration?.[1];
    expect(typeof handler).toBe('function');

    if (typeof handler === 'function') {
      await handler();
    }

    expect(setup.poolInstance.end).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[DB] Erreur lors de la fermeture du pool:',
      expect.objectContaining({ message: 'pool close failed' }),
    );
  });

  it('executes closePool success path once, then returns early on second signal', async () => {
    const processOnSpy = vi.spyOn(process, 'on');
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      provider: 'standard',
      stats: { totalCount: 3, idleCount: 1, waitingCount: 0 },
      processOnSpy,
    });

    const sigintRegistration = processOnSpy.mock.calls.find((call) => call[0] === 'SIGINT');
    expect(sigintRegistration).toBeTruthy();

    const handler = sigintRegistration?.[1];
    expect(typeof handler).toBe('function');

    if (typeof handler === 'function') {
      await handler();
      await handler();
    }

    expect(setup.poolInstance.end).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith('[DB] Fermeture gracieuse du pool de connexions...');
    expect(consoleLogSpy).toHaveBeenCalledWith('[DB] Pool fermé');
  });
});
