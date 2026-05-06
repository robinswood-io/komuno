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

describe('server/storage.js iteration 105', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateTrackingAlerts skips stale patron alert when unresolved one already exists', async () => {
    const patronsQueue: PatronRow[][] = [
      [{ id: 'p105', email: 'p105@example.com', firstName: 'Paul', lastName: 'Martin', createdAt: new Date('2030-01-01T00:00:00.000Z'), updatedAt: new Date('2030-01-10T00:00:00.000Z') }],
      [],
    ];
    const trackingAlertsQueue: Array<Array<{ id: string }>> = [[{ id: 'existing-stale-patron' }]];

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
          return { where: () => ({ limit: () => [] }) };
        }
        return { where: () => [] };
      },
    }));

    const storage = createStorage();
    const result = await storage.generateTrackingAlerts();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.created).toBe(0);
      expect(result.data.errors).toBe(0);
    }
    expect(mockDb.insert).toHaveBeenCalledTimes(0);
  });
});
