import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type EventRow = {
  id: string;
  title: string;
  date: Date;
};

type UnsubscriptionRow = {
  id: string;
  eventId: string;
  email: string;
  name: string;
};

type VoteRow = {
  id: string;
  ideaId: string;
  voterEmail: string;
};

type SelectWhereChain<T> = {
  from: (_table: unknown) => {
    where: (_criteria: unknown) => Promise<T[]>;
  };
};

type TxInsertVoteChain = {
  values: (_payload: unknown) => {
    returning: () => Promise<VoteRow[]>;
  };
};

type TxDeleteUnsubscriptionChain = {
  where: (_criteria: unknown) => Promise<unknown>;
};

type TxMock = {
  insert: (_table: unknown) => TxInsertVoteChain;
  delete: (_table: unknown) => TxDeleteUnsubscriptionChain;
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

describe('server/storage.js - iteration 11c inscriptions/unsubscriptions/votes branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('createUnsubscription returns NotFoundError when event does not exist', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.createUnsubscription({
      eventId: 'evt-not-found',
      email: 'missing@example.com',
      name: 'Missing Event',
      reason: 'Absence',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Événement introuvable');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('createUnsubscription wraps transaction errors into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    mockDb.transaction.mockRejectedValueOnce(new Error('create unsubscription tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: {
        id: 'evt-1',
        title: 'Atelier Produit',
        date: new Date('2036-03-18T10:00:00.000Z'),
      } as EventRow,
    });

    const result = await storage.createUnsubscription({
      eventId: 'evt-1',
      email: 'user@example.com',
      name: 'User One',
      reason: 'Empêchement',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la déclaration d'absence");
    }
  });

  it('deleteUnsubscription deletes existing row and logs success', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            id: 'uns-100',
            eventId: 'evt-2',
            email: 'gone@example.com',
            name: 'Gone User',
          },
        ],
      }),
    }));

    const txMock: TxMock = {
      insert: (_table: unknown): TxInsertVoteChain => ({
        values: (_payload: unknown) => ({
          returning: async () => [],
        }),
      }),
      delete: (_table: unknown): TxDeleteUnsubscriptionChain => ({
        where: async (_criteria: unknown) => undefined,
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<void>): Promise<void> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteUnsubscription('uns-100');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Event unsubscription deleted', {
      unsubscriptionId: 'uns-100',
    });
  });

  it('createVote wraps transaction errors into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<VoteRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    mockDb.transaction.mockRejectedValueOnce(new Error('vote insert failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-22',
        title: 'Idée vote',
      },
    });

    const result = await storage.createVote({
      ideaId: 'idea-22',
      voterEmail: 'voter@example.com',
      voterName: 'Voter Test',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la création du vote');
    }
  });

  it('hasUserRegistered returns true when inscription exists', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<UnsubscriptionRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            id: 'ins-1',
            eventId: 'evt-registered',
            email: 'registered@example.com',
            name: 'Registered User',
          },
        ],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const isRegistered = await storage.hasUserRegistered('evt-registered', 'registered@example.com');

    expect(isRegistered).toBe(true);
  });

  it('hasUserVoted returns false when vote does not exist', async () => {
    mockDb.select.mockImplementationOnce((): SelectWhereChain<VoteRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const hasVoted = await storage.hasUserVoted('idea-no-vote', 'novote@example.com');

    expect(hasVoted).toBe(false);
  });
});
