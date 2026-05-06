import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 81', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('covers getFinancialKPIsExtended catch path when first select throws', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('kpis-81-failed');
    });

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2032);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur lors du calcul des KPIs financiers étendus');
    }
  });
});
