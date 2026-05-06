import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 114', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers insertPatronSchema referrerId empty-string normalization and optional transform branches', () => {
    const result = schema.insertPatronSchema.safeParse({
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      role: 'Dirigeant <CJD>',
      company: 'Entreprise <X>',
      phone: '06<11>22',
      notes: 'Suivi <prioritaire>',
      referrerId: '   ',
      createdBy: 'admin.cjd@example.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.referrerId).toBeUndefined();
      expect(result.data.phone).toBe('061122');
      expect(result.data.notes).toBe('Suivi prioritaire');
      expect(result.data.createdBy).toBe('admin.cjd@example.com');
    }
  });
});
