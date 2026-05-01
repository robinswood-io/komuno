import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type MemberTaskRow = {
  id: string;
  memberEmail: string;
  title: string;
  status: string;
  dueDate: Date | null;
  createdAt: Date;
};

type MemberRelationRow = {
  id: string;
  memberEmail: string;
  relatedMemberEmail: string;
  relationType: string;
  createdAt: Date;
};

type SelectWhereLimitChain<T> = {
  from: (_table: unknown) => {
    where: (_criteria: unknown) => {
      limit: (_count: number) => Promise<T[]>;
    };
  };
};

type SelectWhereOrderByChain<T> = {
  from: (_table: unknown) => {
    where: (_criteria: unknown) => {
      orderBy: (..._ordering: unknown[]) => Promise<T[]>;
    };
  };
};

type SelectOrderByChain<T> = {
  from: (_table: unknown) => {
    orderBy: (..._ordering: unknown[]) => Promise<T[]>;
  };
};

type DeleteWhereChain = {
  where: (_criteria: unknown) => Promise<unknown>;
};

type UpdateSetWhereReturningChain<T> = {
  set: (payload: unknown) => {
    where: (_criteria: unknown) => {
      returning: () => Promise<T[]>;
    };
  };
};

type InsertValuesReturningChain<T> = {
  values: (_payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
  select: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
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
      delete: mockDb.delete,
      update: mockDb.update,
      insert: mockDb.insert,
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

describe('server/storage.js - iteration 13b disjoint branches tasks/relations/tags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('removeTagFromMember logs and returns success on delete', async () => {
    const whereSpy = vi.fn(async (_criteria: unknown) => undefined);

    mockDb.delete.mockImplementationOnce(
      (_table: unknown): DeleteWhereChain => ({
        where: whereSpy,
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.removeTagFromMember('member@example.com', 'tag-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith('Tag retiré du membre', {
      memberEmail: 'member@example.com',
      tagId: 'tag-1',
    });
  });

  it('removeTagFromMember wraps delete failures into DatabaseError', async () => {
    mockDb.delete.mockImplementationOnce(
      (_table: unknown): DeleteWhereChain => ({
        where: async (_criteria: unknown) => {
          throw new Error('remove tag failed');
        },
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.removeTagFromMember('member@example.com', 'tag-2');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la suppression du tag');
    }
  });

  it('updateTask returns NotFoundError when no row is returned', async () => {
    mockDb.update.mockImplementationOnce(
      (_table: unknown): UpdateSetWhereReturningChain<MemberTaskRow> => ({
        set: (_payload: unknown) => ({
          where: (_criteria: unknown) => ({
            returning: async () => [],
          }),
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateTask('task-missing', { status: 'completed' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Tâche non trouvée');
    }
  });

  it('updateTask sets completedAt when status becomes completed', async () => {
    let capturedSetPayload: unknown;

    const updatedRow: MemberTaskRow = {
      id: 'task-1',
      memberEmail: 'm1@example.com',
      title: 'Action prioritaire',
      status: 'completed',
      dueDate: null,
      createdAt: new Date('2035-05-01T08:00:00.000Z'),
    };

    mockDb.update.mockImplementationOnce(
      (_table: unknown): UpdateSetWhereReturningChain<MemberTaskRow> => ({
        set: (payload: unknown) => {
          capturedSetPayload = payload;
          return {
            where: (_criteria: unknown) => ({
              returning: async () => [updatedRow],
            }),
          };
        },
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateTask('task-1', {
      status: 'completed',
      dueDate: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedRow);
    }

    const setPayload = capturedSetPayload as Record<string, unknown>;
    expect(setPayload.completedAt).toBeDefined();
    expect(setPayload.dueDate).toBeNull();
  });

  it('getAllTasks uses combined status+assignedTo branch', async () => {
    const tasks: MemberTaskRow[] = [
      {
        id: 'task-2',
        memberEmail: 'member@example.com',
        title: 'Relancer contact',
        status: 'todo',
        dueDate: new Date('2035-07-10T12:00:00.000Z'),
        createdAt: new Date('2035-07-01T12:00:00.000Z'),
      },
    ];

    const whereSpy = vi.fn((_criteria: unknown) => ({
      orderBy: async (..._ordering: unknown[]) => tasks,
    }));

    mockDb.select.mockImplementationOnce(
      (): SelectWhereOrderByChain<MemberTaskRow> => ({
        from: (_table: unknown) => ({
          where: whereSpy,
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAllTasks({ status: 'todo', assignedTo: 'member@example.com' });

    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(tasks);
    }
  });

  it('getAllTasks wraps select errors into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('select tasks failed');
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAllTasks();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des tâches');
    }
  });

  it('createRelation returns existing relation when already present', async () => {
    const existingRelation: MemberRelationRow = {
      id: 'rel-1',
      memberEmail: 'a@example.com',
      relatedMemberEmail: 'b@example.com',
      relationType: 'mentor',
      createdAt: new Date('2035-02-02T10:00:00.000Z'),
    };

    const limitSpy = vi.fn(async (_count: number) => [existingRelation]);

    mockDb.select.mockImplementationOnce(
      (): SelectWhereLimitChain<MemberRelationRow> => ({
        from: (_table: unknown) => ({
          where: (_criteria: unknown) => ({
            limit: limitSpy,
          }),
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createRelation({
      memberEmail: 'a@example.com',
      relatedMemberEmail: 'b@example.com',
      relationType: 'mentor',
    });

    expect(limitSpy).toHaveBeenCalledWith(1);
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(existingRelation);
    }
  });

  it('createRelation wraps failures into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce(
      (): SelectWhereLimitChain<MemberRelationRow> => ({
        from: (_table: unknown) => ({
          where: (_criteria: unknown) => ({
            limit: async (_count: number) => {
              throw new Error('relation lookup failed');
            },
          }),
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createRelation({
      memberEmail: 'x@example.com',
      relatedMemberEmail: 'y@example.com',
      relationType: 'peer',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la création de la relation');
    }
  });

  it('deleteRelation wraps delete failures into DatabaseError', async () => {
    mockDb.delete.mockImplementationOnce(
      (_table: unknown): DeleteWhereChain => ({
        where: async (_criteria: unknown) => {
          throw new Error('delete relation failed');
        },
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteRelation('rel-2');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la suppression de la relation');
    }
  });
});
