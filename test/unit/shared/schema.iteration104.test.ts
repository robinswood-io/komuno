import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 104', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses insertPatronSchema with non-empty optional fields and valid referrerId', () => {
    const result = schema.insertPatronSchema.safeParse({
      firstName: 'Claire',
      lastName: 'Roche',
      role: 'Présidente',
      company: 'Komuno',
      phone: '0601020304',
      email: 'claire.roche@example.com',
      notes: 'Partenaire annuel',
      referrerId: '8d728e47-0a37-4d68-b296-d369844b1234',
      createdBy: 'admin@example.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('Présidente');
      expect(result.data.company).toBe('Komuno');
      expect(result.data.phone).toBe('0601020304');
      expect(result.data.notes).toBe('Partenaire annuel');
      expect(result.data.referrerId).toBe('8d728e47-0a37-4d68-b296-d369844b1234');
      expect(result.data.createdBy).toBe('admin@example.com');
    }
  });
});
