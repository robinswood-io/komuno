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

type DbMock = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
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
  delete: vi.fn(),
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
      delete: mockDb.delete,
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

describe('server/storage.js - iteration 29 member branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('proposeMember returns DatabaseError and logs when select fails', async () => {
    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => {
          throw new Error('select failed');
        },
      }),
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.proposeMember({
      email: 'proposal-select-error@komuno.test',
      firstName: 'Lina',
      lastName: 'Select',
      proposedBy: 'admin@komuno.test',
    } as ProposeMemberInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toBe('Erreur lors de la proposition du membre');
    }

    expect(loggerMock.error).toHaveBeenCalledWith('Member proposal failed', {
      email: 'proposal-select-error@komuno.test',
      error: expect.any(Error),
    });
  });

  it('proposeMember returns DatabaseError and logs when insert fails', async () => {
    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    });

    mockDb.insert.mockReturnValue({
      values: (_payload: unknown) => ({
        returning: async () => {
          throw new Error('insert failed');
        },
      }),
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.proposeMember({
      email: 'proposal-insert-error@komuno.test',
      firstName: 'Nora',
      lastName: 'Insert',
      proposedBy: 'admin@komuno.test',
    } as ProposeMemberInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toBe('Erreur lors de la proposition du membre');
    }

    expect(loggerMock.error).toHaveBeenCalledWith('Member proposal failed', {
      email: 'proposal-insert-error@komuno.test',
      error: expect.any(Error),
    });
  });

  it('deleteMember returns NotFoundError when member does not exist', async () => {
    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [],
      }),
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.deleteMember('missing-member@komuno.test');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Membre introuvable');
    }
    expect(mockDb.delete).not.toHaveBeenCalled();
  });

  it('createOrUpdateMember wraps update failures for existing member into DatabaseError', async () => {
    mockDb.select.mockReturnValue({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [
          {
            email: 'existing@komuno.test',
            firstName: 'Existing',
            lastName: 'Member',
          },
        ],
      }),
    });

    mockDb.update.mockReturnValue({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => {
            throw new Error('update failed');
          },
        }),
      }),
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createOrUpdateMember({
      email: 'existing@komuno.test',
      firstName: 'Updated',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('création/mise à jour du membre');
    }
  });
});
