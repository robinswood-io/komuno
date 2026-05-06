import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 108', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('covers sponsorship transforms and confirmedAt nullable branch', () => {
    const insertResult = schema.insertEventSponsorshipSchema.safeParse({
      eventId: '7a35f6eb-ec97-4ccb-a1db-32c2e8f2890e',
      patronId: 'ec4c6a12-e6c1-4e94-a1e1-01b1be8dc321',
      level: 'silver',
      amount: 35000,
      benefits: 'Logo sur roll-up',
      logoUrl: 'https://cdn.example.com/logo-silver.png',
      websiteUrl: 'https://partner-silver.example.com',
      proposedByAdminEmail: 'events@example.com',
      confirmedAt: null,
    });

    expect(insertResult.success).toBe(true);
    if (insertResult.success) {
      expect(insertResult.data.benefits).toBe('Logo sur roll-up');
      expect(insertResult.data.logoUrl).toBe('https://cdn.example.com/logo-silver.png');
      expect(insertResult.data.websiteUrl).toBe('https://partner-silver.example.com');
      expect(insertResult.data.confirmedAt).toBeNull();
    }

    const updateResult = schema.updateEventSponsorshipSchema.safeParse({
      benefits: 'Mise à jour des contreparties',
      logoUrl: 'https://cdn.example.com/logo-updated.png',
      websiteUrl: 'https://updated-partner.example.com',
      confirmedAt: '2026-05-02T12:00:00.000Z',
    });

    expect(updateResult.success).toBe(true);
  });
});
