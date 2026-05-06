import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 124', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers initialInscription optional transforms for both undefined and truthy values', () => {
    const withoutOptionalFields = schema.initialInscriptionSchema.safeParse({
      name: 'Alice Bernard',
      email: 'alice.bernard@example.com',
    });

    expect(withoutOptionalFields.success).toBe(true);
    if (withoutOptionalFields.success) {
      expect(withoutOptionalFields.data.company).toBeUndefined();
      expect(withoutOptionalFields.data.phone).toBeUndefined();
      expect(withoutOptionalFields.data.comments).toBeUndefined();
    }

    const withOptionalFields = schema.initialInscriptionSchema.safeParse({
      name: 'Paul Martin',
      email: 'paul.martin@example.com',
      company: 'Société <Delta>',
      phone: '06<12>34 56',
      comments: 'Présent <avec> accompagnant',
    });

    expect(withOptionalFields.success).toBe(true);
    if (withOptionalFields.success) {
      expect(withOptionalFields.data.company).toBe('Société Delta');
      expect(withOptionalFields.data.phone).toBe('061234 56');
      expect(withOptionalFields.data.comments).toBe('Présent avec accompagnant');
    }
  });
});
