import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 141', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers branding config refine branches for valid and invalid JSON payloads', () => {
    const valid = schema.insertBrandingConfigSchema.safeParse({
      key: 'homepage-layout',
      config: JSON.stringify({ theme: 'light', sections: ['hero', 'cta'] }),
    });

    expect(valid.success).toBe(true);

    const invalid = schema.insertBrandingConfigSchema.safeParse({
      key: 'broken-layout',
      config: '{invalid-json',
    });

    expect(invalid.success).toBe(false);
  });
});
