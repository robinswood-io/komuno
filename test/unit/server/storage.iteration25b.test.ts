import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type EventRow = {
  id: string;
  title: string;
  date: Date;
};

type InitialInscriptionInput = {
  name: string;
  email: string;
};

type EventCreateInput = {
  title: string;
  date: string;
  maxParticipants?: number;
};

type TxInsertChain<T> = {
  values: (payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type TxCreateMock = {
  insert: (table: unknown) => TxInsertChain<EventRow>;
};

type DbMock = {
  transaction: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
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
          // no-op
        }
      },
  );
}

function loadStorageModule(): StorageModule {
  delete cjsRequire.cache[storageModulePath];
  return cjsRequire(storageModulePath) as StorageModule;
}

describe('server/storage.js - iteration 25b createEventWithInscriptions branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('returns DuplicateError when event already exists', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();
    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(true);

    const result = await storage.createEventWithInscriptions(
      {
        title: 'Soirée CJD',
        date: '2099-06-01T18:00:00.000Z',
      },
      [],
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('titre et cette date existe déjà');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('returns ValidationError when event date is in the past', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();
    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(false);

    const result = await storage.createEventWithInscriptions(
      {
        title: 'Afterwork passé',
        date: '2000-01-01T00:00:00.000Z',
      },
      [],
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('ValidationError');
      expect(result.error.message).toContain('doit être dans le futur');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('returns ValidationError when initial inscriptions exceed maxParticipants', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();
    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(false);

    const initialInscriptions: InitialInscriptionInput[] = [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
      { name: 'Chloé', email: 'chloe@example.com' },
    ];

    const result = await storage.createEventWithInscriptions(
      {
        title: 'Atelier limité',
        date: '2099-09-15T10:00:00.000Z',
        maxParticipants: 2,
      },
      initialInscriptions,
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('ValidationError');
      expect(result.error.message).toContain('dépasse la limite de participants');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('creates event and skips inscriptions insert when initial list is empty', async () => {
    const createdEvent: EventRow = {
      id: 'evt-empty-ins',
      title: 'Conférence sans préinscriptions',
      date: new Date('2099-11-01T14:00:00.000Z'),
    };

    let insertCalls = 0;
    const txMock: TxCreateMock = {
      insert: (_table: unknown) => {
        insertCalls += 1;
        return {
          values: (_payload: unknown) => ({
            returning: async () => [createdEvent],
          }),
        };
      },
    };

    mockDb.transaction.mockImplementation(
      async (
        callback: (tx: TxCreateMock) => Promise<{ event: EventRow; inscriptions: unknown[] }>,
      ): Promise<{ event: EventRow; inscriptions: unknown[] }> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();
    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(false);

    const result = await storage.createEventWithInscriptions(
      {
        title: 'Conférence sans préinscriptions',
        date: '2099-11-01T14:00:00.000Z',
      },
      [],
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.event).toEqual(createdEvent);
      expect(result.data.inscriptions).toEqual([]);
    }
    expect(insertCalls).toBe(1);
  });

  it('wraps transaction failures into DatabaseError and logs error', async () => {
    mockDb.transaction.mockRejectedValue(new Error('tx create event failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();
    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(false);

    const result = await storage.createEventWithInscriptions(
      {
        title: 'Workshop résilient',
        date: '2099-12-10T09:30:00.000Z',
      },
      [{ name: 'Dina', email: 'dina@example.com' }],
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('création de l\'événement avec inscriptions');
    }
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Event with inscriptions creation failed',
      expect.objectContaining({
        error: expect.any(Error),
      }),
    );
  });
});
