import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 47 - getForecasts/updateForecast branches', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getForecasts returns DatabaseError when select throws', async () => {
    mockDb.select.mockImplementation(() => {
      throw new Error('forecasts-select-failed');
    });

    const storage = createStorage();
    const result = await storage.getForecasts({ period: 'year' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur lors de la récupération des prévisions');
    }
  });

  it('updateForecast updates an existing forecast and returns success payload', async () => {
    mockDb.select.mockImplementation(() =>
      selectBuilder(
        new Map<unknown, unknown[]>([
          [
            schema.financialForecasts,
            [{ id: 'f-1', period: 'year', year: 2025, createdAt: '2025-01-01T00:00:00.000Z' }],
          ],
        ]),
      ),
    );

    mockDb.update.mockImplementation(() => ({
      set: (value: Record<string, unknown>) => ({
        where: (_clause: unknown) => ({
          returning: () =>
            Promise.resolve([
              {
                id: 'f-1',
                ...value,
              },
            ]),
        }),
      }),
    }));

    const storage = createStorage();
    const result = await storage.updateForecast('f-1', { forecastedAmountInCents: 3456 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('f-1');
      expect(result.data.forecastedAmountInCents).toBe(3456);
    }
  });
});

