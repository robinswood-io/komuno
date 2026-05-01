import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 14 - remaining exports/relations/schemas coverage', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers legacy vote-id branch and malformed vote-id branch', () => {
    const legacyVote = schema.insertVoteSchema.parse({
      ideaId: 'ABCDEFGHIJKLMNOPQRST',
      voterName: '  <Louis Martin>  ',
      voterEmail: 'louis@example.org',
    });

    expect(legacyVote.ideaId).toBe('ABCDEFGHIJKLMNOPQRST');
    expect(legacyVote.voterName).toBe('Louis Martin');

    const invalidVote = schema.insertVoteSchema.safeParse({
      ideaId: 'legacy-id-too-short',
      voterName: 'Louis',
      voterEmail: 'louis@example.org',
    });

    expect(invalidVote.success).toBe(false);
  });

  it('covers event-link refinements and event+inscriptions default branch', () => {
    const invalidHelloAssoDomain = schema.insertEventSchema.safeParse({
      title: 'Atelier partenariat',
      description: 'Session de travail',
      date: '2033-09-10T09:00:00.000Z',
      helloAssoLink: 'https://example.org/not-helloasso',
    });
    expect(invalidHelloAssoDomain.success).toBe(false);

    const invalidHelloAssoUrl = schema.insertEventSchema.safeParse({
      title: 'Atelier partenariat',
      description: 'Session de travail',
      date: '2033-09-10T09:00:00.000Z',
      helloAssoLink: 'helloasso.com/evenement',
    });
    expect(invalidHelloAssoUrl.success).toBe(false);

    const invalidRedirectUrl = schema.insertEventSchema.safeParse({
      title: 'Atelier partenariat',
      description: 'Session de travail',
      date: '2033-09-10T09:00:00.000Z',
      enableExternalRedirect: true,
      externalRedirectUrl: 'redirect-local',
    });
    expect(invalidRedirectUrl.success).toBe(false);

    const eventWithDefaults = schema.createEventWithInscriptionsSchema.parse({
      event: {
        title: 'Grand rendez-vous',
        description: 'Présentation annuelle',
        date: '2033-10-01T17:30:00.000Z',
      },
    });

    expect(eventWithDefaults.initialInscriptions).toEqual([]);
  });

  it('covers patron/development schema edge branches', () => {
    const invalidReferrer = schema.updatePatronSchema.safeParse({
      referrerId: 'not-a-uuid',
    });
    expect(invalidReferrer.success).toBe(false);

    const updateRequest = schema.updateDevelopmentRequestSchema.parse({
      status: 'in_progress',
      githubStatus: 'open',
      githubIssueNumber: 42,
      githubIssueUrl: 'https://github.com/org/repo/issues/42',
      lastSyncedAt: new Date('2033-01-01T00:00:00.000Z'),
    });

    expect(updateRequest.githubIssueNumber).toBe(42);

    const invalidIssueNumber = schema.updateDevelopmentRequestSchema.safeParse({
      githubIssueNumber: 0,
    });
    expect(invalidIssueNumber.success).toBe(false);

    const statusUpdate = schema.updateDevelopmentRequestStatusSchema.parse({
      status: 'closed',
      adminComment: ' <Clôture validée> ',
      lastStatusChangeBy: 'admin@example.org',
    });
    expect(statusUpdate.adminComment).toBe('Clôture validée');

    const invalidStatusUpdate = schema.updateDevelopmentRequestStatusSchema.safeParse({
      status: 'open',
      lastStatusChangeBy: 'invalid-email',
    });
    expect(invalidStatusUpdate.success).toBe(false);
  });

  it('covers remaining branding/financial/status/frontend schema branches', () => {
    const invalidBranding = schema.insertBrandingConfigSchema.safeParse({
      key: 'theme',
      config: '{invalid-json',
    });
    expect(invalidBranding.success).toBe(false);

    const emailConfig = schema.insertEmailConfigSchema.parse({
      host: 'smtp.example.org',
      port: 2525,
      secure: false,
      fromEmail: 'noreply@example.org',
    });
    expect(emailConfig.provider).toBe('smtp');

    const invalidFeature = schema.insertFeatureConfigSchema.safeParse({
      featureKey: 'x'.repeat(51),
    });
    expect(invalidFeature.success).toBe(false);

    const category = schema.insertFinancialCategorySchema.parse({
      name: 'Partenariats',
      type: 'income',
    });
    expect(category.isActive).toBe(true);

    const invalidBudgetPatch = schema.updateFinancialBudgetSchema.safeParse({
      quarter: 5,
    });
    expect(invalidBudgetPatch.success).toBe(false);

    const invalidExpense = schema.insertFinancialExpenseSchema.safeParse({
      category: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Facture prestataire',
      amountInCents: 5000,
      expenseDate: '2033-11-15',
      budgetId: 'not-a-uuid',
      createdBy: 'finance@example.org',
    });
    expect(invalidExpense.success).toBe(false);

    const expensePatch = schema.updateFinancialExpenseSchema.parse({
      vendor: null,
    });
    expect(expensePatch.vendor).toBeNull();

    const forecast = schema.insertFinancialForecastSchema.parse({
      category: '550e8400-e29b-41d4-a716-446655440000',
      period: 'year',
      year: 2034,
      forecastedAmountInCents: 900000,
      confidence: 'low',
      basedOn: 'historical',
      createdBy: 'finance@example.org',
    });
    expect(forecast.confidence).toBe('low');
    expect(forecast.basedOn).toBe('historical');

    const statusCheck = schema.statusCheckSchema.parse({
      name: 'database',
      status: 'warning',
      message: 'Latency élevée',
      responseTime: 321,
      details: { pool: 'saturating' },
    });
    expect(statusCheck.status).toBe('warning');

    const invalidStatusResponse = schema.statusResponseSchema.safeParse({
      timestamp: '2034-01-01T12:00:00.000Z',
      uptime: 1234,
      environment: 'test',
      overallStatus: 'degraded',
      checks: {},
    });
    expect(invalidStatusResponse.success).toBe(false);

    const invalidFrontendError = schema.frontendErrorSchema.safeParse({
      message: 'Unhandled error',
      url: 'invalid-url',
      userAgent: 'Mozilla/5.0',
      timestamp: '2034-01-01',
    });
    expect(invalidFrontendError.success).toBe(false);
  });
});
