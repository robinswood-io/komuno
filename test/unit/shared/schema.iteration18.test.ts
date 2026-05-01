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

describe('shared/schema.js iteration 18 - remaining table callback and fk reference branches', () => {
  let schema: SchemaModule;

  beforeEach(() => {
    schema = loadSchemaModule();
  });

  it('covers admins and passwordResetTokens index callbacks and fk reference', () => {
    const adminsConfig = getTableConfig(schema.admins);
    const resetTokensConfig = getTableConfig(schema.passwordResetTokens);

    expect(adminsConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining(['admins_role_idx', 'admins_status_idx', 'admins_active_idx']),
    );

    expect(resetTokensConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'password_reset_tokens_email_idx',
        'password_reset_tokens_token_idx',
        'password_reset_tokens_expires_at_idx',
      ]),
    );

    expect(resetTokensConfig.foreignKeys).toHaveLength(1);

    const fkToAdminEmail = resetTokensConfig.foreignKeys[0]?.reference();
    expect(fkToAdminEmail?.foreignTable).toBe(schema.admins);
    expect(fkToAdminEmail?.columns.map((column) => column.name)).toEqual(['email']);
    expect(fkToAdminEmail?.foreignColumns.map((column) => column.name)).toEqual(['email']);
  });

  it('covers votes/inscriptions/unsubscriptions callback branches and foreign references', () => {
    const votesConfig = getTableConfig(schema.votes);
    const inscriptionsConfig = getTableConfig(schema.inscriptions);
    const unsubscriptionsConfig = getTableConfig(schema.unsubscriptions);

    expect(votesConfig.uniqueConstraints).toHaveLength(1);
    expect(votesConfig.indexes.map((indexDef) => indexDef.config.name)).toContain('votes_idea_id_idx');

    const votesFk = votesConfig.foreignKeys[0]?.reference();
    expect(votesFk?.foreignTable).toBe(schema.ideas);
    expect(votesFk?.columns.map((column) => column.name)).toEqual(['idea_id']);
    expect(votesFk?.foreignColumns.map((column) => column.name)).toEqual(['id']);

    expect(inscriptionsConfig.uniqueConstraints).toHaveLength(1);
    expect(inscriptionsConfig.indexes.map((indexDef) => indexDef.config.name)).toContain(
      'inscriptions_event_id_idx',
    );

    const inscriptionFk = inscriptionsConfig.foreignKeys[0]?.reference();
    expect(inscriptionFk?.foreignTable).toBe(schema.events);
    expect(inscriptionFk?.columns.map((column) => column.name)).toEqual(['event_id']);
    expect(inscriptionFk?.foreignColumns.map((column) => column.name)).toEqual(['id']);

    expect(unsubscriptionsConfig.uniqueConstraints).toHaveLength(1);
    const unsubscriptionFk = unsubscriptionsConfig.foreignKeys[0]?.reference();
    expect(unsubscriptionFk?.foreignTable).toBe(schema.events);
    expect(unsubscriptionFk?.columns.map((column) => column.name)).toEqual(['event_id']);
    expect(unsubscriptionFk?.foreignColumns.map((column) => column.name)).toEqual(['id']);
  });

  it('covers member base tables callbacks (members, activities, subscriptions, tags)', () => {
    const membersConfig = getTableConfig(schema.members);
    const activitiesConfig = getTableConfig(schema.memberActivities);
    const subscriptionsConfig = getTableConfig(schema.memberSubscriptions);
    const tagsConfig = getTableConfig(schema.memberTags);

    expect(membersConfig.indexes).toHaveLength(5);
    expect(membersConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'members_email_idx',
        'members_last_activity_at_idx',
        'members_engagement_score_idx',
        'members_status_idx',
        'members_cjd_role_idx',
      ]),
    );

    expect(activitiesConfig.foreignKeys).toHaveLength(1);
    expect(activitiesConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'member_activities_member_email_idx',
        'member_activities_occurred_at_idx',
        'member_activities_activity_type_idx',
      ]),
    );

    const activityFk = activitiesConfig.foreignKeys[0]?.reference();
    expect(activityFk?.foreignTable).toBe(schema.members);
    expect(activityFk?.columns.map((column) => column.name)).toEqual(['member_email']);
    expect(activityFk?.foreignColumns.map((column) => column.name)).toEqual(['email']);

    expect(subscriptionsConfig.foreignKeys).toHaveLength(1);
    expect(subscriptionsConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'member_subscriptions_member_email_idx',
        'member_subscriptions_start_date_idx',
      ]),
    );

    const subscriptionFk = subscriptionsConfig.foreignKeys[0]?.reference();
    expect(subscriptionFk?.foreignTable).toBe(schema.members);
    expect(subscriptionFk?.columns.map((column) => column.name)).toEqual(['member_email']);
    expect(subscriptionFk?.foreignColumns.map((column) => column.name)).toEqual(['email']);

    expect(tagsConfig.indexes.map((indexDef) => indexDef.config.name)).toContain('member_tags_name_idx');
  });

  it('covers memberTagAssignments and memberTasks foreign-key callback branches', () => {
    const tagAssignmentsConfig = getTableConfig(schema.memberTagAssignments);
    const tasksConfig = getTableConfig(schema.memberTasks);

    expect(tagAssignmentsConfig.indexes).toHaveLength(3);
    expect(tagAssignmentsConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'member_tag_assignments_member_tag_idx',
        'member_tag_assignments_member_email_idx',
        'member_tag_assignments_tag_id_idx',
      ]),
    );

    expect(tagAssignmentsConfig.foreignKeys).toHaveLength(2);
    const assignmentRefs = tagAssignmentsConfig.foreignKeys.map((foreignKey) => foreignKey.reference());

    expect(assignmentRefs.map((ref) => ref.foreignTable)).toEqual(
      expect.arrayContaining([schema.members, schema.memberTags]),
    );

    const memberAssignmentRef = assignmentRefs.find((ref) => ref.foreignTable === schema.members);
    expect(memberAssignmentRef?.columns.map((column) => column.name)).toEqual(['member_email']);
    expect(memberAssignmentRef?.foreignColumns.map((column) => column.name)).toEqual(['email']);

    const tagAssignmentRef = assignmentRefs.find((ref) => ref.foreignTable === schema.memberTags);
    expect(tagAssignmentRef?.columns.map((column) => column.name)).toEqual(['tag_id']);
    expect(tagAssignmentRef?.foreignColumns.map((column) => column.name)).toEqual(['id']);

    expect(tasksConfig.indexes).toHaveLength(4);
    expect(tasksConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'member_tasks_member_email_idx',
        'member_tasks_status_idx',
        'member_tasks_due_date_idx',
        'member_tasks_created_by_idx',
      ]),
    );

    const taskFk = tasksConfig.foreignKeys[0]?.reference();
    expect(taskFk?.foreignTable).toBe(schema.members);
    expect(taskFk?.columns.map((column) => column.name)).toEqual(['member_email']);
    expect(taskFk?.foreignColumns.map((column) => column.name)).toEqual(['email']);
  });

  it('covers memberRelations dual-foreign-key callbacks and indexes', () => {
    const relationsConfig = getTableConfig(schema.memberRelations);

    expect(relationsConfig.indexes).toHaveLength(4);
    expect(relationsConfig.indexes.map((indexDef) => indexDef.config.name)).toEqual(
      expect.arrayContaining([
        'member_relations_member_relation_idx',
        'member_relations_member_email_idx',
        'member_relations_related_member_email_idx',
        'member_relations_relation_type_idx',
      ]),
    );

    expect(relationsConfig.foreignKeys).toHaveLength(2);
    const memberRefs = relationsConfig.foreignKeys.map((foreignKey) => foreignKey.reference());

    expect(memberRefs.every((ref) => ref.foreignTable === schema.members)).toBe(true);

    const fkColumnNames = memberRefs.map((ref) => ref.columns.map((column) => column.name).join(','));
    expect(fkColumnNames).toEqual(expect.arrayContaining(['member_email', 'related_member_email']));

    for (const ref of memberRefs) {
      expect(ref.foreignColumns.map((column) => column.name)).toEqual(['email']);
    }
  });
});
