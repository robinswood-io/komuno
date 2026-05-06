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

describe('shared/schema.js iteration 44 - targeted stubborn lines + practical relation/schema checks', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes FK callback around line 1538 with two dynamic foreign id sources', () => {
    const forecastsConfig = getTableConfig(schema.financialForecasts);
    const fk = forecastsConfig.foreignKeys[0];

    expect(forecastsConfig.foreignKeys).toHaveLength(1);
    expect(fk?.onDelete).toBe('restrict');

    const original = schema.financialCategories.id;
    const sentinelA = { name: 'iteration44-id-a' } as unknown as typeof original;
    const sentinelB = { name: 'iteration44-id-b' } as unknown as typeof original;

    schema.financialCategories.id = sentinelA;
    const refA = fk?.reference();

    schema.financialCategories.id = sentinelB;
    const refB = fk?.reference();

    schema.financialCategories.id = original;
    const refOriginal = fk?.reference();

    expect(refA?.columns[0]?.name).toBe('category');
    expect(refA?.foreignColumns[0]).toBe(sentinelA);
    expect(refB?.foreignColumns[0]).toBe(sentinelB);
    expect(refOriginal?.foreignColumns[0]).toBe(original);
  });

  it('executes refine JSON.parse success and catch paths around lines 1600-1605', () => {
    const realParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration44-force-catch') {
        throw new SyntaxError('iteration44 forced catch');
      }

      return realParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration44-valid',
      config: '{"layout":"grid"}',
    });

    const forcedCatch = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration44-catch',
      config: 'iteration44-force-catch',
    });

    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration44-malformed',
      config: '{"layout":}',
    });

    expect(valid.success).toBe(true);
    expect(forcedCatch.success).toBe(false);
    expect(malformed.success).toBe(false);

    expect(parseSpy).toHaveBeenCalledWith('{"layout":"grid"}');
    expect(parseSpy).toHaveBeenCalledWith('iteration44-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"layout":}');
  });

  it('executes relation config callbacks for budgets and expenses', () => {
    const one = (table: unknown, config?: RelationConfigShape) => makeRelation('one', table, config);
    const many = (table: unknown, config?: RelationConfigShape) => makeRelation('many', table, config);

    const budgetsRelations = schema.financialBudgetsRelations.config({ one, many });
    const expensesRelations = schema.financialExpensesRelations.config({ one, many });

    expect(budgetsRelations.category.fieldName).toBe('category');
    expect(budgetsRelations.expenses.fieldName).toBe('expenses');
    expect(expensesRelations.category.fieldName).toBe('category');
    expect(expensesRelations.budget.fieldName).toBe('budget');

    const budgetCategory = budgetsRelations.category.config as Required<Pick<RelationConfigShape, 'fields' | 'references'>>;
    const expenseBudget = expensesRelations.budget.config as Required<Pick<RelationConfigShape, 'fields' | 'references'>>;

    expect(budgetCategory.fields.map((column) => column.name)).toEqual(['category']);
    expect(budgetCategory.references.map((column) => column.name)).toEqual(['id']);
    expect(expenseBudget.fields.map((column) => column.name)).toEqual(['budget_id']);
    expect(expenseBudget.references.map((column) => column.name)).toEqual(['id']);
  });

  it('covers practical forecast schema behavior: defaults + invalid quarter rejection', () => {
    const valid = schema.insertFinancialForecastSchema.safeParse({
      category: '3b241101-e2bb-4255-8caf-4136c566a962',
      period: 'year',
      year: 2044,
      forecastedAmountInCents: 99000,
      createdBy: 'admin@example.com',
    });

    const invalidQuarter = schema.insertFinancialForecastSchema.safeParse({
      category: '3b241101-e2bb-4255-8caf-4136c566a962',
      period: 'quarter',
      year: 2044,
      quarter: 5,
      forecastedAmountInCents: 100,
      createdBy: 'admin@example.com',
    });

    expect(valid.success).toBe(true);

    if (valid.success) {
      expect(valid.data.confidence).toBe('medium');
      expect(valid.data.basedOn).toBe('estimate');
    }

    expect(invalidQuarter.success).toBe(false);
  });
});
