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

type DrizzleConfig = {
  client: unknown;
  schema: Record<string, unknown>;
  logger: { logQuery: (query: string, params: unknown) => void } | false;
};

class MockPool {
  public totalCount: number;
  public idleCount: number;
  public waitingCount: number;

  public constructor(_options: Record<string, unknown>, stats: PoolStats) {
    this.totalCount = stats.totalCount;
    this.idleCount = stats.idleCount;
    this.waitingCount = stats.waitingCount;
  }

  public on(_event: string, _handler: EventHandler): this {
    return this;
  }

  public end = vi.fn(async () => undefined);
}

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

function loadDbJsModule(params: {
  databaseUrl: string;
  nodeEnv: 'development' | 'testing' | 'production';
  schemaExports: Record<string, unknown>;
  wsExports: unknown;
}): {
  module: DbJsModule;
  drizzleNeonSpy: ReturnType<typeof vi.fn<(cfg: DrizzleConfig) => { mode: string }>>;
  drizzlePgSpy: ReturnType<typeof vi.fn<(cfg: DrizzleConfig) => { mode: string }>>;
  neonConfigMock: {
    webSocketConstructor?: unknown;
    poolQueryViaFetch?: boolean;
    fetchEndpoint?: (host: string) => string;
  };
} {
  process.env.DATABASE_URL = params.databaseUrl;
  process.env.NODE_ENV = params.nodeEnv;

  const neonConfigMock: {
    webSocketConstructor?: unknown;
    poolQueryViaFetch?: boolean;
    fetchEndpoint?: (host: string) => string;
  } = {};

  const drizzleNeonSpy = vi.fn<(cfg: DrizzleConfig) => { mode: string }>(() => ({ mode: 'neon' }));
  const drizzlePgSpy = vi.fn<(cfg: DrizzleConfig) => { mode: string }>(() => ({ mode: 'pg' }));

  vi.spyOn(process, 'on').mockImplementation(() => process);

  setCjsMock(neonModulePath, {
    neonConfig: neonConfigMock,
    Pool: class extends MockPool {
      public constructor(options: Record<string, unknown>) {
        super(options, { totalCount: 0, idleCount: 0, waitingCount: 0 });
      }
    },
  });

  setCjsMock(pgModulePath, {
    Pool: class extends MockPool {
      public constructor(options: Record<string, unknown>) {
        super(options, { totalCount: 0, idleCount: 0, waitingCount: 0 });
      }
    },
  });

  setCjsMock(drizzleNeonModulePath, { drizzle: drizzleNeonSpy });
  setCjsMock(drizzlePgModulePath, { drizzle: drizzlePgSpy });
  setCjsMock(wsModulePath, params.wsExports);
  setCjsMock(schemaModulePath, params.schemaExports);
  setCjsMock(loggerModulePath, {
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
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
    drizzleNeonSpy,
    drizzlePgSpy,
    neonConfigMock,
  };
}

describe('server/db.js iteration26a import helper branches', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    injectedPaths.forEach((modulePath) => {
      delete cjsRequire.cache[modulePath];
    });
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
  });

  it('uses __importStar bindings for named schema exports passed to drizzle config', () => {
    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@localhost:5432/appdb',
      nodeEnv: 'testing',
      schemaExports: {
        users: { tableName: 'users' },
      },
      wsExports: { __esModule: true, default: { kind: 'ws-constructor' } },
    });

    expect(setup.drizzlePgSpy).toHaveBeenCalledTimes(1);

    const drizzleArgs = setup.drizzlePgSpy.mock.calls[0]?.[0];
    expect(drizzleArgs?.schema).toMatchObject({
      users: { tableName: 'users' },
    });
    expect(drizzleArgs?.schema).toHaveProperty('default');
  });

  it('uses __importDefault fallback when ws module is CommonJS-shaped without __esModule', () => {
    const wsCjsExport = { kind: 'ws-commonjs-constructor' };

    const setup = loadDbJsModule({
      databaseUrl: 'postgresql://user:pass@db.neon.tech/mydb',
      nodeEnv: 'production',
      schemaExports: {},
      wsExports: wsCjsExport,
    });

    expect(setup.drizzleNeonSpy).toHaveBeenCalledTimes(1);
    expect(setup.neonConfigMock.webSocketConstructor).toBe(wsCjsExport);
    expect(setup.neonConfigMock.poolQueryViaFetch).toBe(true);
  });
});
