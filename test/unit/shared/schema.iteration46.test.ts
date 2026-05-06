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

describe('shared/schema.js iteration 46 - stubborn lines and budget behavior', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves line 1538 callback uses current financialCategories.id on each call', () => {
    const tableConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = tableConfig.foreignKeys[0];

    expect(tableConfig.foreignKeys).toHaveLength(1);

    const originalId = schema.financialCategories.id;
    const enumerable = Object.prototype.propertyIsEnumerable.call(schema.financialCategories, 'id');

    let hits = 0;
    const values = [
      { name: 'iteration46-id-a' } as unknown as typeof originalId,
      { name: 'iteration46-id-b' } as unknown as typeof originalId,
      originalId,
    ];

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      get() {
        const value = values[hits] ?? originalId;
        hits += 1;
        return value;
      },
    });

    const ref1 = foreignKey?.reference();
    const ref2 = foreignKey?.reference();
    const ref3 = foreignKey?.reference();

    expect(hits).toBe(3);
    expect(ref1?.foreignColumns[0]?.name).toBe('iteration46-id-a');
    expect(ref2?.foreignColumns[0]?.name).toBe('iteration46-id-b');
    expect(ref3?.foreignColumns[0]).toBe(originalId);

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      writable: true,
      value: originalId,
    });
  });

  it('proves lines 1600-1605 with JSON.parse success and catch branches', () => {
    const nativeParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration46-force-catch') {
        throw new SyntaxError('iteration46 forced');
      }

      return nativeParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration46-valid',
      config: '{"palette":["sea","sand"]}',
    });
    const forced = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration46-forced',
      config: 'iteration46-force-catch',
    });
    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration46-malformed',
      config: '{"palette":}',
    });

    expect(valid.success).toBe(true);
    expect(forced.success).toBe(false);
    expect(malformed.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledWith('{"palette":["sea","sand"]}');
    expect(parseSpy).toHaveBeenCalledWith('iteration46-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"palette":}');
  });

  it('adds practical behavior: insertFinancialBudgetSchema accepts quarter budget and rejects negative amount', () => {
    const valid = schema.insertFinancialBudgetSchema.safeParse({
      name: 'Q2 Ads',
      category: '3b241101-e2bb-4255-8caf-4136c566a962',
      period: 'quarter',
      year: 2026,
      quarter: 2,
      amountInCents: 150000,
      createdBy: 'admin@example.com',
    });

    const invalidNegative = schema.insertFinancialBudgetSchema.safeParse({
      name: 'Q2 Ads',
      category: '3b241101-e2bb-4255-8caf-4136c566a962',
      period: 'quarter',
      year: 2026,
      quarter: 2,
      amountInCents: -1,
      createdBy: 'admin@example.com',
    });

    expect(valid.success).toBe(true);
    expect(invalidNegative.success).toBe(false);
  });
});
