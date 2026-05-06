import { beforeEach, describe, expect, it } from 'vitest';
import { createStorage, mockDb, resetStorageTestState } from './storage.test-helpers';

describe('server/storage.js iteration 61', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('generateForecasts returns DatabaseError when insert fails after category loop starts', async () => {
    mockDb.select.mockImplementation(() => {
      const call = mockDb.select.mock.calls.length;
      if (call === 1) {
        return { from: () => [{ amountInCents: 400, createdAt: '2026-01-01T00:00:00.000Z' }] };
      }
      if (call === 2) {
        return { from: () => ({ where: () => [] }) };
      }
      return { from: () => ({ where: () => [{ id: 'cat-sub', name: 'Souscriptions' }] }) };
    });

    mockDb.insert.mockImplementation((_table: unknown) => ({
      values: (_value: Record<string, unknown>) => ({
        returning: () => Promise.reject(new Error('insert-failed-61')),
      }),
    }));

    const storage = createStorage();
    const result = await storage.generateForecasts('year', 2028);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Erreur lors de la génération des prévisions');
    }
  });
});
