import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 120', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers sponsorship transforms for benefits/logo/website/update branches', () => {
    const insert = schema.insertEventSponsorshipSchema.safeParse({
      eventId: '77777777-7777-4777-8777-777777777777',
      patronId: '88888888-8888-4888-8888-888888888888',
      level: 'silver',
      amount: 25000,
      benefits: 'Visibilité <premium>',
      logoUrl: 'https://cdn.example.com/logo120.png',
      websiteUrl: 'https://partner120.example.com',
      proposedByAdminEmail: 'admin120@example.com',
      confirmedAt: null,
    });

    expect(insert.success).toBe(true);
    if (insert.success) {
      expect(insert.data.benefits).toBe('Visibilité premium');
      expect(insert.data.logoUrl).toBe('https://cdn.example.com/logo120.png');
      expect(insert.data.websiteUrl).toBe('https://partner120.example.com');
      expect(insert.data.confirmedAt).toBeNull();
    }

    const update = schema.updateEventSponsorshipSchema.safeParse({
      benefits: 'Nouveau <pack>',
      logoUrl: 'https://cdn.example.com/logo120-updated.png',
      websiteUrl: 'https://partner120-updated.example.com',
    });

    expect(update.success).toBe(true);
    if (update.success) {
      expect(update.data.benefits).toBe('Nouveau pack');
      expect(update.data.logoUrl).toBe('https://cdn.example.com/logo120-updated.png');
      expect(update.data.websiteUrl).toBe('https://partner120-updated.example.com');
    }
  });
});
