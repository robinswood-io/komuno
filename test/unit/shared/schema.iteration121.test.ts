import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 121', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers member/propose-member optional transforms and member-activity entityTitle undefined branch', () => {
    const member = schema.insertMemberSchema.safeParse({
      email: 'member121@example.com',
      firstName: 'Nora',
      lastName: 'Bernard',
      company: 'Company <121>',
      phone: '06<55>66',
      role: 'Role <121>',
      notes: 'Note <121>',
      proposedBy: 'proposer121@example.com',
    });

    expect(member.success).toBe(true);
    if (member.success) {
      expect(member.data.company).toBe('Company 121');
      expect(member.data.phone).toBe('065566');
      expect(member.data.role).toBe('Role 121');
      expect(member.data.notes).toBe('Note 121');
    }

    const proposedMember = schema.proposeMemberSchema.safeParse({
      email: 'proposed121@example.com',
      firstName: 'Lina',
      lastName: 'Robert',
      company: 'Entreprise <Proposée>',
      phone: '07<77>88',
      role: 'DG <Projet>',
      notes: 'Profil <intéressant>',
      proposedBy: 'admin121@example.com',
    });

    expect(proposedMember.success).toBe(true);
    if (proposedMember.success) {
      expect(proposedMember.data.company).toBe('Entreprise Proposée');
      expect(proposedMember.data.role).toBe('DG Projet');
      expect(proposedMember.data.notes).toBe('Profil intéressant');
    }

    const activityWithoutTitle = schema.insertMemberActivitySchema.safeParse({
      memberEmail: 'member121@example.com',
      activityType: 'event_registered',
      entityType: 'event',
      scoreImpact: 2,
    });

    expect(activityWithoutTitle.success).toBe(true);
    if (activityWithoutTitle.success) {
      expect(activityWithoutTitle.data.entityTitle).toBeUndefined();
    }
  });
});
