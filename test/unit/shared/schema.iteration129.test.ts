import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 129', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers sponsorship transforms and confirmedAt normalize branches', () => {
    const withNullConfirm = schema.insertEventSponsorshipSchema.safeParse({
      eventId: '55555555-5555-4555-8555-555555555555',
      patronId: '66666666-6666-4666-8666-666666666666',
      level: 'gold',
      amount: 12000,
      benefits: 'Pack <Gold>',
      logoUrl: 'https://cdn.example.com/logo-gold.png',
      websiteUrl: 'https://gold.example.com',
      proposedByAdminEmail: 'admin@example.com',
      confirmedAt: null,
    });

    expect(withNullConfirm.success).toBe(true);
    if (withNullConfirm.success) {
      expect(withNullConfirm.data.benefits).toBe('Pack Gold');
      expect(withNullConfirm.data.logoUrl).toBe('https://cdn.example.com/logo-gold.png');
      expect(withNullConfirm.data.websiteUrl).toBe('https://gold.example.com');
      expect(withNullConfirm.data.confirmedAt).toBeNull();
    }

    const withStringConfirm = schema.insertEventSponsorshipSchema.safeParse({
      eventId: '77777777-7777-4777-8777-777777777777',
      patronId: '88888888-8888-4888-8888-888888888888',
      level: 'silver',
      amount: 9000,
      proposedByAdminEmail: 'admin@example.com',
      confirmedAt: '2026-05-03T12:00:00.000Z',
    });

    expect(withStringConfirm.success).toBe(true);
    if (withStringConfirm.success) {
      expect(withStringConfirm.data.confirmedAt).toBe('2026-05-03T12:00:00.000Z');
    }

    const updateTransforms = schema.updateEventSponsorshipSchema.safeParse({
      benefits: 'Visibilité <web>',
      logoUrl: 'https://cdn.example.com/logo-updated.png',
      websiteUrl: 'https://updated.example.com',
    });

    expect(updateTransforms.success).toBe(true);
    if (updateTransforms.success) {
      expect(updateTransforms.data.benefits).toBe('Visibilité web');
      expect(updateTransforms.data.logoUrl).toBe('https://cdn.example.com/logo-updated.png');
      expect(updateTransforms.data.websiteUrl).toBe('https://updated.example.com');
    }
  });
});
