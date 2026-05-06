import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 123', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers insertEventSchema optional branch paths for url and custom text transforms', () => {
    const minimal = schema.insertEventSchema.safeParse({
      title: 'Plénière de Mai',
      date: '2026-05-03T10:00:00.000Z',
      maxParticipants: 120,
    });

    expect(minimal.success).toBe(true);

    const withUrls = schema.insertEventSchema.safeParse({
      title: 'Atelier mécénat',
      description: 'Description <avec balises>',
      date: '2026-05-03T14:30:00.000Z',
      helloAssoLink: 'https://www.helloasso.com/associations/cjd/evenements/atelier',
      externalRedirectUrl: 'https://komuno.example.com/redirect',
      customButtonText: 'Je participe <maintenant>',
      location: 'Salle <A>',
    });

    expect(withUrls.success).toBe(true);
    if (withUrls.success) {
      expect(withUrls.data.description).toBe('Description avec balises');
      expect(withUrls.data.location).toBe('Salle A');
      expect(withUrls.data.customButtonText).toBe('Je participe maintenant');
    }
  });
});
