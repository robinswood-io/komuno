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

describe('shared/schema.js iteration 83', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-evaluates foreign reference callback after financialCategories.id temporary swap (line 1538)', () => {
    const fk = getTableConfig(schema.financialForecasts).foreignKeys[0];
    const originalId = schema.financialCategories.id;
    const sentinel = { tag: 'iteration83' } as unknown as typeof originalId;

    schema.financialCategories.id = sentinel;
    const swappedRef = fk?.reference();
    schema.financialCategories.id = originalId;
    const restoredRef = fk?.reference();

    expect(swappedRef?.foreignColumns[0]).toBe(sentinel);
    expect(restoredRef?.foreignColumns[0]).toBe(originalId);
  });
});
