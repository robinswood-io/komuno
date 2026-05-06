import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 91', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts branding config with optional createdAt and valid JSON (lines 1600-1603)', () => {
    const result = schema.insertBrandingConfigSchema.safeParse({
      key: 'branding-iteration91',
      config: '{"theme":"classic"}',
      createdAt: new Date('2026-05-02T00:00:00.000Z'),
    });

    expect(result.success).toBe(true);
  });
});
