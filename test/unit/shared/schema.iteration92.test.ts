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

function findForeignKeyByColumn(
  tableConfig: ReturnType<typeof getTableConfig>,
  columnName: string,
) {
  return tableConfig.foreignKeys.find((fk) =>
    fk.reference().columns.some((column) => column.name === columnName),
  );
}

describe('shared/schema.js iteration 92', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves core and financial foreign-key callbacks to expected columns', () => {
    const passwordResetEmailFk = findForeignKeyByColumn(
      getTableConfig(schema.passwordResetTokens),
      'email',
    )?.reference();
    expect(passwordResetEmailFk?.foreignColumns[0]).toBe(schema.admins.email);

    const voteIdeaFk = findForeignKeyByColumn(
      getTableConfig(schema.votes),
      'idea_id',
    )?.reference();
    expect(voteIdeaFk?.foreignColumns[0]).toBe(schema.ideas.id);

    const inscriptionEventFk = findForeignKeyByColumn(
      getTableConfig(schema.inscriptions),
      'event_id',
    )?.reference();
    expect(inscriptionEventFk?.foreignColumns[0]).toBe(schema.events.id);

    const unsubscriptionEventFk = findForeignKeyByColumn(
      getTableConfig(schema.unsubscriptions),
      'event_id',
    )?.reference();
    expect(unsubscriptionEventFk?.foreignColumns[0]).toBe(schema.events.id);

    const memberActivityFk = findForeignKeyByColumn(
      getTableConfig(schema.memberActivities),
      'member_email',
    )?.reference();
    expect(memberActivityFk?.foreignColumns[0]).toBe(schema.members.email);

    const memberSubscriptionFk = findForeignKeyByColumn(
      getTableConfig(schema.memberSubscriptions),
      'member_email',
    )?.reference();
    expect(memberSubscriptionFk?.foreignColumns[0]).toBe(schema.members.email);

    const memberTagFk = findForeignKeyByColumn(
      getTableConfig(schema.memberTagAssignments),
      'tag_id',
    )?.reference();
    expect(memberTagFk?.foreignColumns[0]).toBe(schema.memberTags.id);

    const memberRelationRelatedFk = findForeignKeyByColumn(
      getTableConfig(schema.memberRelations),
      'related_member_email',
    )?.reference();
    expect(memberRelationRelatedFk?.foreignColumns[0]).toBe(schema.members.email);

    const sponsorshipPatronFk = findForeignKeyByColumn(
      getTableConfig(schema.eventSponsorships),
      'patron_id',
    )?.reference();
    expect(sponsorshipPatronFk?.foreignColumns[0]).toBe(schema.patrons.id);

    const budgetCategoryFk = findForeignKeyByColumn(
      getTableConfig(schema.financialBudgets),
      'category',
    )?.reference();
    expect(budgetCategoryFk?.foreignColumns[0]).toBe(schema.financialCategories.id);

    const expenseBudgetFk = findForeignKeyByColumn(
      getTableConfig(schema.financialExpenses),
      'budget_id',
    )?.reference();
    expect(expenseBudgetFk?.foreignColumns[0]).toBe(schema.financialBudgets.id);

    const forecastCategoryFk = findForeignKeyByColumn(
      getTableConfig(schema.financialForecasts),
      'category',
    )?.reference();
    expect(forecastCategoryFk?.foreignColumns[0]).toBe(schema.financialCategories.id);
  });
});
