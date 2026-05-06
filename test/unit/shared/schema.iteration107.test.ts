import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 107', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('covers donation/patron-update/proposal transforms around lines 980-1116', () => {
    const donation = schema.insertPatronDonationSchema.safeParse({
      patronId: 'aa88f4e4-9b9f-4ef9-bf1d-75f1f38dfdc4',
      donatedAt: '2026-05-01',
      amount: 1000,
      occasion: 'Gala',
      recordedBy: 'finance@example.com',
    });
    expect(donation.success).toBe(true);
    if (donation.success) {
      expect(donation.data.donatedAt.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    }

    const patronUpdate = schema.insertPatronUpdateSchema.safeParse({
      patronId: 'cd7539fd-fad9-4634-9b70-1e63f2361cfc',
      type: 'email',
      subject: 'Compte-rendu',
      date: '2026-05-02',
      startTime: '14:30',
      description: 'Compte-rendu envoyé',
      notes: 'Relance dans 2 semaines',
      createdBy: 'admin@example.com',
    });
    expect(patronUpdate.success).toBe(true);

    const updatePatch = schema.updatePatronUpdateSchema.safeParse({
      startTime: '08:15',
      notes: 'Note interne',
    });
    expect(updatePatch.success).toBe(true);

    const proposal = schema.insertIdeaPatronProposalSchema.safeParse({
      ideaId: '0ec78331-e3c2-4da0-a1e2-9d79d2c96f28',
      patronId: '63d3d1af-42f8-4bf5-bec9-7ef0f7c6f998',
      proposedByAdminEmail: 'admin@example.com',
      comments: 'À contacter en priorité',
    });
    expect(proposal.success).toBe(true);

    const proposalPatch = schema.updateIdeaPatronProposalSchema.safeParse({
      comments: 'Contact initial effectué',
    });
    expect(proposalPatch.success).toBe(true);
  });
});
