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

describe('shared/schema.js iteration 47 - stubborn lines and budget update behavior', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves line 1538 FK callback reflects dynamic property changes across reference calls', () => {
    const tableConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = tableConfig.foreignKeys[0];
    const originalId = schema.financialCategories.id;

    expect(tableConfig.foreignKeys).toHaveLength(1);

    const sentinelA = { name: 'iteration47-id-a' } as unknown as typeof originalId;
    const sentinelB = { name: 'iteration47-id-b' } as unknown as typeof originalId;

    schema.financialCategories.id = sentinelA;
    const refA = foreignKey?.reference();
    schema.financialCategories.id = sentinelB;
    const refB = foreignKey?.reference();
    schema.financialCategories.id = originalId;
    const refOriginal = foreignKey?.reference();

    expect(refA?.foreignColumns[0]).toBe(sentinelA);
    expect(refB?.foreignColumns[0]).toBe(sentinelB);
    expect(refOriginal?.foreignColumns[0]).toBe(originalId);
  });

  it('proves lines 1600-1605 by forcing parse throw and natural malformed JSON failure', () => {
    const nativeParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration47-force-catch') {
        throw new RangeError('iteration47 forced');
      }

      return nativeParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration47-valid',
      config: '{"brand":"north"}',
    });
    const forced = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration47-forced',
      config: 'iteration47-force-catch',
    });
    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration47-malformed',
      config: '{"brand":}',
    });

    expect(valid.success).toBe(true);
    expect(forced.success).toBe(false);
    expect(malformed.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledWith('{"brand":"north"}');
    expect(parseSpy).toHaveBeenCalledWith('iteration47-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"brand":}');
  });

  it('adds practical behavior: updateFinancialBudgetSchema is partial but still enforces month bounds', () => {
    const validPartial = schema.updateFinancialBudgetSchema.safeParse({
      month: 12,
    });
    const invalidMonth = schema.updateFinancialBudgetSchema.safeParse({
      month: 13,
    });
    const emptyPartial = schema.updateFinancialBudgetSchema.safeParse({});

    expect(validPartial.success).toBe(true);
    expect(invalidMonth.success).toBe(false);
    expect(emptyPartial.success).toBe(true);
  });
});
