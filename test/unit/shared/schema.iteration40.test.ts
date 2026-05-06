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

describe('shared/schema.js iteration 40 - stubborn source-map probes + practical relation gains', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves financialForecasts FK callback re-reads financialCategories.id on each reference() call (line 1538)', () => {
    const forecastTable = getTableConfig(schema.financialForecasts);
    const foreignKey = forecastTable.foreignKeys[0];

    expect(forecastTable.foreignKeys).toHaveLength(1);
    expect(foreignKey?.onDelete).toBe('restrict');

    const originalId = schema.financialCategories.id;
    const originalEnumerable = Object.prototype.propertyIsEnumerable.call(schema.financialCategories, 'id');

    let getterReads = 0;

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable: originalEnumerable,
      get() {
        getterReads += 1;
        return originalId;
      },
    });

    const first = foreignKey?.reference();
    const second = foreignKey?.reference();

    expect(first?.columns[0]?.name).toBe('category');
    expect(second?.foreignColumns[0]?.name).toBe('id');
    expect(getterReads).toBeGreaterThanOrEqual(2);

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable: originalEnumerable,
      writable: true,
      value: originalId,
    });

    const restored = foreignKey?.reference();
    expect(restored?.foreignColumns[0]).toBe(originalId);
  });

  it('executes branding refine JSON.parse success + catch branches with explicit parse-call proof (lines 1600-1605)', () => {
    const realParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration40-force-catch') {
        throw new SyntaxError('iteration40 forced catch');
      }

      return realParse(text);
    });

    const validObject = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration40-valid-object',
      config: '{"mode":"focused","accent":"#0891b2"}',
    });

    const validPrimitive = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration40-valid-primitive',
      config: '42',
    });

    const forcedCatch = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration40-forced-catch',
      config: 'iteration40-force-catch',
    });

    const nativeCatch = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration40-native-catch',
      config: '{"broken":}',
    });

    expect(validObject.success).toBe(true);
    expect(validPrimitive.success).toBe(true);
    expect(forcedCatch.success).toBe(false);
    expect(nativeCatch.success).toBe(false);

    expect(parseSpy).toHaveBeenCalledWith('{"mode":"focused","accent":"#0891b2"}');
    expect(parseSpy).toHaveBeenCalledWith('42');
    expect(parseSpy).toHaveBeenCalledWith('iteration40-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"broken":}');

    if (!forcedCatch.success) {
      const issue = forcedCatch.error.issues.find((entry) => entry.path.join('.') === 'config');
      expect(issue?.message).toBe('Config must be valid JSON');
    }

    if (!nativeCatch.success) {
      const issue = nativeCatch.error.issues.find((entry) => entry.path.join('.') === 'config');
      expect(issue?.message).toBe('Config must be valid JSON');
    }
  });

  it('executes financialBudgetsRelations and financialExpensesRelations callback wiring', () => {
    const one = (table: unknown, config?: RelationConfigShape) => makeRelation('one', table, config);
    const many = (table: unknown, config?: RelationConfigShape) => makeRelation('many', table, config);

    const budgetsRelations = schema.financialBudgetsRelations.config({ one, many });
    const expensesRelations = schema.financialExpensesRelations.config({ one, many });

    expect(budgetsRelations.category.fieldName).toBe('category');
    expect(budgetsRelations.category.kind).toBe('one');
    expect(budgetsRelations.expenses.fieldName).toBe('expenses');
    expect(budgetsRelations.expenses.kind).toBe('many');

    const budgetCategoryConfig = budgetsRelations.category.config as Required<Pick<RelationConfigShape, 'fields' | 'references'>>;
    expect(budgetCategoryConfig.fields.map((column) => column.name)).toEqual(['category']);
    expect(budgetCategoryConfig.references.map((column) => column.name)).toEqual(['id']);

    expect(expensesRelations.category.fieldName).toBe('category');
    expect(expensesRelations.budget.fieldName).toBe('budget');

    const expenseCategoryConfig = expensesRelations.category.config as Required<Pick<RelationConfigShape, 'fields' | 'references'>>;
    const expenseBudgetConfig = expensesRelations.budget.config as Required<Pick<RelationConfigShape, 'fields' | 'references'>>;

    expect(expenseCategoryConfig.fields.map((column) => column.name)).toEqual(['category']);
    expect(expenseCategoryConfig.references.map((column) => column.name)).toEqual(['id']);
    expect(expenseBudgetConfig.fields.map((column) => column.name)).toEqual(['budget_id']);
    expect(expenseBudgetConfig.references.map((column) => column.name)).toEqual(['id']);
  });
});
