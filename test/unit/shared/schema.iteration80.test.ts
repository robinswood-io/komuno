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

describe('shared/schema.js iteration 80 - stubborn proofs + useful behavior', () => {
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

    const sentinelA = { name: 'iteration80-id-a' } as unknown as typeof originalId;
    const sentinelB = { name: 'iteration80-id-b' } as unknown as typeof originalId;

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
      if (text === 'iteration80-force-catch') {
        throw new Error('iteration80 forced catch');
      }
      return nativeParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration80-valid',
      config: '{"theme":"iteration80"}',
    });
    const forced = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration80-forced',
      config: 'iteration80-force-catch',
    });
    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration80-malformed',
      config: '{"theme":}',
    });

    expect(valid.success).toBe(true);
    expect(forced.success).toBe(false);
    expect(malformed.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledWith('{"theme":"iteration80"}');
    expect(parseSpy).toHaveBeenCalledWith('iteration80-force-catch');
    expect(parseSpy).toHaveBeenCalledWith('{"theme":}');
  });

  it('adds useful behavior: member task schema defaults status and validates dueDate datetime', () => {
    const valid = schema.insertMemberTaskSchema.safeParse({
      memberEmail: 'member@example.com',
      title: 'Relancer sponsor',
      taskType: 'call',
      createdBy: 'admin@example.com',
      dueDate: '2026-05-02T12:00:00.000Z',
    });

    const invalidDueDate = schema.insertMemberTaskSchema.safeParse({
      memberEmail: 'member@example.com',
      title: 'Relancer sponsor',
      taskType: 'call',
      createdBy: 'admin@example.com',
      dueDate: '2026-05-02',
    });

    expect(valid.success).toBe(true);
    expect(invalidDueDate.success).toBe(false);

    if (valid.success) {
      expect(valid.data.status).toBe('todo');
    }
  });
});
