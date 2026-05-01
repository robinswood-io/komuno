import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type DbMock = {
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
  update: vi.fn(),
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
  const selectMock = vi.fn(() => ({
    from: () => ({
      limit: async () => [],
    }),
  }));

  setCjsModule(dbModulePath, {
    pool: {},
    dbResilience: {},
    QUERY_TIMEOUT_PROFILES: {},
    runDbQuery: vi.fn(),
    getPoolStats: vi.fn(),
    db: {
      select: selectMock,
      update: mockDb.update,
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

describe('server/storage.js - iteration 3 additional DatabaseStorage methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('approveAdmin returns success payload when update returns a row', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const updatedAdmin = {
      id: 'adm-1',
      email: 'admin@example.com',
      status: 'active',
      role: 'content_manager',
    };

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [updatedAdmin],
        }),
      }),
    }));

    const result = await storage.approveAdmin('admin@example.com', 'content_manager');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedAdmin);
    }
  });

  it('approveAdmin returns NotFoundError when no row is updated', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [],
        }),
      }),
    }));

    const result = await storage.approveAdmin('missing@example.com', 'ideas_manager');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Administrateur non trouvé');
    }
  });

  it('approveAdmin wraps database exceptions into DatabaseError', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => {
            throw new Error('approve failed');
          },
        }),
      }),
    }));

    const result = await storage.approveAdmin('error@example.com', 'admin');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de l'approbation du compte");
    }
  });

  it('updateAdminPassword returns success when update succeeds', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: async (_criteria: unknown) => ({
          rowCount: 1,
        }),
      }),
    }));

    const result = await storage.updateAdminPassword('admin@example.com', 'hashed-password');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });

  it('updateAdminPassword wraps update errors into DatabaseError', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: async (_criteria: unknown) => {
          throw new Error('password update failed');
        },
      }),
    }));

    const result = await storage.updateAdminPassword('admin@example.com', 'hashed-password');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la mise à jour du mot de passe');
    }
  });

  it('deleteAdmin returns success and logs info when row is deleted', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.delete.mockImplementation(() => ({
      where: (_criteria: unknown) => ({
        returning: async () => [{ email: 'admin@example.com' }],
      }),
    }));

    const result = await storage.deleteAdmin('admin@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
    expect(loggerMock.info).toHaveBeenCalledWith('Admin deleted', { email: 'admin@example.com' });
  });

  it('deleteAdmin returns NotFoundError when nothing is deleted', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.delete.mockImplementation(() => ({
      where: (_criteria: unknown) => ({
        returning: async () => [],
      }),
    }));

    const result = await storage.deleteAdmin('missing@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Administrateur introuvable');
    }
  });

  it('deleteAdmin logs error and returns DatabaseError on exception', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.delete.mockImplementation(() => ({
      where: (_criteria: unknown) => ({
        returning: async () => {
          throw new Error('delete failed');
        },
      }),
    }));

    const result = await storage.deleteAdmin('admin@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la suppression de l'administrateur");
    }
    expect(loggerMock.error).toHaveBeenCalledWith('Admin deletion failed', {
      email: 'admin@example.com',
      error: expect.any(Error),
    });
  });
});
