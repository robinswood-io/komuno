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

describe('shared/schema.js iteration 45 - stubborn lines proof + practical forecast update behavior', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves line 1538 callback is re-evaluated on each FK reference() call', () => {
    const forecastsConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = forecastsConfig.foreignKeys[0];

    expect(forecastsConfig.foreignKeys).toHaveLength(1);

    const originalId = schema.financialCategories.id;
    const enumerable = Object.prototype.propertyIsEnumerable.call(schema.financialCategories, 'id');

    let getterHits = 0;
    const sentinelValues = [
      { name: 'iteration45-id-a' } as unknown as typeof originalId,
      { name: 'iteration45-id-b' } as unknown as typeof originalId,
      originalId,
    ];

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      get() {
        const current = sentinelValues[getterHits] ?? originalId;
        getterHits += 1;
        return current;
      },
    });

    const ref1 = foreignKey?.reference();
    const ref2 = foreignKey?.reference();
    const ref3 = foreignKey?.reference();

    expect(getterHits).toBe(3);
    expect(ref1?.foreignColumns[0]?.name).toBe('iteration45-id-a');
    expect(ref2?.foreignColumns[0]?.name).toBe('iteration45-id-b');
    expect(ref3?.foreignColumns[0]).toBe(originalId);
    expect(ref1?.columns[0]?.name).toBe('category');

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      writable: true,
      value: originalId,
    });
  });

  it('proves lines 1600-1605 via JSON.parse success path and catch path', () => {
    const nativeParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration45-force-catch') {
        throw new TypeError('iteration45 forced catch branch');
      }

      return nativeParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration45-valid',
      config: '{"primary":"#0044aa"}',
    });

    const forcedCatch = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration45-forced-catch',
      config: 'iteration45-force-catch',
    });

    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration45-malformed',
      config: '{"primary":}',
    });

    expect(valid.success).toBe(true);
    expect(forcedCatch.success).toBe(false);
    expect(malformed.success).toBe(false);

    expect(parseSpy).toHaveBeenCalledTimes(3);
    expect(parseSpy).toHaveBeenCalledWith('{"primary":"#0044aa"}');
    expect(parseSpy).toHaveBeenCalledWith('iteration45-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"primary":}');

    if (!forcedCatch.success) {
      const issue = forcedCatch.error.issues.find((entry) => entry.path.join('.') === 'config');
      expect(issue?.message).toBe('Config must be valid JSON');
    }

    if (!malformed.success) {
      const issue = malformed.error.issues.find((entry) => entry.path.join('.') === 'config');
      expect(issue?.message).toBe('Config must be valid JSON');
    }
  });

  it('adds practical behavior gain: updateFinancialForecastSchema stays partial but validates provided enums', () => {
    const validPartial = schema.updateFinancialForecastSchema.safeParse({
      confidence: 'high',
      basedOn: 'historical',
    });

    const invalidConfidence = schema.updateFinancialForecastSchema.safeParse({
      confidence: 'certain',
    });

    const invalidBasedOn = schema.updateFinancialForecastSchema.safeParse({
      basedOn: 'pipeline',
    });

    const emptyPartial = schema.updateFinancialForecastSchema.safeParse({});

    expect(validPartial.success).toBe(true);
    expect(invalidConfidence.success).toBe(false);
    expect(invalidBasedOn.success).toBe(false);
    expect(emptyPartial.success).toBe(true);
  });
});
