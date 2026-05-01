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

describe('shared/schema.js iteration 15 - constraints/enums/defaults edge branches', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers remaining permission/display/permission-list branches', () => {
    expect(schema.hasPermission(schema.ADMIN_ROLES.IDEAS_READER, 'admin.view')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.EVENTS_MANAGER, 'admin.view')).toBe(true);

    expect(schema.getRoleDisplayName(schema.ADMIN_ROLES.IDEAS_READER)).toBe('Consultation des idées');
    expect(schema.getRoleDisplayName(schema.ADMIN_ROLES.IDEAS_MANAGER)).toBe('Gestion des idées');
    expect(schema.getRoleDisplayName(schema.ADMIN_ROLES.EVENTS_READER)).toBe('Consultation des événements');

    expect(schema.getRolePermissions(schema.ADMIN_ROLES.SUPER_ADMIN)).toEqual([
      'Toutes les permissions',
      'Gestion des administrateurs',
    ]);
    expect(schema.getRolePermissions(schema.ADMIN_ROLES.IDEAS_READER)).toEqual([
      'Consultation des idées',
    ]);
    expect(schema.getRolePermissions(schema.ADMIN_ROLES.EVENTS_MANAGER)).toContain(
      'Gestion des inscriptions et absences',
    );
  });

  it('covers optional transform branches for inscriptions/patrons/sponsorship', () => {
    const initialInscription = schema.initialInscriptionSchema.parse({
      name: '  <Camille Dupuis> ',
      email: 'camille@example.org',
      company: ' <Komuno> ',
      phone: ' 0600000000 ',
      comments: ' <Présence confirmée> ',
    });

    expect(initialInscription.company).toBe('Komuno');
    expect(initialInscription.phone).toBe('0600000000');
    expect(initialInscription.comments).toBe('Présence confirmée');

    const patronWithEmptyReferrer = schema.insertPatronSchema.parse({
      firstName: 'Lucie',
      lastName: 'Bernard',
      email: 'lucie@example.org',
      role: ' <Partenaire> ',
      company: ' <Entreprise Y> ',
      phone: ' 0610101010 ',
      notes: ' <Historique relationnel> ',
      referrerId: '   ',
      createdBy: 'admin@example.org',
    });

    expect(patronWithEmptyReferrer.referrerId).toBeUndefined();

    const patronUpdate = schema.updatePatronSchema.parse({
      role: ' <Directrice> ',
      company: ' <Société Z> ',
      phone: ' 0712121212 ',
      notes: ' <Suivi trimestriel> ',
    });

    expect(patronUpdate.role).toBe('Directrice');
    expect(patronUpdate.company).toBe('Société Z');
    expect(patronUpdate.phone).toBe('0712121212');
    expect(patronUpdate.notes).toBe('Suivi trimestriel');

    const sponsorship = schema.insertEventSponsorshipSchema.parse({
      eventId: '550e8400-e29b-41d4-a716-446655440010',
      patronId: '550e8400-e29b-41d4-a716-446655440011',
      level: 'silver',
      amount: 120000,
      benefits: ' <Visibilité sur scène> ',
      logoUrl: 'https://example.org/logo-silver.png',
      websiteUrl: 'https://example.org',
      proposedByAdminEmail: 'admin@example.org',
      confirmedAt: '2035-06-10T09:00:00.000Z',
    });

    expect(sponsorship.benefits).toBe('Visibilité sur scène');
    expect(sponsorship.logoUrl).toBe('https://example.org/logo-silver.png');
    expect(sponsorship.websiteUrl).toBe('https://example.org');
    expect(sponsorship.confirmedAt).toBe('2035-06-10T09:00:00.000Z');
  });

  it('covers defaults/enums/limits around financial and email schemas', () => {
    const category = schema.insertFinancialCategorySchema.parse({
      name: 'Subventions',
      type: 'income',
      parentId: null,
      description: null,
    });

    expect(category.isActive).toBe(true);
    expect(category.parentId).toBeNull();

    const invalidBudgetMonth = schema.insertFinancialBudgetSchema.safeParse({
      name: 'Budget mensuel invalide',
      category: '550e8400-e29b-41d4-a716-446655440020',
      period: 'month',
      year: 2035,
      month: 0,
      amountInCents: 1000,
      createdBy: 'finance@example.org',
    });
    expect(invalidBudgetMonth.success).toBe(false);

    const forecastDefaults = schema.insertFinancialForecastSchema.parse({
      category: '550e8400-e29b-41d4-a716-446655440021',
      period: 'year',
      year: 2036,
      forecastedAmountInCents: 450000,
      createdBy: 'finance@example.org',
    });

    expect(forecastDefaults.confidence).toBe('medium');
    expect(forecastDefaults.basedOn).toBe('estimate');

    const validEmailConfig = schema.insertEmailConfigSchema.parse({
      host: 'smtp.example.org',
      port: 465,
      secure: true,
      fromEmail: 'mailer@example.org',
      provider: 'ovh',
    });
    expect(validEmailConfig.provider).toBe('ovh');

    const invalidEmailConfig = schema.insertEmailConfigSchema.safeParse({
      host: 'smtp.example.org',
      port: 65536,
      secure: false,
      fromEmail: 'mailer@example.org',
    });
    expect(invalidEmailConfig.success).toBe(false);
  });

  it('covers financial table constraint callbacks (indexes and foreign keys)', () => {
    const categoriesConfig = getTableConfig(schema.financialCategories);
    const budgetsConfig = getTableConfig(schema.financialBudgets);
    const expensesConfig = getTableConfig(schema.financialExpenses);
    const forecastsConfig = getTableConfig(schema.financialForecasts);

    expect(categoriesConfig.indexes).toHaveLength(3);
    expect(budgetsConfig.indexes).toHaveLength(4);
    expect(expensesConfig.indexes).toHaveLength(4);
    expect(forecastsConfig.indexes).toHaveLength(4);

    expect(budgetsConfig.foreignKeys).toHaveLength(1);
    expect(expensesConfig.foreignKeys).toHaveLength(2);
    expect(forecastsConfig.foreignKeys).toHaveLength(1);

    const categoriesIndexNames = categoriesConfig.indexes.map((indexDef) => indexDef.config.name);
    expect(categoriesIndexNames).toContain('financial_categories_type_idx');
    expect(categoriesIndexNames).toContain('financial_categories_parent_id_idx');
    expect(categoriesIndexNames).toContain('financial_categories_name_idx');

    const expensesIndexNames = expensesConfig.indexes.map((indexDef) => indexDef.config.name);
    expect(expensesIndexNames).toContain('financial_expenses_expense_date_idx');
    expect(expensesIndexNames).toContain('financial_expenses_budget_id_idx');
  });
});
