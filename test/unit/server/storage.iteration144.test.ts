import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorage, mockDb, resetStorageTestState, schema, selectBuilder } from './storage.test-helpers';

describe('server/storage.js iteration 144', () => {
  beforeEach(() => {
    resetStorageTestState();
  });

  it('getFinancialKPIsExtended computes values for current year when year is omitted', async () => {
    const storage = createStorage();
    const currentYear = new Date().getFullYear();

    const dataByTable = new Map<unknown, unknown[]>();
    dataByTable.set(schema.memberSubscriptions, [
      { amountInCents: 1000, createdAt: `${currentYear}-01-10T00:00:00.000Z` },
    ]);
    dataByTable.set(schema.eventSponsorships, [
      { amount: 500, createdAt: `${currentYear}-02-10T00:00:00.000Z`, status: 'confirmed' },
    ]);
    dataByTable.set(schema.financialForecasts, [
      { year: currentYear, forecastedAmountInCents: 1200 },
      { year: currentYear - 1, forecastedAmountInCents: 9999 },
    ]);
    dataByTable.set(schema.financialExpenses, [
      { amountInCents: 700, expenseDate: `${currentYear}-03-10T00:00:00.000Z` },
    ]);
    dataByTable.set(schema.financialBudgets, [
      { year: currentYear, amountInCents: 900 },
      { year: currentYear - 1, amountInCents: 9999 },
    ]);

    mockDb.select.mockImplementation(() => selectBuilder(dataByTable));

    const result = await storage.getFinancialKPIsExtended('year');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(1500);
      expect(result.data.revenues.forecasted).toBe(1200);
      expect(result.data.expenses.actual).toBe(700);
      expect(result.data.expenses.budgeted).toBe(900);
      expect(result.data.balance.actual).toBe(800);
      expect(result.data.balance.forecasted).toBe(300);
      expect(result.data.realizationRate).toBe(125);
    }
  });

  it('getFinancialKPIsExtended applies year filtering for subscriptions, sponsorings and expenses', async () => {
    const storage = createStorage();
    const targetYear = 2026;

    const dataByTable = new Map<unknown, unknown[]>();
    dataByTable.set(schema.memberSubscriptions, [
      { amountInCents: 111, createdAt: '2026-01-10T00:00:00.000Z' },
      { amountInCents: 999, createdAt: '2025-01-10T00:00:00.000Z' },
    ]);
    dataByTable.set(schema.eventSponsorships, [
      { amount: 222, createdAt: '2026-02-10T00:00:00.000Z', status: 'completed' },
      { amount: 888, createdAt: '2025-02-10T00:00:00.000Z', status: 'completed' },
    ]);
    dataByTable.set(schema.financialForecasts, [{ year: 2026, forecastedAmountInCents: 0 }]);
    dataByTable.set(schema.financialExpenses, [
      { amountInCents: 333, expenseDate: '2026-03-10T00:00:00.000Z' },
      { amountInCents: 777, expenseDate: '2025-03-10T00:00:00.000Z' },
    ]);
    dataByTable.set(schema.financialBudgets, [{ year: 2026, amountInCents: 0 }]);

    mockDb.select.mockImplementation(() => selectBuilder(dataByTable));

    const result = await storage.getFinancialKPIsExtended('year', targetYear);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.revenues.actual).toBe(333);
      expect(result.data.expenses.actual).toBe(333);
      expect(result.data.realizationRate).toBe(0);
      expect(result.data.revenues.variancePercent).toBe(0);
      expect(result.data.expenses.variancePercent).toBe(0);
    }
  });

  it('getFinancialKPIsExtended wraps unexpected errors into DatabaseError', async () => {
    const storage = createStorage();

    mockDb.select.mockImplementation(() => {
      throw new Error('kpis-select-failure');
    });

    const result = await storage.getFinancialKPIsExtended('year', 2026);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe('DatabaseError');
      expect(result.error.message).toContain('KPIs financiers étendus');
    }
  });
});
