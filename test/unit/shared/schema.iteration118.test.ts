import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 118', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers updatePatronSchema optional field transforms and referrerId null normalization', () => {
    const result = schema.updatePatronSchema.safeParse({
      role: 'Mécène <VIP>',
      company: 'Société <Alpha>',
      phone: '06<33>44',
      notes: 'Notes <confidentielles>',
      referrerId: ' ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('Mécène VIP');
      expect(result.data.company).toBe('Société Alpha');
      expect(result.data.phone).toBe('063344');
      expect(result.data.notes).toBe('Notes confidentielles');
      expect(result.data.referrerId).toBeNull();
    }
  });
});
