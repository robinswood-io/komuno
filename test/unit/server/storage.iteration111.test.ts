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

describe('server/storage.js iteration 111', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateTrackingAlerts increments errors when each inner section throws once', async () => {
    const membersQueue: MemberRow[][] = [
      [{ id: 'm111-stale', email: 'm111s@example.com', firstName: 'Mina', lastName: 'Stale', createdAt: new Date('2030-01-01T00:00:00.000Z'), engagementScore: 0 }],
      [{ id: 'm111-high', email: 'm111h@example.com', firstName: 'Mina', lastName: 'High', createdAt: new Date('2030-01-01T00:00:00.000Z'), engagementScore: 21 }],
    ];
    const patronsQueue: PatronRow[][] = [
      [{ id: 'p111-stale', email: 'p111s@example.com', firstName: 'Pat', lastName: 'Stale', createdAt: new Date('2030-01-01T00:00:00.000Z'), updatedAt: new Date('2030-01-01T00:00:00.000Z') }],
      [{ id: 'p111-high', email: 'p111h@example.com', firstName: 'Pat', lastName: 'High', createdAt: new Date('2030-01-01T00:00:00.000Z'), updatedAt: new Date('2030-01-01T00:00:00.000Z') }],
    ];
    const trackingAlertsQueue: Array<Array<{ id: string }> | Error> = [
      new Error('stale member existing alert lookup failed'),
      new Error('stale patron existing alert lookup failed'),
      new Error('high member existing alert lookup failed'),
    ];
    const trackingMetricsQueue: Array<Array<{ id: string }> | Error> = [new Error('high patron metrics lookup failed')];

    mockDb.select.mockImplementation(() => ({
      from: (table: unknown) => {
        if (table === schema.members) {
          return { where: () => membersQueue.shift() ?? [] };
        }
        if (table === schema.patrons) {
          return { where: () => patronsQueue.shift() ?? [] };
        }
        if (table === schema.trackingAlerts) {
          return {
            where: () => {
              const next = trackingAlertsQueue.shift();
              if (next instanceof Error) {
                throw next;
              }
              return next ?? [];
            },
          };
        }
        if (table === schema.trackingMetrics) {
          return {
            where: () => ({
              limit: () => {
                const next = trackingMetricsQueue.shift();
                if (next instanceof Error) {
                  throw next;
                }
                return next ?? [];
              },
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
      expect(result.data.errors).toBe(4);
    }
  });
});
