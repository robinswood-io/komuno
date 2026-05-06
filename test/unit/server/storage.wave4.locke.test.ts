import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave4 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('approveAdmin returns NotFoundError when update returns no row', async () => {
    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [],
        }),
      }),
    }));

    const storage = createStorage();
    const result = await storage.approveAdmin('missing-admin@example.com', 'admin');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Administrateur non trouvé');
    }
  });
});
