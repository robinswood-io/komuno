import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 98', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes updatePatronSchema referrerId empty string to null', () => {
    const result = schema.updatePatronSchema.safeParse({
      role: 'Directeur',
      company: 'Acme Corp',
      phone: '0601020304',
      email: 'patron@example.com',
      notes: 'Relation historique',
      referrerId: '   ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.referrerId).toBeNull();
      expect(result.data.role).toBe('Directeur');
      expect(result.data.company).toBe('Acme Corp');
    }
  });
});
