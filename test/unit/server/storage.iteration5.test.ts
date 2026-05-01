import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type DbMock = {
  select: ReturnType<typeof vi.fn>;
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

describe('server/storage.js - iteration 5 DatabaseStorage additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getUser returns success payload with admin data when select succeeds', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const adminRow = {
      id: 'adm-10',
      email: 'admin.success@example.com',
      role: 'admin',
    };

    mockDb.select.mockImplementation(() => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => [adminRow],
      }),
    }));

    const result = await storage.getUser('admin.success@example.com');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(adminRow);
    }
  });

  it('getUser wraps select failures into DatabaseError', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.select.mockImplementation(() => ({
      from: (_table: unknown) => ({
        where: async (_criteria: unknown) => {
          throw new Error('getUser select failed');
        },
      }),
    }));

    const result = await storage.getUser('admin.error@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération utilisateur');
    }
  });

  it('updateAdminStatus returns success payload when update returns a row', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const updatedAdmin = {
      id: 'adm-11',
      email: 'status.success@example.com',
      isActive: true,
    };

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [updatedAdmin],
        }),
      }),
    }));

    const result = await storage.updateAdminStatus('status.success@example.com', true);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedAdmin);
    }
  });

  it('updateAdminStatus returns NotFoundError when no row is updated', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [],
        }),
      }),
    }));

    const result = await storage.updateAdminStatus('status.missing@example.com', false);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Administrateur non trouvé');
    }
  });

  it('updateAdminInfo returns NotFoundError when no row is updated', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [],
        }),
      }),
    }));

    const result = await storage.updateAdminInfo('info.missing@example.com', {
      firstName: 'Ghost',
      lastName: 'Admin',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Administrateur non trouvé');
    }
  });

  it('updateAdminRole wraps update exceptions into DatabaseError', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => {
            throw new Error('role update failed');
          },
        }),
      }),
    }));

    const result = await storage.updateAdminRole('role.error@example.com', 'admin');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la mise à jour du rôle');
    }
  });
});
