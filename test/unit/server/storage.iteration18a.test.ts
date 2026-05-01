import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type MemberRow = {
  email: string;
  firstName: string;
  lastName: string;
  status?: string;
  proposedBy?: string | null;
};

type ProposeMemberInput = {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  role?: string;
  notes?: string;
  proposedBy?: string;
};

type SelectWhereChain = {
  where: (criteria: unknown) => Promise<MemberRow[]>;
};

type SelectFromChain = {
  from: (table: unknown) => SelectWhereChain;
};

type InsertReturningChain = {
  returning: () => Promise<MemberRow[]>;
};

type InsertValuesChain = {
  values: (payload: unknown) => InsertReturningChain;
};

type DeleteWhereChain = {
  where: (criteria: unknown) => Promise<unknown>;
};

type DbMock = {
  select: ReturnType<typeof vi.fn<() => SelectFromChain>>;
  insert: ReturnType<typeof vi.fn<(table: unknown) => InsertValuesChain>>;
  delete: ReturnType<typeof vi.fn<(table: unknown) => DeleteWhereChain>>;
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

describe('server/storage.js - iteration 18a uncovered member actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('proposeMember inserts a proposed member when email does not exist', async () => {
    const selectWhere = vi.fn(async (_criteria: unknown) => []);
    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: selectWhere,
      }),
    });

    let capturedPayload: unknown;
    const insertedMember: MemberRow = {
      email: 'new-proposal@komuno.test',
      firstName: 'Nora',
      lastName: 'Martin',
      status: 'proposed',
      proposedBy: 'admin@komuno.test',
    };

    mockDb.insert.mockReturnValue({
      values: (payload: unknown) => {
        capturedPayload = payload;
        return {
          returning: async () => [insertedMember],
        };
      },
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.proposeMember({
      email: 'new-proposal@komuno.test',
      firstName: 'Nora',
      lastName: 'Martin',
      proposedBy: 'admin@komuno.test',
    } as ProposeMemberInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(insertedMember);
    }

    const payload = capturedPayload as Record<string, unknown>;
    expect(payload.status).toBe('proposed');
    expect(payload.proposedBy).toBe('admin@komuno.test');
    expect(payload.firstSeenAt instanceof Date).toBe(true);
    expect(payload.lastActivityAt instanceof Date).toBe(true);

    expect(loggerMock.info).toHaveBeenCalledWith('Member proposed', {
      email: 'new-proposal@komuno.test',
      proposedBy: 'admin@komuno.test',
      name: 'Nora Martin',
    });
  });

  it('proposeMember returns DuplicateError when member email already exists', async () => {
    const existingMember: MemberRow = {
      email: 'duplicate@komuno.test',
      firstName: 'Lina',
      lastName: 'Dupont',
    };

    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [existingMember],
      }),
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.proposeMember({
      email: 'duplicate@komuno.test',
      firstName: 'Lina',
      lastName: 'Dupont',
    } as ProposeMemberInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DuplicateError');
      expect(result.error.message).toContain('Un membre avec cet email existe déjà');
    }
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('deleteMember deletes an existing member and logs action', async () => {
    const existingMember: MemberRow = {
      email: 'to-delete@komuno.test',
      firstName: 'Paul',
      lastName: 'Roux',
    };

    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [existingMember],
      }),
    });

    const deleteWhere = vi.fn(async (_criteria: unknown) => ({ rowCount: 1 }));
    mockDb.delete.mockReturnValue({
      where: deleteWhere,
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteMember('to-delete@komuno.test');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
    expect(deleteWhere).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith('Member deleted', {
      email: 'to-delete@komuno.test',
    });
  });

  it('deleteMember wraps delete failures into DatabaseError', async () => {
    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            email: 'failing-delete@komuno.test',
            firstName: 'Milo',
            lastName: 'Leroy',
          },
        ],
      }),
    });

    mockDb.delete.mockReturnValue({
      where: async (_criteria: unknown) => {
        throw new Error('delete query failed');
      },
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteMember('failing-delete@komuno.test');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la suppression du membre');
    }
  });
});
