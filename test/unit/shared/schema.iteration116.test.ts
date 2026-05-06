import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 116', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers updatePatronUpdateSchema transform branches and strict startTime regex', () => {
    const valid = schema.updatePatronUpdateSchema.safeParse({
      startTime: '08:45',
      notes: 'Note <mise à jour>',
      description: 'Description <mise à jour>',
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.startTime).toBe('08:45');
      expect(valid.data.notes).toBe('Note mise à jour');
    }

    const invalidTime = schema.updatePatronUpdateSchema.safeParse({
      startTime: '25:61',
    });

    expect(invalidTime.success).toBe(false);
  });
});
