import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 117', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers idea-patron proposal comments transform for both undefined and sanitized values', () => {
    const withoutComments = schema.insertIdeaPatronProposalSchema.safeParse({
      ideaId: '11111111-1111-4111-8111-111111111111',
      patronId: '22222222-2222-4222-8222-222222222222',
      proposedByAdminEmail: 'admin@example.com',
      status: 'proposed',
    });

    expect(withoutComments.success).toBe(true);
    if (withoutComments.success) {
      expect(withoutComments.data.comments).toBeUndefined();
    }

    const withComments = schema.insertIdeaPatronProposalSchema.safeParse({
      ideaId: '33333333-3333-4333-8333-333333333333',
      patronId: '44444444-4444-4444-8444-444444444444',
      proposedByAdminEmail: 'admin@example.com',
      comments: 'Commentaire <à nettoyer>',
    });

    expect(withComments.success).toBe(true);
    if (withComments.success) {
      expect(withComments.data.comments).toBe('Commentaire à nettoyer');
    }
  });
});
