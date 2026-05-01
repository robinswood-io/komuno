import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type EventRow = {
  id: string;
  title: string;
  date: Date;
  maxParticipants?: number | null;
};

type InscriptionInput = {
  eventId: string;
  name: string;
  email: string;
};

type InscriptionRow = {
  id: string;
  eventId: string;
  name: string;
  email: string;
};

type TxInsertChain = {
  values: (payload: unknown) => {
    returning: () => Promise<InscriptionRow[]>;
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

describe('server/storage.js - iteration 10b createInscription coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('createInscription returns DuplicateError when user is already registered', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'hasUserRegistered').mockResolvedValue(true);

    const result = await storage.createInscription({
      eventId: 'evt-1',
      name: 'Alice Dupont',
      email: 'alice@example.com',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('déjà inscrit');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('createInscription propagates getEvent failure result', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const upstreamError = new Error('event lookup failed');

    vi.spyOn(storage, 'hasUserRegistered').mockResolvedValue(false);
    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: false,
      error: upstreamError,
    });

    const result = await storage.createInscription({
      eventId: 'evt-2',
      name: 'Bob Martin',
      email: 'bob@example.com',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(upstreamError);
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('createInscription returns ValidationError when event is full', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const eventRow: EventRow = {
      id: 'evt-3',
      title: 'Conférence CJD',
      date: new Date('2035-03-14T18:00:00.000Z'),
      maxParticipants: 2,
    };

    vi.spyOn(storage, 'hasUserRegistered').mockResolvedValue(false);
    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: eventRow,
    });
    vi.spyOn(storage, 'getEventInscriptions').mockResolvedValue({
      success: true,
      data: [
        { id: 'i-1', eventId: 'evt-3', name: 'A', email: 'a@example.com' },
        { id: 'i-2', eventId: 'evt-3', name: 'B', email: 'b@example.com' },
      ],
    });

    const result = await storage.createInscription({
      eventId: 'evt-3',
      name: 'Charlie Durand',
      email: 'charlie@example.com',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('ValidationError');
      expect(result.error.message).toContain('événement est complet');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('createInscription inserts row in transaction and returns success payload', async () => {
    const inserted: InscriptionRow = {
      id: 'ins-100',
      eventId: 'evt-4',
      name: 'Diane Leroy',
      email: 'diane@example.com',
    };

    const txMock: TxMock = {
      insert: (_table: unknown): TxInsertChain => ({
        values: (_payload: unknown) => ({
          returning: async () => [inserted],
        }),
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<InscriptionRow>): Promise<InscriptionRow> =>
        callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'hasUserRegistered').mockResolvedValue(false);
    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: {
        id: 'evt-4',
        title: 'Meetup Produit',
        date: new Date('2035-04-22T08:00:00.000Z'),
      },
    });

    const result = await storage.createInscription({
      eventId: 'evt-4',
      name: 'Diane Leroy',
      email: 'diane@example.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(inserted);
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Event registration created', {
      inscriptionId: 'ins-100',
      eventId: 'evt-4',
      name: 'Diane Leroy',
    });
  });

  it('createInscription wraps transaction errors into DatabaseError', async () => {
    mockDb.transaction.mockRejectedValue(new Error('insert inscription failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'hasUserRegistered').mockResolvedValue(false);
    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: {
        id: 'evt-5',
        title: 'Atelier Final',
        date: new Date('2036-01-10T10:00:00.000Z'),
      },
    });

    const result = await storage.createInscription({
      eventId: 'evt-5',
      name: 'Emma Robert',
      email: 'emma@example.com',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la création de l'inscription");
    }
  });
});
