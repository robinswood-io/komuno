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

type PatronRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
};

describe('server/storage.js iteration 102', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateTrackingAlerts creates stale member alert when none exists', async () => {
    const membersQueue: MemberRow[][] = [
      [{ id: 'm102', email: 'm102@example.com', firstName: 'Marie', lastName: 'Test', createdAt: new Date('2030-01-01T00:00:00.000Z'), engagementScore: 0 }],
      [],
    ];
    const patronsQueue: PatronRow[][] = [[], []];
    const trackingAlertsQueue: Array<Array<{ id: string }>> = [[]];
    const inserted: Array<Record<string, unknown>> = [];

    mockDb.select.mockImplementation(() => ({
      from: (table: unknown) => {
        if (table === schema.members) {
          return { where: () => membersQueue.shift() ?? [] };
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
    expect(inserted[0].alertType).toBe('stale');
  });
});
