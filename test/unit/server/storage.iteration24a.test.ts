import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');
type DatabaseStorageCtor = StorageModule['DatabaseStorage'];
type DatabaseStorageInstance = InstanceType<DatabaseStorageCtor>;

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
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
  update: vi.fn(),
  delete: vi.fn(),
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

function createSelectBuilder(): {
  from: () => {
    where: (_clause: unknown) => unknown;
    orderBy: (_clause: unknown) => unknown;
  };
} {
  const chain = {
    where: (_clause: unknown) => chain,
    orderBy: (_clause: unknown) => chain,
    limit: (_value: number) => chain,
    offset: (_value: number) => chain,
  };

  return {
    from: () => chain,
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
      update: mockDb.update,
      delete: mockDb.delete,
      transaction: mockDb.transaction,
    },
  });

  setCjsModule(loggerModulePath, { logger: loggerMock });

  setCjsModule(expressSessionModulePath, function mockExpressSession() {
    return {};
  });

  setCjsModule(
    connectPgSimpleModulePath,
    () =>
      class MockPostgresSessionStore {
        constructor(_config: unknown) {
          // no-op
        }
      },
  );
}

function loadStorageModule(): StorageModule {
  delete cjsRequire.cache[storageModulePath];
  return cjsRequire(storageModulePath) as StorageModule;
}

function createStorage(): DatabaseStorageInstance {
  const { DatabaseStorage } = loadStorageModule();
  return new DatabaseStorage();
}

describe('server/storage.js - iteration 24a loan item edge/error branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
    mockDb.select.mockImplementation(() => createSelectBuilder());
  });

  it('getLoanItem returns the item when lookup succeeds', async () => {
    const storage = createStorage();
    runDbQueryMock.mockResolvedValueOnce([
      {
        id: 'loan-24',
        title: 'Table de mixage',
        ownerEmail: 'owner@example.com',
      },
    ]);

    const result = await storage.getLoanItem('loan-24');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(
        expect.objectContaining({
          id: 'loan-24',
          title: 'Table de mixage',
        }),
      );
    }
  });

  it('getLoanItem returns null when no row is found', async () => {
    const storage = createStorage();
    runDbQueryMock.mockResolvedValueOnce([]);

    const result = await storage.getLoanItem('missing-loan');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('getLoanItem returns DatabaseError when query fails', async () => {
    const storage = createStorage();
    runDbQueryMock.mockRejectedValueOnce(new Error('loan read timeout'));

    const result = await storage.getLoanItem('loan-error');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('récupération de la fiche prêt');
    }
  });

  it('updateLoanItem returns upstream error when getLoanItem fails', async () => {
    const storage = createStorage();
    const lookupError = new Error('lookup failed');

    vi.spyOn(storage, 'getLoanItem').mockResolvedValue({
      success: false,
      error: lookupError,
    });

    const result = await storage.updateLoanItem('loan-upstream-fail', {
      title: 'Ignored',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(lookupError);
    }
  });

  it('updateLoanItem returns DatabaseError when update query throws', async () => {
    const storage = createStorage();

    vi.spyOn(storage, 'getLoanItem').mockResolvedValue({
      success: true,
      data: { id: 'loan-update-fail' },
    });
    runDbQueryMock.mockRejectedValueOnce(new Error('update crashed'));

    const result = await storage.updateLoanItem('loan-update-fail', {
      description: 'attempt update',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('mise à jour de la fiche prêt');
    }
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });

  it('deleteLoanItem returns upstream error when getLoanItem fails', async () => {
    const storage = createStorage();
    const lookupError = new Error('delete lookup failure');

    vi.spyOn(storage, 'getLoanItem').mockResolvedValue({
      success: false,
      error: lookupError,
    });

    const result = await storage.deleteLoanItem('loan-delete-upstream');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(lookupError);
    }
  });

  it('getAllLoanItems returns fallback empty payload when relation is missing', async () => {
    const storage = createStorage();
    runDbQueryMock.mockRejectedValueOnce(new Error('relation missing while querying'));

    const result = await storage.getAllLoanItems();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    }
    expect(loggerMock.warn).toHaveBeenCalledWith(
      'Loan items table does not exist yet, returning empty list',
      expect.objectContaining({ error: expect.stringContaining('relation') }),
    );
  });

  it('getAllLoanItems returns DatabaseError on non-table generic failures', async () => {
    const storage = createStorage();
    runDbQueryMock.mockRejectedValueOnce(new Error('network timeout'));

    const result = await storage.getAllLoanItems({ page: 4, limit: 5, search: 'mix' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('récupération des fiches prêt');
      expect(result.error.message).toContain('network timeout');
    }
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });
});
