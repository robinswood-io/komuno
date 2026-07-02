import { describe, expect, it } from 'vitest';

import {
  ADMIN_ROLES,
  AUTOMATION_STEP_TYPE,
  automationDefinitionSchema,
  hasPermission,
  insertAutomationWorkflowSchema,
} from '../../shared/schema';

describe('Automations foundation', () => {
  it('valide un workflow P0 form.response.created avec condition et audit', () => {
    const definition = {
      trigger: { type: 'form.response.created', config: {} },
      steps: [
        {
          id: 'budget-qualified',
          type: AUTOMATION_STEP_TYPE.CONDITION,
          config: {
            all: [{ path: 'data.answers.budget', operator: 'gte', value: 30000 }],
          },
        },
        {
          id: 'audit-qualified',
          type: AUTOMATION_STEP_TYPE.AUDIT_RECORD,
          config: {
            action: 'automations.lead.qualified',
            entityType: 'survey_response',
            entityId: '{{data.id}}',
          },
        },
      ],
    };

    const parsed = automationDefinitionSchema.safeParse(definition);
    expect(parsed.success).toBe(true);

    const workflow = insertAutomationWorkflowSchema.safeParse({
      name: 'Qualification formulaire',
      triggerType: 'form.response.created',
      draftDefinition: definition,
    });
    expect(workflow.success).toBe(true);
  });

  it('refuse les identifiants de steps dupliqués', () => {
    const parsed = automationDefinitionSchema.safeParse({
      trigger: { type: 'member.created', config: {} },
      steps: [
        { id: 'same', type: AUTOMATION_STEP_TYPE.NOOP, config: {} },
        { id: 'same', type: AUTOMATION_STEP_TYPE.NOOP, config: {} },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('expose les permissions automations aux managers mais pas aux lecteurs', () => {
    expect(hasPermission(ADMIN_ROLES.SUPER_ADMIN, 'automations.manage')).toBe(true);
    expect(hasPermission(ADMIN_ROLES.IDEAS_MANAGER, 'automations.write')).toBe(true);
    expect(hasPermission(ADMIN_ROLES.EVENTS_MANAGER, 'automations.write')).toBe(true);
    expect(hasPermission(ADMIN_ROLES.IDEAS_READER, 'automations.view')).toBe(false);
  });
});
