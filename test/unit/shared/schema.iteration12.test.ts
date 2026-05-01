import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 12 - top-level export coverage sweep', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    vi.restoreAllMocks();
    schema = loadSchemaModule();
  });

  it('loads the schema module and exposes a broad set of constants, aliases, tables and relations', () => {
    expect(Object.keys(schema).length).toBeGreaterThan(120);

    expect(schema.ADMIN_ROLES.SUPER_ADMIN).toBe('super_admin');
    expect(schema.ADMIN_STATUS.PENDING).toBe('pending');
    expect(schema.IDEA_STATUS.UNDER_REVIEW).toBe('under_review');
    expect(schema.EVENT_STATUS.PUBLISHED).toBe('published');
    expect(schema.LOAN_STATUS.BORROWED).toBe('borrowed');

    expect(schema.CJD_ROLES.PRESIDENT).toBe('president');
    expect(schema.CJD_ROLE_LABELS[schema.CJD_ROLES.TRESORIER]).toBe('Trésorier');

    expect(schema.SPONSORSHIP_LEVEL.GOLD).toBe('gold');
    expect(schema.SPONSORSHIP_LEVEL_LABELS[schema.SPONSORSHIP_LEVEL.PLATINUM]).toBe('Platine');
    expect(schema.SPONSORSHIP_STATUS.CONFIRMED).toBe('confirmed');

    expect(schema.FINANCIAL_PERIOD.YEAR).toBe('year');
    expect(schema.FINANCIAL_CATEGORY_TYPE.EXPENSE).toBe('expense');
    expect(schema.FORECAST_CONFIDENCE.MEDIUM).toBe('medium');
    expect(schema.FORECAST_BASED_ON.HISTORICAL).toBe('historical');

    expect(schema.users).toBe(schema.admins);
    expect(schema.adminUsers).toBe(schema.admins);
    expect(schema.insertUserSchema).toBe(schema.insertAdminSchema);
    expect(schema.eventRegistrations).toBe(schema.inscriptions);
    expect(schema.insertEventRegistrationSchema).toBe(schema.insertInscriptionSchema);

    expect(schema.admins.email).toBeDefined();
    expect(schema.passwordResetTokens.token).toBeDefined();
    expect(schema.ideas.status).toBeDefined();
    expect(schema.votes.ideaId).toBeDefined();
    expect(schema.events.date).toBeDefined();
    expect(schema.loanItems.lenderName).toBeDefined();
    expect(schema.inscriptions.eventId).toBeDefined();
    expect(schema.unsubscriptions.email).toBeDefined();
    expect(schema.pushSubscriptions.endpoint).toBeDefined();
    expect(schema.developmentRequests.githubIssueNumber).toBeDefined();
    expect(schema.patrons.email).toBeDefined();
    expect(schema.patronDonations.amount).toBeDefined();
    expect(schema.patronUpdates.subject).toBeDefined();
    expect(schema.ideaPatronProposals.status).toBeDefined();
    expect(schema.members.email).toBeDefined();
    expect(schema.memberActivities.activityType).toBeDefined();
    expect(schema.memberSubscriptions.amountInCents).toBeDefined();
    expect(schema.memberTags.color).toBeDefined();
    expect(schema.memberTagAssignments.tagId).toBeDefined();
    expect(schema.memberTasks.taskType).toBeDefined();
    expect(schema.memberRelations.relationType).toBeDefined();
    expect(schema.eventSponsorships.level).toBeDefined();
    expect(schema.trackingMetrics.metricType).toBeDefined();
    expect(schema.trackingAlerts.alertType).toBeDefined();
    expect(schema.brandingConfig.config).toBeDefined();
    expect(schema.featureConfig.featureKey).toBeDefined();
    expect(schema.emailConfig.fromEmail).toBeDefined();
    expect(schema.financialCategories.name).toBeDefined();
    expect(schema.financialBudgets.amountInCents).toBeDefined();
    expect(schema.financialExpenses.expenseDate).toBeDefined();
    expect(schema.financialForecasts.forecastedAmountInCents).toBeDefined();

    expect(schema.ideasRelations).toBeDefined();
    expect(schema.votesRelations).toBeDefined();
    expect(schema.eventsRelations).toBeDefined();
    expect(schema.inscriptionsRelations).toBeDefined();
    expect(schema.unsubscriptionsRelations).toBeDefined();
    expect(schema.patronsRelations).toBeDefined();
    expect(schema.patronDonationsRelations).toBeDefined();
    expect(schema.patronUpdatesRelations).toBeDefined();
    expect(schema.ideaPatronProposalsRelations).toBeDefined();
    expect(schema.eventSponsorshipsRelations).toBeDefined();
    expect(schema.membersRelations).toBeDefined();
    expect(schema.memberActivitiesRelations).toBeDefined();
    expect(schema.memberSubscriptionsRelations).toBeDefined();
    expect(schema.financialCategoriesRelations).toBeDefined();
    expect(schema.financialBudgetsRelations).toBeDefined();
    expect(schema.financialExpensesRelations).toBeDefined();
    expect(schema.financialForecastsRelations).toBeDefined();
  });

  it('covers permission helpers with valid and invalid role branches', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(schema.hasPermission('not_a_role', 'ideas.read')).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    expect(schema.hasPermission(schema.ADMIN_ROLES.SUPER_ADMIN, 'unknown.permission')).toBe(true);

    expect(schema.hasPermission(schema.ADMIN_ROLES.IDEAS_READER, 'ideas.read')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.IDEAS_READER, 'ideas.write')).toBe(false);
    expect(schema.hasPermission(schema.ADMIN_ROLES.IDEAS_MANAGER, 'ideas.delete')).toBe(true);

    expect(schema.hasPermission(schema.ADMIN_ROLES.EVENTS_READER, 'events.read')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.EVENTS_READER, 'events.manage')).toBe(false);
    expect(schema.hasPermission(schema.ADMIN_ROLES.EVENTS_MANAGER, 'events.manage')).toBe(true);

    expect(schema.hasPermission(schema.ADMIN_ROLES.EVENTS_MANAGER, 'admin.edit')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.IDEAS_READER, 'admin.manage')).toBe(false);
    expect(schema.hasPermission(schema.ADMIN_ROLES.IDEAS_READER, 'permission.inconnue')).toBe(false);

    expect(schema.getRoleDisplayName(schema.ADMIN_ROLES.SUPER_ADMIN)).toBe('Super Administrateur');
    expect(schema.getRoleDisplayName(schema.ADMIN_ROLES.EVENTS_MANAGER)).toBe('Gestion des événements');
    expect(schema.getRoleDisplayName('x')).toBe('Rôle inconnu');

    expect(schema.getRolePermissions(schema.ADMIN_ROLES.IDEAS_MANAGER)).toContain('Gestion des votes');
    expect(schema.getRolePermissions(schema.ADMIN_ROLES.EVENTS_READER)).toEqual(['Consultation des événements']);
    expect(schema.getRolePermissions('x')).toEqual([]);
  });

  it('instantiates exported custom errors with dedicated names', () => {
    const validationError = new schema.ValidationError('validation failed');
    const duplicateError = new schema.DuplicateError('duplicate');
    const databaseError = new schema.DatabaseError('database');
    const notFoundError = new schema.NotFoundError('not found');

    expect(validationError).toBeInstanceOf(Error);
    expect(validationError.name).toBe('ValidationError');
    expect(duplicateError.name).toBe('DuplicateError');
    expect(databaseError.name).toBe('DatabaseError');
    expect(notFoundError.name).toBe('NotFoundError');
  });

  it('validates key schemas on success paths and transformation paths', () => {
    const admin = schema.insertAdminSchema.parse({
      email: 'admin@example.org',
      firstName: ' <Alice> ',
      lastName: '<Doe>',
      password: 'Aa123456',
      role: schema.ADMIN_ROLES.IDEAS_READER,
      addedBy: 'owner@example.org',
    });

    expect(admin.firstName).toBe('Alice');
    expect(admin.lastName).toBe('Doe');

    const idea = schema.insertIdeaSchema.parse({
      title: '  <Nouveau concept>  ',
      description: '<description>',
      proposedBy: ' <Jean> ',
      proposedByEmail: 'jean@example.org',
      company: ' <Komuno> ',
      phone: ' 0611223344 ',
      deadline: '2030-01-10T12:00:00.000Z',
    });

    expect(idea.title).toBe('Nouveau concept');
    expect(idea.proposedBy).toBe('Jean');
    expect(idea.company).toBe('Komuno');

    const vote = schema.insertVoteSchema.parse({
      ideaId: '550e8400-e29b-41d4-a716-446655440000',
      voterName: '  <Marie> ',
      voterEmail: 'marie@example.org',
    });

    expect(vote.voterName).toBe('Marie');

    const event = schema.insertEventSchema.parse({
      title: 'Plénière CJD',
      description: 'Atelier trimestriel',
      date: '2031-06-01T18:30:00.000Z',
      helloAssoLink: 'https://www.helloasso.com/associations/cjd/evenements/pleniere',
      enableExternalRedirect: true,
      externalRedirectUrl: 'https://example.org/merci',
      buttonMode: 'custom',
      customButtonText: 'Je participe',
      status: 'published',
    });

    expect(event.buttonMode).toBe('custom');
    expect(event.customButtonText).toBe('Je participe');

    const developmentRequest = schema.insertDevelopmentRequestSchema.parse({
      title: '  <Ajouter dashboard sponsors> ',
      description: 'Créer une vue dédiée avec indicateurs et historique des actions. ',
      type: 'feature',
      priority: 'high',
      requestedBy: 'admin@example.org',
      requestedByName: ' <Admin Principal> ',
    });

    expect(developmentRequest.title).toBe('Ajouter dashboard sponsors');
    expect(developmentRequest.requestedByName).toBe('Admin Principal');

    const developmentStatus = schema.updateDevelopmentRequestStatusSchema.parse({
      status: 'in_progress',
      adminComment: ' <Suivi démarré> ',
      lastStatusChangeBy: 'superadmin@example.org',
    });

    expect(developmentStatus.adminComment).toBe('Suivi démarré');

    const branding = schema.insertBrandingConfigSchema.parse({
      key: 'public-theme',
      config: '{"accent":"#0055ff"}',
    });
    expect(branding.key).toBe('public-theme');

    const feature = schema.insertFeatureConfigSchema.parse({
      featureKey: 'events.sponsoring',
    });
    expect(feature.enabled).toBe(true);

    const emailConfig = schema.insertEmailConfigSchema.parse({
      host: 'smtp.example.org',
      port: 465,
      secure: true,
      fromEmail: 'noreply@example.org',
    });
    expect(emailConfig.provider).toBe('smtp');

    const financialCategory = schema.insertFinancialCategorySchema.parse({
      name: 'Cotisations',
      type: 'income',
    });
    expect(financialCategory.type).toBe('income');

    const financialBudget = schema.insertFinancialBudgetSchema.parse({
      name: 'Budget T1',
      category: '550e8400-e29b-41d4-a716-446655440000',
      period: 'quarter',
      year: 2030,
      quarter: 1,
      amountInCents: 300000,
      createdBy: 'finance@example.org',
    });
    expect(financialBudget.period).toBe('quarter');

    const forecast = schema.insertFinancialForecastSchema.parse({
      category: '550e8400-e29b-41d4-a716-446655440000',
      period: 'month',
      year: 2030,
      month: 2,
      forecastedAmountInCents: 120000,
      createdBy: 'finance@example.org',
    });

    expect(forecast.confidence).toBe('medium');
    expect(forecast.basedOn).toBe('estimate');

    const statusCheck = schema.statusCheckSchema.parse({
      name: 'database',
      status: 'healthy',
      message: 'connected',
      responseTime: 42,
      details: {
        host: 'db',
        retries: 1,
      },
    });

    expect(statusCheck.status).toBe('healthy');

    const statusResponse = schema.statusResponseSchema.parse({
      timestamp: '2030-02-01T10:00:00.000Z',
      uptime: 1200,
      environment: 'test',
      overallStatus: 'healthy',
      checks: {
        application: statusCheck,
        database: statusCheck,
      },
    });

    expect(statusResponse.overallStatus).toBe('healthy');
  });

  it('validates key schemas on error paths', () => {
    const invalidInscription = schema.insertInscriptionSchema.safeParse({
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Alice',
      email: 'alice@localhost',
    });
    expect(invalidInscription.success).toBe(false);

    const invalidVote = schema.insertVoteSchema.safeParse({
      ideaId: 'id_invalide',
      voterName: 'Alice',
      voterEmail: 'alice@example.org',
    });
    expect(invalidVote.success).toBe(false);

    const invalidEvent = schema.insertEventSchema.safeParse({
      title: 'Événement test',
      date: '2031-06-01T18:30:00.000Z',
      helloAssoLink: 'https://example.org/pas-helloasso',
    });
    expect(invalidEvent.success).toBe(false);

    const invalidPatron = schema.insertPatronSchema.safeParse({
      firstName: 'Paul',
      lastName: 'Martin',
      email: 'paul@example.org',
      referrerId: 'not-a-uuid',
    });
    expect(invalidPatron.success).toBe(false);

    const invalidBranding = schema.insertBrandingConfigSchema.safeParse({
      key: 'brand',
      config: '{invalid_json}',
    });
    expect(invalidBranding.success).toBe(false);

    const invalidFrontendError = schema.frontendErrorSchema.safeParse({
      message: 'boom',
      url: 'not-an-url',
      userAgent: 'agent',
      timestamp: '2030-01-01T00:00:00.000Z',
    });
    expect(invalidFrontendError.success).toBe(false);
  });
});
