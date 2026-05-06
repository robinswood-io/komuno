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

describe('shared/schema.js iteration 81 - stubborn proofs + useful behavior', () => {
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

    const sentinelA = { name: 'iteration81-id-a' } as unknown as typeof originalId;
    const sentinelB = { name: 'iteration81-id-b' } as unknown as typeof originalId;

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
      if (text === 'iteration81-force-catch') {
        throw new Error('iteration81 forced catch');
      }
      return nativeParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration81-valid',
      config: '{"theme":"iteration81"}',
    });
    const forced = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration81-forced',
      config: 'iteration81-force-catch',
    });
    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration81-malformed',
      config: '{"theme":}',
    });

    expect(valid.success).toBe(true);
    expect(forced.success).toBe(false);
    expect(malformed.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledWith('{"theme":"iteration81"}');
    expect(parseSpy).toHaveBeenCalledWith('iteration81-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"theme":}');
  });

  it('adds useful behavior: createEventWithInscriptionsSchema defaults initialInscriptions to empty array', () => {
    const validDefault = schema.createEventWithInscriptionsSchema.safeParse({
      event: {
        title: 'Rencontre partenaires',
        date: '2026-05-02T18:00:00.000Z',
      },
    });

    const invalidInscription = schema.createEventWithInscriptionsSchema.safeParse({
      event: {
        title: 'Rencontre partenaires',
        date: '2026-05-02T18:00:00.000Z',
      },
      initialInscriptions: [
        {
          name: 'A',
          email: 'invalid-email',
        },
      ],
    });

    expect(validDefault.success).toBe(true);
    expect(invalidInscription.success).toBe(false);

    if (validDefault.success) {
      expect(validDefault.data.initialInscriptions).toEqual([]);
    }
  });
});
