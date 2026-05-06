import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 95', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('transforms donatedAt string into UTC date in insertPatronDonationSchema', () => {
    const result = schema.insertPatronDonationSchema.safeParse({
      patronId: '0f31a9d7-3eb1-4f9f-8742-65d7941fb6af',
      donatedAt: '2026-04-20',
      amount: 4500,
      occasion: 'Dîner annuel',
      recordedBy: 'finance@example.com',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.donatedAt).toBeInstanceOf(Date);
      expect(result.data.donatedAt.toISOString()).toBe('2026-04-20T00:00:00.000Z');
    }
  });
});
