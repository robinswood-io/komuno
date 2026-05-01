import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { createTableRelationsHelpers } from 'drizzle-orm/relations';

type SchemaModule = typeof import('../../../shared/schema.js');

const cjsRequire = createRequire(import.meta.url);
const schemaModulePath = cjsRequire.resolve('../../../shared/schema.js');

function loadSchemaModule(): SchemaModule {
  delete cjsRequire.cache[schemaModulePath];
  return cjsRequire(schemaModulePath) as SchemaModule;
}

function executeRelationConfig(relation: { table: unknown; config: (helpers: unknown) => unknown }) {
  const helpers = createTableRelationsHelpers(relation.table);
  const relationMap = relation.config(helpers) as Record<string, unknown>;
  return relationMap;
}

describe('shared/schema.js iteration 19 - remaining callback/function coverage', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers remaining pgTable callback functions for idea/event/push/dev/patron tables', () => {
    const ideasConfig = getTableConfig(schema.ideas);
    const eventsConfig = getTableConfig(schema.events);
    const loanItemsConfig = getTableConfig(schema.loanItems);
    const pushSubscriptionsConfig = getTableConfig(schema.pushSubscriptions);
    const developmentRequestsConfig = getTableConfig(schema.developmentRequests);
    const patronsConfig = getTableConfig(schema.patrons);
    const donationsConfig = getTableConfig(schema.patronDonations);
    const updatesConfig = getTableConfig(schema.patronUpdates);
    const proposalsConfig = getTableConfig(schema.ideaPatronProposals);

    expect(ideasConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'ideas_status_idx',
        'ideas_email_idx',
        'ideas_featured_idx',
        'ideas_created_at_idx',
      ]),
    );

    expect(eventsConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining(['events_status_idx', 'events_date_idx', 'events_status_date_idx']),
    );

    expect(loanItemsConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'loan_items_status_idx',
        'loan_items_created_at_idx',
        'loan_items_title_search_idx',
        'loan_items_status_created_idx',
      ]),
    );

    expect(pushSubscriptionsConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining(['push_subscriptions_endpoint_idx', 'push_subscriptions_email_idx']),
    );

    expect(developmentRequestsConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'dev_requests_type_idx',
        'dev_requests_status_idx',
        'dev_requests_requested_by_idx',
        'dev_requests_github_issue_idx',
      ]),
    );

    expect(patronsConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'patrons_email_idx',
        'patrons_created_by_idx',
        'patrons_created_at_idx',
        'patrons_referrer_id_idx',
      ]),
    );

    const patronReferrerFk = patronsConfig.foreignKeys[0]?.reference();
    expect(patronReferrerFk?.foreignTable).toBe(schema.members);
    expect(patronReferrerFk?.columns.map((column) => column.name)).toEqual(['referrer_id']);
    expect(patronReferrerFk?.foreignColumns.map((column) => column.name)).toEqual(['id']);

    expect(donationsConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining(['patron_donations_patron_id_idx', 'patron_donations_donated_at_idx']),
    );
    const donationFk = donationsConfig.foreignKeys[0]?.reference();
    expect(donationFk?.foreignTable).toBe(schema.patrons);

    expect(updatesConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'patron_updates_patron_id_idx',
        'patron_updates_type_idx',
        'patron_updates_date_idx',
        'patron_updates_created_at_idx',
      ]),
    );
    const updateFk = updatesConfig.foreignKeys[0]?.reference();
    expect(updateFk?.foreignTable).toBe(schema.patrons);

    expect(proposalsConfig.uniqueConstraints.map((constraint) => constraint.getName())).toEqual(
      expect.arrayContaining(['idea_patron_proposals_idea_id_patron_id_unique']),
    );
    expect(proposalsConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'idea_patron_proposals_idea_id_idx',
        'idea_patron_proposals_patron_id_idx',
        'idea_patron_proposals_status_idx',
      ]),
    );

    const proposalRefs = proposalsConfig.foreignKeys.map((foreignKey) => foreignKey.reference());
    expect(proposalRefs.map((ref) => ref.foreignTable)).toEqual(
      expect.arrayContaining([schema.ideas, schema.patrons]),
    );
  });

  it('executes relation config callbacks for idea/event/member/patron relation exports', () => {
    const coreRelations = [
      schema.ideasRelations,
      schema.votesRelations,
      schema.eventsRelations,
      schema.inscriptionsRelations,
      schema.unsubscriptionsRelations,
      schema.patronsRelations,
      schema.patronDonationsRelations,
      schema.patronUpdatesRelations,
      schema.ideaPatronProposalsRelations,
      schema.eventSponsorshipsRelations,
      schema.membersRelations,
      schema.memberActivitiesRelations,
      schema.memberSubscriptionsRelations,
    ];

    for (const relation of coreRelations) {
      const relationMap = executeRelationConfig(relation);
      expect(Object.keys(relationMap).length).toBeGreaterThan(0);
    }

    const eventRelationsMap = executeRelationConfig(schema.eventsRelations);
    expect(Object.keys(eventRelationsMap)).toEqual(
      expect.arrayContaining(['inscriptions', 'unsubscriptions', 'sponsorships']),
    );

    const ideaRelationsMap = executeRelationConfig(schema.ideasRelations);
    expect(Object.keys(ideaRelationsMap)).toEqual(
      expect.arrayContaining(['votes', 'patronProposals']),
    );

    const membersRelationsMap = executeRelationConfig(schema.membersRelations);
    expect(Object.keys(membersRelationsMap)).toEqual(
      expect.arrayContaining(['activities', 'subscriptions']),
    );
  });

  it('executes relation config callbacks for financial relation exports', () => {
    const financialRelations = [
      schema.financialCategoriesRelations,
      schema.financialBudgetsRelations,
      schema.financialExpensesRelations,
      schema.financialForecastsRelations,
    ];

    for (const relation of financialRelations) {
      const relationMap = executeRelationConfig(relation);
      expect(Object.keys(relationMap).length).toBeGreaterThan(0);
    }

    const categoryRelationMap = executeRelationConfig(schema.financialCategoriesRelations);
    expect(Object.keys(categoryRelationMap)).toEqual(
      expect.arrayContaining(['parent', 'children', 'budgets', 'expenses', 'forecasts']),
    );

    const expensesRelationMap = executeRelationConfig(schema.financialExpensesRelations);
    expect(Object.keys(expensesRelationMap)).toEqual(expect.arrayContaining(['category', 'budget']));
  });

  it('covers remaining optional transform fallback branches on sponsorship and member tag schemas', () => {
    const sponsorshipWithUndefinedFields = schema.insertEventSponsorshipSchema.parse({
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      patronId: '550e8400-e29b-41d4-a716-446655440001',
      level: 'gold',
      amount: 1200,
      benefits: '',
      logoUrl: undefined,
      websiteUrl: undefined,
      proposedByAdminEmail: 'admin@example.org',
    });

    expect(sponsorshipWithUndefinedFields.benefits).toBeUndefined();
    expect(sponsorshipWithUndefinedFields.logoUrl).toBeUndefined();
    expect(sponsorshipWithUndefinedFields.websiteUrl).toBeUndefined();

    const memberTagWithEmptyDescription = schema.insertMemberTagSchema.parse({
      name: 'Sponsor premium',
      color: '#3b82f6',
      description: '',
    });

    expect(memberTagWithEmptyDescription.description).toBeUndefined();

    const memberTagWithDescriptionText = schema.insertMemberTagSchema.parse({
      name: 'Sponsor actif',
      color: '#10b981',
      description: '  <Description tag>  ',
    });

    expect(memberTagWithDescriptionText.description).toBe('Description tag');
  });
});
