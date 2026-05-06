import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 135', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers member tag schemas optional transform branches', () => {
    const tag = schema.insertMemberTagSchema.safeParse({
      name: 'Finance <VIP>',
      description: 'Groupe <prioritaire>',
    });

    expect(tag.success).toBe(true);
    if (tag.success) {
      expect(tag.data.name).toBe('Finance VIP');
      expect(tag.data.description).toBe('Groupe prioritaire');
    }

    const updateNoDesc = schema.updateMemberTagSchema.safeParse({
      name: 'Comité <IA>',
    });

    expect(updateNoDesc.success).toBe(true);

    const assign = schema.assignMemberTagSchema.safeParse({
      memberEmail: 'member135@example.com',
      tagId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      assignedBy: 'supervisor.test@example.com',
    });

    expect(assign.success).toBe(true);
    if (assign.success) {
      expect(assign.data.assignedBy).toBe('supervisor.test@example.com');
    }
  });
});
