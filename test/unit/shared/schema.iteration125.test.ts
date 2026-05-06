import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 125', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers insertPatronSchema optional transforms and referrerId normalize/refine branches', () => {
    const blankReferrer = schema.insertPatronSchema.safeParse({
      firstName: 'Nicolas',
      lastName: 'Durand',
      email: 'nicolas.durand@example.com',
      role: 'Dirigeant <CJD>',
      company: 'Société <Alpha>',
      phone: '07<11>22',
      notes: 'Profil <premium>',
      referrerId: '   ',
      createdBy: 'admin@example.com',
    });

    expect(blankReferrer.success).toBe(true);
    if (blankReferrer.success) {
      expect(blankReferrer.data.referrerId).toBeUndefined();
      expect(blankReferrer.data.role).toBe('Dirigeant CJD');
      expect(blankReferrer.data.company).toBe('Société Alpha');
      expect(blankReferrer.data.phone).toBe('071122');
      expect(blankReferrer.data.notes).toBe('Profil premium');
    }

    const validReferrer = schema.insertPatronSchema.safeParse({
      firstName: 'Julie',
      lastName: 'Petit',
      email: 'julie.petit@example.com',
      referrerId: '11111111-1111-4111-8111-111111111111',
    });

    expect(validReferrer.success).toBe(true);

    const invalidReferrer = schema.insertPatronSchema.safeParse({
      firstName: 'Luc',
      lastName: 'Moreau',
      email: 'luc.moreau@example.com',
      referrerId: 'invalid-referrer-id',
    });

    expect(invalidReferrer.success).toBe(false);
  });
});
