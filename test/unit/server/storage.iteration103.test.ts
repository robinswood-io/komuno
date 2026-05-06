import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema } from './storage.test-helpers';

type MemberRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  engagementScore: number;
};

describe('server/storage.js iteration 103', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateTrackingAlerts skips stale member alert when unresolved one already exists', async () => {
    const membersQueue: MemberRow[][] = [
      [{ id: 'm103', email: 'm103@example.com', firstName: 'Marc', lastName: 'Dupre', createdAt: new Date('2030-01-01T00:00:00.000Z'), engagementScore: 0 }],
      [],
    ];
    const trackingAlertsQueue: Array<Array<{ id: string }>> = [[{ id: 'existing-stale-member' }]];

    mockDb.select.mockImplementation(() => ({
      from: (table: unknown) => {
        if (table === schema.members) {
          return { where: () => membersQueue.shift() ?? [] };
        }
        if (table === schema.patrons) {
          return { where: () => [] };
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
