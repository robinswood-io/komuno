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

describe('shared/schema.js iteration 33 - focused coverage around financial + config blocks', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers financial forecasts table indexes and foreign key callback branch', () => {
    const forecastsConfig = getTableConfig(schema.financialForecasts);

    expect(forecastsConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'financial_forecasts_category_idx',
        'financial_forecasts_period_idx',
        'financial_forecasts_year_idx',
        'financial_forecasts_period_year_idx',
      ]),
    );

    expect(forecastsConfig.foreignKeys).toHaveLength(1);

    const forecastFk = forecastsConfig.foreignKeys[0]?.reference();
    expect(forecastFk?.foreignTable).toBe(schema.financialCategories);
    expect(forecastFk?.columns.map((column) => column.name)).toEqual(['category']);
    expect(forecastFk?.foreignColumns.map((column) => column.name)).toEqual(['id']);
  });

  it('covers financial expenses dual foreign keys and related indexes', () => {
    const expensesConfig = getTableConfig(schema.financialExpenses);

    expect(expensesConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'financial_expenses_category_idx',
        'financial_expenses_expense_date_idx',
        'financial_expenses_budget_id_idx',
        'financial_expenses_created_by_idx',
      ]),
    );

    expect(expensesConfig.foreignKeys).toHaveLength(2);

    const foreignTables = expensesConfig.foreignKeys.map((fk) => fk.reference()?.foreignTable);
    expect(foreignTables).toEqual(expect.arrayContaining([schema.financialCategories, schema.financialBudgets]));

    const foreignColumns = expensesConfig.foreignKeys.map((fk) => fk.reference()?.foreignColumns.map((c) => c.name));
    expect(foreignColumns).toEqual(expect.arrayContaining([['id'], ['id']]));
  });

  it('covers branding JSON refine success/failure and nearby config schema paths', () => {
    const brandingValid = schema.insertBrandingConfigSchema.parse({
      key: 'dashboard-theme',
      config: '{"palette":{"primary":"#123456"}}',
      createdAt: new Date('2036-06-01T08:00:00.000Z'),
    });

    expect(brandingValid.key).toBe('dashboard-theme');
    expect(brandingValid.config).toContain('palette');

    const brandingInvalid = schema.insertBrandingConfigSchema.safeParse({
      key: 'broken-json',
      config: '{"palette":,}',
    });
    expect(brandingInvalid.success).toBe(false);

    const emailConfig = schema.insertEmailConfigSchema.parse({
      host: 'smtp.example.org',
      port: 587,
      secure: false,
      fromEmail: 'ops@example.org',
      provider: 'ovh',
      createdAt: new Date('2036-06-01T09:00:00.000Z'),
    });
    expect(emailConfig.provider).toBe('ovh');

    const featureWithDefaults = schema.insertFeatureConfigSchema.parse({
      featureKey: 'beta-widget',
    });
    expect(featureWithDefaults.enabled).toBe(true);

    const invalidFeature = schema.insertFeatureConfigSchema.safeParse({
      featureKey: '',
    });
    expect(invalidFeature.success).toBe(false);
  });
});
