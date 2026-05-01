import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type IdeaRow = {
  id: string;
  title?: string;
};

type SelectFromWhereChain = {
  from: (table: unknown) => {
    where: (criteria: unknown) => Promise<IdeaRow[]>;
  };
};

type SelectFromWhereLimitChain = {
  from: (table: unknown) => {
    where: (criteria: unknown) => {
      limit: (value: number) => Promise<Array<{ id: string }>>;
    };
  };
};

type TxDeleteChain = {
  where: (criteria: unknown) => Promise<unknown>;
};

type TxMock = {
  delete: (table: unknown) => TxDeleteChain;
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
    runDbQuery: vi.fn(),
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

describe('server/storage.js - iteration 6b ideas deletion coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getIdea returns null payload when no row matches the id', async () => {
    mockDb.select.mockImplementation((): SelectFromWhereChain => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getIdea('idea-missing');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it('isDuplicateIdea returns true when one idea with same title exists', async () => {
    mockDb.select.mockImplementation((): SelectFromWhereLimitChain => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_value: number) => [{ id: 'idea-1' }],
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const isDuplicate = await storage.isDuplicateIdea('Titre déjà pris');

    expect(isDuplicate).toBe(true);
  });

  it('isDuplicateIdea logs and returns false when select chain throws', async () => {
    mockDb.select.mockImplementation((): SelectFromWhereLimitChain => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_value: number) => {
            throw new Error('duplicate lookup failure');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const isDuplicate = await storage.isDuplicateIdea('Titre potentiellement unique');

    expect(isDuplicate).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith('Duplicate idea check failed', {
      title: 'Titre potentiellement unique',
      error: expect.any(Error),
    });
  });

  it('deleteIdea propagates getIdea database failures', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: false,
      error: new Error('query failed'),
    });

    const result = await storage.deleteIdea('idea-db-error');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('query failed');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('deleteIdea returns NotFoundError when getIdea returns null', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.deleteIdea('idea-not-found');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Idée introuvable');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('deleteIdea deletes idea in transaction and logs success', async () => {
    const txDeleteWhere = vi.fn(async (_criteria: unknown) => undefined);
    const txMock: TxMock = {
      delete: (_table: unknown): TxDeleteChain => ({
        where: txDeleteWhere,
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<void>): Promise<void> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: { id: 'idea-42', title: 'Moderniser le onboarding' },
    });

    const result = await storage.deleteIdea('idea-42');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
    expect(txDeleteWhere).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith('Idea deleted', { ideaId: 'idea-42' });
  });

  it('deleteIdea wraps transaction errors into DatabaseError', async () => {
    mockDb.transaction.mockRejectedValue(new Error('transaction failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: { id: 'idea-99', title: 'Proposition test' },
    });

    const result = await storage.deleteIdea('idea-99');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la suppression de l'idée");
    }
  });
});
