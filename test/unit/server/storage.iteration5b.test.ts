import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type FeatureConfigRow = {
  id?: string;
  featureKey: string;
  enabled: boolean;
  updatedBy?: string;
};

type SelectForListChain = {
  from: (table: unknown) => {
    orderBy: (ordering: unknown) => Promise<FeatureConfigRow[]>;
  };
};

type SelectForOneChain = {
  from: (table: unknown) => {
    where: (criteria: unknown) => {
      limit: (limitValue: number) => Promise<FeatureConfigRow[]>;
    };
  };
};

type TxSelectChain = {
  from: (table: unknown) => {
    where: (criteria: unknown) => {
      limit: (limitValue: number) => Promise<FeatureConfigRow[]>;
    };
  };
};

type TxUpdateChain = {
  set: (payload: unknown) => {
    where: (criteria: unknown) => {
      returning: () => Promise<FeatureConfigRow[]>;
    };
  };
};

type TxInsertChain = {
  values: (payload: unknown) => {
    returning: () => Promise<FeatureConfigRow[]>;
  };
};

type TxMock = {
  select: () => TxSelectChain;
  update: (table: unknown) => TxUpdateChain;
  insert: (table: unknown) => TxInsertChain;
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

describe('server/storage.js - iteration 5b feature config coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getFeatureConfig returns full config list via runDbQuery quick profile', async () => {
    const rows: FeatureConfigRow[] = [
      { featureKey: 'prospects', enabled: false },
      { featureKey: 'analytics', enabled: true },
    ];

    mockDb.select.mockImplementation((): SelectForListChain => ({
      from: (_table: unknown) => ({
        orderBy: async (_ordering: unknown) => rows,
      }),
    }));

    runDbQueryMock.mockImplementation(
      async (
        callback: () => Promise<FeatureConfigRow[]>,
        _profile: 'quick' | 'normal' | 'critical',
      ): Promise<FeatureConfigRow[]> => callback(),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getFeatureConfig();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(rows);
    }
    expect(runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'quick');
  });

  it('getFeatureConfigByKey returns null when no config exists for the key', async () => {
    mockDb.select.mockImplementation((): SelectForOneChain => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_limitValue: number) => [],
        }),
      }),
    }));

    runDbQueryMock.mockImplementation(
      async (
        callback: () => Promise<FeatureConfigRow[]>,
        _profile: 'quick' | 'normal' | 'critical',
      ): Promise<FeatureConfigRow[]> => callback(),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getFeatureConfigByKey('missing-feature');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('isFeatureEnabled defaults to true when feature config is missing', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getFeatureConfigByKey').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.isFeatureEnabled('new-feature');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(true);
    }
  });

  it('updateFeatureConfig updates existing config when key already exists', async () => {
    const existingRow: FeatureConfigRow = {
      id: 'fc-1',
      featureKey: 'prospects',
      enabled: true,
      updatedBy: 'old-admin',
    };

    const updatedRow: FeatureConfigRow = {
      id: 'fc-1',
      featureKey: 'prospects',
      enabled: false,
      updatedBy: 'new-admin',
    };

    const txInsert = vi.fn((_table: unknown): TxInsertChain => ({
      values: (_payload: unknown) => ({
        returning: async () => [updatedRow],
      }),
    }));

    const txMock: TxMock = {
      select: (): TxSelectChain => ({
        from: (_table: unknown) => ({
          where: (_criteria: unknown) => ({
            limit: async (_limitValue: number) => [existingRow],
          }),
        }),
      }),
      update: (_table: unknown): TxUpdateChain => ({
        set: (_payload: unknown) => ({
          where: (_criteria: unknown) => ({
            returning: async () => [updatedRow],
          }),
        }),
      }),
      insert: txInsert,
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<FeatureConfigRow>): Promise<FeatureConfigRow> =>
        callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateFeatureConfig('prospects', false, 'new-admin');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedRow);
    }
    expect(txInsert).not.toHaveBeenCalled();
  });

  it('updateFeatureConfig inserts a new config when key does not exist', async () => {
    const insertedRow: FeatureConfigRow = {
      id: 'fc-2',
      featureKey: 'analytics-v2',
      enabled: true,
      updatedBy: 'admin-owner',
    };

    const txUpdate = vi.fn((_table: unknown): TxUpdateChain => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [insertedRow],
        }),
      }),
    }));

    const txMock: TxMock = {
      select: (): TxSelectChain => ({
        from: (_table: unknown) => ({
          where: (_criteria: unknown) => ({
            limit: async (_limitValue: number) => [],
          }),
        }),
      }),
      update: txUpdate,
      insert: (_table: unknown): TxInsertChain => ({
        values: (_payload: unknown) => ({
          returning: async () => [insertedRow],
        }),
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<FeatureConfigRow>): Promise<FeatureConfigRow> =>
        callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateFeatureConfig('analytics-v2', true, 'admin-owner');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(insertedRow);
    }
    expect(txUpdate).not.toHaveBeenCalled();
  });

  it('updateFeatureConfig wraps transaction failures in DatabaseError', async () => {
    mockDb.transaction.mockRejectedValue(new Error('feature tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateFeatureConfig('prospects', false, 'admin-owner');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la mise à jour de la configuration');
    }
  });
});
