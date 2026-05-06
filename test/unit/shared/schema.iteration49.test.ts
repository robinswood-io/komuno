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

describe('shared/schema.js iteration 49 - stubborn lines and expense schema behavior', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves line 1538 callback execution using property swap between FK references', () => {
    const tableConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = tableConfig.foreignKeys[0];
    const originalId = schema.financialCategories.id;

    expect(tableConfig.foreignKeys).toHaveLength(1);

    const idA = { name: 'iteration49-id-a' } as unknown as typeof originalId;
    const idB = { name: 'iteration49-id-b' } as unknown as typeof originalId;

    schema.financialCategories.id = idA;
    const first = foreignKey?.reference();
    schema.financialCategories.id = idB;
    const second = foreignKey?.reference();
    schema.financialCategories.id = originalId;
    const third = foreignKey?.reference();

    expect(first?.foreignColumns[0]).toBe(idA);
    expect(second?.foreignColumns[0]).toBe(idB);
    expect(third?.foreignColumns[0]).toBe(originalId);
  });

  it('proves lines 1600-1605 by triggering both valid and invalid parse flows', () => {
    const nativeParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration49-force-catch') {
        throw new EvalError('iteration49 forced');
      }

      return nativeParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration49-valid',
      config: '{"layout":"cards"}',
    });
    const forced = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration49-forced',
      config: 'iteration49-force-catch',
    });
    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration49-malformed',
      config: '{"layout":}',
    });

    expect(valid.success).toBe(true);
    expect(forced.success).toBe(false);
    expect(malformed.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledWith('{"layout":"cards"}');
    expect(parseSpy).toHaveBeenCalledWith('iteration49-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"layout":}');
  });

  it('adds practical behavior: expense schema enforces receipt URL validity', () => {
    const valid = schema.insertFinancialExpenseSchema.safeParse({
      category: '3b241101-e2bb-4255-8caf-4136c566a962',
      description: 'Hosting fee',
      amountInCents: 8900,
      expenseDate: '2026-05-02',
      receiptUrl: 'https://example.com/receipt.pdf',
      createdBy: 'admin@example.com',
    });
    const invalidUrl = schema.insertFinancialExpenseSchema.safeParse({
      category: '3b241101-e2bb-4255-8caf-4136c566a962',
      description: 'Hosting fee',
      amountInCents: 8900,
      expenseDate: '2026-05-02',
      receiptUrl: 'not-an-url',
      createdBy: 'admin@example.com',
    });

    expect(valid.success).toBe(true);
    expect(invalidUrl.success).toBe(false);
  });
});
