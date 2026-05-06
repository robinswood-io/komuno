import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 133', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers insertInscriptionSchema optional transforms with empty/filled values', () => {
    const minimal = schema.insertInscriptionSchema.safeParse({
      eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Marie Claire',
      email: 'marie.claire@example.com',
    });

    expect(minimal.success).toBe(true);

    const enriched = schema.insertInscriptionSchema.safeParse({
      eventId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      name: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      company: 'Société <CJD>',
      phone: '06<11>22 33',
      comments: 'Présent <avec invité>',
    });

    expect(enriched.success).toBe(true);
    if (enriched.success) {
      expect(enriched.data.company).toBe('Société CJD');
      expect(enriched.data.phone).toBe('061122 33');
      expect(enriched.data.comments).toBe('Présent avec invité');
    }
  });
});
