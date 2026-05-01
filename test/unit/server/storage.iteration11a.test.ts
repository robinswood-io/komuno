import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type IdeaRow = {
  id: string;
  title: string;
  description?: string;
  proposedBy?: string;
  proposedByEmail?: string;
  status?: string;
  featured?: boolean;
  deadline?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  updatedBy?: string;
};

type IdeasListRow = {
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

type CountRow = {
  count: number;
};

type CountSelectChain = {
  from: (table: unknown) => {
    where: (criteria: unknown) => Promise<CountRow[]>;
  };
};

type IdeasListSelectChain = {
  from: (table: unknown) => {
    leftJoin: (table: unknown, join: unknown) => {
      where: (criteria: unknown) => {
        groupBy: (grouping: unknown) => {
          orderBy: (orderingA: unknown, orderingB: unknown, orderingC: unknown) => {
            limit: (limitValue: number) => {
              offset: (offsetValue: number) => Promise<IdeasListRow[]>;
            };
          };
        };
      };
    };
  };
};

type TxInsertIdeaChain = {
  values: (payload: unknown) => {
    returning: () => Promise<IdeaRow[]>;
  };
};

type TxUpdateIdeaChain = {
  set: (payload: unknown) => {
    where: (criteria: unknown) => {
      returning: () => Promise<IdeaRow[]>;
    };
  };
};

type TxMock = {
  insert: (table: unknown) => TxInsertIdeaChain;
  update: (table: unknown) => TxUpdateIdeaChain;
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

describe('server/storage.js - iteration 11a ideas create/update/listing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getIdeas returns paginated data and normalizes voteCount to numbers', async () => {
    const rows: IdeasListRow[] = [
      {
        id: 'idea-1',
        title: 'Idea A',
        description: 'Desc A',
        proposedBy: 'Alice',
        proposedByEmail: 'alice@example.com',
        status: 'approved',
        featured: true,
        deadline: null,
        createdAt: new Date('2030-01-01T08:00:00.000Z'),
        updatedAt: null,
        updatedBy: null,
        voteCount: '3',
      },
      {
        id: 'idea-2',
        title: 'Idea B',
        description: 'Desc B',
        proposedBy: 'Bob',
        proposedByEmail: 'bob@example.com',
        status: 'completed',
        featured: false,
        deadline: new Date('2030-03-15T08:00:00.000Z'),
        createdAt: new Date('2030-01-02T08:00:00.000Z'),
        updatedAt: new Date('2030-01-10T08:00:00.000Z'),
        updatedBy: 'admin',
        voteCount: 7,
      },
    ];

    mockDb.select
      .mockImplementationOnce((_fields: unknown): CountSelectChain => ({
        from: (_table: unknown) => ({
          where: async (_criteria: unknown) => [{ count: 12 }],
        }),
      }))
      .mockImplementationOnce((_fields: unknown): IdeasListSelectChain => ({
        from: (_table: unknown) => ({
          leftJoin: (_joinTable: unknown, _join: unknown) => ({
            where: (_criteria: unknown) => ({
              groupBy: (_grouping: unknown) => ({
                orderBy: (_orderingA: unknown, _orderingB: unknown, _orderingC: unknown) => ({
                  limit: (_limitValue: number) => ({
                    offset: async (_offsetValue: number) => rows,
                  }),
                }),
              }),
            }),
          }),
        }),
      }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getIdeas({ page: 2, limit: 5 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total).toBe(12);
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(5);
      expect(result.data.data).toHaveLength(2);
      expect(result.data.data[0]?.voteCount).toBe(3);
      expect(result.data.data[1]?.voteCount).toBe(7);
    }
  });

  it('getIdeas wraps query failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce((_fields: unknown): CountSelectChain => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => {
          throw new Error('ideas count failed');
        },
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getIdeas({ page: 1, limit: 20 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des idées');
    }
  });

  it('createIdea returns DuplicateError when title already exists', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'isDuplicateIdea').mockResolvedValue(true);

    const result = await storage.createIdea({
      title: 'Duplicated idea',
      description: 'description',
      proposedBy: 'Nina',
      proposedByEmail: 'nina@example.com',
      status: 'pending',
      featured: false,
      deadline: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('Une idée avec ce titre existe déjà');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('createIdea inserts idea in transaction and converts deadline to Date', async () => {
    const createdIdea: IdeaRow = {
      id: 'idea-new',
      title: 'Fresh idea',
      proposedBy: 'Nina',
      proposedByEmail: 'nina@example.com',
      status: 'pending',
      featured: false,
      deadline: new Date('2036-02-12T09:00:00.000Z'),
    };

    let capturedInsertValues: unknown;

    const txMock: TxMock = {
      insert: (_table: unknown): TxInsertIdeaChain => ({
        values: (payload: unknown) => {
          capturedInsertValues = payload;
          return {
            returning: async () => [createdIdea],
          };
        },
      }),
      update: (_table: unknown): TxUpdateIdeaChain => ({
        set: (_payload: unknown) => ({
          where: (_criteria: unknown) => ({
            returning: async () => [createdIdea],
          }),
        }),
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<IdeaRow>): Promise<IdeaRow> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'isDuplicateIdea').mockResolvedValue(false);

    const result = await storage.createIdea({
      title: 'Fresh idea',
      description: 'description',
      proposedBy: 'Nina',
      proposedByEmail: 'nina@example.com',
      status: 'pending',
      featured: false,
      deadline: '2036-02-12T09:00:00.000Z',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(createdIdea);
    }

    expect(Array.isArray(capturedInsertValues)).toBe(true);
    if (Array.isArray(capturedInsertValues) && capturedInsertValues.length > 0) {
      const payload = capturedInsertValues[0] as { deadline?: unknown };
      expect(payload.deadline).toBeInstanceOf(Date);
    }

    expect(loggerMock.info).toHaveBeenCalledWith('Idea created', {
      ideaId: 'idea-new',
      proposedBy: 'Nina',
      title: 'Fresh idea',
    });
  });

  it('updateIdea returns NotFoundError when idea does not exist', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: null,
    });

    const result = await storage.updateIdea('idea-missing', {
      title: 'Updated title',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Idée introuvable');
    }
  });

  it('updateIdea returns DuplicateError when new title already exists', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-1',
        title: 'Old title',
      } as IdeaRow,
    });

    vi.spyOn(storage, 'isDuplicateIdea').mockResolvedValue(true);

    const result = await storage.updateIdea('idea-1', {
      title: 'New conflicting title',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('Une idée avec ce titre existe déjà');
    }
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('updateIdea updates data in transaction and converts createdAt string to Date', async () => {
    const updatedIdea: IdeaRow = {
      id: 'idea-5',
      title: 'Edited title',
      status: 'approved',
    };

    let capturedUpdateData: unknown;

    const txMock: TxMock = {
      insert: (_table: unknown): TxInsertIdeaChain => ({
        values: (_payload: unknown) => ({
          returning: async () => [updatedIdea],
        }),
      }),
      update: (_table: unknown): TxUpdateIdeaChain => ({
        set: (payload: unknown) => {
          capturedUpdateData = payload;
          return {
            where: (_criteria: unknown) => ({
              returning: async () => [updatedIdea],
            }),
          };
        },
      }),
    };

    mockDb.transaction.mockImplementation(
      async (callback: (tx: TxMock) => Promise<IdeaRow>): Promise<IdeaRow> => callback(txMock),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-5',
        title: 'Previous title',
      } as IdeaRow,
    });

    vi.spyOn(storage, 'isDuplicateIdea').mockResolvedValue(false);

    const result = await storage.updateIdea('idea-5', {
      title: 'Edited title',
      createdAt: '2037-07-01T10:30:00.000Z',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedIdea);
    }

    expect(capturedUpdateData).toBeTruthy();
    const updatePayload = capturedUpdateData as {
      createdAt?: unknown;
      updatedBy?: unknown;
      updatedAt?: unknown;
    };
    expect(updatePayload.createdAt).toBeInstanceOf(Date);
    expect(updatePayload.updatedBy).toBe('admin');
    expect(updatePayload.updatedAt).toBeDefined();

    expect(loggerMock.info).toHaveBeenCalledWith('Idea updated', {
      ideaId: 'idea-5',
      title: 'Edited title',
      updates: ['title', 'createdAt'],
    });
  });

  it('updateIdea wraps transaction failures into DatabaseError', async () => {
    mockDb.transaction.mockRejectedValueOnce(new Error('update idea tx failed'));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    vi.spyOn(storage, 'getIdea').mockResolvedValue({
      success: true,
      data: {
        id: 'idea-6',
        title: 'Stable title',
      } as IdeaRow,
    });

    const result = await storage.updateIdea('idea-6', {
      description: 'new description',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la mise à jour de l'idée");
    }
  });
});
