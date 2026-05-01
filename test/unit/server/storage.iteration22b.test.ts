import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type TrackingAlertRow = {
  id: string;
  entityType: string;
  entityId?: string | null;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt?: Date;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
};

type UpdateTrackingAlertInput = {
  isRead?: boolean;
  isResolved?: boolean;
  resolvedBy?: string;
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
          // no-op
        }
      },
  );
}

function loadStorageModule(): StorageModule {
  delete cjsRequire.cache[storageModulePath];
  return cjsRequire(storageModulePath) as StorageModule;
}

describe('server/storage.js - iteration 22b tracking dashboard + updateTrackingAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('getTrackingDashboard returns DatabaseError when db select fails', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('dashboard members query failed');
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingDashboard();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération du dashboard');
    }
  });

  it('updateTrackingAlert returns success with resolved metadata branch', async () => {
    let capturedSetPayload: unknown;

    const updated: TrackingAlertRow = {
      id: 'alert-42',
      entityType: 'member',
      entityId: 'm-42',
      alertType: 'stale',
      severity: 'high',
      title: 'Alert',
      message: 'Needs follow-up',
      isRead: true,
      isResolved: true,
      resolvedBy: 'admin@example.com',
      resolvedAt: new Date('2040-01-02T00:00:00.000Z'),
    };

    mockDb.update.mockImplementationOnce((_table: unknown): UpdateChain<TrackingAlertRow> => ({
      set: (payload: unknown) => {
        capturedSetPayload = payload;
        return {
          where: (_criteria: unknown) => ({
            returning: async () => [updated],
          }),
        };
      },
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const input: UpdateTrackingAlertInput = {
      isRead: true,
      isResolved: true,
      resolvedBy: 'admin@example.com',
    };

    const result = await storage.updateTrackingAlert('alert-42', input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updated);
    }

    const setPayload = capturedSetPayload as Record<string, unknown>;
    expect(setPayload.isRead).toBe(true);
    expect(setPayload.isResolved).toBe(true);
    expect(setPayload.resolvedBy).toBe('admin@example.com');
    expect(setPayload.resolvedAt).toBeInstanceOf(Date);
  });

  it('updateTrackingAlert returns NotFoundError when no row is updated', async () => {
    mockDb.update.mockImplementationOnce((_table: unknown): UpdateChain<TrackingAlertRow> => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => [],
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateTrackingAlert('missing-alert', { isRead: true });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Alerte non trouvée');
    }
  });

  it('updateTrackingAlert returns DatabaseError when update query throws', async () => {
    mockDb.update.mockImplementationOnce((_table: unknown): UpdateChain<TrackingAlertRow> => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => {
            throw new Error('alert update query failed');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateTrackingAlert('alert-error', { isResolved: false });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la mise à jour de l'alerte");
    }
  });
});
