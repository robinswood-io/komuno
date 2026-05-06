import { beforeEach, describe, expect, it } from 'vitest';

import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js wave24 locke', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('approveAdmin returns DatabaseError when update throws', async () => {
    mockDb.update.mockImplementation(() => {
      throw new Error('wave24-approve-failure');
    });

    const storage = createStorage();
    const result = await storage.approveAdmin('wave24@example.com', 'admin');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain("approbation du compte");
    }
  });
});

