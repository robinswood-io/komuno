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

describe('server/storage.js iteration 106', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateTrackingAlerts creates high_potential member alert when none exists', async () => {
    const membersQueue: MemberRow[][] = [
      [],
      [{ id: 'm106', email: 'm106@example.com', firstName: 'Lea', lastName: 'Henry', createdAt: new Date('2030-01-01T00:00:00.000Z'), engagementScore: 20 }],
    ];
    const trackingAlertsQueue: Array<Array<{ id: string }>> = [[]];
    const inserted: Array<Record<string, unknown>> = [];

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
    expect(inserted[0].entityType).toBe('member');
    expect(inserted[0].alertType).toBe('high_potential');
  });
});
