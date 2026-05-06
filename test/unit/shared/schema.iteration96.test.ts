import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 96', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses insertPatronUpdateSchema with optional startTime and notes transforms', () => {
    const result = schema.insertPatronUpdateSchema.safeParse({
      patronId: '7f3e85c6-0281-4377-a3da-04df0b95bc7b',
      type: 'meeting',
      subject: 'Point trimestriel',
      date: '2026-05-02',
      startTime: '09:45',
      duration: 45,
      description: 'Échange sur les objectifs du trimestre.',
      notes: 'Relancer fin de mois',
      createdBy: 'admin@example.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startTime).toBe('09:45');
      expect(result.data.notes).toBe('Relancer fin de mois');
    }
  });
});
