import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type IdeaListRow = {
  id: string;
  title: string;
  description: string | null;
  proposedBy: string;
  proposedByEmail: string;
  status: string;
  featured: boolean;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  updatedBy: string | null;
  voteCount: number | string;
};

type IdeaResult = {
  id: string;
  title: string;
  description?: string | null;
  proposedBy?: string;
  status: string;
  featured?: boolean;
};

type EventRow = {
  id: string;
  title: string;
  status: string;
};

type SelectCountChain = {
  from: (_table: unknown) => Promise<Array<{ count: number }>>;
};

type SelectAllIdeasChain = {
  from: (_table: unknown) => {
    leftJoin: (_table: unknown, _condition: unknown) => {
      groupBy: (_value: unknown) => {
        orderBy: (_orderingA: unknown, _orderingB: unknown) => {
          limit: (_value: number) => {
            offset: (_value: number) => Promise<IdeaListRow[]>;
          };
        };
      };
    };
  };
};

type TxInsertChain<T> = {
  values: (payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type TxUpdateNoReturnChain = {
  set: (payload: unknown) => {
    where: (_criteria: unknown) => Promise<unknown>;
  };
};

type TxMockForTransform = {
  insert: (_table: unknown) => TxInsertChain<EventRow>;
  update: (_table: unknown) => TxUpdateNoReturnChain;
};

type TxMockForToggle = {
  update: (_table: unknown) => TxUpdateNoReturnChain;
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

describe('server/storage.js - iteration 14a uncovered ideas transformation/feature branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getAllIdeas returns paginated payload and casts voteCount to number', async () => {
    const rows: IdeaListRow[] = [
      {
        id: 'idea-1',
        title: 'Idée 1',
        description: 'Desc 1',
        proposedBy: 'Alice',
        proposedByEmail: 'alice@example.com',
        status: 'approved',
        featured: true,
        deadline: null,
        createdAt: new Date('2038-02-01T10:00:00.000Z'),
        updatedAt: null,
        updatedBy: null,
        voteCount: '4',
      },
    ];

    mockDb.select
      .mockImplementationOnce((): SelectCountChain => ({
        from: async (_table: unknown) => [{ count: 1 }],
      }))
      .mockImplementationOnce((): SelectAllIdeasChain => ({
        from: (_table: unknown) => ({
          leftJoin: (_joinTable: unknown, _condition: unknown) => ({
            groupBy: (_value: unknown) => ({
              orderBy: (_orderingA: unknown, _orderingB: unknown) => ({
                limit: (_limit: number) => ({
                  offset: async (_offset: number) => rows,
                }),
              }),
            }),
          }),
        }),
      }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAllIdeas({ page: 1, limit: 10 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(1);
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
      expect(result.data.data[0]?.voteCount).toBe(4);
    }
  });

  it('getAllIdeas wraps select failure into DatabaseError', async () => {
    mockDb.select.mockImplementation((): SelectCountChain => ({
      from: async (_table: unknown) => {
        throw new Error('ideas admin read failed');
      },
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAllIdeas({ page: 2, limit: 5 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération admin des idées');
    }
  });

  it('toggleIdeaFeatured propagates getIdea failure', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const upstreamError = new Error('idea lookup failed');
    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: false,
      error: upstreamError,
    });

    const result = await storage.toggleIdeaFeatured('idea-upstream');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(upstreamError);
    }
  });

  it('toggleIdeaFeatured returns NotFoundError when idea does not exist', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.toggleIdeaFeatured('idea-missing');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Idée introuvable');
    }
  });

  it('toggleIdeaFeatured flips featured status in transaction and returns new value', async () => {
    const whereSpy = vi.fn(async (_criteria: unknown) => undefined);
    const setSpy = vi.fn((_payload: unknown) => ({
      where: whereSpy,
    }));

    mockDb.transaction.mockImplementation(async (callback: (tx: TxMockForToggle) => Promise<void>) => {
      const tx: TxMockForToggle = {
        update: (_table: unknown) => ({
          set: setSpy,
        }),
      };

      await callback(tx);
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-100',
        title: 'Idée',
        status: 'approved',
        featured: false,
      },
    });

    const result = await storage.toggleIdeaFeatured('idea-100');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(true);
    }
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith('Idea featured status updated', {
      ideaId: 'idea-100',
      featured: true,
    });
  });

  it('toggleIdeaFeatured wraps transaction failures into DatabaseError', async () => {
    mockDb.transaction.mockRejectedValue(new Error('toggle tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-101',
        title: 'Idée',
        status: 'approved',
        featured: true,
      },
    });

    const result = await storage.toggleIdeaFeatured('idea-101');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la mise à jour du featured de l'idée");
    }
  });

  it('transformIdeaToEvent returns ValidationError when idea status is not approvable', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-200',
        title: 'Idée en attente',
        status: 'pending',
        proposedBy: 'Alice',
      } as IdeaResult,
    });

    const result = await storage.transformIdeaToEvent('idea-200');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('ValidationError');
      expect(result.error.message).toContain('Seules les idées approuvées ou réalisées');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('transformIdeaToEvent creates event and marks idea completed when source idea is approved', async () => {
    const eventCreated: EventRow = {
      id: 'evt-500',
      title: 'Événement: Idée validée',
      status: 'draft',
    };

    const insertValuesSpy = vi.fn((_payload: unknown) => ({
      returning: async () => [eventCreated],
    }));
    const updateWhereSpy = vi.fn(async (_criteria: unknown) => undefined);
    const updateSetSpy = vi.fn((_payload: unknown) => ({
      where: updateWhereSpy,
    }));

    mockDb.transaction.mockImplementation(async (callback: (tx: TxMockForTransform) => Promise<EventRow>) => {
      const tx: TxMockForTransform = {
        insert: (_table: unknown) => ({
          values: insertValuesSpy,
        }),
        update: (_table: unknown) => ({
          set: updateSetSpy,
        }),
      };

      return callback(tx);
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-201',
        title: 'Idée validée',
        description: 'Description source',
        proposedBy: 'Bob',
        status: 'approved',
      } as IdeaResult,
    });

    const result = await storage.transformIdeaToEvent('idea-201');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(eventCreated);
    }
    expect(insertValuesSpy).toHaveBeenCalledTimes(1);
    expect(updateSetSpy).toHaveBeenCalledTimes(1);
    expect(updateWhereSpy).toHaveBeenCalledTimes(1);
  });

  it('transformIdeaToEvent skips idea status update when source idea is already completed', async () => {
    const eventCreated: EventRow = {
      id: 'evt-600',
      title: 'Événement: Idée terminée',
      status: 'draft',
    };

    const updateSetSpy = vi.fn((_payload: unknown) => ({
      where: async (_criteria: unknown) => undefined,
    }));

    mockDb.transaction.mockImplementation(async (callback: (tx: TxMockForTransform) => Promise<EventRow>) => {
      const tx: TxMockForTransform = {
        insert: (_table: unknown) => ({
          values: (_payload: unknown) => ({
            returning: async () => [eventCreated],
          }),
        }),
        update: (_table: unknown) => ({
          set: updateSetSpy,
        }),
      };

      return callback(tx);
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-202',
        title: 'Idée terminée',
        description: null,
        proposedBy: 'Claire',
        status: 'completed',
      } as IdeaResult,
    });

    const result = await storage.transformIdeaToEvent('idea-202');

    expect(result.success).toBe(true);
    expect(updateSetSpy).not.toHaveBeenCalled();
  });

  it('transformIdeaToEvent wraps transaction errors into DatabaseError', async () => {
    mockDb.transaction.mockRejectedValue(new Error('transform failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-203',
        title: 'Idée à transformer',
        status: 'approved',
        proposedBy: 'David',
      } as IdeaResult,
    });

    const result = await storage.transformIdeaToEvent('idea-203');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la transformation de l'idée en événement");
    }
    expect(loggerMock.error).toHaveBeenCalled();
  });
});
