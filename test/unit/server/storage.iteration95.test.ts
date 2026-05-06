import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 95', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getBudgets returns DatabaseError when select chain throws', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('getBudgets select failed');
    });

    const storage = createStorage();
    const result = await storage.getBudgets({ period: 'month' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('récupération des budgets');
    }
  });
});
