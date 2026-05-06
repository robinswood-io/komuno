import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 97', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getExpenses quarter period keeps matching year rows and excludes others', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.financialExpenses,
            [
              { id: 'e97-keep', expenseDate: '2037-06-15', category: 'ops', amountInCents: 200, budgetId: 'b97' },
              { id: 'e97-drop', expenseDate: '2036-06-15', category: 'ops', amountInCents: 300, budgetId: 'b97' },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getExpenses({ period: 'quarter', year: 2037 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((e: { id: string }) => e.id)).toEqual(['e97-keep']);
    }
  });
});
