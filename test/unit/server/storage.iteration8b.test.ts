import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type EventInput = {
  title: string;
  date: string;
  description?: string;
  location?: string;
};

type EventRow = {
  id: string;
  title: string;
  date: Date;
};

type TxInsertChain = {
  values: (payload: unknown) => {
    returning: () => Promise<EventRow[]>;
  };
};

type TxMock = {
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

describe('server/storage.js - iteration 8b createEvent coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('createEvent returns DuplicateError when duplicate event exists', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(true);

    const result = await storage.createEvent({
      title: 'Atelier IA',
      date: '2031-06-01T10:00:00.000Z',
      description: 'Session pratique',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('existe déjà');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('createEvent returns ValidationError when date is in the past', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(false);

    const result = await storage.createEvent({
      title: 'Événement passé',
      date: '2000-01-01T09:00:00.000Z',
      location: 'Paris',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('ValidationError');
      expect(result.error.message).toContain('dans le futur');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('createEvent returns success payload when transaction inserts event', async () => {
    const insertedEvent: EventRow = {
      id: 'evt-100',
      title: 'Atelier produit',
      date: new Date('2032-05-01T14:00:00.000Z'),
    };

    const txMock: TxMock = {
      insert: (_table: unknown): TxInsertChain => ({
        values: (_payload: unknown) => ({
          returning: async () => [insertedEvent],
        }),
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<EventRow>): Promise<EventRow> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(false);

    const result = await storage.createEvent({
      title: 'Atelier produit',
      date: '2032-05-01T14:00:00.000Z',
      description: 'Roadmap trimestrielle',
      location: 'Lyon',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(insertedEvent);
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Event created', {
      eventId: 'evt-100',
      title: 'Atelier produit',
      date: insertedEvent.date,
    });
  });

  it('createEvent wraps transaction failures into DatabaseError', async () => {
    mockDb.transaction.mockRejectedValue(new Error('event insert failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'isDuplicateEvent').mockResolvedValue(false);

    const result = await storage.createEvent({
      title: 'Atelier instable',
      date: '2033-09-12T08:30:00.000Z',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la création de l'événement");
    }
  });
});
