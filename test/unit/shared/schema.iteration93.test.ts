import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 93', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes optional patron fields to undefined/null-like values when empty', () => {
    const result = schema.insertPatronSchema.safeParse({
      firstName: 'Marie',
      lastName: 'Durand',
      email: 'marie.durand@example.com',
      role: '',
      company: '',
      phone: '',
      notes: '',
      referrerId: '   ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBeUndefined();
      expect(result.data.company).toBeUndefined();
      expect(result.data.phone).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
      expect(result.data.referrerId).toBeUndefined();
    }
  });
});
