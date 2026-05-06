import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 128', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers idea-patron proposal comment transforms for insert and update schemas', () => {
    const insertWithoutComments = schema.insertIdeaPatronProposalSchema.safeParse({
      ideaId: '33333333-3333-4333-8333-333333333333',
      patronId: '44444444-4444-4444-8444-444444444444',
      proposedByAdminEmail: 'admin@example.com',
    });

    expect(insertWithoutComments.success).toBe(true);
    if (insertWithoutComments.success) {
      expect(insertWithoutComments.data.comments).toBeUndefined();
    }

    const insertWithComments = schema.insertIdeaPatronProposalSchema.safeParse({
      ideaId: '33333333-3333-4333-8333-333333333333',
      patronId: '44444444-4444-4444-8444-444444444444',
      proposedByAdminEmail: 'admin@example.com',
      comments: 'Commentaire <initial>',
    });

    expect(insertWithComments.success).toBe(true);
    if (insertWithComments.success) {
      expect(insertWithComments.data.comments).toBe('Commentaire initial');
    }

    const updateWithComments = schema.updateIdeaPatronProposalSchema.safeParse({
      comments: 'Commentaire <mis à jour>',
    });

    expect(updateWithComments.success).toBe(true);
    if (updateWithComments.success) {
      expect(updateWithComments.data.comments).toBe('Commentaire mis à jour');
    }
  });
});
