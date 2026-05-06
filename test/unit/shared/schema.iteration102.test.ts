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

function fkByColumn(schema: SchemaModule, table: unknown, columnName: string) {
  return getTableConfig(table as Parameters<typeof getTableConfig>[0])
    .foreignKeys.find((fk) => fk.reference().columns.some((column) => column.name === columnName));
}

describe('shared/schema.js iteration 102', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executes top-level foreign-key callbacks for auth/events/patrons tables', () => {
    expect(fkByColumn(schema, schema.passwordResetTokens, 'email')?.reference().foreignColumns[0]).toBe(schema.admins.email);
    expect(fkByColumn(schema, schema.votes, 'idea_id')?.reference().foreignColumns[0]).toBe(schema.ideas.id);
    expect(fkByColumn(schema, schema.inscriptions, 'event_id')?.reference().foreignColumns[0]).toBe(schema.events.id);
    expect(fkByColumn(schema, schema.unsubscriptions, 'event_id')?.reference().foreignColumns[0]).toBe(schema.events.id);
    expect(fkByColumn(schema, schema.patrons, 'referrer_id')?.reference().foreignColumns[0]).toBe(schema.members.id);
    expect(fkByColumn(schema, schema.patronDonations, 'patron_id')?.reference().foreignColumns[0]).toBe(schema.patrons.id);
    expect(fkByColumn(schema, schema.patronUpdates, 'patron_id')?.reference().foreignColumns[0]).toBe(schema.patrons.id);
    expect(fkByColumn(schema, schema.ideaPatronProposals, 'idea_id')?.reference().foreignColumns[0]).toBe(schema.ideas.id);
    expect(fkByColumn(schema, schema.ideaPatronProposals, 'patron_id')?.reference().foreignColumns[0]).toBe(schema.patrons.id);
  });
});
