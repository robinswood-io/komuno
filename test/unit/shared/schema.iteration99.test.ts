import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 99', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles insertEventSponsorshipSchema confirmedAt null branch and benefits transform', () => {
    const result = schema.insertEventSponsorshipSchema.safeParse({
      eventId: 'f8cd57d7-bfc8-4c66-9c6d-6f2f3b0a011c',
      patronId: 'd2f95e80-0f8f-46d8-81a7-87098cf8fc0a',
      level: 'gold',
      amount: 120000,
      benefits: 'Visibilité scène principale',
      proposedByAdminEmail: 'events-admin@example.com',
      confirmedAt: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.benefits).toBe('Visibilité scène principale');
      expect(result.data.confirmedAt).toBeNull();
    }
  });
});
