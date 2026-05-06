import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 94', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid patron referrerId and keeps refine message branch', () => {
    const result = schema.insertPatronSchema.safeParse({
      firstName: 'Lina',
      lastName: 'Martin',
      email: 'lina.martin@example.com',
      createdBy: 'admin@example.com',
      referrerId: 'invalid-referrer-id',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes("n'est pas valide"))).toBe(true);
    }
  });
});
