import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type UnsubscriptionRow = {
  id: string;
  eventId: string;
  email: string;
  name: string;
  reason?: string;
  createdAt?: Date;
};

type EventRow = {
  id: string;
  title: string;
  date: Date;
};

type SelectWhereChain<T> = {
  from: (table: unknown) => {
    where: (criteria: unknown) => Promise<T[]>;
  };
};

type SelectWhereOrderByChain<T> = {
  from: (table: unknown) => {
    where: (criteria: unknown) => {
      orderBy: (ordering: unknown) => Promise<T[]>;
    };
  };
};

type TxInsertChain<T> = {
  values: (payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type TxUpdateChain<T> = {
  set: (payload: unknown) => {
    where: (criteria: unknown) => {
      returning: () => Promise<T[]>;
    };
  };
};

type TxMock = {
  insert: (table: unknown) => TxInsertChain<UnsubscriptionRow>;
  update: (table: unknown) => TxUpdateChain<UnsubscriptionRow>;
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

describe('server/storage.js - iteration 7a unsubscriptions coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getEventUnsubscriptions returns rows on success', async () => {
    const rows: UnsubscriptionRow[] = [
      {
        id: 'u-1',
        eventId: 'e-1',
        email: 'personne@example.com',
        name: 'Personne Exemple',
      },
    ];

    mockDb.select.mockImplementation((): SelectWhereOrderByChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => rows,
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getEventUnsubscriptions('e-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(rows);
    }
    expect(loggerMock.debug).toHaveBeenCalledWith('Event unsubscriptions retrieved', {
      eventId: 'e-1',
      count: 1,
    });
  });

  it('getEventUnsubscriptions wraps select errors into DatabaseError', async () => {
    mockDb.select.mockImplementation((): SelectWhereOrderByChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => {
            throw new Error('unsubscriptions query failed');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getEventUnsubscriptions('e-err');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des absences');
    }
  });

  it('createUnsubscription returns DuplicateError when user already declared absence', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            id: 'u-dup',
            eventId: 'e-2',
            email: 'dup@example.com',
            name: 'Déjà là',
          },
        ],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createUnsubscription({
      eventId: 'e-2',
      email: 'dup@example.com',
      name: 'Déjà là',
      reason: 'Indisponible',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('déjà déclaré votre absence');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('createUnsubscription propagates getEvent failure', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const upstreamError = new Error('getEvent upstream failed');

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: false,
      error: upstreamError,
    });

    const result = await storage.createUnsubscription({
      eventId: 'e-3',
      email: 'err@example.com',
      name: 'Erreur Event',
      reason: 'Conflit',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(upstreamError);
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('createUnsubscription inserts row in transaction on success', async () => {
    const insertedRow: UnsubscriptionRow = {
      id: 'u-new',
      eventId: 'e-4',
      email: 'new@example.com',
      name: 'Nouveau',
      reason: 'Empêchement',
    };

    mockDb.select.mockImplementationOnce((): SelectWhereChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: {
        id: 'e-4',
        title: 'Event 4',
        date: new Date('2032-01-10T12:00:00.000Z'),
      } as EventRow,
    });

    const txMock: TxMock = {
      insert: (_table: unknown): TxInsertChain<UnsubscriptionRow> => ({
        values: (_payload: unknown) => ({
          returning: async () => [insertedRow],
        }),
      }),
      update: (_table: unknown): TxUpdateChain<UnsubscriptionRow> => ({
        set: (_payload: unknown) => ({
          where: (_criteria: unknown) => ({
            returning: async () => [insertedRow],
          }),
        }),
      }),
    };

    mockDb.transaction.mockImplementation(
      async (
        callback: (tx: TxMock) => Promise<UnsubscriptionRow>,
      ): Promise<UnsubscriptionRow> => callback(txMock),
    );

    const result = await storage.createUnsubscription({
      eventId: 'e-4',
      email: 'new@example.com',
      name: 'Nouveau',
      reason: 'Empêchement',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(insertedRow);
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Event unsubscription created', {
      unsubscriptionId: 'u-new',
      eventId: 'e-4',
      name: 'Nouveau',
    });
  });

  it('updateUnsubscription returns NotFoundError when row does not exist', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateUnsubscription('u-missing', {
      reason: 'Nouveau motif',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain("Déclaration d'absence introuvable");
    }
  });

  it('updateUnsubscription updates row in transaction on success', async () => {
    const updatedRow: UnsubscriptionRow = {
      id: 'u-6',
      eventId: 'e-6',
      email: 'u6@example.com',
      name: 'User Six',
      reason: 'Motif mis à jour',
    };

    mockDb.select.mockImplementationOnce((): SelectWhereChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            id: 'u-6',
            eventId: 'e-6',
            email: 'u6@example.com',
            name: 'User Six',
          },
        ],
      }),
    }));

    const txMock: TxMock = {
      insert: (_table: unknown): TxInsertChain<UnsubscriptionRow> => ({
        values: (_payload: unknown) => ({
          returning: async () => [updatedRow],
        }),
      }),
      update: (_table: unknown): TxUpdateChain<UnsubscriptionRow> => ({
        set: (_payload: unknown) => ({
          where: (_criteria: unknown) => ({
            returning: async () => [updatedRow],
          }),
        }),
      }),
    };

    mockDb.transaction.mockImplementation(
      async (
        callback: (tx: TxMock) => Promise<UnsubscriptionRow>,
      ): Promise<UnsubscriptionRow> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateUnsubscription('u-6', {
      reason: 'Motif mis à jour',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedRow);
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Event unsubscription updated', {
      unsubscriptionId: 'u-6',
      updates: ['reason'],
    });
  });

  it('updateUnsubscription wraps transaction errors into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            id: 'u-7',
            eventId: 'e-7',
            email: 'u7@example.com',
            name: 'User Seven',
          },
        ],
      }),
    }));

    mockDb.transaction.mockRejectedValue(new Error('update transaction failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateUnsubscription('u-7', {
      reason: 'Erreur',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la modification de la déclaration d'absence");
    }
  });
});
