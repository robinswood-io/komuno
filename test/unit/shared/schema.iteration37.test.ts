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

describe('shared/schema.js iteration 37 - source-map pressure around 1538 and 1600', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('resolves financialForecasts foreign key callback repeatedly with stable metadata', () => {
    const tableConfig = getTableConfig(schema.financialForecasts);
    expect(tableConfig.foreignKeys).toHaveLength(1);

    const foreignKey = tableConfig.foreignKeys[0];
    const firstReference = foreignKey?.reference();
    const secondReference = foreignKey?.reference();

    expect(firstReference?.foreignTable).toBe(schema.financialCategories);
    expect(secondReference?.foreignTable).toBe(schema.financialCategories);
    expect(firstReference?.columns.map((column) => column.name)).toEqual(['category']);
    expect(firstReference?.foreignColumns.map((column) => column.name)).toEqual(['id']);
    expect(foreignKey?.onDelete).toBe('restrict');
    expect(foreignKey?.onUpdate).toBe('no action');
  });

  it('runs branding config refine with parse success and thrown failure via mocked JSON.parse', () => {
    const originalParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'force-throw') {
        throw new Error('forced parse error');
      }

      return originalParse(text);
    });

    const success = schema.insertBrandingConfigSchema.safeParse({
      key: 'iter37-valid',
      config: '{"v":37}',
    });

    const forcedFailure = schema.insertBrandingConfigSchema.safeParse({
      key: 'iter37-force-fail',
      config: 'force-throw',
    });

    expect(success.success).toBe(true);
    expect(forcedFailure.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledWith('{"v":37}');
    expect(parseSpy).toHaveBeenCalledWith('force-throw');

    parseSpy.mockRestore();
  });

  it('keeps original invalid JSON failure branch with config issue message', () => {
    const parsed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iter37-invalid-json',
      config: '{"broken":}',
    });

    expect(parsed.success).toBe(false);

    if (!parsed.success) {
      const configIssue = parsed.error.issues.find((issue) => issue.path.join('.') === 'config');
      expect(configIssue?.message).toBe('Config must be valid JSON');
      return;
    }

    expect.unreachable('Expected invalid JSON string to fail branding config schema parsing');
  });
});
