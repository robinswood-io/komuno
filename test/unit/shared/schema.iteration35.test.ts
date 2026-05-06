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

describe('shared/schema.js iteration 35 - focused branches around financial forecasts and branding config', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('resolves financialForecasts category foreign key reference callback', () => {
    const forecastsTableConfig = getTableConfig(schema.financialForecasts);
    expect(forecastsTableConfig.foreignKeys).toHaveLength(1);

    const fkReference = forecastsTableConfig.foreignKeys[0]?.reference();
    expect(fkReference?.foreignTable).toBe(schema.financialCategories);
    expect(fkReference?.columns.map((column) => column.name)).toEqual(['category']);
    expect(fkReference?.foreignColumns.map((column) => column.name)).toEqual(['id']);
  });

  it('accepts valid JSON object and array strings in branding config refine success branch', () => {
    const objectConfig = schema.insertBrandingConfigSchema.parse({
      key: 'branding-object',
      config: '{"theme":"sunrise","primary":"#f97316"}',
    });
    expect(objectConfig.key).toBe('branding-object');

    const arrayConfig = schema.insertBrandingConfigSchema.parse({
      key: 'branding-array',
      config: '["header","footer"]',
    });
    expect(arrayConfig.config).toBe('["header","footer"]');
  });

  it('rejects invalid JSON string in branding config refine catch branch', () => {
    const parsed = schema.insertBrandingConfigSchema.safeParse({
      key: 'invalid-json',
      config: '{"theme":}',
    });

    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      expect(parsed.error.issues[0]?.path).toEqual(['config']);
      expect(parsed.error.issues[0]?.message).toBe('Config must be valid JSON');
      return;
    }

    expect.unreachable('Expected invalid JSON in branding config to fail');
  });
});
