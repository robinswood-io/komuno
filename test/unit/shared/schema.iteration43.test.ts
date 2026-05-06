import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { getTableConfig } from 'drizzle-orm/pg-core';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 43 - stubborn line proofs + practical schema behavior', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves FK callback around line 1538 reads current financialCategories.id per reference() call', () => {
    const forecastsConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = forecastsConfig.foreignKeys[0];

    expect(forecastsConfig.foreignKeys).toHaveLength(1);

    const originalId = schema.financialCategories.id;
    const enumerable = Object.prototype.propertyIsEnumerable.call(schema.financialCategories, 'id');

    const values = [
      { name: 'iteration43-id-a' } as unknown as typeof originalId,
      { name: 'iteration43-id-b' } as unknown as typeof originalId,
      originalId,
    ];

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      get() {
        return values.shift() ?? originalId;
      },
    });

    const ref1 = foreignKey?.reference();
    const ref2 = foreignKey?.reference();
    const ref3 = foreignKey?.reference();

    expect(ref1?.foreignColumns[0]?.name).toBe('iteration43-id-a');
    expect(ref2?.foreignColumns[0]?.name).toBe('iteration43-id-b');
    expect(ref3?.foreignColumns[0]).toBe(originalId);
    expect(ref1?.columns[0]?.name).toBe('category');

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      writable: true,
      value: originalId,
    });
  });

  it('proves branding refine executes try and catch paths around lines 1600-1605', () => {
    const nativeParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration43-force-catch') {
        throw new Error('forced catch');
      }

      return nativeParse(text);
    });

    const validArray = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration43-valid-array',
      config: '["compact","cards"]',
    });

    const forcedCatch = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration43-forced',
      config: 'iteration43-force-catch',
    });

    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration43-malformed',
      config: '{"x":}',
    });

    expect(validArray.success).toBe(true);
    expect(forcedCatch.success).toBe(false);
    expect(malformed.success).toBe(false);

    expect(parseSpy).toHaveBeenCalledWith('["compact","cards"]');
    expect(parseSpy).toHaveBeenCalledWith('iteration43-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"x":}');

    if (!forcedCatch.success) {
      const issue = forcedCatch.error.issues.find((entry) => entry.path.join('.') === 'config');
      expect(issue?.message).toBe('Config must be valid JSON');
    }

    if (!malformed.success) {
      const issue = malformed.error.issues.find((entry) => entry.path.join('.') === 'config');
      expect(issue?.message).toBe('Config must be valid JSON');
    }
  });

  it('covers practical financial expense schema behavior: strict date format and partial update acceptance', () => {
    const validExpense = schema.insertFinancialExpenseSchema.safeParse({
      category: '3b241101-e2bb-4255-8caf-4136c566a962',
      description: 'Taxi mission',
      amountInCents: 3550,
      expenseDate: '2026-05-02',
      createdBy: 'admin@example.com',
    });

    const invalidExpenseDate = schema.insertFinancialExpenseSchema.safeParse({
      category: '3b241101-e2bb-4255-8caf-4136c566a962',
      description: 'Taxi mission',
      amountInCents: 3550,
      expenseDate: '02/05/2026',
      createdBy: 'admin@example.com',
    });

    const partialUpdate = schema.updateFinancialExpenseSchema.safeParse({
      vendor: 'Cab Partner',
      amountInCents: 4000,
    });

    expect(validExpense.success).toBe(true);
    expect(invalidExpenseDate.success).toBe(false);
    expect(partialUpdate.success).toBe(true);
  });
});
