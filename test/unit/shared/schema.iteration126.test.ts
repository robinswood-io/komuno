import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 126', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers insertPatronUpdateSchema optional startTime and notes transform branches', () => {
    const withoutOptional = schema.insertPatronUpdateSchema.safeParse({
      patronId: '22222222-2222-4222-8222-222222222222',
      type: 'meeting',
      subject: 'Point de suivi',
      date: '2026-05-03',
      description: 'Compte rendu',
      createdBy: 'admin@example.com',
    });

    expect(withoutOptional.success).toBe(true);
    if (withoutOptional.success) {
      expect(withoutOptional.data.startTime).toBeUndefined();
      expect(withoutOptional.data.notes).toBeUndefined();
    }

    const withOptional = schema.insertPatronUpdateSchema.safeParse({
      patronId: '22222222-2222-4222-8222-222222222222',
      type: 'email',
      subject: 'Relance <mail>',
      date: '2026-05-04',
      startTime: ' 10:15 ',
      description: 'Description <propre>',
      notes: 'Notes <à garder>',
      createdBy: 'admin@example.com',
    });

    expect(withOptional.success).toBe(true);
    if (withOptional.success) {
      expect(withOptional.data.startTime).toBe('10:15');
      expect(withOptional.data.notes).toBe('Notes à garder');
    }
  });
});
