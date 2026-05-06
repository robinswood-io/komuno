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

type RelationStub = {
  kind: 'one' | 'many';
  table: unknown;
  config: Record<string, unknown> | undefined;
  fieldName: string | null;
  withFieldName: (name: string) => RelationStub;
};

function makeRelation(kind: 'one' | 'many', table: unknown, config?: Record<string, unknown>): RelationStub {
  const relation: RelationStub = {
    kind,
    table,
    config,
    fieldName: null,
    withFieldName(name: string): RelationStub {
      relation.fieldName = name;
      return relation;
    },
  };

  return relation;
}

describe('shared/schema.js iteration 39 - practical gains around forecasts relations and branding refine', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes financial category + forecast relation config callbacks with explicit field wiring', () => {
    const one = (table: unknown, config?: Record<string, unknown>) => makeRelation('one', table, config);
    const many = (table: unknown, config?: Record<string, unknown>) => makeRelation('many', table, config);

    const forecastsRelations = schema.financialForecastsRelations.config({ one, many });
    const categoriesRelations = schema.financialCategoriesRelations.config({ one, many });

    expect(Object.keys(forecastsRelations)).toEqual(['category']);
    expect(forecastsRelations.category.fieldName).toBe('category');
    expect(forecastsRelations.category.kind).toBe('one');

    const forecastCategoryConfig = forecastsRelations.category.config as {
      fields: Array<{ name: string }>;
      references: Array<{ name: string }>;
    };

    expect(forecastCategoryConfig.fields.map((column) => column.name)).toEqual(['category']);
    expect(forecastCategoryConfig.references.map((column) => column.name)).toEqual(['id']);

    expect(categoriesRelations.forecasts.fieldName).toBe('forecasts');
    expect(categoriesRelations.forecasts.kind).toBe('many');
    expect(categoriesRelations.forecasts.table).toBe(schema.financialForecasts);

    const parentConfig = categoriesRelations.parent.config as { relationName: string };
    const childrenConfig = categoriesRelations.children.config as { relationName: string };

    expect(parentConfig.relationName).toBe('categoryParent');
    expect(childrenConfig.relationName).toBe('categoryParent');
  });

  it('revalidates financialForecasts FK callback path with temporary sentinel target', () => {
    const forecastConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = forecastConfig.foreignKeys[0];

    expect(forecastConfig.foreignKeys).toHaveLength(1);
    expect(foreignKey?.onDelete).toBe('restrict');

    const originalId = schema.financialCategories.id;
    const sentinelColumn = { name: 'iteration39-sentinel-id' };

    schema.financialCategories.id = sentinelColumn as typeof originalId;

    const mutatedReference = foreignKey?.reference();
    expect(mutatedReference?.foreignColumns[0]).toBe(sentinelColumn);

    schema.financialCategories.id = originalId;

    const restoredReference = foreignKey?.reference();
    expect(restoredReference?.foreignColumns[0]).toBe(originalId);
  });

  it('validates branding config refine with createdAt pass-through and malformed JSON failure', () => {
    const parseSpy = vi.spyOn(JSON, 'parse');

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration39-branding',
      config: '{"layout":"cards","accent":"#10b981"}',
      createdAt: new Date('2039-01-01T00:00:00.000Z'),
    });

    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration39-branding-invalid',
      config: '{"layout":}',
    });

    expect(valid.success).toBe(true);
    expect(malformed.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledWith('{"layout":"cards","accent":"#10b981"}');
    expect(parseSpy).toHaveBeenCalledWith('{"layout":}');

    if (valid.success) {
      expect(valid.data.createdAt?.toISOString()).toBe('2039-01-01T00:00:00.000Z');
    }

    if (!malformed.success) {
      const configIssue = malformed.error.issues.find((issue) => issue.path.join('.') === 'config');
      expect(configIssue?.message).toBe('Config must be valid JSON');
      return;
    }

    expect.unreachable('Expected malformed JSON to fail branding config parsing');
  });
});
