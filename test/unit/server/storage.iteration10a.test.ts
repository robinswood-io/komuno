import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type IdeaRow = {
  id: string;
  title: string;
  status?: string;
};

type EventRow = {
  id: string;
  title: string;
  date: Date;
  status?: string;
};

type TxUpdateChain = {
  set: (payload: unknown) => {
    where: (criteria: unknown) => Promise<unknown>;
  };
};

type TxMock = {
  update: (table: unknown) => TxUpdateChain;
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
          // No-op
        }
      },
  );
}

function loadStorageModule(): StorageModule {
  delete cjsRequire.cache[storageModulePath];
  return cjsRequire(storageModulePath) as StorageModule;
}

describe('server/storage.js - iteration 10a idea/event status update branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('updateIdeaStatus propagates getIdea failure', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const upstreamError = new Error('getIdea failed');

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: false,
      error: upstreamError,
    });

    const result = await storage.updateIdeaStatus('idea-fail', 'approved');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(upstreamError);
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('updateIdeaStatus returns NotFoundError when idea does not exist', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.updateIdeaStatus('idea-missing', 'approved');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Idée introuvable');
    }
  });

  it('updateIdeaStatus updates idea status and logs on success', async () => {
    const txMock: TxMock = {
      update: (_table: unknown): TxUpdateChain => ({
        set: (_payload: unknown) => ({
          where: async (_criteria: unknown) => undefined,
        }),
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<void>): Promise<void> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-1',
        title: 'Idée initiale',
        status: 'pending',
      } as IdeaRow,
    });

    const result = await storage.updateIdeaStatus('idea-1', 'approved');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Idea status updated', {
      ideaId: 'idea-1',
      newStatus: 'approved',
    });
  });

  it('updateIdeaStatus wraps transaction errors into DatabaseError', async () => {
    mockDb.transaction.mockRejectedValueOnce(new Error('idea status tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-2',
        title: 'Idée erreur',
        status: 'pending',
      } as IdeaRow,
    });

    const result = await storage.updateIdeaStatus('idea-2', 'completed');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la mise à jour du statut de l'idée");
    }
  });

  it('updateEventStatus propagates getEvent failure', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const upstreamError = new Error('getEvent failed');

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: false,
      error: upstreamError,
    });

    const result = await storage.updateEventStatus('event-fail', 'published');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(upstreamError);
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('updateEventStatus returns NotFoundError when event does not exist', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.updateEventStatus('event-missing', 'published');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Événement introuvable');
    }
  });

  it('updateEventStatus updates event status and logs on success', async () => {
    const txMock: TxMock = {
      update: (_table: unknown): TxUpdateChain => ({
        set: (_payload: unknown) => ({
          where: async (_criteria: unknown) => undefined,
        }),
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<void>): Promise<void> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: {
        id: 'event-1',
        title: 'Événement initial',
        date: new Date('2034-03-22T18:00:00.000Z'),
        status: 'draft',
      } as EventRow,
    });

    const result = await storage.updateEventStatus('event-1', 'published');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Event status updated', {
      eventId: 'event-1',
      newStatus: 'published',
    });
  });

  it('updateEventStatus wraps transaction errors into DatabaseError', async () => {
    mockDb.transaction.mockRejectedValueOnce(new Error('event status tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getEvent').mockResolvedValue({
      success: true,
      data: {
        id: 'event-2',
        title: 'Événement erreur',
        date: new Date('2034-04-10T09:30:00.000Z'),
        status: 'draft',
      } as EventRow,
    });

    const result = await storage.updateEventStatus('event-2', 'cancelled');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la mise à jour du statut de l'événement");
    }
  });
});
