import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type BrandingRow = {
  id: number;
  config: string;
  updatedBy: string;
};

type TxSelectChain<T> = {
  from: (table: unknown) => {
    limit: (count: number) => Promise<T[]>;
  };
};

type TxUpdateChain<T> = {
  set: (payload: unknown) => {
    where: (criteria: unknown) => {
      returning: () => Promise<T[]>;
    };
  };
};

type TxInsertChain<T> = {
  values: (payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type TransactionClient = {
  select: () => TxSelectChain<BrandingRow>;
  update: (_table: unknown) => TxUpdateChain<BrandingRow>;
  insert: (_table: unknown) => TxInsertChain<BrandingRow>;
};

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  transaction: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
  select: vi.fn(),
  transaction: vi.fn(),
};

const runDbQueryMock = vi.fn();

const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

function setCjsModule(path: string, exportsValue: unknown): void {
  const previous = cjsRequire.cache[path];
  cjsRequire.cache[path] = {
    ...(previous ?? {
      id: path,
      filename: path,
      loaded: true,
      children: [],
      paths: [],
    }),
    exports: exportsValue,
  };
}

function setupStorageDependencies(): void {
  setCjsModule(dbModulePath, {
    pool: {},
    dbResilience: {},
    QUERY_TIMEOUT_PROFILES: {},
    runDbQuery: runDbQueryMock,
    getPoolStats: vi.fn(),
    db: {
      select: mockDb.select,
      transaction: mockDb.transaction,
    },
  });

  setCjsModule(loggerModulePath, {
    logger: loggerMock,
  });

  setCjsModule(expressSessionModulePath, function mockExpressSession() {
    return {};
  });

  setCjsModule(
    connectPgSimpleModulePath,
    () =>
      class MockPostgresSessionStore {
        constructor(_config: unknown) {
          // No-op
        }
      },
  );
}

function loadStorageModule(): StorageModule {
  delete cjsRequire.cache[storageModulePath];
  return cjsRequire(storageModulePath) as StorageModule;
}

describe('server/storage.js - iteration 14b branding config coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getBrandingConfig returns first config when query succeeds', async () => {
    const configRow: BrandingRow = {
      id: 1,
      config: '{"primaryColor":"#0EA5E9"}',
      updatedBy: 'admin@example.com',
    };

    runDbQueryMock.mockResolvedValue([configRow]);

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getBrandingConfig();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(configRow);
    }
    expect(runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'quick');
  });

  it('getBrandingConfig wraps runDbQuery failure in DatabaseError', async () => {
    runDbQueryMock.mockRejectedValue(new Error('branding read failure'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getBrandingConfig();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération de la configuration');
    }
  });

  it('updateBrandingConfig returns ValidationError for invalid JSON', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateBrandingConfig('{invalid-json', 'admin@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('ValidationError');
      expect(result.error.message).toContain('JSON valide');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('updateBrandingConfig updates existing row when config already exists', async () => {
    const existing: BrandingRow = {
      id: 3,
      config: '{"primaryColor":"#111111"}',
      updatedBy: 'old-admin@example.com',
    };

    const updated: BrandingRow = {
      id: 3,
      config: '{"primaryColor":"#22C55E"}',
      updatedBy: 'new-admin@example.com',
    };

    const tx: TransactionClient = {
      select: () => ({
        from: (_table: unknown) => ({
          limit: async (_count: number) => [existing],
        }),
      }),
      update: (_table: unknown) => ({
        set: (_payload: unknown) => ({
          where: (_criteria: unknown) => ({
            returning: async () => [updated],
          }),
        }),
      }),
      insert: (_table: unknown) => ({
        values: (_payload: unknown) => ({
          returning: async () => {
            throw new Error('insert should not be called for existing config');
          },
        }),
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (trx: TransactionClient) => Promise<BrandingRow>) => callback(tx),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateBrandingConfig('{"primaryColor":"#22C55E"}', 'new-admin@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updated);
    }
  });

  it('updateBrandingConfig inserts a new row when none exists', async () => {
    const inserted: BrandingRow = {
      id: 8,
      config: '{"logo":"https://cdn/logo.svg"}',
      updatedBy: 'owner@example.com',
    };

    const tx: TransactionClient = {
      select: () => ({
        from: (_table: unknown) => ({
          limit: async (_count: number) => [],
        }),
      }),
      update: (_table: unknown) => ({
        set: (_payload: unknown) => ({
          where: (_criteria: unknown) => ({
            returning: async () => {
              throw new Error('update should not be called when no row exists');
            },
          }),
        }),
      }),
      insert: (_table: unknown) => ({
        values: (_payload: unknown) => ({
          returning: async () => [inserted],
        }),
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (trx: TransactionClient) => Promise<BrandingRow>) => callback(tx),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateBrandingConfig('{"logo":"https://cdn/logo.svg"}', 'owner@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(inserted);
    }
  });

  it('updateBrandingConfig returns DatabaseError when transaction fails', async () => {
    mockDb.transaction.mockRejectedValue(new Error('tx branding failure'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateBrandingConfig('{"font":"Montserrat"}', 'admin@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la mise à jour de la configuration');
    }
  });
});
