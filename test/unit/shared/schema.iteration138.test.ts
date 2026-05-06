import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 138', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers updateDevelopmentRequestStatusSchema adminComment optional branches', () => {
    const withoutComment = schema.updateDevelopmentRequestStatusSchema.safeParse({
      status: 'in_progress',
      lastStatusChangeBy: 'admin138@example.com',
    });

    expect(withoutComment.success).toBe(true);
    if (withoutComment.success) {
      expect(withoutComment.data.adminComment).toBeUndefined();
    }

    const withComment = schema.updateDevelopmentRequestStatusSchema.safeParse({
      status: 'closed',
      adminComment: 'Terminé <avec succès>',
      lastStatusChangeBy: 'admin139@example.com',
    });

    expect(withComment.success).toBe(true);
    if (withComment.success) {
      expect(withComment.data.adminComment).toBe('Terminé avec succès');
    }
  });
});
