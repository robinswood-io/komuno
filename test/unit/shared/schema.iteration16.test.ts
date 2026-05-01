import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { getTableConfig } from 'drizzle-orm/pg-core';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

describe('shared/schema.js iteration 16 - targeted missing branch recovery', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers remaining permission switch cases and admin optional transform branch', () => {
    expect(schema.hasPermission(schema.ADMIN_ROLES.EVENTS_MANAGER, 'events.write')).toBe(true);
    expect(schema.hasPermission(schema.ADMIN_ROLES.EVENTS_MANAGER, 'events.delete')).toBe(true);

    const adminWithoutAddedBy = schema.insertAdminSchema.parse({
      email: 'ops-admin@example.org',
      firstName: 'Ops',
      lastName: 'Admin',
      password: 'Secure123',
      role: schema.ADMIN_ROLES.IDEAS_MANAGER,
    });

    expect(adminWithoutAddedBy.addedBy).toBeUndefined();
  });

  it('covers optional sanitize branches on idea/event/inscription/unsubscription/loan/patron schemas', () => {
    const ideaWithoutOptionalFields = schema.insertIdeaSchema.parse({
      title: 'Nouvelle idée structurante',
      proposedBy: 'Membre Actif',
      proposedByEmail: 'membre@example.org',
    });

    expect(ideaWithoutOptionalFields.description).toBeUndefined();
    expect(ideaWithoutOptionalFields.company).toBeUndefined();
    expect(ideaWithoutOptionalFields.phone).toBeUndefined();

    const eventWithLocation = schema.insertEventSchema.parse({
      title: 'Rencontre annuelle',
      description: 'Temps fort du réseau',
      date: '2036-10-20T18:00:00.000Z',
      location: ' <Espace CJD National> ',
    });
    expect(eventWithLocation.location).toBe('Espace CJD National');

    const inscriptionWithOptionalFields = schema.insertInscriptionSchema.parse({
      eventId: '550e8400-e29b-41d4-a716-446655440110',
      name: '  Claire Martin  ',
      email: 'claire@example.org',
      company: ' <Komuno> ',
      phone: ' 0601020304 ',
      comments: ' <Je serai présente> ',
    });

    expect(inscriptionWithOptionalFields.company).toBe('Komuno');
    expect(inscriptionWithOptionalFields.phone).toBe('0601020304');
    expect(inscriptionWithOptionalFields.comments).toBe('Je serai présente');

    const initialInscriptionWithoutOptionals = schema.initialInscriptionSchema.parse({
      name: 'Thomas Petit',
      email: 'thomas@example.org',
    });

    expect(initialInscriptionWithoutOptionals.company).toBeUndefined();
    expect(initialInscriptionWithoutOptionals.phone).toBeUndefined();
    expect(initialInscriptionWithoutOptionals.comments).toBeUndefined();

    const unsubscriptionWithReason = schema.insertUnsubscriptionSchema.parse({
      eventId: '550e8400-e29b-41d4-a716-446655440120',
      name: 'Julie Bernard',
      email: 'julie@example.org',
      comments: ' <Contrainte professionnelle> ',
    });

    expect(unsubscriptionWithReason.comments).toBe('Contrainte professionnelle');

    const loanWithPhotoNoDescription = schema.insertLoanItemSchema.parse({
      title: 'Micro HF',
      lenderName: 'JD Prêteur',
      proposedBy: 'JD Gestion',
      proposedByEmail: 'gestion@example.org',
      photoUrl: ' https://example.org/micro.jpg ',
    });

    expect(loanWithPhotoNoDescription.description).toBeUndefined();
    expect(loanWithPhotoNoDescription.photoUrl).toBe('https://example.org/micro.jpg');

    const patronUpdateWithNotes = schema.insertPatronUpdateSchema.parse({
      patronId: '550e8400-e29b-41d4-a716-446655440130',
      type: 'email',
      subject: 'Suivi partenariat',
      date: '2036-04-18',
      description: 'Compte-rendu envoyé',
      notes: ' <Relance dans 10 jours> ',
      createdBy: 'admin@example.org',
    });

    expect(patronUpdateWithNotes.startTime).toBeUndefined();
    expect(patronUpdateWithNotes.notes).toBe('Relance dans 10 jours');

    const ideaPatronWithComment = schema.insertIdeaPatronProposalSchema.parse({
      ideaId: '550e8400-e29b-41d4-a716-446655440131',
      patronId: '550e8400-e29b-41d4-a716-446655440132',
      proposedByAdminEmail: 'admin@example.org',
      comments: ' <Premier contact pris> ',
    });

    expect(ideaPatronWithComment.comments).toBe('Premier contact pris');
  });

  it('covers remaining optional branches on sponsorship/member/tracking schemas', () => {
    const sponsorshipRequiredOnly = schema.insertEventSponsorshipSchema.parse({
      eventId: '550e8400-e29b-41d4-a716-446655440140',
      patronId: '550e8400-e29b-41d4-a716-446655440141',
      level: 'bronze',
      amount: 30000,
      proposedByAdminEmail: 'admin@example.org',
    });

    expect(sponsorshipRequiredOnly.benefits).toBeUndefined();
    expect(sponsorshipRequiredOnly.logoUrl).toBeUndefined();
    expect(sponsorshipRequiredOnly.websiteUrl).toBeUndefined();

    const memberWithOptionalFields = schema.insertMemberSchema.parse({
      email: 'membre.opt@example.org',
      firstName: 'Noah',
      lastName: 'Durand',
      company: ' <CJD Lille> ',
      phone: ' 0677889900 ',
      role: ' <Président> ',
      notes: ' <Profil engagé> ',
      proposedBy: 'sponsor@example.org',
    });

    expect(memberWithOptionalFields.company).toBe('CJD Lille');
    expect(memberWithOptionalFields.phone).toBe('0677889900');
    expect(memberWithOptionalFields.role).toBe('Président');
    expect(memberWithOptionalFields.notes).toBe('Profil engagé');
    expect(memberWithOptionalFields.proposedBy).toBe('sponsor@example.org');

    const activityWithEntityTitle = schema.insertMemberActivitySchema.parse({
      memberEmail: 'membre.opt@example.org',
      activityType: 'event_registered',
      entityType: 'event',
      entityTitle: ' <Assemblée régionale> ',
      scoreImpact: 4,
    });

    expect(activityWithEntityTitle.entityTitle).toBe('Assemblée régionale');

    const proposedMemberWithOptionals = schema.proposeMemberSchema.parse({
      email: 'new.proposal@example.org',
      firstName: 'Emma',
      lastName: 'Leroy',
      company: ' <Entreprise Delta> ',
      phone: ' 0655443322 ',
      role: ' <Dirigeante> ',
      notes: ' <Proposition validée> ',
      proposedBy: 'admin@example.org',
    });

    expect(proposedMemberWithOptionals.company).toBe('Entreprise Delta');
    expect(proposedMemberWithOptionals.phone).toBe('0655443322');
    expect(proposedMemberWithOptionals.role).toBe('Dirigeante');
    expect(proposedMemberWithOptionals.notes).toBe('Proposition validée');

    const memberTagWithoutDescription = schema.insertMemberTagSchema.parse({
      name: 'Contributeur',
      color: '#1A2B3C',
    });
    expect(memberTagWithoutDescription.description).toBeUndefined();

    const updateTagWithoutDescription = schema.updateMemberTagSchema.parse({
      color: '#abcdef',
    });
    expect(updateTagWithoutDescription.description).toBeUndefined();

    const assignedTagWithoutAssigner = schema.assignMemberTagSchema.parse({
      memberEmail: 'membre.opt@example.org',
      tagId: '550e8400-e29b-41d4-a716-446655440142',
    });
    expect(assignedTagWithoutAssigner.assignedBy).toBeUndefined();

    const taskWithOptionalText = schema.insertMemberTaskSchema.parse({
      memberEmail: 'membre.opt@example.org',
      title: 'Préparer un appel',
      taskType: 'call',
      description: ' <Préparer les points clés> ',
      assignedTo: 'assign@example.org',
      createdBy: 'admin@example.org',
    });

    expect(taskWithOptionalText.description).toBe('Préparer les points clés');
    expect(taskWithOptionalText.assignedTo).toBe('assign@example.org');

    const taskPatchWithOptionalText = schema.updateMemberTaskSchema.parse({
      description: ' <Compte-rendu ajouté> ',
      assignedTo: 'manager@example.org',
      status: 'in_progress',
    });

    expect(taskPatchWithOptionalText.description).toBe('Compte-rendu ajouté');
    expect(taskPatchWithOptionalText.assignedTo).toBe('manager@example.org');
    expect(taskPatchWithOptionalText.completedBy).toBeUndefined();

    const relationWithDetails = schema.insertMemberRelationSchema.parse({
      memberEmail: 'membre.opt@example.org',
      relatedMemberEmail: 'peer@example.org',
      relationType: 'custom',
      description: ' <Mise en relation locale> ',
      createdBy: 'admin@example.org',
    });

    expect(relationWithDetails.description).toBe('Mise en relation locale');
    expect(relationWithDetails.createdBy).toBe('admin@example.org');

    const metricWithOptionals = schema.insertTrackingMetricSchema.parse({
      entityType: 'member',
      entityId: 'member-entity-01',
      entityEmail: 'membre.opt@example.org',
      metricType: 'activity',
      metricData: ' <{"count":2}> ',
      recordedBy: 'admin@example.org',
    });

    expect(metricWithOptionals.metricData).toBe('{"count":2}');
    expect(metricWithOptionals.description).toBeUndefined();
    expect(metricWithOptionals.recordedBy).toBe('admin@example.org');

    const alertWithCreator = schema.insertTrackingAlertSchema.parse({
      entityType: 'member',
      entityId: 'member-entity-01',
      entityEmail: 'membre.opt@example.org',
      alertType: 'stale',
      title: 'Relance requise',
      message: 'Dernière activité trop ancienne',
      createdBy: 'admin@example.org',
    });

    expect(alertWithCreator.createdBy).toBe('admin@example.org');

    const alertPatchWithoutResolver = schema.updateTrackingAlertSchema.parse({
      isRead: true,
      isResolved: false,
    });
    expect(alertPatchWithoutResolver.resolvedBy).toBeUndefined();
  });

  it('covers unresolved financial foreign-key reference callbacks', () => {
    const budgetsConfig = getTableConfig(schema.financialBudgets);
    const expensesConfig = getTableConfig(schema.financialExpenses);
    const forecastsConfig = getTableConfig(schema.financialForecasts);

    const budgetReference = budgetsConfig.foreignKeys[0]?.reference();
    expect(budgetReference?.foreignTable).toBe(schema.financialCategories);

    const expenseCategoryReference = expensesConfig.foreignKeys[0]?.reference();
    expect(expenseCategoryReference?.foreignTable).toBe(schema.financialCategories);

    const expenseBudgetReference = expensesConfig.foreignKeys[1]?.reference();
    expect(expenseBudgetReference?.foreignTable).toBe(schema.financialBudgets);

    const forecastReference = forecastsConfig.foreignKeys[0]?.reference();
    expect(forecastReference?.foreignTable).toBe(schema.financialCategories);
  });
});
