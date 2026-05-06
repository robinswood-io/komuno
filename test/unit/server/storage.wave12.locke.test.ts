import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave12 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('approveAdmin returns success when update returns one admin row', async () => {
    const approvedAdmin = {
      id: 'admin-wave12-1',
      email: 'approved12@example.com',
      role: 'admin',
      status: 'active',
    };

    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [approvedAdmin],
        }),
      }),
    }));

    const storage = createStorage();
    const result = await storage.approveAdmin('approved12@example.com', 'admin');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(approvedAdmin);
    }
  });
});

