import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 130', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers member/propose schemas optional transforms and member-activity entityTitle branches', () => {
    const member = schema.insertMemberSchema.safeParse({
      email: 'member130@example.com',
      firstName: 'Camille',
      lastName: 'Roux',
      company: 'Komuno <130>',
      phone: '06<77>88',
      role: 'Membre <actif>',
      notes: 'Très <engagé>',
      proposedBy: 'sponsor130@example.com',
    });

    expect(member.success).toBe(true);

    const proposedMember = schema.proposeMemberSchema.safeParse({
      email: 'prospect130@example.com',
      firstName: 'Olivier',
      lastName: 'Nicolas',
      company: 'Entreprise <beta>',
      phone: '07<01>02',
      role: 'DG <innovation>',
      notes: 'Profil <prometteur>',
      proposedBy: 'admin130@example.com',
    });

    expect(proposedMember.success).toBe(true);

    const activityWithTitle = schema.insertMemberActivitySchema.safeParse({
      memberEmail: 'member130@example.com',
      activityType: 'idea_proposed',
      entityType: 'idea',
      entityTitle: 'Titre <à nettoyer>',
      scoreImpact: 3,
    });

    expect(activityWithTitle.success).toBe(true);
    if (activityWithTitle.success) {
      expect(activityWithTitle.data.entityTitle).toBe('Titre à nettoyer');
    }

    const activityWithoutTitle = schema.insertMemberActivitySchema.safeParse({
      memberEmail: 'member130@example.com',
      activityType: 'event_registered',
      entityType: 'event',
      scoreImpact: 1,
    });

    expect(activityWithoutTitle.success).toBe(true);
    if (activityWithoutTitle.success) {
      expect(activityWithoutTitle.data.entityTitle).toBeUndefined();
    }
  });
});
