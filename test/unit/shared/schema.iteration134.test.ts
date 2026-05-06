import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 134', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers insertUnsubscriptionSchema comments optional transform branches', () => {
    const withoutComment = schema.insertUnsubscriptionSchema.safeParse({
      eventId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      name: 'Paul Henry',
      email: 'paul.henry@example.com',
    });

    expect(withoutComment.success).toBe(true);
    if (withoutComment.success) {
      expect(withoutComment.data.comments).toBeUndefined();
    }

    const withComment = schema.insertUnsubscriptionSchema.safeParse({
      eventId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      name: 'Nina Leroy',
      email: 'nina.leroy@example.com',
      comments: 'Absent <déplacement pro>',
    });

    expect(withComment.success).toBe(true);
    if (withComment.success) {
      expect(withComment.data.comments).toBe('Absent déplacement pro');
    }
  });
});
