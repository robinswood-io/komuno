import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 106', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('covers updatePatronSchema transforms and refine branches for referrerId', () => {
    const blankReferrer = schema.updatePatronSchema.safeParse({
      role: 'Mécène',
      company: 'Acme',
      phone: '0708091011',
      notes: 'Présent au gala',
      referrerId: ' ',
    });

    expect(blankReferrer.success).toBe(true);
    if (blankReferrer.success) {
      expect(blankReferrer.data.referrerId).toBeNull();
    }

    const validReferrer = schema.updatePatronSchema.safeParse({
      referrerId: '55ad4034-d4ef-4829-9668-d2786aa47180',
    });
    expect(validReferrer.success).toBe(true);

    const invalidReferrer = schema.updatePatronSchema.safeParse({
      referrerId: 'not-a-uuid',
    });
    expect(invalidReferrer.success).toBe(false);
  });
});
