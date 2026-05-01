import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type InscriptionRow = {
  id: string;
  eventId: string;
  email: string;
  name: string;
};

type UnsubscriptionRow = {
  id: string;
  eventId: string;
  email: string;
  name: string;
};

type SelectWhereChain<T> = {
  from: (table: unknown) => {
    where: (criteria: unknown) => Promise<T[]>;
  };
};

type TxDeleteWhereChain = {
  where: (criteria: unknown) => Promise<unknown>;
};

type TxMock = {
  delete: (table: unknown) => TxDeleteWhereChain;
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

describe('server/storage.js - iteration 8a delete/unsubscribe branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('unsubscribeFromEvent returns NotFoundError when no matching inscription exists', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<InscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.unsubscribeFromEvent('event-1', 'Jean Dupont', 'jean@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Inscription introuvable avec ce nom et cet email');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('unsubscribeFromEvent deletes matching inscription in transaction on success', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<InscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            id: 'ins-1',
            eventId: 'event-2',
            email: 'ana@example.com',
            name: 'Ana Martin',
          },
        ],
      }),
    }));

    const txMock: TxMock = {
      delete: (_table: unknown): TxDeleteWhereChain => ({
        where: async (_criteria: unknown) => undefined,
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<void>): Promise<void> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.unsubscribeFromEvent('event-2', 'Ana Martin', 'ana@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Event unregistration', {
      eventId: 'event-2',
      name: 'Ana Martin',
      email: 'ana@example.com',
    });
  });

  it('unsubscribeFromEvent wraps transaction failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<InscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            id: 'ins-2',
            eventId: 'event-3',
            email: 'leo@example.com',
            name: 'Leo Diaz',
          },
        ],
      }),
    }));

    mockDb.transaction.mockRejectedValueOnce(new Error('unsubscribe tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.unsubscribeFromEvent('event-3', 'Leo Diaz', 'leo@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la désinscription');
    }
  });

  it('deleteInscription returns NotFoundError when inscription does not exist', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<InscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteInscription('ins-missing');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Inscription introuvable');
    }
  });

  it('deleteInscription deletes row and logs on success', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<InscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            id: 'ins-ok',
            eventId: 'event-4',
            email: 'ok@example.com',
            name: 'Ok User',
          },
        ],
      }),
    }));

    const txMock: TxMock = {
      delete: (_table: unknown): TxDeleteWhereChain => ({
        where: async (_criteria: unknown) => undefined,
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<void>): Promise<void> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteInscription('ins-ok');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Event registration deleted', {
      inscriptionId: 'ins-ok',
    });
  });

  it('deleteInscription wraps select failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<InscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => {
          throw new Error('delete inscription select failed');
        },
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteInscription('ins-error');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la suppression de l'inscription");
    }
  });

  it('deleteUnsubscription returns NotFoundError when row does not exist', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteUnsubscription('uns-missing');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain("Déclaration d'absence introuvable");
    }
  });

  it('deleteUnsubscription wraps transaction failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            id: 'uns-1',
            eventId: 'event-5',
            email: 'uns@example.com',
            name: 'Uns User',
          },
        ],
      }),
    }));

    mockDb.transaction.mockRejectedValueOnce(new Error('delete unsubscription tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteUnsubscription('uns-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la suppression de la déclaration d'absence");
    }
  });
});
