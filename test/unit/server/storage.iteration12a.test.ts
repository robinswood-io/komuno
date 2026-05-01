import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type TagRow = {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
};

type TagInput = {
  name: string;
  color?: string;
  description?: string;
};

type TagUpdateInput = {
  name?: string;
  color?: string;
  description?: string;
};

type AssignmentRow = {
  id: string;
  memberEmail: string;
  tagId: string;
};

type AssignmentInput = {
  memberEmail: string;
  tagId: string;
};

type SelectOrderByChain<T> = {
  from: (table: unknown) => {
    orderBy: (ordering: unknown) => Promise<T[]>;
  };
};

type SelectLimitChain<T> = {
  from: (table: unknown) => {
    where: (criteria: unknown) => {
      limit: (count: number) => Promise<T[]>;
    };
  };
};

type InsertChain<T> = {
  values: (payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type UpdateChain<T> = {
  set: (payload: unknown) => {
    where: (criteria: unknown) => {
      returning: () => Promise<T[]>;
    };
  };
};

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
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
  update: vi.fn(),
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
      update: mockDb.update,
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

describe('server/storage.js - iteration 12a member tags coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getAllTags returns success payload with ordered tags', async () => {
    const tags: TagRow[] = [
      { id: 't-1', name: 'Animation', color: '#00AAFF' },
      { id: 't-2', name: 'Finance', color: '#22CC66' },
    ];

    mockDb.select.mockImplementation((): SelectOrderByChain<TagRow> => ({
      from: (_table: unknown) => ({
        orderBy: async (_ordering: unknown) => tags,
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAllTags();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(tags);
    }
  });

  it('getAllTags wraps select failure into DatabaseError', async () => {
    mockDb.select.mockImplementation((): SelectOrderByChain<TagRow> => ({
      from: (_table: unknown) => ({
        orderBy: async (_ordering: unknown) => {
          throw new Error('tags select failed');
        },
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getAllTags();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des tags');
    }
  });

  it('createTag returns success payload and logs when insert succeeds', async () => {
    const createdTag: TagRow = {
      id: 't-3',
      name: 'RH',
      color: '#F59E0B',
      description: 'Ressources humaines',
    };

    mockDb.insert.mockImplementation((_table: unknown): InsertChain<TagRow> => ({
      values: (_payload: unknown) => ({
        returning: async () => [createdTag],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const tagInput: TagInput = {
      name: 'RH',
      color: '#F59E0B',
      description: 'Ressources humaines',
    };

    const result = await storage.createTag(tagInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(createdTag);
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Tag créé', { tagId: 't-3', name: 'RH' });
  });

  it('createTag returns DuplicateError when unique constraint fails', async () => {
    mockDb.insert.mockImplementation((_table: unknown): InsertChain<TagRow> => ({
      values: (_payload: unknown) => ({
        returning: async () => {
          throw new Error('unique constraint member_tags_name_key');
        },
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createTag({ name: 'Finance' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('existe déjà');
    }
  });

  it('updateTag returns NotFoundError when no row is returned', async () => {
    mockDb.update.mockImplementation((_table: unknown): UpdateChain<TagRow> => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [],
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const updates: TagUpdateInput = { color: '#111827' };
    const result = await storage.updateTag('t-missing', updates);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Tag non trouvé');
    }
  });

  it('assignTagToMember returns existing assignment when already present', async () => {
    const existing: AssignmentRow = {
      id: 'a-1',
      memberEmail: 'membre@example.com',
      tagId: 't-1',
    };

    mockDb.select.mockImplementation((): SelectLimitChain<AssignmentRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_count: number) => [existing],
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const assignment: AssignmentInput = {
      memberEmail: 'membre@example.com',
      tagId: 't-1',
    };

    const result = await storage.assignTagToMember(assignment);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(existing);
    }
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('assignTagToMember inserts assignment when none exists', async () => {
    const created: AssignmentRow = {
      id: 'a-2',
      memberEmail: 'nouveau@example.com',
      tagId: 't-2',
    };

    mockDb.select.mockImplementation((): SelectLimitChain<AssignmentRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_count: number) => [],
        }),
      }),
    }));

    mockDb.insert.mockImplementation((_table: unknown): InsertChain<AssignmentRow> => ({
      values: (_payload: unknown) => ({
        returning: async () => [created],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const assignment: AssignmentInput = {
      memberEmail: 'nouveau@example.com',
      tagId: 't-2',
    };

    const result = await storage.assignTagToMember(assignment);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(created);
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Tag assigné au membre', {
      memberEmail: 'nouveau@example.com',
      tagId: 't-2',
    });
  });

  it('assignTagToMember wraps failures into DatabaseError', async () => {
    mockDb.select.mockImplementation((): SelectLimitChain<AssignmentRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_count: number) => {
            throw new Error('assignment check failed');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const assignment: AssignmentInput = {
      memberEmail: 'erreur@example.com',
      tagId: 't-3',
    };

    const result = await storage.assignTagToMember(assignment);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de l\'assignation du tag');
    }
  });
});
