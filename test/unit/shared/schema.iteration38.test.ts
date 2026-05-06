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

describe('shared/schema.js iteration 38 - explicit execution proof for stubborn source-map lines', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves financialForecasts FK reference callback re-evaluates financialCategories.id (line 1538 path)', () => {
    const forecastConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = forecastConfig.foreignKeys[0];

    expect(forecastConfig.foreignKeys).toHaveLength(1);
    expect(foreignKey?.onDelete).toBe('restrict');

    const originalId = schema.financialCategories.id;
    const sentinelColumn = { name: 'iteration38-sentinel-foreign-id' };

    schema.financialCategories.id = sentinelColumn as typeof originalId;

    const evaluated = foreignKey?.reference();

    expect(evaluated?.foreignColumns[0]).toBe(sentinelColumn);
    expect(evaluated?.columns[0]?.name).toBe('category');

    schema.financialCategories.id = originalId;

    const restored = foreignKey?.reference();
    expect(restored?.foreignColumns[0]).toBe(originalId);
    expect(restored?.foreignColumns[0]?.name).toBe('id');
  });

  it('proves branding config refine executes JSON.parse try and catch branches (line 1600 path)', () => {
    const originalParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration38-force-catch') {
        throw new SyntaxError('forced-iteration38');
      }

      return originalParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration38-valid',
      config: '{"active":true,"theme":"contrast"}',
    });

    const forcedCatch = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration38-catch',
      config: 'iteration38-force-catch',
    });

    expect(valid.success).toBe(true);
    expect(forcedCatch.success).toBe(false);

    expect(parseSpy).toHaveBeenCalledWith('{"active":true,"theme":"contrast"}');
    expect(parseSpy).toHaveBeenCalledWith('iteration38-force-catch');
    expect(parseSpy).toHaveBeenCalledTimes(2);

    if (!forcedCatch.success) {
      const configIssue = forcedCatch.error.issues.find((issue) => issue.path.join('.') === 'config');
      expect(configIssue?.message).toBe('Config must be valid JSON');
      return;
    }

    expect.unreachable('Expected forced parse failure to hit branding refine catch path');
  });
});
