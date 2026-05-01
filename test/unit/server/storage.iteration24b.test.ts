import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type TrackingMetricRow = {
  id: string;
  entityType: string;
  metricType: string;
  recordedAt: Date;
};

type TrackingAlertRow = {
  id: string;
  entityType: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: Date;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
};

type TrackingAlertInput = {
  entityType: string;
  entityId?: string;
  entityEmail?: string;
  alertType: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  createdBy?: string;
  expiresAt?: Date;
};

type UpdateTrackingAlertInput = {
  isRead?: boolean;
  isResolved?: boolean;
  resolvedBy?: string;
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

type WhereOrderByChain<T> = {
  orderBy: (ordering: unknown) => Promise<T[]> | { limit: (count: number) => Promise<T[]> };
};

type QueryChain<T> = {
  where: (criteria: unknown) => WhereOrderByChain<T>;
  orderBy: (ordering: unknown) => Promise<T[]> | { limit: (count: number) => Promise<T[]> };
};

type SelectFromChain<T> = {
  from: (table: unknown) => QueryChain<T>;
};

type DbMock = {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
};

const cjsRequire = createRequire(import.meta.url);
const storageModulePath = cjsRequire.resolve('../../../server/storage.js');
const dbModulePath = cjsRequire.resolve('../../../server/db.js');
const loggerModulePath = cjsRequire.resolve('../../../server/lib/logger.js');
const expressSessionModulePath = cjsRequire.resolve('express-session');
const connectPgSimpleModulePath = cjsRequire.resolve('connect-pg-simple');

const mockDb: DbMock = {
  insert: vi.fn(),
  update: vi.fn(),
  select: vi.fn(),
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
      insert: mockDb.insert,
      update: mockDb.update,
      select: mockDb.select,
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

describe('server/storage.js - iteration 24b tracking metrics/alerts branch saturation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('createTrackingAlert success applies explicit severity and optional fields', async () => {
    let capturedValues: unknown;

    const created: TrackingAlertRow = {
      id: 'ta-1',
      entityType: 'member',
      alertType: 'stale',
      severity: 'critical',
      title: 'Critical alert',
      message: 'Needs immediate action',
      isRead: false,
      isResolved: false,
      createdAt: new Date('2041-01-01T00:00:00.000Z'),
    };

    mockDb.insert.mockImplementationOnce((_table: unknown): InsertChain<TrackingAlertRow> => ({
      values: (payload: unknown) => {
        capturedValues = payload;
        return {
          returning: async () => [created],
        };
      },
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const input: TrackingAlertInput = {
      entityType: 'member',
      entityId: 'm-1',
      alertType: 'stale',
      severity: 'critical',
      title: 'Critical alert',
      message: 'Needs immediate action',
      createdBy: 'admin@example.com',
      expiresAt: new Date('2041-02-01T00:00:00.000Z'),
    };

    const result = await storage.createTrackingAlert(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(created);
    }

    const payload = capturedValues as Record<string, unknown>;
    expect(payload.severity).toBe('critical');
    expect(payload.isRead).toBe(false);
    expect(payload.isResolved).toBe(false);
    expect(payload.createdBy).toBe('admin@example.com');
    expect(payload.expiresAt).toBeInstanceOf(Date);
    expect(payload.createdAt).toBeInstanceOf(Date);
  });

  it('createTrackingAlert returns DatabaseError when insert fails', async () => {
    mockDb.insert.mockImplementationOnce((_table: unknown): InsertChain<TrackingAlertRow> => ({
      values: (_payload: unknown) => ({
        returning: async () => {
          throw new Error('alert insert failed');
        },
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createTrackingAlert({
      entityType: 'member',
      alertType: 'stale',
      title: 'x',
      message: 'y',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la création de l'alerte");
    }
  });

  it('getTrackingAlerts success default path without filters', async () => {
    const rows: TrackingAlertRow[] = [];

    const whereSpy = vi.fn((_criteria: unknown) => ({
      orderBy: async (_ordering: unknown) => rows,
    }));
    const orderBySpy = vi.fn(async (_ordering: unknown) => rows);

    mockDb.select.mockImplementationOnce((): SelectFromChain<TrackingAlertRow> => ({
      from: (_table: unknown) => ({
        where: whereSpy,
        orderBy: orderBySpy,
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingAlerts();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(rows);
    }
    expect(whereSpy).not.toHaveBeenCalled();
    expect(orderBySpy).toHaveBeenCalledTimes(1);
  });

  it('getTrackingAlerts success filtered path with booleans false and limit', async () => {
    const rows: TrackingAlertRow[] = [
      {
        id: 'ta-2',
        entityType: 'member',
        alertType: 'stale',
        severity: 'high',
        title: 'Follow-up',
        message: 'Contact needed',
        isRead: false,
        isResolved: false,
        createdAt: new Date('2041-03-01T00:00:00.000Z'),
      },
    ];

    const limitSpy = vi.fn(async (_count: number) => rows);
    const orderBySpy = vi.fn((_ordering: unknown) => ({ limit: limitSpy }));
    const whereSpy = vi.fn((_criteria: unknown) => ({ orderBy: orderBySpy }));

    mockDb.select.mockImplementationOnce((): SelectFromChain<TrackingAlertRow> => ({
      from: (_table: unknown) => ({
        where: whereSpy,
        orderBy: vi.fn(async (_ordering: unknown) => rows),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingAlerts({
      entityType: 'member',
      entityId: 'm-2',
      isRead: false,
      isResolved: false,
      severity: 'high',
      limit: 2,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(rows);
    }
    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(orderBySpy).toHaveBeenCalledTimes(1);
    expect(limitSpy).toHaveBeenCalledWith(2);
  });

  it('getTrackingAlerts returns DatabaseError when query builder throws', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('alerts select failed');
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingAlerts();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des alertes');
    }
  });

  it('getTrackingMetrics success default path without filters', async () => {
    const rows: TrackingMetricRow[] = [];

    const whereSpy = vi.fn((_criteria: unknown) => ({
      orderBy: async (_ordering: unknown) => rows,
    }));
    const orderBySpy = vi.fn(async (_ordering: unknown) => rows);

    mockDb.select.mockImplementationOnce((): SelectFromChain<TrackingMetricRow> => ({
      from: (_table: unknown) => ({
        where: whereSpy,
        orderBy: orderBySpy,
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingMetrics();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(rows);
    }
    expect(whereSpy).not.toHaveBeenCalled();
    expect(orderBySpy).toHaveBeenCalledTimes(1);
  });

  it('getTrackingMetrics success filtered path with dates and limit', async () => {
    const rows: TrackingMetricRow[] = [
      {
        id: 'tm-2',
        entityType: 'member',
        metricType: 'followup',
        recordedAt: new Date('2041-04-01T00:00:00.000Z'),
      },
    ];

    const limitSpy = vi.fn(async (_count: number) => rows);
    const orderBySpy = vi.fn((_ordering: unknown) => ({ limit: limitSpy }));
    const whereSpy = vi.fn((_criteria: unknown) => ({ orderBy: orderBySpy }));

    mockDb.select.mockImplementationOnce((): SelectFromChain<TrackingMetricRow> => ({
      from: (_table: unknown) => ({
        where: whereSpy,
        orderBy: vi.fn(async (_ordering: unknown) => rows),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingMetrics({
      entityType: 'member',
      entityId: 'm-77',
      entityEmail: 'm77@example.com',
      metricType: 'followup',
      startDate: '2041-01-01',
      endDate: '2041-12-31',
      limit: 4,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(rows);
    }
    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(orderBySpy).toHaveBeenCalledTimes(1);
    expect(limitSpy).toHaveBeenCalledWith(4);
  });

  it('getTrackingMetrics returns DatabaseError when select fails', async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error('metrics select failed');
    });

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingMetrics({ entityType: 'member' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la récupération des métriques');
    }
  });

  it('updateTrackingAlert success updates with unresolved branch (no resolvedAt/resolvedBy)', async () => {
    let capturedSetPayload: unknown;

    const updated: TrackingAlertRow = {
      id: 'ta-3',
      entityType: 'member',
      alertType: 'stale',
      severity: 'medium',
      title: 'Alert',
      message: 'Message',
      isRead: true,
      isResolved: false,
      createdAt: new Date('2041-05-01T00:00:00.000Z'),
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
      // resolvedBy intentionally omitted
    };

    const result = await storage.updateTrackingAlert('ta-3', input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updated);
    }

    const setPayload = capturedSetPayload as Record<string, unknown>;
    expect(setPayload.isRead).toBe(true);
    expect(setPayload.isResolved).toBe(true);
    expect(setPayload.resolvedBy).toBeUndefined();
    expect(setPayload.resolvedAt).toBeUndefined();
  });

  it('updateTrackingAlert returns DatabaseError when update fails', async () => {
    mockDb.update.mockImplementationOnce((_table: unknown): UpdateChain<TrackingAlertRow> => ({
      set: (_payload: unknown) => ({
        where: (_criteria: unknown) => ({
          returning: async () => {
            throw new Error('alert update failed');
          },
        }),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.updateTrackingAlert('ta-error', {
      isRead: true,
      isResolved: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("Erreur lors de la mise à jour de l'alerte");
    }
  });
});
