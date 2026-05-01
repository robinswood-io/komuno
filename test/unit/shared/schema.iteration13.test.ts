import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 13 - additional schema and export coverage', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers additional export objects and aliases for top-level lines', () => {
    expect(schema.insertAdminUserSchema).toBe(schema.insertAdminSchema);
    expect(schema.insertEventRegistrationSchema).toBe(schema.insertInscriptionSchema);

    expect(schema.members.cjdRole).toBeDefined();
    expect(schema.memberTasks.completedAt).toBeDefined();
    expect(schema.trackingAlerts.expiresAt).toBeDefined();
    expect(schema.financialBudgets.quarter).toBeDefined();
    expect(schema.financialForecasts.basedOn).toBeDefined();

    expect(schema.updateDevelopmentRequestSchema).toBeDefined();
    expect(schema.insertMemberSubscriptionSchema).toBeDefined();
    expect(schema.updateFinancialCategorySchema).toBeDefined();
    expect(schema.updateFinancialBudgetSchema).toBeDefined();
    expect(schema.updateFinancialExpenseSchema).toBeDefined();
    expect(schema.updateFinancialForecastSchema).toBeDefined();
  });

  it('validates additional admin/idea/event/update schemas success and error paths', () => {
    const adminUpdate = schema.updateAdminSchema.parse({
      role: schema.ADMIN_ROLES.EVENTS_MANAGER,
      isActive: true,
    });
    expect(adminUpdate.role).toBe(schema.ADMIN_ROLES.EVENTS_MANAGER);

    const adminInfo = schema.updateAdminInfoSchema.parse({
      firstName: ' <Camille> ',
      lastName: ' <Durand> ',
    });
    expect(adminInfo.firstName).toBe('Camille');
    expect(adminInfo.lastName).toBe('Durand');

    const passwordOk = schema.updateAdminPasswordSchema.safeParse({
      password: 'Secure123',
    });
    expect(passwordOk.success).toBe(true);

    const passwordKo = schema.updateAdminPasswordSchema.safeParse({
      password: 'lowercase-only',
    });
    expect(passwordKo.success).toBe(false);

    const ideaStatus = schema.updateIdeaStatusSchema.parse({
      status: schema.IDEA_STATUS.POSTPONED,
    });
    expect(ideaStatus.status).toBe('postponed');

    const updateIdea = schema.updateIdeaSchema.parse({
      title: 'Titre corrigé',
      proposedBy: ' <Alice Martin> ',
      proposedByEmail: 'alice@example.org',
      createdAt: '2032-02-01T09:30:00.000Z',
    });
    expect(updateIdea.proposedBy).toBe('Alice Martin');

    const updateEventStatus = schema.updateEventStatusSchema.parse({
      status: schema.EVENT_STATUS.COMPLETED,
    });
    expect(updateEventStatus.status).toBe('completed');

    const updateEvent = schema.updateEventSchema.parse({
      title: 'Nouvelle plénière',
      date: '2032-05-01T19:00:00.000Z',
      status: 'draft',
    });
    expect(updateEvent.status).toBe('draft');
  });

  it('covers loan, patron, sponsorship and member/tracking schemas', () => {
    const loan = schema.insertLoanItemSchema.parse({
      title: ' <Caméra 4K> ',
      description: ' <Équipement en prêt> ',
      lenderName: ' <JD Prêteur> ',
      proposedBy: ' <JD Proposant> ',
      proposedByEmail: 'jd@example.org',
      status: 'available',
    });
    expect(loan.title).toBe('Caméra 4K');

    const loanUpdate = schema.updateLoanItemSchema.parse({
      title: '  Trépied Pro  ',
      description: null,
      photoUrl: null,
    });
    expect(loanUpdate.title).toBe('  Trépied Pro  ');

    const loanStatus = schema.updateLoanItemStatusSchema.parse({
      status: schema.LOAN_STATUS.UNAVAILABLE,
    });
    expect(loanStatus.status).toBe('unavailable');

    const donation = schema.insertPatronDonationSchema.parse({
      patronId: '550e8400-e29b-41d4-a716-446655440000',
      donatedAt: '2030-03-15',
      amount: 25000,
      occasion: ' <Soirée annuelle> ',
      recordedBy: 'admin@example.org',
    });
    expect(donation.donatedAt).toBeInstanceOf(Date);
    expect(donation.occasion).toBe('Soirée annuelle');

    const patronUpdate = schema.insertPatronUpdateSchema.parse({
      patronId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'meeting',
      subject: ' <Rendez-vous trimestriel> ',
      date: '2030-04-10',
      startTime: ' 09:30 ',
      duration: 45,
      description: ' <Échange sur les axes de partenariat> ',
      createdBy: 'admin@example.org',
    });
    expect(patronUpdate.subject).toBe('Rendez-vous trimestriel');
    expect(patronUpdate.startTime).toBe('09:30');

    const patronUpdatePatch = schema.updatePatronUpdateSchema.parse({
      startTime: '14:15',
      notes: ' <Suivi envoyé> ',
    });
    expect(patronUpdatePatch.startTime).toBe('14:15');
    expect(patronUpdatePatch.notes).toBe('Suivi envoyé');

    const invalidPatronUpdatePatch = schema.updatePatronUpdateSchema.safeParse({
      startTime: '24:99',
    });
    expect(invalidPatronUpdatePatch.success).toBe(false);

    const ideaPatron = schema.insertIdeaPatronProposalSchema.parse({
      ideaId: '550e8400-e29b-41d4-a716-446655440000',
      patronId: '550e8400-e29b-41d4-a716-446655440001',
      proposedByAdminEmail: 'admin@example.org',
    });
    expect(ideaPatron.status).toBe('proposed');

    const updatedPatron = schema.updatePatronSchema.parse({
      company: ' <Entreprise X> ',
      referrerId: '   ',
    });
    expect(updatedPatron.company).toBe('Entreprise X');
    expect(updatedPatron.referrerId).toBeNull();

    const ideaPatronPatch = schema.updateIdeaPatronProposalSchema.parse({
      comments: ' <Contact initial réalisé> ',
    });
    expect(ideaPatronPatch.comments).toBe('Contact initial réalisé');

    const sponsorship = schema.insertEventSponsorshipSchema.parse({
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      patronId: '550e8400-e29b-41d4-a716-446655440001',
      level: 'gold',
      amount: 80000,
      proposedByAdminEmail: 'admin@example.org',
      confirmedAt: null,
    });
    expect(sponsorship.isPubliclyVisible).toBe(true);
    expect(sponsorship.status).toBe('proposed');

    const sponsorshipPatch = schema.updateEventSponsorshipSchema.parse({
      logoUrl: 'https://example.org/logo.png',
      websiteUrl: 'https://example.org',
      benefits: ' <Visibilité sur les supports> ',
    });
    expect(sponsorshipPatch.benefits).toBe('Visibilité sur les supports');

    const member = schema.insertMemberSchema.parse({
      email: 'new.member@example.org',
      firstName: ' <Nina> ',
      lastName: ' <Rossi> ',
    });
    expect(member.status).toBe('active');
    expect(member.firstName).toBe('Nina');

    const memberActivity = schema.insertMemberActivitySchema.parse({
      memberEmail: 'new.member@example.org',
      activityType: 'idea_proposed',
      entityType: 'idea',
      entityId: '550e8400-e29b-41d4-a716-446655440000',
      scoreImpact: 3,
    });
    expect(memberActivity.activityType).toBe('idea_proposed');

    const memberPatch = schema.updateMemberSchema.parse({
      notes: ' <Contact à relancer> ',
    });
    expect(memberPatch.notes).toBe('Contact à relancer');

    const proposedMember = schema.proposeMemberSchema.parse({
      email: 'proposition@example.org',
      firstName: 'Laura',
      lastName: 'Meyer',
      proposedBy: 'admin@example.org',
    });
    expect(proposedMember.proposedBy).toBe('admin@example.org');

    const tag = schema.insertMemberTagSchema.parse({
      name: 'VIP',
    });
    expect(tag.color).toBe('#3b82f6');

    const tagPatch = schema.updateMemberTagSchema.parse({
      description: ' <Tag stratégique> ',
    });
    expect(tagPatch.description).toBe('Tag stratégique');

    const tagAssign = schema.assignMemberTagSchema.parse({
      memberEmail: 'new.member@example.org',
      tagId: '550e8400-e29b-41d4-a716-446655440000',
      assignedBy: 'admin@example.org',
    });
    expect(tagAssign.assignedBy).toBe('admin@example.org');

    const task = schema.insertMemberTaskSchema.parse({
      memberEmail: 'new.member@example.org',
      title: ' <Appeler le membre> ',
      taskType: 'call',
      dueDate: '2030-06-01T08:00:00.000Z',
      createdBy: 'admin@example.org',
    });
    expect(task.status).toBe('todo');

    const taskPatch = schema.updateMemberTaskSchema.parse({
      dueDate: null,
      completedBy: 'admin@example.org',
    });
    expect(taskPatch.dueDate).toBeNull();

    const relation = schema.insertMemberRelationSchema.parse({
      memberEmail: 'new.member@example.org',
      relatedMemberEmail: 'other.member@example.org',
      relationType: 'team',
    });
    expect(relation.relationType).toBe('team');

    const metric = schema.insertTrackingMetricSchema.parse({
      entityType: 'member',
      entityId: 'entity-1',
      entityEmail: 'new.member@example.org',
      metricType: 'engagement',
      metricValue: 10,
      description: ' <Progression notable> ',
    });
    expect(metric.description).toBe('Progression notable');

    const alert = schema.insertTrackingAlertSchema.parse({
      entityType: 'patron',
      entityId: 'entity-2',
      entityEmail: 'patron@example.org',
      alertType: 'needs_followup',
      title: ' <Relance nécessaire> ',
      message: ' <Le contact attend une réponse> ',
      expiresAt: '2031-01-01T00:00:00.000Z',
    });
    expect(alert.severity).toBe('medium');
    expect(alert.title).toBe('Relance nécessaire');

    const alertPatch = schema.updateTrackingAlertSchema.parse({
      isRead: true,
      resolvedBy: 'admin@example.org',
    });
    expect(alertPatch.isRead).toBe(true);
    expect(alertPatch.resolvedBy).toBe('admin@example.org');
  });

  it('covers remaining schema error paths for this iteration', () => {
    const invalidUnsubscription = schema.insertUnsubscriptionSchema.safeParse({
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Anna',
      email: 'anna@invalid',
    });
    expect(invalidUnsubscription.success).toBe(false);

    const invalidDevelopmentUpdate = schema.updateDevelopmentRequestSchema.safeParse({
      githubIssueNumber: -1,
    });
    expect(invalidDevelopmentUpdate.success).toBe(false);

    const invalidTrackingAlert = schema.insertTrackingAlertSchema.safeParse({
      entityType: 'member',
      entityId: 'entity-3',
      entityEmail: 'member@example.org',
      alertType: 'stale',
      title: 'Test',
      message: 'Message',
      expiresAt: 'not-a-date',
    });
    expect(invalidTrackingAlert.success).toBe(false);

    const invalidEventSponsorship = schema.insertEventSponsorshipSchema.safeParse({
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      patronId: '550e8400-e29b-41d4-a716-446655440001',
      level: 'gold',
      amount: -50,
      proposedByAdminEmail: 'admin@example.org',
    });
    expect(invalidEventSponsorship.success).toBe(false);
  });
});
