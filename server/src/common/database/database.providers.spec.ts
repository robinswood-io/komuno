import { afterEach, describe, expect, it, vi } from 'vitest';

type PoolOptions = Record<string, unknown>;

class MockPool {
  public options: PoolOptions;

  public constructor(options: PoolOptions) {
    this.options = options;
  }
}

type NeonConfigMock = {
  webSocketConstructor?: unknown;
  poolQueryViaFetch?: boolean;
  fetchEndpoint?: (host: string) => string;
};

type LoadedModule = {
  module: typeof import('./database.providers');
  createdNeonPools: MockPool[];
  createdPgPools: MockPool[];
  neonConfigMock: NeonConfigMock;
  drizzleNeonMock: ReturnType<typeof vi.fn>;
  drizzlePgMock: ReturnType<typeof vi.fn>;
  wsDefaultMock: { kind: string };
  schemaMock: { schemaMarker: string };
};

const originalDatabaseUrl = process.env.DATABASE_URL;

const loadDatabaseProvidersModule = async (
  databaseUrl: string | undefined,
): Promise<LoadedModule> => {
  vi.resetModules();

  if (databaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = databaseUrl;
  }

  const createdNeonPools: MockPool[] = [];
  const createdPgPools: MockPool[] = [];
  const neonConfigMock: NeonConfigMock = {};
  const wsDefaultMock = { kind: 'ws-constructor' };
  const schemaMock = { schemaMarker: 'schema' };

  vi.doMock('@neondatabase/serverless', () => {
    class NeonPoolMock extends MockPool {
      public constructor(options: PoolOptions) {
        super(options);
        createdNeonPools.push(this);
      }
    }

    return {
      Pool: NeonPoolMock,
      neonConfig: neonConfigMock,
    };
  });

  vi.doMock('pg', () => {
    class PgPoolMock extends MockPool {
      public constructor(options: PoolOptions) {
        super(options);
        createdPgPools.push(this);
      }
    }

    return {
      Pool: PgPoolMock,
    };
  });

  const drizzleNeonMock = vi.fn(() => ({ adapter: 'neon' }));
  const drizzlePgMock = vi.fn(() => ({ adapter: 'pg' }));

  vi.doMock('drizzle-orm/neon-serverless', () => ({ drizzle: drizzleNeonMock }));
  vi.doMock('drizzle-orm/node-postgres', () => ({ drizzle: drizzlePgMock }));

  vi.doMock('ws', () => ({ default: wsDefaultMock }));
  vi.doMock('../../../../shared/schema', () => schemaMock);

  const module = await import('./database.providers');

  return {
    module,
    createdNeonPools,
    createdPgPools,
    neonConfigMock,
    drizzleNeonMock,
    drizzlePgMock,
    wsDefaultMock,
    schemaMock,
  };
};

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
  vi.clearAllMocks();
});

describe('database.providers', () => {
  it('throws when DATABASE_URL is missing', async () => {
    await expect(loadDatabaseProvidersModule(undefined)).rejects.toThrow(
      'DATABASE_URL must be set',
    );
  });

  it('uses Neon provider and Neon-specific config when DATABASE_URL contains neon.tech', async () => {
    const setup = await loadDatabaseProvidersModule(
      'postgresql://user:pass@project.neon.tech/dbname',
    );

    expect(setup.createdNeonPools).toHaveLength(1);
    expect(setup.createdPgPools).toHaveLength(0);

    expect(setup.neonConfigMock.webSocketConstructor).toEqual(setup.wsDefaultMock);
    expect(setup.neonConfigMock.poolQueryViaFetch).toBe(true);
    expect(setup.neonConfigMock.fetchEndpoint?.('project.neon.tech')).toBe(
      'https://project.neon.tech/sql',
    );

    const neonPoolOptions = setup.createdNeonPools[0]?.options;
    expect(neonPoolOptions).toMatchObject({
      connectionString: 'postgresql://user:pass@project.neon.tech/dbname',
      max: 20,
      min: 2,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 3000,
      maxUses: 10000,
      allowExitOnIdle: false,
    });

    expect(setup.drizzleNeonMock).toHaveBeenCalledTimes(1);
    expect(setup.drizzlePgMock).not.toHaveBeenCalled();
    expect(setup.drizzleNeonMock).toHaveBeenCalledWith(
      setup.createdNeonPools[0],
      { schema: setup.schemaMock },
    );

    expect(setup.module.databaseProviders).toHaveLength(2);
    expect(setup.module.databaseProviders[0]).toMatchObject({
      provide: setup.module.DATABASE_POOL,
      useValue: setup.createdNeonPools[0],
    });
    expect(setup.module.databaseProviders[1]).toMatchObject({
      provide: setup.module.DATABASE,
      useValue: { adapter: 'neon' },
    });
  });

  it('uses standard PostgreSQL provider when DATABASE_URL is not a Neon host', async () => {
    const setup = await loadDatabaseProvidersModule(
      'postgresql://user:pass@localhost:5432/komuno',
    );

    expect(setup.createdPgPools).toHaveLength(1);
    expect(setup.createdNeonPools).toHaveLength(0);

    const pgPoolOptions = setup.createdPgPools[0]?.options;
    expect(pgPoolOptions).toMatchObject({
      connectionString: 'postgresql://user:pass@localhost:5432/komuno',
      max: 20,
      min: 2,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 3000,
      application_name: 'komuno',
    });

    expect(setup.drizzlePgMock).toHaveBeenCalledTimes(1);
    expect(setup.drizzleNeonMock).not.toHaveBeenCalled();
    expect(setup.drizzlePgMock).toHaveBeenCalledWith(setup.createdPgPools[0], {
      schema: setup.schemaMock,
    });

    expect(setup.module.databaseProviders).toHaveLength(2);
    expect(setup.module.databaseProviders[0]).toMatchObject({
      provide: setup.module.DATABASE_POOL,
      useValue: setup.createdPgPools[0],
    });
    expect(setup.module.databaseProviders[1]).toMatchObject({
      provide: setup.module.DATABASE,
      useValue: { adapter: 'pg' },
    });
  });
});
