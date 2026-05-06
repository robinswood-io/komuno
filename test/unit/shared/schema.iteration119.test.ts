import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 119', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers updateIdeaPatronProposalSchema comments transform and default status parsing', () => {
    const proposalUpdate = schema.updateIdeaPatronProposalSchema.safeParse({
      status: 'contacted',
      comments: 'Suivi <effectué>',
    });

    expect(proposalUpdate.success).toBe(true);
    if (proposalUpdate.success) {
      expect(proposalUpdate.data.comments).toBe('Suivi effectué');
    }

    const sponsorshipDefault = schema.insertEventSponsorshipSchema.safeParse({
      eventId: '55555555-5555-4555-8555-555555555555',
      patronId: '66666666-6666-4666-8666-666666666666',
      level: 'gold',
      amount: 10000,
      proposedByAdminEmail: 'events-admin@example.com',
    });

    expect(sponsorshipDefault.success).toBe(true);
    if (sponsorshipDefault.success) {
      expect(sponsorshipDefault.data.status).toBe('proposed');
      expect(sponsorshipDefault.data.isPubliclyVisible).toBe(true);
      expect(sponsorshipDefault.data.confirmedAt).toBeNull();
    }
  });
});
