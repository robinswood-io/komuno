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

describe('shared/schema.js iteration 75 - stubborn proofs + useful behavior', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves line 1538 callback uses current financialCategories.id on each reference() call', () => {
    const tableConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = tableConfig.foreignKeys[0];
    const originalId = schema.financialCategories.id;

    expect(tableConfig.foreignKeys).toHaveLength(1);

    const sentinelA = { name: 'iteration75-id-a' } as unknown as typeof originalId;
    const sentinelB = { name: 'iteration75-id-b' } as unknown as typeof originalId;

    schema.financialCategories.id = sentinelA;
    const refA = foreignKey?.reference();
    schema.financialCategories.id = sentinelB;
    const refB = foreignKey?.reference();
    schema.financialCategories.id = originalId;
    const refOriginal = foreignKey?.reference();

    expect(refA?.foreignColumns[0]).toBe(sentinelA);
    expect(refB?.foreignColumns[0]).toBe(sentinelB);
    expect(refOriginal?.foreignColumns[0]).toBe(originalId);
    expect(refA?.columns[0]?.name).toBe('category');
  });

  it('proves lines 1600-1605 through JSON.parse success and catch branches', () => {
    const nativeParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration75-force-catch') {
        throw new Error('iteration75 forced catch');
      }
      return nativeParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration75-valid',
      config: '{"theme":"iteration75"}',
    });
    const forced = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration75-forced',
      config: 'iteration75-force-catch',
    });
    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration75-malformed',
      config: '{"theme":}',
    });

    expect(valid.success).toBe(true);
    expect(forced.success).toBe(false);
    expect(malformed.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledWith('{"theme":"iteration75"}');
    expect(parseSpy).toHaveBeenCalledWith('iteration75-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"theme":}');
  });

  it('adds useful behavior: idea-patron proposal defaults status and enforces comments max length', () => {
    const valid = schema.insertIdeaPatronProposalSchema.safeParse({
      ideaId: '3b241101-e2bb-4255-8caf-4136c566a962',
      patronId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      proposedByAdminEmail: 'admin@example.com',
    });

    const invalidComments = schema.insertIdeaPatronProposalSchema.safeParse({
      ideaId: '3b241101-e2bb-4255-8caf-4136c566a962',
      patronId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      proposedByAdminEmail: 'admin@example.com',
      comments: 'x'.repeat(1001),
    });

    expect(valid.success).toBe(true);
    expect(invalidComments.success).toBe(false);

    if (valid.success) {
      expect(valid.data.status).toBe('proposed');
    }
  });
});
