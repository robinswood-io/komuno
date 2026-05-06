import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 71', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialKPIsExtended returns DatabaseError when sponsorship selection chain throws', async () => {
    let call = 0;
    mockDb.select.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return { from: () => [] };
      }
      return {
        from: () => ({
          where: () => {
            throw new Error('sponsorship-where-failed');
          },
        }),
      };
    });

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2032);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur lors du calcul des KPIs financiers étendus');
    }
  });
});
