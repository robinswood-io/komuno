import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 115', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers insertPatronUpdateSchema optional transforms (undefined and sanitized paths)', () => {
    const undefinedOptionals = schema.insertPatronUpdateSchema.safeParse({
      patronId: 'b3745f04-5d08-44f6-814c-0f0ec0dc8d85',
      type: 'meeting',
      subject: 'Point mécénat',
      date: '2026-05-02',
      description: 'Description détaillée',
      createdBy: 'admin@example.com',
    });

    expect(undefinedOptionals.success).toBe(true);
    if (undefinedOptionals.success) {
      expect(undefinedOptionals.data.startTime).toBeUndefined();
      expect(undefinedOptionals.data.notes).toBeUndefined();
    }

    const filledOptionals = schema.insertPatronUpdateSchema.safeParse({
      patronId: 'b3745f04-5d08-44f6-814c-0f0ec0dc8d85',
      type: 'email',
      subject: 'Compte-rendu <mail>',
      date: '2026-05-03',
      startTime: '09:30',
      description: 'Description <propre>',
      notes: 'Note <importante>',
      createdBy: 'admin@example.com',
    });

    expect(filledOptionals.success).toBe(true);
    if (filledOptionals.success) {
      expect(filledOptionals.data.startTime).toBe('09:30');
      expect(filledOptionals.data.notes).toBe('Note importante');
    }
  });
});
