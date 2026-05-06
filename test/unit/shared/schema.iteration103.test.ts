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

function fkByColumn(table: Parameters<typeof getTableConfig>[0], columnName: string) {
  return getTableConfig(table).foreignKeys.find((fk) =>
    fk.reference().columns.some((column) => column.name === columnName),
  );
}

describe('shared/schema.js iteration 103', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes member/sponsorship/financial foreign-key callbacks including budget/expense/forecast', () => {
    expect(fkByColumn(schema.memberActivities, 'member_email')?.reference().foreignColumns[0]).toBe(schema.members.email);
    expect(fkByColumn(schema.memberSubscriptions, 'member_email')?.reference().foreignColumns[0]).toBe(schema.members.email);
    expect(fkByColumn(schema.memberTagAssignments, 'member_email')?.reference().foreignColumns[0]).toBe(schema.members.email);
    expect(fkByColumn(schema.memberTagAssignments, 'tag_id')?.reference().foreignColumns[0]).toBe(schema.memberTags.id);
    expect(fkByColumn(schema.memberTasks, 'member_email')?.reference().foreignColumns[0]).toBe(schema.members.email);
    expect(fkByColumn(schema.memberRelations, 'member_email')?.reference().foreignColumns[0]).toBe(schema.members.email);
    expect(fkByColumn(schema.memberRelations, 'related_member_email')?.reference().foreignColumns[0]).toBe(schema.members.email);
    expect(fkByColumn(schema.eventSponsorships, 'event_id')?.reference().foreignColumns[0]).toBe(schema.events.id);
    expect(fkByColumn(schema.eventSponsorships, 'patron_id')?.reference().foreignColumns[0]).toBe(schema.patrons.id);
    expect(fkByColumn(schema.financialBudgets, 'category')?.reference().foreignColumns[0]).toBe(schema.financialCategories.id);
    expect(fkByColumn(schema.financialExpenses, 'category')?.reference().foreignColumns[0]).toBe(schema.financialCategories.id);
    expect(fkByColumn(schema.financialExpenses, 'budget_id')?.reference().foreignColumns[0]).toBe(schema.financialBudgets.id);
    expect(fkByColumn(schema.financialForecasts, 'category')?.reference().foreignColumns[0]).toBe(schema.financialCategories.id);
  });
});
