import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave15 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateAdminStatus returns success when one admin row is updated', async () => {
    const updatedAdmin = {
      id: 'admin-wave15-1',
      email: 'active15@example.com',
      isActive: true,
    };

    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [updatedAdmin],
        }),
      }),
    }));

    const storage = createStorage();
    const result = await storage.updateAdminStatus('active15@example.com', true);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(updatedAdmin);
    }
  });
});

