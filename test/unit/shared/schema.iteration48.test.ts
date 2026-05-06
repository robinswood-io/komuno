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

describe('shared/schema.js iteration 48 - stubborn lines and category schema behavior', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('proves line 1538 callback reads latest category id when FK reference() is called', () => {
    const tableConfig = getTableConfig(schema.financialForecasts);
    const foreignKey = tableConfig.foreignKeys[0];
    const originalId = schema.financialCategories.id;

    expect(tableConfig.foreignKeys).toHaveLength(1);

    const replacements = [
      { name: 'iteration48-id-a' } as unknown as typeof originalId,
      { name: 'iteration48-id-b' } as unknown as typeof originalId,
      originalId,
    ];

    let index = 0;
    const enumerable = Object.prototype.propertyIsEnumerable.call(schema.financialCategories, 'id');
    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      get() {
        const value = replacements[index] ?? originalId;
        index += 1;
        return value;
      },
    });

    const first = foreignKey?.reference();
    const second = foreignKey?.reference();
    const third = foreignKey?.reference();

    expect(first?.foreignColumns[0]?.name).toBe('iteration48-id-a');
    expect(second?.foreignColumns[0]?.name).toBe('iteration48-id-b');
    expect(third?.foreignColumns[0]).toBe(originalId);
    expect(index).toBe(3);

    Object.defineProperty(schema.financialCategories, 'id', {
      configurable: true,
      enumerable,
      writable: true,
      value: originalId,
    });
  });

  it('proves lines 1600-1605 with valid JSON, forced throw, and malformed JSON', () => {
    const nativeParse = JSON.parse;
    const parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text: string) => {
      if (text === 'iteration48-force-catch') {
        throw new Error('iteration48 forced catch');
      }

      return nativeParse(text);
    });

    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration48-valid',
      config: '{"logo":{"mode":"compact"}}',
    });
    const forced = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration48-forced',
      config: 'iteration48-force-catch',
    });
    const malformed = schema.insertBrandingConfigSchema.safeParse({
      key: 'iteration48-malformed',
      config: '{"logo":}',
    });

    expect(valid.success).toBe(true);
    expect(forced.success).toBe(false);
    expect(malformed.success).toBe(false);
    expect(parseSpy).toHaveBeenCalledTimes(3);
  });

  it('adds practical behavior: category schema accepts null parentId and rejects invalid UUID parentId', () => {
    const valid = schema.insertFinancialCategorySchema.safeParse({
      name: 'Services',
      type: 'income',
      parentId: null,
    });
    const invalidParent = schema.insertFinancialCategorySchema.safeParse({
      name: 'Services',
      type: 'income',
      parentId: 'not-a-uuid',
    });

    expect(valid.success).toBe(true);
    expect(invalidParent.success).toBe(false);

    if (valid.success) {
      expect(valid.data.isActive).toBe(true);
    }
  });
});
