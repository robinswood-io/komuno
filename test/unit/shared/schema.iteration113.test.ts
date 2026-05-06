import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 113', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers initialInscription optional transform branches for undefined and sanitized values', () => {
    const withUndefinedOptionals = schema.initialInscriptionSchema.safeParse({
      name: 'Alice Martin',
      email: 'alice@example.com',
    });

    expect(withUndefinedOptionals.success).toBe(true);
    if (withUndefinedOptionals.success) {
      expect(withUndefinedOptionals.data.phone).toBeUndefined();
      expect(withUndefinedOptionals.data.comments).toBeUndefined();
    }

    const withFilledOptionals = schema.initialInscriptionSchema.safeParse({
      name: 'Bob Durand',
      email: 'bob@example.com',
      phone: '06<12>34',
      comments: 'Présent <avec> plaisir',
    });

    expect(withFilledOptionals.success).toBe(true);
    if (withFilledOptionals.success) {
      expect(withFilledOptionals.data.phone).toBe('061234');
      expect(withFilledOptionals.data.comments).toBe('Présent avec plaisir');
    }
  });
});
