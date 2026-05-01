import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type RelationRow = {
  id: string;
  memberEmail: string;
  relatedMemberEmail: string;
  relationType: string;
  createdAt?: Date;
};

type RelationInput = {
  memberEmail: string;
  relatedMemberEmail: string;
  relationType: string;
};

type SelectOrderByChain<T> = {
  from: (table: unknown) => {
    where: (criteria: unknown) => {
      orderBy: (ordering: unknown) => Promise<T[]>;
    };
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

describe('server/storage.js - iteration 13a member relations coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getRelationsByMember returns ordered relations on success', async () => {
    const relations: RelationRow[] = [
      {
        id: 'rel-1',
        memberEmail: 'alice@example.com',
        relatedMemberEmail: 'bob@example.com',
        relationType: 'partner',
      },
    ];

    mockDb.select.mockImplementation((): SelectOrderByChain<RelationRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => relations,
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getRelationsByMember('alice@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(relations);
    }
  });

  it('getRelationsByMember wraps database failures in DatabaseError', async () => {
    mockDb.select.mockImplementation((): SelectOrderByChain<RelationRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => {
            throw new Error('relation read failure');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getRelationsByMember('alice@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des relations');
    }
  });

  it('createRelation returns existing relation when duplicate is detected', async () => {
    const existingRelation: RelationRow = {
      id: 'rel-existing',
      memberEmail: 'alice@example.com',
      relatedMemberEmail: 'bob@example.com',
      relationType: 'partner',
    };

    mockDb.select.mockImplementation((): SelectLimitChain<RelationRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_count: number) => [existingRelation],
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const payload: RelationInput = {
      memberEmail: 'alice@example.com',
      relatedMemberEmail: 'bob@example.com',
      relationType: 'partner',
    };

    const result = await storage.createRelation(payload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(existingRelation);
    }
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('createRelation inserts and logs when relation does not already exist', async () => {
    const createdRelation: RelationRow = {
      id: 'rel-2',
      memberEmail: 'alice@example.com',
      relatedMemberEmail: 'carol@example.com',
      relationType: 'mentor',
    };

    mockDb.select.mockImplementation((): SelectLimitChain<RelationRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_count: number) => [],
        }),
      }),
    }));

    mockDb.insert.mockImplementation((_table: unknown): InsertChain<RelationRow> => ({
      values: (_payload: unknown) => ({
        returning: async () => [createdRelation],
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const payload: RelationInput = {
      memberEmail: 'alice@example.com',
      relatedMemberEmail: 'carol@example.com',
      relationType: 'mentor',
    };

    const result = await storage.createRelation(payload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(createdRelation);
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Relation créée', {
      relationId: 'rel-2',
      memberEmail: 'alice@example.com',
    });
  });

  it('createRelation returns DatabaseError when select fails', async () => {
    mockDb.select.mockImplementation((): SelectLimitChain<RelationRow> => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          limit: async (_count: number) => {
            throw new Error('relation select failure');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createRelation({
      memberEmail: 'alice@example.com',
      relatedMemberEmail: 'bob@example.com',
      relationType: 'partner',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la création de la relation');
    }
  });

  it('deleteRelation returns success and logs on deletion', async () => {
    mockDb.delete.mockImplementation((_table: unknown): DeleteChain => ({
      where: async (_criteria: unknown) => ({ rowCount: 1 }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteRelation('rel-99');

    expect(result.success).toBe(true);
    expect(loggerMock.info).toHaveBeenCalledWith('Relation supprimée', { relationId: 'rel-99' });
  });

  it('deleteRelation returns DatabaseError when delete fails', async () => {
    mockDb.delete.mockImplementation((_table: unknown): DeleteChain => ({
      where: async (_criteria: unknown) => {
        throw new Error('relation delete failure');
      },
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteRelation('rel-bad');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la suppression de la relation');
    }
  });
});
