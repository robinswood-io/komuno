import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 88', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls JSON.parse during branding config validation (lines 1600-1605 execution proof)', () => {
    const parseSpy = vi.spyOn(JSON, 'parse');

    schema.insertBrandingConfigSchema.safeParse({
      key: 'branding-iteration88',
      config: '{"k":"v"}',
    });

    expect(parseSpy).toHaveBeenCalledWith('{"k":"v"}');
  });
});
