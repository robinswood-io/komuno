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

describe('shared/schema.js iteration 41 - stubborn line proof + forecast schema defaults', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves financialForecasts foreign key callback executes dynamically (line 1538) using getter read count', () => {
    const forecastsConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = forecastsConfig.foreignKeys[0];

    expect(forecastsConfig.foreignKeys).toHaveLength(1);
    expect(foreignKey?.onDelete).toBe('restrict');

    const originalId = schema.financialCategories.id;
    const isEnumerable = Object.prototype.propertyIsEnumerable.call(schema.financialCategories, 'id');

    let reads = 0;

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable: isEnumerable,
      get() {
        reads += 1;
        return originalId;
      },
    });

    const refA = foreignKey?.reference();
    const refB = foreignKey?.reference();
    const refC = foreignKey?.reference();

    expect(refA?.columns[0]?.name).toBe('category');
    expect(refB?.foreignColumns[0]?.name).toBe('id');
    expect(refC?.foreignTable).toBe(schema.financialCategories);
    expect(reads).toBeGreaterThanOrEqual(3);

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable: isEnumerable,
      writable: true,
      value: originalId,
    });

    const restored = foreignKey?.reference();
    expect(restored?.foreignColumns[0]).toBe(originalId);
  });

  it('proves branding refine executes JSON.parse success and catch branches (lines 1600-1605)', () => {
    const realParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration41-force-catch') {
        throw new SyntaxError('iteration41 catch branch');
      }

      return realParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration41-valid',
      config: '{"palette":{"primary":"#22c55e"}}',
    });

    const forcedCatch = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration41-catch',
      config: 'iteration41-force-catch',
    });

    const malformedCatch = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration41-malformed',
      config: '{"palette":}',
    });

    expect(valid.success).toBe(true);
    expect(forcedCatch.success).toBe(false);
    expect(malformedCatch.success).toBe(false);

    expect(parseSpy).toHaveBeenCalledWith('{"palette":{"primary":"#22c55e"}}');
    expect(parseSpy).toHaveBeenCalledWith('iteration41-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"palette":}');

    if (!forcedCatch.success) {
      const configIssue = forcedCatch.error.issues.find((issue) => issue.path.join('.') === 'config');
      expect(configIssue?.message).toBe('Config must be valid JSON');
    }

    if (!malformedCatch.success) {
      const configIssue = malformedCatch.error.issues.find((issue) => issue.path.join('.') === 'config');
      expect(configIssue?.message).toBe('Config must be valid JSON');
    }
  });

  it('applies financial forecast defaults and rejects invalid month range', () => {
    const parsed = schema.insertFinancialForecastSchema.parse({
      category: '3b241101-e2bb-4255-8caf-4136c566a962',
      period: 'year',
      year: 2041,
      forecastedAmountInCents: 125000,
      createdBy: 'finance@example.com',
    });

    expect(parsed.confidence).toBe('medium');
    expect(parsed.basedOn).toBe('estimate');

    const invalidMonth = schema.insertFinancialForecastSchema.safeParse({
      category: '3b241101-e2bb-4255-8caf-4136c566a962',
      period: 'month',
      year: 2041,
      month: 13,
      forecastedAmountInCents: 100,
      createdBy: 'finance@example.com',
    });

    expect(invalidMonth.success).toBe(false);

    if (!invalidMonth.success) {
      const monthIssue = invalidMonth.error.issues.find((issue) => issue.path.join('.') === 'month');
      expect(monthIssue).toBeDefined();
    }
  });
});
