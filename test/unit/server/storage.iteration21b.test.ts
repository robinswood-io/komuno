import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type StorageModule = typeof import('../../../server/storage.js');

type TrackingMetricInput = {
  entityType: string;
  entityId?: string;
  entityEmail?: string;
  metricType: string;
  metricValue?: number;
  metricData?: Record<string, unknown>;
  description?: string;
  recordedBy?: string;
};

type TrackingMetricRow = {
  id: string;
  entityType: string;
  entityId?: string | null;
  entityEmail?: string | null;
  metricType: string;
  metricValue?: number | null;
  metricData?: Record<string, unknown> | null;
  description?: string | null;
  recordedBy?: string | null;
  recordedAt: Date;
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

type TrackingAlertRow = {
  id: string;
  entityType: string;
  entityId?: string | null;
  entityEmail?: string | null;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdBy?: string | null;
  createdAt: Date;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
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

type QueryFromDefault<T> = {
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
};

type QueryFromBuilder<T> = {
  from: (table: unknown) => QueryFromDefault<T>;
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

describe('server/storage.js - iteration 21b tracking metrics/alerts branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:pwd@localhost:5432/komuno_test';
    setupStorageDependencies();
  });

  it('createTrackingMetric returns success with explicit fields', async () => {
    let capturedValues: unknown;

    const created: TrackingMetricRow = {
      id: 'metric-1',
      entityType: 'member',
      entityId: 'm-1',
      entityEmail: 'm1@example.com',
      metricType: 'engagement',
      metricValue: 42,
      metricData: { source: 'manual' },
      description: 'Manual boost',
      recordedBy: 'admin@example.com',
      recordedAt: new Date('2039-01-01T00:00:00.000Z'),
    };

    mockDb.insert.mockImplementationOnce((_table: unknown): InsertChain<TrackingMetricRow> => ({
      values: (payload: unknown) => {
        capturedValues = payload;
        return {
          returning: async () => [created],
        };
      },
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const input: TrackingMetricInput = {
      entityType: 'member',
      entityId: 'm-1',
      entityEmail: 'm1@example.com',
      metricType: 'engagement',
      metricValue: 42,
      metricData: { source: 'manual' },
      description: 'Manual boost',
      recordedBy: 'admin@example.com',
    };

    const result = await storage.createTrackingMetric(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(created);
    }

    const payload = capturedValues as Record<string, unknown>;
    expect(payload.metricValue).toBe(42);
    expect(payload.metricData).toEqual({ source: 'manual' });
    expect(payload.recordedAt).toBeInstanceOf(Date);
  });

  it('createTrackingMetric returns DatabaseError on insert failure', async () => {
    mockDb.insert.mockImplementationOnce((_table: unknown): InsertChain<TrackingMetricRow> => ({
      values: (_payload: unknown) => ({
        returning: async () => {
          throw new Error('metric insert failed');
        },
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.createTrackingMetric({
      entityType: 'member',
      metricType: 'engagement',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('Erreur lors de la création de la métrique');
    }
  });

  it('getTrackingMetrics uses default path (no where) when no options are provided', async () => {
    const rows: TrackingMetricRow[] = [];

    const whereSpy = vi.fn((_criteria: unknown) => ({
      orderBy: async (_ordering: unknown) => rows,
    }));

    const orderBySpy = vi.fn(async (_ordering: unknown) => rows);

    mockDb.select.mockImplementationOnce((): QueryFromBuilder<TrackingMetricRow> => ({
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

  it('getTrackingMetrics applies filters + limit path when options are provided', async () => {
    const rows: TrackingMetricRow[] = [
      {
        id: 'metric-2',
        entityType: 'member',
        entityId: 'm-22',
        entityEmail: 'm22@example.com',
        metricType: 'followup',
        metricValue: 1,
        metricData: null,
        description: null,
        recordedBy: 'admin@example.com',
        recordedAt: new Date('2039-02-01T00:00:00.000Z'),
      },
    ];

    const limitSpy = vi.fn(async (_count: number) => rows);
    const orderBySpy = vi.fn((_ordering: unknown) => ({ limit: limitSpy }));
    const whereSpy = vi.fn((_criteria: unknown) => ({ orderBy: orderBySpy }));

    mockDb.select.mockImplementationOnce((): QueryFromBuilder<TrackingMetricRow> => ({
      from: (_table: unknown) => ({
        where: whereSpy,
        orderBy: vi.fn(async (_ordering: unknown) => rows),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const result = await storage.getTrackingMetrics({
      entityType: 'member',
      entityId: 'm-22',
      entityEmail: 'm22@example.com',
      metricType: 'followup',
      startDate: '2039-01-01',
      endDate: '2039-12-31',
      limit: 5,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(rows);
    }
    expect(whereSpy).toHaveBeenCalledTimes(1);
    expect(orderBySpy).toHaveBeenCalledTimes(1);
    expect(limitSpy).toHaveBeenCalledWith(5);
  });

  it('createTrackingAlert returns success and defaults severity/isRead/isResolved', async () => {
    let capturedValues: unknown;

    const created: TrackingAlertRow = {
      id: 'alert-1',
      entityType: 'member',
      entityId: 'm-8',
      entityEmail: null,
      alertType: 'stale',
      severity: 'medium',
      title: 'Inactivité',
      message: 'Membre inactif',
      isRead: false,
      isResolved: false,
      createdBy: null,
      createdAt: new Date('2039-03-01T00:00:00.000Z'),
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
      entityId: 'm-8',
      alertType: 'stale',
      title: 'Inactivité',
      message: 'Membre inactif',
    };

    const result = await storage.createTrackingAlert(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(created);
    }

    const payload = capturedValues as Record<string, unknown>;
    expect(payload.severity).toBe('medium');
    expect(payload.isRead).toBe(false);
    expect(payload.isResolved).toBe(false);
    expect(payload.createdAt).toBeInstanceOf(Date);
  });

  it('getTrackingAlerts covers default path and filtered path with limit', async () => {
    const defaultRows: TrackingAlertRow[] = [];
    const filteredRows: TrackingAlertRow[] = [
      {
        id: 'alert-2',
        entityType: 'member',
        entityId: 'm-9',
        alertType: 'stale',
        severity: 'high',
        title: 'Relance urgente',
        message: 'Alerte critique',
        isRead: false,
        isResolved: true,
        createdAt: new Date('2039-04-01T00:00:00.000Z'),
      },
    ];

    const defaultWhereSpy = vi.fn((_criteria: unknown) => ({
      orderBy: async (_ordering: unknown) => defaultRows,
    }));
    const defaultOrderBySpy = vi.fn(async (_ordering: unknown) => defaultRows);

    mockDb.select.mockImplementationOnce((): QueryFromBuilder<TrackingAlertRow> => ({
      from: (_table: unknown) => ({
        where: defaultWhereSpy,
        orderBy: defaultOrderBySpy,
      }),
    }));

    const limitSpy = vi.fn(async (_count: number) => filteredRows);
    const filteredOrderBySpy = vi.fn((_ordering: unknown) => ({ limit: limitSpy }));
    const filteredWhereSpy = vi.fn((_criteria: unknown) => ({ orderBy: filteredOrderBySpy }));

    mockDb.select.mockImplementationOnce((): QueryFromBuilder<TrackingAlertRow> => ({
      from: (_table: unknown) => ({
        where: filteredWhereSpy,
        orderBy: vi.fn(async (_ordering: unknown) => filteredRows),
      }),
    }));

    const { DatabaseStorage } = loadStorageModule();
    const storage = new DatabaseStorage();

    const defaultResult = await storage.getTrackingAlerts();
    expect(defaultResult.success).toBe(true);
    if (defaultResult.success) {
      expect(defaultResult.data).toEqual(defaultRows);
    }
    expect(defaultWhereSpy).not.toHaveBeenCalled();
    expect(defaultOrderBySpy).toHaveBeenCalledTimes(1);

    const filteredResult = await storage.getTrackingAlerts({
      entityType: 'member',
      entityId: 'm-9',
      isRead: false,
      isResolved: true,
      severity: 'high',
      limit: 3,
    });

    expect(filteredResult.success).toBe(true);
    if (filteredResult.success) {
      expect(filteredResult.data).toEqual(filteredRows);
    }
    expect(filteredWhereSpy).toHaveBeenCalledTimes(1);
    expect(filteredOrderBySpy).toHaveBeenCalledTimes(1);
    expect(limitSpy).toHaveBeenCalledWith(3);
  });

  it('updateTrackingAlert returns DatabaseError when update query throws', async () => {
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

    const result = await storage.updateTrackingAlert('alert-x', {
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
