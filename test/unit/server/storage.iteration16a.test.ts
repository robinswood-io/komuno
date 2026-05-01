import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type MemberTagRow = {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
  createdAt?: Date;
};

type MemberTaskRow = {
  id: string;
  memberEmail: string;
  title: string;
  status: string;
  dueDate?: Date | null;
};

type CreateTaskInput = {
  memberEmail: string;
  title: string;
  description?: string;
  status?: string;
  assignedTo?: string;
  dueDate?: string;
};

type SelectTagsChain<T> = {
  from: (table: unknown) => {
    innerJoin: (joinedTable: unknown, condition: unknown) => {
      where: (criteria: unknown) => {
        orderBy: (ordering: unknown) => Promise<T[]>;
      };
    };
  };
};

type SelectTasksChain<T> = {
  from: (table: unknown) => {
    where: (criteria: unknown) => {
      orderBy: (ordering: unknown) => Promise<T[]>;
    };
  };
};

type InsertChain<T> = {
  values: (payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type DeleteChain = {
  where: (criteria: unknown) => Promise<unknown>;
};

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
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
      insert: mockDb.insert,
      delete: mockDb.delete,
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

describe('server/storage.js - iteration 16a member tasks/tags branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getTagsByMember returns tags when join query succeeds', async () => {
    const tags: MemberTagRow[] = [
      { id: 'tag-1', name: 'Finance', color: '#22CC66' },
      { id: 'tag-2', name: 'Animation', color: '#00AAFF' },
    ];

    mockDb.select.mockImplementation((_projection?: unknown): SelectTagsChain<MemberTagRow> => ({
      from: (_table: unknown) => ({
        innerJoin: (_joinedTable: unknown, _condition: unknown) => ({
          where: (_criteria: unknown) => ({
            orderBy: async (_ordering: unknown) => tags,
          }),
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTagsByMember('member@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(tags);
    }
  });

  it('getTagsByMember wraps db failures into DatabaseError', async () => {
    mockDb.select.mockImplementation((_projection?: unknown): SelectTagsChain<MemberTagRow> => ({
      from: (_table: unknown) => ({
        innerJoin: (_joinedTable: unknown, _condition: unknown) => ({
          where: (_criteria: unknown) => ({
            orderBy: async (_ordering: unknown) => {
              throw new Error('tags join failure');
            },
          }),
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTagsByMember('member@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des tags du membre');
    }
  });

  it('createTask converts dueDate string to Date and logs success', async () => {
    let capturedPayload: unknown;

    const created: MemberTaskRow = {
      id: 'task-1',
      memberEmail: 'member@example.com',
      title: 'Préparer présentation',
      status: 'todo',
      dueDate: new Date('2027-01-10T00:00:00.000Z'),
    };

    mockDb.insert.mockImplementation((_table: unknown): InsertChain<MemberTaskRow> => ({
      values: (payload: unknown) => {
        capturedPayload = payload;
        return {
          returning: async () => [created],
        };
      },
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const input: CreateTaskInput = {
      memberEmail: 'member@example.com',
      title: 'Préparer présentation',
      dueDate: '2027-01-10T00:00:00.000Z',
      status: 'todo',
    };

    const result = await storage.createTask(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(created);
    }

    const payload = capturedPayload as { dueDate?: unknown; memberEmail?: string };
    expect(payload.memberEmail).toBe('member@example.com');
    expect(payload.dueDate instanceof Date).toBe(true);

    expect(loggerMock.info).toHaveBeenCalledWith('Tâche créée', {
      taskId: 'task-1',
      memberEmail: 'member@example.com',
    });
  });

  it('createTask keeps dueDate undefined when not provided', async () => {
    let capturedPayload: unknown;

    const created: MemberTaskRow = {
      id: 'task-2',
      memberEmail: 'member@example.com',
      title: 'Relancer partenaire',
      status: 'todo',
      dueDate: null,
    };

    mockDb.insert.mockImplementation((_table: unknown): InsertChain<MemberTaskRow> => ({
      values: (payload: unknown) => {
        capturedPayload = payload;
        return {
          returning: async () => [created],
        };
      },
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createTask({
      memberEmail: 'member@example.com',
      title: 'Relancer partenaire',
    });

    expect(result.success).toBe(true);
    const payload = capturedPayload as { dueDate?: unknown };
    expect(payload.dueDate).toBeUndefined();
  });

  it('createTask returns DatabaseError when insertion fails', async () => {
    mockDb.insert.mockImplementation((_table: unknown): InsertChain<MemberTaskRow> => ({
      values: (_payload: unknown) => ({
        returning: async () => {
          throw new Error('task insert failure');
        },
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createTask({
      memberEmail: 'member@example.com',
      title: 'Task fail',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la création de la tâche');
    }
  });

  it('getTasksByMember returns tasks in success path', async () => {
    const tasks: MemberTaskRow[] = [
      {
        id: 'task-3',
        memberEmail: 'member@example.com',
        title: 'Appeler client',
        status: 'in_progress',
      },
    ];

    mockDb.select.mockImplementation((): SelectTasksChain<MemberTaskRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => tasks,
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTasksByMember('member@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(tasks);
    }
  });

  it('deleteTask returns DatabaseError when delete query fails', async () => {
    mockDb.delete.mockImplementation((_table: unknown): DeleteChain => ({
      where: async (_criteria: unknown) => {
        throw new Error('task delete failure');
      },
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteTask('task-bad');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la suppression de la tâche');
    }
  });
});
