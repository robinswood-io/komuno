import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

type ForeignKeyReferenceResult = {
  name?: string;
  columns: Array<{ name: string }>;
  foreignColumns: Array<{ name: string }>;
};

type InlineForeignKey = {
  reference: () => ForeignKeyReferenceResult;
};

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

function extractInlineForeignKeys(table: object): InlineForeignKey[] {
  const symbol = Object.getOwnPropertySymbols(table).find((item) =>
    String(item).includes('PgInlineForeignKeys'),
  );

  if (!symbol) {
    return [];
  }

  const value = (table as Record<symbol, unknown>)[symbol];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is InlineForeignKey =>
      typeof entry === 'object' && entry !== null && 'reference' in entry,
  );
}

describe('shared/schema.js iteration 122', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('executes foreign key reference callbacks on all relation-heavy tables', () => {
    const tables = [
      schema.passwordResetTokens,
      schema.votes,
      schema.inscriptions,
      schema.unsubscriptions,
      schema.patronDonations,
      schema.patronUpdates,
      schema.ideaPatronProposals,
      schema.memberActivities,
      schema.memberSubscriptions,
      schema.memberTagAssignments,
      schema.memberTasks,
      schema.memberRelations,
      schema.eventSponsorships,
      schema.financialBudgets,
      schema.financialExpenses,
      schema.financialForecasts,
    ];

    let callbackExecutions = 0;

    for (const table of tables) {
      const foreignKeys = extractInlineForeignKeys(table);
      for (const foreignKey of foreignKeys) {
        const reference = foreignKey.reference();
        expect(reference.columns.length).toBeGreaterThan(0);
        expect(reference.foreignColumns.length).toBeGreaterThan(0);
        callbackExecutions += 1;
      }
    }

    expect(callbackExecutions).toBeGreaterThan(10);
  });
});
