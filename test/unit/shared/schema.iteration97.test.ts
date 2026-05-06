import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 97', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses updatePatronUpdateSchema and keeps transformed optional fields', () => {
    const result = schema.updatePatronUpdateSchema.safeParse({
      type: 'call',
      subject: 'Suivi opérationnel',
      date: '2026-05-01',
      startTime: '10:30',
      duration: 30,
      description: 'Point de suivi hebdomadaire.',
      notes: 'Préparer la prochaine réunion',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startTime).toBe('10:30');
      expect(result.data.notes).toBe('Préparer la prochaine réunion');
    }
  });
});
