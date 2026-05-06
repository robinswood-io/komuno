import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { getTableConfig } from 'drizzle-orm/pg-core';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 36 - coverage for financialForecasts FK and branding JSON refine', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('resolves financialForecasts category foreign key callback with restrict delete action', () => {
    const tableConfig = getTableConfig(schema.financialForecasts);
    expect(tableConfig.foreignKeys).toHaveLength(1);

    const foreignKey = tableConfig.foreignKeys[0];
    const reference = foreignKey?.reference();

    expect(reference?.columns.map((column) => column.name)).toEqual(['category']);
    expect(reference?.foreignTable).toBe(schema.financialCategories);
    expect(reference?.foreignColumns.map((column) => column.name)).toEqual(['id']);
    expect(foreignKey?.onDelete).toBe('restrict');
  });

  it('executes branding config JSON refine for valid and invalid payloads', () => {
    const parseSpy = vi.spyOn(JSON, 'parse');

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'brand-valid-36',
      config: '{"palette":{"primary":"#0ea5e9"}}',
    });

    const invalid = schema.insertBrandingConfigSchema.safeParse({
      key: 'brand-invalid-36',
      config: '{"palette":}',
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledTimes(2);

    parseSpy.mockRestore();
  });

  it('keeps branding config key validation while returning refine message for bad JSON', () => {
    const badJson = schema.insertBrandingConfigSchema.safeParse({
      key: 'x',
      config: '{',
    });

    expect(badJson.success).toBe(false);

    if (!badJson.success) {
      expect(badJson.error.issues.some((issue) => issue.path.join('.') === 'config')).toBe(true);
      expect(badJson.error.issues.some((issue) => issue.message === 'Config must be valid JSON')).toBe(true);
      return;
    }

    expect.unreachable('Expected malformed JSON to fail branding config validation');
  });
});
