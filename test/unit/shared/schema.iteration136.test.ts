import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 136', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers member task insert/update optional transform branches', () => {
    const insertMinimal = schema.insertMemberTaskSchema.safeParse({
      memberEmail: 'member136@example.com',
      title: 'Relance cotisation',
      taskType: 'email',
      createdBy: 'admin136@example.com',
    });

    expect(insertMinimal.success).toBe(true);

    const insertWithOptionals = schema.insertMemberTaskSchema.safeParse({
      memberEmail: 'member137@example.com',
      title: 'Appeler le partenaire',
      description: 'Préparer <argumentaire>',
      taskType: 'call',
      assignedTo: 'owner.task@example.com',
      createdBy: 'admin137@example.com',
    });

    expect(insertWithOptionals.success).toBe(true);
    if (insertWithOptionals.success) {
      expect(insertWithOptionals.data.description).toBe('Préparer argumentaire');
      expect(insertWithOptionals.data.assignedTo).toBe('owner.task@example.com');
    }

    const updateWithOptionals = schema.updateMemberTaskSchema.safeParse({
      description: 'Compte rendu <mis à jour>',
      assignedTo: 'next.owner@example.com',
      completedBy: 'closer.admin@example.com',
    });

    expect(updateWithOptionals.success).toBe(true);
    if (updateWithOptionals.success) {
      expect(updateWithOptionals.data.description).toBe('Compte rendu mis à jour');
      expect(updateWithOptionals.data.assignedTo).toBe('next.owner@example.com');
      expect(updateWithOptionals.data.completedBy).toBe('closer.admin@example.com');
    }
  });
});
