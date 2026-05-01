import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type BrandingConfigRow = {
  id: string;
  config: string;
  updatedBy: string;
};

type EmailConfigRow = {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  updatedBy: string;
};

type SelectLimitChain<T> = {
  from: (_table: unknown) => {
    limit: (_count: number) => Promise<T[]>;
  };
};

type TxSelectLimitChain<T> = {
  from: (_table: unknown) => {
    limit: (_count: number) => Promise<T[]>;
  };
};

type TxUpdateChain<T> = {
  set: (_payload: unknown) => {
    where: (_criteria: unknown) => {
      returning: () => Promise<T[]>;
    };
  };
};

type TxInsertChain<T> = {
  values: (_payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type TxMock = {
  select: () => TxSelectLimitChain<BrandingConfigRow | EmailConfigRow>;
  update: (_table: unknown) => TxUpdateChain<BrandingConfigRow | EmailConfigRow>;
  insert: (_table: unknown) => TxInsertChain<BrandingConfigRow | EmailConfigRow>;
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

describe('server/storage.js - iteration 14c branding/email guard-fallback-error branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getBrandingConfig wraps runDbQuery failures into DatabaseError', async () => {
    runDbQueryMock.mockRejectedValueOnce(new Error('branding quick query failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getBrandingConfig();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération de la configuration');
    }
    expect(runDbQueryMock).toHaveBeenCalledWith(expect.any(Function), 'quick');
  });

  it('updateBrandingConfig returns ValidationError on invalid JSON guard', async () => {
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

  it('updateBrandingConfig updates existing row when config exists', async () => {
    const existing: BrandingConfigRow = {
      id: 'bc-1',
      config: '{"theme":"old"}',
      updatedBy: 'old-admin@example.com',
    };

    const updated: BrandingConfigRow = {
      id: 'bc-1',
      config: '{"theme":"new"}',
      updatedBy: 'admin@example.com',
    };

    const txInsertSpy = vi.fn((_table: unknown): TxInsertChain<BrandingConfigRow | EmailConfigRow> => ({
      values: (_payload: unknown) => ({
        returning: async () => [updated],
      }),
    }));

    const txMock: TxMock = {
      select: (): TxSelectLimitChain<BrandingConfigRow | EmailConfigRow> => ({
        from: (_table: unknown) => ({
          limit: async (_count: number) => [existing],
        }),
      }),
      update: (_table: unknown): TxUpdateChain<BrandingConfigRow | EmailConfigRow> => ({
        set: (_payload: unknown) => ({
          where: (_criteria: unknown) => ({
            returning: async () => [updated],
          }),
        }),
      }),
      insert: txInsertSpy,
    };

    mockDb.transaction.mockImplementationOnce(
      async (callback: (tx: TxMock) => Promise<BrandingConfigRow | EmailConfigRow>) => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateBrandingConfig('{"theme":"new"}', 'admin@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updated);
    }
    expect(txInsertSpy).not.toHaveBeenCalled();
  });

  it('updateBrandingConfig inserts row when config does not exist (fallback)', async () => {
    const inserted: BrandingConfigRow = {
      id: 'bc-2',
      config: '{"theme":"created"}',
      updatedBy: 'admin2@example.com',
    };

    const txUpdateSpy = vi.fn((_table: unknown): TxUpdateChain<BrandingConfigRow | EmailConfigRow> => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [inserted],
        }),
      }),
    }));

    const txMock: TxMock = {
      select: (): TxSelectLimitChain<BrandingConfigRow | EmailConfigRow> => ({
        from: (_table: unknown) => ({
          limit: async (_count: number) => [],
        }),
      }),
      update: txUpdateSpy,
      insert: (_table: unknown): TxInsertChain<BrandingConfigRow | EmailConfigRow> => ({
        values: (_payload: unknown) => ({
          returning: async () => [inserted],
        }),
      }),
    };

    mockDb.transaction.mockImplementationOnce(
      async (callback: (tx: TxMock) => Promise<BrandingConfigRow | EmailConfigRow>) => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateBrandingConfig('{"theme":"created"}', 'admin2@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(inserted);
    }
    expect(txUpdateSpy).not.toHaveBeenCalled();
  });

  it('updateBrandingConfig wraps transaction failures into DatabaseError', async () => {
    mockDb.transaction.mockRejectedValueOnce(new Error('branding tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateBrandingConfig('{"theme":"safe"}', 'admin3@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la mise à jour de la configuration');
    }
  });

  it('getEmailConfig wraps runDbQuery failures into DatabaseError', async () => {
    runDbQueryMock.mockRejectedValueOnce(new Error('email quick query failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getEmailConfig();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération de la configuration email');
    }
  });

  it('updateEmailConfig inserts row when no config exists', async () => {
    const inserted: EmailConfigRow = {
      id: 'ec-1',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: 'user',
      smtpPass: 'secret',
      fromEmail: 'noreply@example.com',
      fromName: 'Komuno',
      updatedBy: 'admin@example.com',
    };

    const txUpdateSpy = vi.fn((_table: unknown): TxUpdateChain<BrandingConfigRow | EmailConfigRow> => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [inserted],
        }),
      }),
    }));

    const txMock: TxMock = {
      select: (): TxSelectLimitChain<BrandingConfigRow | EmailConfigRow> => ({
        from: (_table: unknown) => ({
          limit: async (_count: number) => [],
        }),
      }),
      update: txUpdateSpy,
      insert: (_table: unknown): TxInsertChain<BrandingConfigRow | EmailConfigRow> => ({
        values: (_payload: unknown) => ({
          returning: async () => [inserted],
        }),
      }),
    };

    mockDb.transaction.mockImplementationOnce(
      async (callback: (tx: TxMock) => Promise<BrandingConfigRow | EmailConfigRow>) => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateEmailConfig(
      {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user',
        smtpPass: 'secret',
        fromEmail: 'noreply@example.com',
        fromName: 'Komuno',
      },
      'admin@example.com',
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(inserted);
    }
    expect(txUpdateSpy).not.toHaveBeenCalled();
  });
});
