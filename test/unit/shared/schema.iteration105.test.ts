import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 105', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('covers insertPatronSchema referrerId transform branches: blank to undefined and invalid format rejection', () => {
    const blankReferrer = schema.insertPatronSchema.safeParse({
      firstName: 'Nina',
      lastName: 'Durand',
      email: 'nina.durand@example.com',
      referrerId: '   ',
    });

    expect(blankReferrer.success).toBe(true);
    if (blankReferrer.success) {
      expect(blankReferrer.data.referrerId).toBeUndefined();
    }

    const invalidReferrer = schema.insertPatronSchema.safeParse({
      firstName: 'Nina',
      lastName: 'Durand',
      email: 'nina.durand@example.com',
      referrerId: 'invalid-referrer',
    });

    expect(invalidReferrer.success).toBe(false);
    if (!invalidReferrer.success) {
      expect(invalidReferrer.error.issues.some((issue) => issue.message.includes("n'est pas valide"))).toBe(true);
    }
  });
});
