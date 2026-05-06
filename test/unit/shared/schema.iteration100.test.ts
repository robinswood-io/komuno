import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 100', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses updateEventSponsorshipSchema URL and benefits transform paths', () => {
    const result = schema.updateEventSponsorshipSchema.safeParse({
      level: 'partner',
      amount: 50000,
      benefits: 'Logo sur supports',
      isPubliclyVisible: true,
      status: 'confirmed',
      logoUrl: 'https://cdn.example.com/logo.png',
      websiteUrl: 'https://partner.example.com',
      confirmedAt: '2026-05-02T10:15:00.000Z',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.benefits).toBe('Logo sur supports');
      expect(result.data.logoUrl).toBe('https://cdn.example.com/logo.png');
      expect(result.data.websiteUrl).toBe('https://partner.example.com');
    }
  });
});
