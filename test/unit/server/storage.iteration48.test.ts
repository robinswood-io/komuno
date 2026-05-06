import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 48 - createForecast success/error paths', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('createForecast returns inserted forecast on success', async () => {
    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: () =>
          Promise.resolve([
            {
              id: 'f-created',
              ...value,
            },
          ]),
      }),
    }));

    const storage = createStorage();
    const result = await storage.createForecast({
      category: 'cat-income',
      period: 'year',
      year: 2028,
      forecastedAmountInCents: 8900,
      confidence: 'medium',
      basedOn: 'manual',
      notes: 'manual forecast',
      createdBy: 'user-1',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('f-created');
      expect(result.data.category).toBe('cat-income');
      expect(result.data.forecastedAmountInCents).toBe(8900);
    }
  });

  it('createForecast wraps insertion failures in DatabaseError', async () => {
    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (_value: Record<string, unknown>) => ({
        returning: () => Promise.reject(new Error('insert-failed')),
      }),
    }));

    const storage = createStorage();
    const result = await storage.createForecast({
      category: 'cat-income',
      period: 'year',
      year: 2028,
      forecastedAmountInCents: 1000,
      confidence: 'low',
      basedOn: 'manual',
      notes: 'manual forecast',
      createdBy: 'user-2',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur lors de la création de la prévision');
    }
  });
});
