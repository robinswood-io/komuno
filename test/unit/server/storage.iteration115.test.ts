import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema } from './storage.test-helpers';

describe('server/storage.js iteration 115', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialKPIsExtended returns DatabaseError when budgets select throws', async () => {
    mockDb.select.mockImplementation(() => ({
      from: (table: unknown) => {
        if (table === schema.memberSubscriptions) {
          return { where: () => [] };
        }
        if (table === schema.eventSponsorships) {
          return { where: () => [] };
        }
        if (table === schema.financialForecasts) {
          return { where: () => [] };
        }
        if (table === schema.financialExpenses) {
          return { where: () => [] };
        }
        if (table === schema.financialBudgets) {
          throw new Error('budgets select failed');
        }
        return { where: () => [] };
      },
    }));

    const storage = createStorage();
    const result = await storage.getFinancialKPIsExtended('year', 2041);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('KPIs financiers étendus');
    }
  });
});
