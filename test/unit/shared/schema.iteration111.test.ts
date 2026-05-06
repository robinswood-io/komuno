import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 111', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('covers branding JSON refine try/catch and custom error constructors', () => {
    const validBranding = schema.insertBrandingConfigSchema.safeParse({
      key: 'branding-111-valid',
      config: '{"theme":"ocean"}',
    });
    expect(validBranding.success).toBe(true);

    const invalidBranding = schema.insertBrandingConfigSchema.safeParse({
      key: 'branding-111-invalid',
      config: '{invalid-json',
    });
    expect(invalidBranding.success).toBe(false);
    if (!invalidBranding.success) {
      expect(invalidBranding.error.issues[0]?.message).toBe('Config must be valid JSON');
    }

    const validationError = new schema.ValidationError('validation failed');
    const duplicateError = new schema.DuplicateError('duplicate');
    const databaseError = new schema.DatabaseError('db');
    const notFoundError = new schema.NotFoundError('not-found');

    expect(validationError.name).toBe('ValidationError');
    expect(duplicateError.name).toBe('DuplicateError');
    expect(databaseError.name).toBe('DatabaseError');
    expect(notFoundError.name).toBe('NotFoundError');
  });
});
