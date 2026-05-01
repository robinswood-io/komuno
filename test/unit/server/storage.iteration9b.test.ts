import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type EventRow = {
  id: string;
  title: string;
  date: Date;
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

describe('server/storage.js - iteration 9b deleteEvent coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('deleteEvent propagates getEvent failure result', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const upstreamError = new Error('getEvent failure');

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: false,
      error: upstreamError,
    });

    const result = await storage.deleteEvent('evt-failure');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(upstreamError);
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('deleteEvent returns NotFoundError when event does not exist', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.deleteEvent('evt-missing');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Événement introuvable');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('deleteEvent deletes event in transaction and logs success', async () => {
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

    const eventRow: EventRow = {
      id: 'evt-100',
      title: 'Rencontre produit',
      date: new Date('2034-02-17T10:30:00.000Z'),
    };

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: eventRow,
    });

    const result = await storage.deleteEvent('evt-100');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
    expect(txDeleteWhere).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith('Event deleted', { eventId: 'evt-100' });
  });

  it('deleteEvent wraps transaction exception into DatabaseError', async () => {
    mockDb.transaction.mockRejectedValue(new Error('delete event tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: {
        id: 'evt-err',
        title: 'Événement à supprimer',
        date: new Date('2034-08-22T09:00:00.000Z'),
      },
    });

    const result = await storage.deleteEvent('evt-err');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la suppression de l'événement");
    }
  });
});
