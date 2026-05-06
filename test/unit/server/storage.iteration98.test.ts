import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 98', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getExpenseById returns matching expense when found', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.financialExpenses,
            [
              { id: 'exp-98-a', amountInCents: 10 },
              { id: 'exp-98-target', amountInCents: 98 },
            ],
          ],
        ]),
      ),
    );

    const storage = createStorage();
    const result = await storage.getExpenseById('exp-98-target');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.id).toBe('exp-98-target');
      expect(result.data?.amountInCents).toBe(98);
    }
  });
});
