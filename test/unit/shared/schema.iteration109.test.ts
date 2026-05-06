import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 109', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('covers member and member-activity optional transforms', () => {
    const member = schema.insertMemberSchema.safeParse({
      email: 'member@example.com',
      firstName: 'Julie',
      lastName: 'Martin',
      company: 'Komuno',
      phone: '0600000000',
      role: 'Membre',
      notes: 'Très active',
      proposedBy: 'proposer@example.com',
    });
    expect(member.success).toBe(true);

    const memberActivity = schema.insertMemberActivitySchema.safeParse({
      memberEmail: 'member@example.com',
      activityType: 'idea_proposed',
      entityType: 'idea',
      entityId: '90c9f18c-e5e4-4f44-b2f4-38ad8cfdc3a2',
      entityTitle: 'Nouvelle initiative',
      metadata: '{"source":"batch109"}',
      scoreImpact: 5,
    });
    expect(memberActivity.success).toBe(true);
    if (memberActivity.success) {
      expect(memberActivity.data.entityTitle).toBe('Nouvelle initiative');
    }
  });
});
