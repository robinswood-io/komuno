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

describe('server/storage.js iteration 109', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateTrackingAlerts skips high_potential patron alert when one already exists', async () => {
    const recentDate = new Date('2035-03-10T00:00:00.000Z');
    const patronsQueue: PatronRow[][] = [
      [],
      [{ id: 'p109', email: 'p109@example.com', firstName: 'Pia', lastName: 'Noel', createdAt: recentDate, updatedAt: recentDate }],
    ];
    const trackingAlertsQueue: Array<Array<{ id: string }>> = [[{ id: 'existing-high-patron' }]];

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
              limit: () => [{ id: 'metric109' }],
            }),
          };
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
