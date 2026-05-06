import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { getTableConfig } from 'drizzle-orm/pg-core';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 34 - targeted coverage for forecasts FK and branding JSON refine', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('executes financialForecasts FK reference callback and validates mapping', () => {
    const forecastsConfig = getTableConfig(schema.financialForecasts);

    expect(forecastsConfig.foreignKeys).toHaveLength(1);

    const forecastFk = forecastsConfig.foreignKeys[0]?.reference();
    expect(forecastFk?.foreignTable).toBe(schema.financialCategories);
    expect(forecastFk?.columns.map((column) => column.name)).toEqual(['category']);
    expect(forecastFk?.foreignColumns.map((column) => column.name)).toEqual(['id']);
  });

  it('accepts primitive but valid JSON in branding config refine branch', () => {
    const parsed = schema.insertBrandingConfigSchema.parse({
      key: 'primitive-json',
      config: '123',
    });

    expect(parsed.key).toBe('primitive-json');
    expect(parsed.config).toBe('123');
  });

  it('returns refine issue details when branding JSON is invalid', () => {
    const result = schema.insertBrandingConfigSchema.safeParse({
      key: 'invalid-json',
      config: '{"a":',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['config']);
      expect(result.error.issues[0]?.message).toBe('Config must be valid JSON');
      return;
    }

    expect.unreachable('Expected invalid branding config to fail parsing');
  });
});
