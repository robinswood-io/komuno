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

describe('server/storage.js iteration 107', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateTrackingAlerts skips high_potential member alert when unresolved one exists', async () => {
    const membersQueue: MemberRow[][] = [
      [],
      [{ id: 'm107', email: 'm107@example.com', firstName: 'Lina', lastName: 'Bertin', createdAt: new Date('2030-01-01T00:00:00.000Z'), engagementScore: 18 }],
    ];
    const trackingAlertsQueue: Array<Array<{ id: string }>> = [[{ id: 'existing-high-member' }]];

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
