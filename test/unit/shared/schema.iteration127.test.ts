import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 127', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers updatePatronUpdateSchema regex and sanitize transforms', () => {
    const valid = schema.updatePatronUpdateSchema.safeParse({
      startTime: '09:45',
      notes: 'Rappel <important>',
      description: 'Texte <nettoyé>',
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.startTime).toBe('09:45');
      expect(valid.data.notes).toBe('Rappel important');
      expect(valid.data.description).toBe('Texte nettoyé');
    }

    const invalid = schema.updatePatronUpdateSchema.safeParse({
      startTime: '24:70',
    });

    expect(invalid.success).toBe(false);
  });
});
