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

describe('server/storage.js iteration 108', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateTrackingAlerts keeps high_potential patron branch false when no recent metrics and old creation date', async () => {
    const oldDate = new Date('2000-01-01T00:00:00.000Z');
    const patronsQueue: PatronRow[][] = [
      [],
      [{ id: 'p108', email: 'p108@example.com', firstName: 'Pierre', lastName: 'Durand', createdAt: oldDate, updatedAt: oldDate }],
    ];

    mockDb.select.mockImplementation(() => ({
      from: (table: unknown) => {
        if (table === schema.members) {
          return { where: () => [] };
        }
        if (table === schema.patrons) {
          return { where: () => patronsQueue.shift() ?? [] };
        }
        if (table === schema.trackingAlerts) {
          return { where: () => [] };
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
