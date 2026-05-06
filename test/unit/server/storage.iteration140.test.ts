import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 140', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('executes getFinancialKPIsExtended catch return when db select throws (line 4051)', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('kpi-select-throws-140');
    });

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2058);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur lors du calcul des KPIs financiers étendus');
      expect(result.error.message).toContain('kpi-select-throws-140');
    }
  });
});
