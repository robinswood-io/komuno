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

describe('shared/schema.js iteration 61 - stubborn line proofs + useful behavior', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves line 1538 callback tracks current financialCategories.id across reference() calls', () => {
    const tableConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = tableConfig.foreignKeys[0];
    const originalId = schema.financialCategories.id;

    expect(tableConfig.foreignKeys).toHaveLength(1);

    const sentinelA = { name: 'iteration61-id-a' } as unknown as typeof originalId;
    const sentinelB = { name: 'iteration61-id-b' } as unknown as typeof originalId;

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

  it('proves lines 1600-1605 by executing JSON.parse success and catch branches', () => {
    const nativeParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration61-force-catch') {
        throw new Error('iteration61 forced catch');
      }

      return nativeParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration61-valid',
      config: '{"theme":"iteration61"}',
    });

    const forced = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration61-forced',
      config: 'iteration61-force-catch',
    });

    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration61-malformed',
      config: '{"theme":}',
    });

    expect(valid.success).toBe(true);
    expect(forced.success).toBe(false);
    expect(malformed.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledWith('{"theme":"iteration61"}');
    expect(parseSpy).toHaveBeenCalledWith('iteration61-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"theme":}');
  });

  it('adds useful behavior: email schema requires secure boolean and valid fromEmail format', () => {
    const valid = schema.insertEmailConfigSchema.safeParse({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      fromEmail: 'team@example.com',
      provider: 'gmail',
    });

    const missingSecure = schema.insertEmailConfigSchema.safeParse({
      host: 'smtp.example.com',
      port: 587,
      fromEmail: 'team@example.com',
    });

    const invalidEmail = schema.insertEmailConfigSchema.safeParse({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      fromEmail: 'team-at-example.com',
    });

    expect(valid.success).toBe(true);
    expect(missingSecure.success).toBe(false);
    expect(invalidEmail.success).toBe(false);
  });
});
