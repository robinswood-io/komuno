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

describe('shared/schema.js iteration 50 - stubborn lines and forecast schema behavior', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves line 1538 FK callback remains dynamic via getter sequence', () => {
    const tableConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = tableConfig.foreignKeys[0];
    const originalId = schema.financialCategories.id;
    const enumerable = Object.prototype.propertyIsEnumerable.call(schema.financialCategories, 'id');

    let calls = 0;
    const values = [
      { name: 'iteration50-id-a' } as unknown as typeof originalId,
      { name: 'iteration50-id-b' } as unknown as typeof originalId,
      originalId,
    ];

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      get() {
        const value = values[calls] ?? originalId;
        calls += 1;
        return value;
      },
    });

    const refA = foreignKey?.reference();
    const refB = foreignKey?.reference();
    const refC = foreignKey?.reference();

    expect(calls).toBe(3);
    expect(refA?.foreignColumns[0]?.name).toBe('iteration50-id-a');
    expect(refB?.foreignColumns[0]?.name).toBe('iteration50-id-b');
    expect(refC?.foreignColumns[0]).toBe(originalId);

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      writable: true,
      value: originalId,
    });
  });

  it('proves lines 1600-1605 through parse success + forced and native errors', () => {
    const nativeParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration50-force-catch') {
        throw new URIError('iteration50 forced catch');
      }

      return nativeParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration50-valid',
      config: '{"accent":"amber"}',
    });
    const forced = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration50-forced',
      config: 'iteration50-force-catch',
    });
    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration50-malformed',
      config: '{"accent":}',
    });

    expect(valid.success).toBe(true);
    expect(forced.success).toBe(false);
    expect(malformed.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledTimes(3);
  });

  it('adds practical behavior: forecast schema enforces year bounds and keeps defaults', () => {
    const valid = schema.insertFinancialForecastSchema.safeParse({
      category: '3b241101-e2bb-4255-8caf-4136c566a962',
      period: 'year',
      year: 2026,
      forecastedAmountInCents: 250000,
      createdBy: 'admin@example.com',
    });
    const invalidYear = schema.insertFinancialForecastSchema.safeParse({
      category: '3b241101-e2bb-4255-8caf-4136c566a962',
      period: 'year',
      year: 1999,
      forecastedAmountInCents: 250000,
      createdBy: 'admin@example.com',
    });

    expect(valid.success).toBe(true);
    expect(invalidYear.success).toBe(false);

    if (valid.success) {
      expect(valid.data.confidence).toBe('medium');
      expect(valid.data.basedOn).toBe('estimate');
    }
  });
});
