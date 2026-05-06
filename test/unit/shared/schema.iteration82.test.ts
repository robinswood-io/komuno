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

describe('shared/schema.js iteration 82', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps financialForecasts.category foreign key linked to financialCategories.id (line 1538)', () => {
    const fk = getTableConfig(schema.financialForecasts).foreignKeys[0];
    expect(fk).toBeDefined();
    const ref = fk?.reference();
    expect(ref?.columns[0]?.name).toBe('category');
    expect(ref?.foreignColumns[0]).toBe(schema.financialCategories.id);
  });
});
