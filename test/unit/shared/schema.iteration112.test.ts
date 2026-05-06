import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

type ForeignKeyReferenceResult = {
  columns: unknown[];
  foreignColumns: unknown[];
};

type InlineForeignKey = {
  reference: () => ForeignKeyReferenceResult;
  onDelete?: string;
  onUpdate?: string;
};

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

function isInlineForeignKey(value: unknown): value is InlineForeignKey {
  return typeof value === 'object' && value !== null && 'reference' in value;
}

function extractInlineForeignKeys(table: object): InlineForeignKey[] {
  const fkSymbol = Object.getOwnPropertySymbols(table).find((symbol) =>
    String(symbol).includes('PgInlineForeignKeys'),
  );

  if (!fkSymbol) {
    return [];
  }

  const raw = (table as Record<symbol, unknown>)[fkSymbol];
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(isInlineForeignKey);
}

describe('shared/schema.js iteration 112', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('executes inline foreign key reference callbacks for persistent FK coverage gaps', () => {
    const tablesWithForeignKeys: object[] = [
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

    let executedCallbacks = 0;

    for (const table of tablesWithForeignKeys) {
      const foreignKeys = extractInlineForeignKeys(table);

      for (const foreignKey of foreignKeys) {
        const reference = foreignKey.reference();
        expect(reference.columns.length).toBeGreaterThan(0);
        expect(reference.foreignColumns.length).toBeGreaterThan(0);
        executedCallbacks += 1;
      }
    }

    expect(executedCallbacks).toBeGreaterThanOrEqual(16);
  });
});
