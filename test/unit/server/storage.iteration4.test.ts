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

describe('server/storage.js - iteration 4 additional DatabaseStorage coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getAllAdmins returns success payload when select succeeds', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const adminsList = [
      { id: 'adm-1', email: 'admin1@example.com' },
      { id: 'adm-2', email: 'admin2@example.com' },
    ];

    mockDb.select.mockImplementation(() => ({
      from: (_table: unknown) => ({
        orderBy: async (_ordering: unknown) => adminsList,
      }),
    }));

    const result = await storage.getAllAdmins();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(adminsList);
    }
  });

  it('getAllAdmins wraps database exceptions into DatabaseError', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.select.mockImplementation(() => ({
      from: (_table: unknown) => ({
        orderBy: async (_ordering: unknown) => {
          throw new Error('select admins failed');
        },
      }),
    }));

    const result = await storage.getAllAdmins();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des administrateurs');
    }
  });

  it('getPendingAdmins returns success payload when select succeeds', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const pendingAdmins = [{ id: 'adm-3', email: 'pending@example.com', status: 'pending' }];

    mockDb.select.mockImplementation(() => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => pendingAdmins,
        }),
      }),
    }));

    const result = await storage.getPendingAdmins();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(pendingAdmins);
    }
  });

  it('getPendingAdmins wraps database exceptions into DatabaseError', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.select.mockImplementation(() => ({
      from: (_table: unknown) => ({
        where: (_criteria: unknown) => ({
          orderBy: async (_ordering: unknown) => {
            throw new Error('select pending failed');
          },
        }),
      }),
    }));

    const result = await storage.getPendingAdmins();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des comptes en attente');
    }
  });

  it('updateAdminRole returns success payload when update returns a row', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const updatedAdmin = {
      id: 'adm-4',
      email: 'role@example.com',
      role: 'ideas_manager',
    };

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [updatedAdmin],
        }),
      }),
    }));

    const result = await storage.updateAdminRole('role@example.com', 'ideas_manager');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedAdmin);
    }
  });

  it('updateAdminRole returns NotFoundError when no row is updated', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [],
        }),
      }),
    }));

    const result = await storage.updateAdminRole('missing-role@example.com', 'admin');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Administrateur non trouvé');
    }
  });

  it('updateAdminStatus wraps database exceptions into DatabaseError', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => {
            throw new Error('status update failed');
          },
        }),
      }),
    }));

    const result = await storage.updateAdminStatus('status@example.com', true);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la mise à jour du statut');
    }
  });

  it('updateAdminInfo returns success payload when update returns a row', async () => {
    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const updatedAdmin = {
      id: 'adm-5',
      email: 'info@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    mockDb.update.mockImplementation(() => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [updatedAdmin],
        }),
      }),
    }));

    const result = await storage.updateAdminInfo('info@example.com', {
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedAdmin);
    }
  });
});
