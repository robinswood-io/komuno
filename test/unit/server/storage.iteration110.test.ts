import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema } from './storage.test-helpers';

type PatronRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
};

describe('server/storage.js iteration 110', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateTrackingAlerts creates high_potential patron alert when condition is true and none exists', async () => {
    const recentDate = new Date('2036-04-15T00:00:00.000Z');
    const patronsQueue: PatronRow[][] = [
      [],
      [{ id: 'p110', email: 'p110@example.com', firstName: 'Pablo', lastName: 'Carre', createdAt: recentDate, updatedAt: recentDate }],
    ];
    const trackingAlertsQueue: Array<Array<{ id: string }>> = [[]];
    const inserted: Array<Record<string, unknown>> = [];

    mockDb.select.mockImplementation(() => ({
      from: (table: unknown) => {
        if (table === schema.members) {
          return { where: () => [] };
        }
        if (table === schema.patrons) {
          return { where: () => patronsQueue.shift() ?? [] };
        }
        if (table === schema.trackingAlerts) {
          return { where: () => trackingAlertsQueue.shift() ?? [] };
        }
        if (table === schema.trackingMetrics) {
          return {
            where: () => ({
              limit: () => [{ id: 'metric110' }],
            }),
          };
        }
        return { where: () => [] };
      },
    }));

    mockDb.insert.mockImplementation(() => ({
      values: (payload: unknown) => {
        inserted.push(payload as Record<string, unknown>);
        return Promise.resolve({});
      },
    }));

    const storage = createStorage();
    const result = await storage.generateTrackingAlerts();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.created).toBe(1);
      expect(result.data.errors).toBe(0);
    }
    expect(inserted).toHaveLength(1);
    expect(inserted[0].entityType).toBe('patron');
    expect(inserted[0].alertType).toBe('high_potential');
  });
});
