import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave26 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('updateAdminStatus returns NotFoundError when no row is returned', async () => {
    mockDb.update.mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [],
        }),
      }),
    }));

    const storage = createStorage();
    const result = await storage.updateAdminStatus('wave26@example.com', false);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('NotFoundError');
      expect(result.error.message).toContain('Administrateur non trouvé');
    }
  });
});

