import { describe, expect, it } from 'vitest';

import {
  ADMIN_ROLES,
  EVENT_BUDGET_LINE_TYPE,
  EVENT_OBJECTIVE_TYPE,
  EVENT_SUPPLIER_STATUS,
  hasPermission,
  insertEventBudgetLineSchema,
  insertEventObjectiveSchema,
  insertEventSupplierCandidateSchema,
  insertEventSupplierQuoteSchema,
  insertEventWorkstreamSchema,
  upsertEventOperationPlanSchema,
} from '../../shared/schema';

describe('Event Operations foundation', () => {
  it('valide un plan opérationnel avec responsable et risque', () => {
    const parsed = upsertEventOperationPlanSchema.safeParse({
      status: 'in_progress',
      ownerEmail: 'orga@example.com',
      dueDate: '2026-09-15',
      riskLevel: 'high',
      summary: 'Événement complexe avec arbitrage prestataires.',
    });

    expect(parsed.success).toBe(true);
  });

  it('valide lots, prestataires, devis, objectifs et lignes budget', () => {
    expect(insertEventWorkstreamSchema.safeParse({
      name: 'Traiteur',
      category: 'logistique',
      priority: 2,
    }).success).toBe(true);

    expect(insertEventSupplierCandidateSchema.safeParse({
      name: 'Maison Exemple',
      category: 'traiteur',
      contactEmail: 'contact@example.com',
      status: EVENT_SUPPLIER_STATUS.SELECTED,
      rating: 4,
    }).success).toBe(true);

    expect(insertEventSupplierQuoteSchema.safeParse({
      supplierId: '11111111-1111-4111-8111-111111111111',
      title: 'Cocktail 80 personnes',
      amountInCents: 320000,
      currency: 'EUR',
      validUntil: '2026-08-31',
    }).success).toBe(true);

    expect(insertEventObjectiveSchema.safeParse({
      type: EVENT_OBJECTIVE_TYPE.PARTICIPANTS,
      label: 'Participants confirmés',
      targetValue: 80,
      currentValue: 35,
    }).success).toBe(true);

    expect(insertEventBudgetLineSchema.safeParse({
      type: EVENT_BUDGET_LINE_TYPE.EXPENSE,
      label: 'Traiteur',
      plannedAmountInCents: 300000,
      committedAmountInCents: 320000,
      actualAmountInCents: 0,
    }).success).toBe(true);
  });

  it('refuse les valeurs financières négatives', () => {
    const parsed = insertEventBudgetLineSchema.safeParse({
      type: EVENT_BUDGET_LINE_TYPE.EXPENSE,
      label: 'Sono',
      plannedAmountInCents: -1,
    });

    expect(parsed.success).toBe(false);
  });

  it('expose les permissions event_ops aux rôles événements uniquement', () => {
    expect(hasPermission(ADMIN_ROLES.SUPER_ADMIN, 'event_ops.manage')).toBe(true);
    expect(hasPermission(ADMIN_ROLES.EVENTS_MANAGER, 'event_ops.write')).toBe(true);
    expect(hasPermission(ADMIN_ROLES.EVENTS_READER, 'event_ops.view')).toBe(true);
    expect(hasPermission(ADMIN_ROLES.EVENTS_READER, 'event_ops.write')).toBe(false);
    expect(hasPermission(ADMIN_ROLES.IDEAS_MANAGER, 'event_ops.view')).toBe(false);
  });
});
