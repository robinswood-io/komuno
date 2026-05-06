import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 132', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers insertAdminSchema addedBy transform branches (undefined and sanitized)', () => {
    const withoutAddedBy = schema.insertAdminSchema.safeParse({
      email: 'admin132@example.com',
      firstName: 'Alice',
      lastName: 'Martin',
      password: 'SecurePass1',
    });

    expect(withoutAddedBy.success).toBe(true);
    if (withoutAddedBy.success) {
      expect(withoutAddedBy.data.addedBy).toBeUndefined();
    }

    const withAddedBy = schema.insertAdminSchema.safeParse({
      email: 'admin133@example.com',
      firstName: 'Bob',
      lastName: 'Durand',
      password: 'SecurePass1',
      addedBy: 'manager+admin@example.com',
    });

    expect(withAddedBy.success).toBe(true);
    if (withAddedBy.success) {
      expect(withAddedBy.data.addedBy).toBe('manager+admin@example.com');
    }
  });
});
