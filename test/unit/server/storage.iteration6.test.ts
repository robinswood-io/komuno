import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type IdeaRow = {
  id: string;
  title: string;
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

type SelectLimitChain<T> = {
  from: (table: unknown) => {
    where: (criteria: unknown) => {
      limit: (value: number) => Promise<T[]>;
    };
  };
};

type DbMock = {
  select: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
  select: vi.fn(),
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

describe('server/storage.js - iteration 6 additional exported methods coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getIdea returns idea payload when row exists', async () => {
    const ideaRow: IdeaRow = {
      id: 'idea-1',
      title: 'Nouvelle idée',
    };

    mockDb.select.mockImplementation((): SelectWhereChain<IdeaRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [ideaRow],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getIdea('idea-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(ideaRow);
    }
  });

  it('getIdea wraps select errors into DatabaseError', async () => {
    mockDb.select.mockImplementation((): SelectWhereChain<IdeaRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => {
          throw new Error('idea select failed');
        },
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getIdea('idea-error');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la récupération de l'idée");
    }
  });

  it('getEvent returns event payload when row exists', async () => {
    const eventRow: EventRow = {
      id: 'event-1',
      title: 'Assemblée générale',
      date: new Date('2030-06-15T10:00:00.000Z'),
    };

    mockDb.select.mockImplementation((): SelectWhereChain<EventRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [eventRow],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getEvent('event-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(eventRow);
    }
  });

  it('getEvent wraps select errors into DatabaseError', async () => {
    mockDb.select.mockImplementation((): SelectWhereChain<EventRow> => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => {
          throw new Error('event select failed');
        },
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getEvent('event-error');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la récupération de l'événement");
    }
  });

  it('isDuplicateIdea returns true when duplicate exists', async () => {
    mockDb.select.mockImplementation((): SelectLimitChain<IdeaRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_value: number) => [{ id: 'idea-dup', title: 'Doublon' }],
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.isDuplicateIdea('Doublon');

    expect(result).toBe(true);
  });

  it('isDuplicateIdea returns false and logs on query error', async () => {
    mockDb.select.mockImplementation((): SelectLimitChain<IdeaRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_value: number) => {
            throw new Error('duplicate idea check failed');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.isDuplicateIdea('Titre erreur');

    expect(result).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith('Duplicate idea check failed', {
      title: 'Titre erreur',
      error: expect.any(Error),
    });
  });

  it('isDuplicateEvent returns true when duplicate exists', async () => {
    const eventDate = new Date('2031-04-12T08:30:00.000Z');

    mockDb.select.mockImplementation((): SelectLimitChain<EventRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_value: number) => [
            {
              id: 'event-dup',
              title: 'Atelier',
              date: eventDate,
            },
          ],
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.isDuplicateEvent('Atelier', eventDate);

    expect(result).toBe(true);
  });

  it('isDuplicateEvent returns false and logs on query error', async () => {
    const eventDate = new Date('2031-05-20T14:00:00.000Z');

    mockDb.select.mockImplementation((): SelectLimitChain<EventRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_value: number) => {
            throw new Error('duplicate event check failed');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.isDuplicateEvent('Atelier erreur', eventDate);

    expect(result).toBe(false);
    expect(loggerMock.error).toHaveBeenCalledWith('Duplicate event check failed', {
      title: 'Atelier erreur',
      date: eventDate,
      error: expect.any(Error),
    });
  });
});
