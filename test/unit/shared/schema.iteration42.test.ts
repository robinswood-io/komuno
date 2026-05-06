import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { getTableConfig } from 'drizzle-orm/pg-core';

type SchemaModule = typeof import('../../../shared/schema.js');

type NamedColumn = { name: string };

type RelationConfigShape = {
  fields?: NamedColumn[];
  references?: NamedColumn[];
  relationName?: string;
};

type RelationStub = {
  kind: 'one' | 'many';
  table: unknown;
  config: RelationConfigShape | undefined;
  fieldName: string | null;
  withFieldName: (name: string) => RelationStub;
};

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

function makeRelation(kind: 'one' | 'many', table: unknown, config?: RelationConfigShape): RelationStub {
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

describe('shared/schema.js iteration 42 - practical gains + explicit stubborn line proofs', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves line 1538 FK callback is evaluated at call time by swapping foreign id source', () => {
    const forecastsTableConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = forecastsTableConfig.foreignKeys[0];

    expect(forecastsTableConfig.foreignKeys).toHaveLength(1);
    expect(foreignKey?.onDelete).toBe('restrict');

    const originalId = schema.financialCategories.id;
    const enumerable = Object.prototype.propertyIsEnumerable.call(schema.financialCategories, 'id');

    const sentinelA = { name: 'iteration42-id-A' } as unknown as typeof originalId;
    const sentinelB = { name: 'iteration42-id-B' } as unknown as typeof originalId;

    schema.financialCategories.id = sentinelA;
    const refA = foreignKey?.reference();

    schema.financialCategories.id = sentinelB;
    const refB = foreignKey?.reference();

    expect(refA?.columns[0]?.name).toBe('category');
    expect(refA?.foreignColumns[0]).toBe(sentinelA);
    expect(refB?.foreignColumns[0]).toBe(sentinelB);

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      writable: true,
      value: originalId,
    });

    const restored = foreignKey?.reference();
    expect(restored?.foreignColumns[0]).toBe(originalId);
    expect(restored?.foreignColumns[0]?.name).toBe('id');
  });

  it('proves lines 1600-1605: branding refine executes JSON.parse success and catch branches', () => {
    const nativeParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration42-force-catch') {
        throw new SyntaxError('forced catch branch in iteration42');
      }

      return nativeParse(text);
    });

    const validResult = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration42-valid',
      config: '{"theme":"forest","density":"compact"}',
    });

    const forcedCatchResult = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration42-forced-catch',
      config: 'iteration42-force-catch',
    });

    const nativeCatchResult = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration42-native-catch',
      config: '{"theme":}',
    });

    expect(validResult.success).toBe(true);
    expect(forcedCatchResult.success).toBe(false);
    expect(nativeCatchResult.success).toBe(false);

    expect(parseSpy).toHaveBeenCalledWith('{"theme":"forest","density":"compact"}');
    expect(parseSpy).toHaveBeenCalledWith('iteration42-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"theme":}');

    if (!forcedCatchResult.success) {
      const issue = forcedCatchResult.error.issues.find((entry) => entry.path.join('.') === 'config');
      expect(issue?.message).toBe('Config must be valid JSON');
    }

    if (!nativeCatchResult.success) {
      const issue = nativeCatchResult.error.issues.find((entry) => entry.path.join('.') === 'config');
      expect(issue?.message).toBe('Config must be valid JSON');
    }
  });

  it('executes financial categories and forecasts relation callback wiring (practical coverage gain)', () => {
    const one = (table: unknown, config?: RelationConfigShape) => makeRelation('one', table, config);
    const many = (table: unknown, config?: RelationConfigShape) => makeRelation('many', table, config);

    const categoriesRelations = schema.financialCategoriesRelations.config({ one, many });
    const forecastsRelations = schema.financialForecastsRelations.config({ one, many });

    expect(categoriesRelations.parent.fieldName).toBe('parent');
    expect(categoriesRelations.children.fieldName).toBe('children');
    expect(categoriesRelations.forecasts.fieldName).toBe('forecasts');

    const parentConfig = categoriesRelations.parent.config as Required<Pick<RelationConfigShape, 'fields' | 'references' | 'relationName'>>;
    const childrenConfig = categoriesRelations.children.config as Required<Pick<RelationConfigShape, 'relationName'>>;

    expect(parentConfig.relationName).toBe('categoryParent');
    expect(childrenConfig.relationName).toBe('categoryParent');
    expect(parentConfig.fields.map((column) => column.name)).toEqual(['parent_id']);
    expect(parentConfig.references.map((column) => column.name)).toEqual(['id']);

    const forecastsCategoryConfig = forecastsRelations.category.config as Required<Pick<RelationConfigShape, 'fields' | 'references'>>;
    expect(forecastsRelations.category.fieldName).toBe('category');
    expect(forecastsCategoryConfig.fields.map((column) => column.name)).toEqual(['category']);
    expect(forecastsCategoryConfig.references.map((column) => column.name)).toEqual(['id']);
  });

  it('validates new behavior: statusResponse schema accepts partial checks and rejects invalid overallStatus', () => {
    const valid = schema.statusResponseSchema.safeParse({
      timestamp: '2026-05-02T00:00:00.000Z',
      uptime: 123,
      environment: 'test',
      overallStatus: 'warning',
      checks: {
        application: {
          name: 'app',
          status: 'healthy',
          message: 'ok',
        },
      },
    });

    const invalid = schema.statusResponseSchema.safeParse({
      timestamp: '2026-05-02T00:00:00.000Z',
      uptime: 123,
      environment: 'test',
      overallStatus: 'degraded',
      checks: {},
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });
});
