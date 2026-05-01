import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type TrackingMetricRow = {
  id: string;
  entityType: string;
  entityId: string;
  entityEmail: string | null;
  metricType: string;
  metricValue: number | null;
  metricData: Record<string, unknown> | null;
  description: string | null;
  recordedBy: string | null;
  recordedAt: Date;
};

type TrackingAlertRow = {
  id: string;
  entityType: string;
  entityId: string;
  alertType: string;
  isRead: boolean;
  isResolved: boolean;
  resolvedBy: string | null;
  resolvedAt: Date | null;
};

type SelectFromWhereChain<T> = {
  from: (_table: unknown) => {
    where: (_criteria: unknown) => Promise<T[]>;
  };
};

type SelectFromChain = {
  from: (_table: unknown) => {
    where?: (_criteria: unknown) => {
      orderBy: (_ordering: unknown) => Promise<TrackingMetricRow[]>;
    };
    orderBy?: (_ordering: unknown) => Promise<TrackingMetricRow[]>;
  };
};

type InsertValuesReturningChain<T> = {
  values: (_payload: unknown) => {
    returning: () => Promise<T[]>;
  };
};

type UpdateSetWhereReturningChain<T> = {
  set: (_payload: unknown) => {
    where: (_criteria: unknown) => {
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

describe('server/storage.js - iteration 12b tracking guards/fallback/errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('createTrackingMetric applies null fallbacks for optional fields and returns success', async () => {
    let capturedValues: unknown;

    const inserted: TrackingMetricRow = {
      id: 'tm-1',
      entityType: 'member',
      entityId: 'm-1',
      entityEmail: null,
      metricType: 'followup',
      metricValue: null,
      metricData: null,
      description: null,
      recordedBy: null,
      recordedAt: new Date('2032-01-10T10:00:00.000Z'),
    };

    mockDb.insert.mockImplementationOnce(
      (_table: unknown): InsertValuesReturningChain<TrackingMetricRow> => ({
        values: (payload: unknown) => {
          capturedValues = payload;
          return {
            returning: async () => [inserted],
          };
        },
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createTrackingMetric({
      entityType: 'member',
      entityId: 'm-1',
      metricType: 'followup',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(inserted);
    }

    const payload = capturedValues as Record<string, unknown>;
    expect(payload.metricValue).toBeNull();
    expect(payload.metricData).toBeNull();
    expect(payload.description).toBeNull();
    expect(payload.recordedBy).toBeNull();
    expect(payload.recordedAt).toBeInstanceOf(Date);
  });

  it('getTrackingMetrics uses where + orderBy chain when filters are provided', async () => {
    const rows: TrackingMetricRow[] = [
      {
        id: 'tm-2',
        entityType: 'member',
        entityId: 'm-2',
        entityEmail: 'm2@example.com',
        metricType: 'meeting',
        metricValue: 1,
        metricData: null,
        description: 'Meeting planned',
        recordedBy: 'admin',
        recordedAt: new Date('2033-03-01T09:00:00.000Z'),
      },
    ];

    const whereSpy = vi.fn((_criteria: unknown) => ({
      orderBy: async (_ordering: unknown) => rows,
    }));

    mockDb.select.mockImplementationOnce(
      (): SelectFromChain => ({
        from: (_table: unknown) => ({
          where: whereSpy,
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingMetrics({ entityType: 'member' });

    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(rows);
    }
  });

  it('getTrackingMetrics wraps select errors into DatabaseError', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('tracking metrics select failed');
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingMetrics();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des métriques');
    }
  });

  it('updateTrackingAlert returns NotFoundError when no alert row is updated', async () => {
    mockDb.update.mockImplementationOnce(
      (_table: unknown): UpdateSetWhereReturningChain<TrackingAlertRow> => ({
        set: (_payload: unknown) => ({
          where: (_criteria: unknown) => ({
            returning: async () => [],
          }),
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateTrackingAlert('missing-alert', { isRead: true });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Alerte non trouvée');
    }
  });

  it('updateTrackingAlert sets resolved metadata when resolving an alert', async () => {
    let capturedSetPayload: unknown;

    const updated: TrackingAlertRow = {
      id: 'alert-1',
      entityType: 'member',
      entityId: 'm-1',
      alertType: 'stale',
      isRead: true,
      isResolved: true,
      resolvedBy: 'admin@example.com',
      resolvedAt: new Date('2034-01-01T12:00:00.000Z'),
    };

    mockDb.update.mockImplementationOnce(
      (_table: unknown): UpdateSetWhereReturningChain<TrackingAlertRow> => ({
        set: (payload: unknown) => {
          capturedSetPayload = payload;
          return {
            where: (_criteria: unknown) => ({
              returning: async () => [updated],
            }),
          };
        },
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateTrackingAlert('alert-1', {
      isRead: true,
      isResolved: true,
      resolvedBy: 'admin@example.com',
    });

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

  it('createTrackingAlert wraps insert errors into DatabaseError', async () => {
    mockDb.insert.mockImplementationOnce(
      (_table: unknown): InsertValuesReturningChain<TrackingAlertRow> => ({
        values: (_payload: unknown) => ({
          returning: async () => {
            throw new Error('insert alert failed');
          },
        }),
      }),
    );

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createTrackingAlert({
      entityType: 'member',
      entityId: 'm-3',
      alertType: 'stale',
      title: 'Alert',
      message: 'Alert message',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la création de l'alerte");
    }
  });

  it('generateTrackingAlerts returns DatabaseError when initial query fails', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('stale members query failed');
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.generateTrackingAlerts();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la génération des alertes');
    }
  });
});
