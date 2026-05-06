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

describe('shared/schema.js iteration 55 - stubborn line proofs + useful behavior', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves line 1538 callback tracks current financialCategories.id across reference() calls', () => {
    const tableConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = tableConfig.foreignKeys[0];
    const originalId = schema.financialCategories.id;

    expect(tableConfig.foreignKeys).toHaveLength(1);

    const sentinelA = { name: 'iteration55-id-a' } as unknown as typeof originalId;
    const sentinelB = { name: 'iteration55-id-b' } as unknown as typeof originalId;

    schema.financialCategories.id = sentinelA;
    const refA = foreignKey?.reference();
    schema.financialCategories.id = sentinelB;
    const refB = foreignKey?.reference();
    schema.financialCategories.id = originalId;
    const refOriginal = foreignKey?.reference();

    expect(refA?.foreignColumns[0]).toBe(sentinelA);
    expect(refB?.foreignColumns[0]).toBe(sentinelB);
    expect(refOriginal?.foreignColumns[0]).toBe(originalId);
    expect(refA?.columns[0]?.name).toBe('category');
  });

  it('proves lines 1600-1605 by executing JSON.parse success and catch branches', () => {
    const nativeParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration55-force-catch') {
        throw new Error('iteration55 forced catch');
      }

      return nativeParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration55-valid',
      config: '{"theme":"iteration55"}',
    });

    const forced = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration55-forced',
      config: 'iteration55-force-catch',
    });

    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration55-malformed',
      config: '{"theme":}',
    });

    expect(valid.success).toBe(true);
    expect(forced.success).toBe(false);
    expect(malformed.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledWith('{"theme":"iteration55"}');
    expect(parseSpy).toHaveBeenCalledWith('iteration55-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"theme":}');
  });

  it('adds useful behavior: updateFinancialBudgetSchema validates quarter bound while staying partial', () => {
    const validQuarter = schema.updateFinancialBudgetSchema.safeParse({
      quarter: 4,
    });

    const invalidQuarter = schema.updateFinancialBudgetSchema.safeParse({
      quarter: 5,
    });

    expect(validQuarter.success).toBe(true);
    expect(invalidQuarter.success).toBe(false);
  });
});
