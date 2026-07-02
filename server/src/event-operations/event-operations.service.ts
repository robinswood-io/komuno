import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '../../db';
import { AuditService } from '../audit/audit.service';
import { AutomationsService } from '../automations/automations.service';
import {
  EVENT_BUDGET_LINE_TYPE,
  EVENT_COMMITMENT_STATUS,
  EVENT_OPERATION_STATUS,
  EVENT_SUPPLIER_STATUS,
  EVENT_WORKSTREAM_STATUS,
  eventBudgetLines,
  eventObjectives,
  eventOperationPlans,
  events,
  eventSupplierCandidates,
  eventSupplierCommitments,
  eventSupplierQuotes,
  eventWorkstreams,
  insertEventBudgetLineSchema,
  insertEventObjectiveSchema,
  insertEventSupplierCandidateSchema,
  insertEventSupplierCommitmentSchema,
  insertEventSupplierQuoteSchema,
  insertEventWorkstreamSchema,
  updateEventBudgetLineSchema,
  updateEventObjectiveSchema,
  updateEventSupplierCandidateSchema,
  updateEventSupplierCommitmentSchema,
  updateEventSupplierQuoteSchema,
  updateEventWorkstreamSchema,
  upsertEventOperationPlanSchema,
} from '../../../shared/schema';

type Actor = string | undefined;
type EventBudgetLine = typeof eventBudgetLines.$inferSelect;
type EventObjective = typeof eventObjectives.$inferSelect;
type EventWorkstream = typeof eventWorkstreams.$inferSelect;
type EventSupplierCandidate = typeof eventSupplierCandidates.$inferSelect;
type EventSupplierQuote = typeof eventSupplierQuotes.$inferSelect;
type EventSupplierCommitment = typeof eventSupplierCommitments.$inferSelect;

type EntityKind = 'workstreams' | 'suppliers' | 'quotes' | 'commitments' | 'objectives' | 'budget-lines';

function zodToBadRequest(error: unknown) {
  if (error instanceof ZodError) return new BadRequestException(fromZodError(error).message);
  return error;
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[";\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function cents(value: number | null | undefined) {
  return typeof value === 'number' ? value : 0;
}

function dateOrNull(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

@Injectable()
export class EventOperationsService {
  private readonly logger = new Logger(EventOperationsService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly automationsService: AutomationsService,
  ) {}

  async getOperations(eventId: string) {
    const event = await this.ensureEvent(eventId);
    const [plan, workstreams, suppliers, quotes, commitments, objectives, budgetLines] = await Promise.all([
      this.getPlan(eventId),
      db.select().from(eventWorkstreams).where(eq(eventWorkstreams.eventId, eventId)).orderBy(asc(eventWorkstreams.orderIndex), asc(eventWorkstreams.createdAt)),
      db.select().from(eventSupplierCandidates).where(eq(eventSupplierCandidates.eventId, eventId)).orderBy(desc(eventSupplierCandidates.selectedAt), asc(eventSupplierCandidates.name)),
      db.select().from(eventSupplierQuotes).where(eq(eventSupplierQuotes.eventId, eventId)).orderBy(desc(eventSupplierQuotes.createdAt)),
      db.select().from(eventSupplierCommitments).where(eq(eventSupplierCommitments.eventId, eventId)).orderBy(desc(eventSupplierCommitments.createdAt)),
      db.select().from(eventObjectives).where(eq(eventObjectives.eventId, eventId)).orderBy(asc(eventObjectives.createdAt)),
      db.select().from(eventBudgetLines).where(eq(eventBudgetLines.eventId, eventId)).orderBy(asc(eventBudgetLines.type), asc(eventBudgetLines.createdAt)),
    ]);
    return { event, plan, workstreams, suppliers, quotes, commitments, objectives, budgetLines, summary: this.buildSummary({ workstreams, suppliers, quotes, commitments, objectives, budgetLines }) };
  }

  async getSummary(eventId: string) {
    const operations = await this.getOperations(eventId);
    return operations.summary;
  }

  async upsertPlan(eventId: string, payload: unknown, actor?: Actor) {
    await this.ensureEvent(eventId);
    try {
      const parsed = upsertEventOperationPlanSchema.parse(payload);
      const [existing] = await db.select().from(eventOperationPlans).where(eq(eventOperationPlans.eventId, eventId)).limit(1);
      const values = { ...parsed, eventId, updatedBy: actor ?? null, updatedAt: new Date() };
      const [plan] = existing
        ? await db.update(eventOperationPlans).set(values).where(eq(eventOperationPlans.id, existing.id)).returning()
        : await db.insert(eventOperationPlans).values({ ...values, createdBy: actor ?? null }).returning();
      await this.audit('event_ops.plan.updated', actor, 'event_operation_plan', plan.id, { eventId, status: plan.status, riskLevel: plan.riskLevel });
      await this.emitAutomation('event_ops.plan.updated', { id: plan.id, eventId, status: plan.status, riskLevel: plan.riskLevel });
      return plan;
    } catch (error) {
      throw zodToBadRequest(error);
    }
  }

  async createEntity(eventId: string, kind: EntityKind, payload: unknown, actor?: Actor) {
    await this.ensureEvent(eventId);
    try {
      if (kind === 'workstreams') {
        const parsed = insertEventWorkstreamSchema.parse(payload);
        const [row] = await db.insert(eventWorkstreams).values({ ...parsed, eventId, createdBy: actor ?? null, updatedBy: actor ?? null }).returning();
        await this.audit('event_ops.workstream.created', actor, 'event_workstream', row.id, { eventId, name: row.name });
        return row;
      }
      if (kind === 'suppliers') {
        const parsed = insertEventSupplierCandidateSchema.parse(payload);
        await this.assertWorkstreamBelongsToEvent(eventId, parsed.workstreamId ?? null);
        const [row] = await db.insert(eventSupplierCandidates).values({ ...parsed, eventId, selectedAt: parsed.status === EVENT_SUPPLIER_STATUS.SELECTED ? new Date() : null, createdBy: actor ?? null, updatedBy: actor ?? null }).returning();
        await this.audit('event_ops.supplier.created', actor, 'event_supplier_candidate', row.id, { eventId, name: row.name, status: row.status });
        if (row.status === EVENT_SUPPLIER_STATUS.SELECTED) await this.emitSupplierSelected(row);
        return row;
      }
      if (kind === 'quotes') {
        const parsed = insertEventSupplierQuoteSchema.parse(payload);
        await this.assertSupplierBelongsToEvent(eventId, parsed.supplierId);
        await this.assertWorkstreamBelongsToEvent(eventId, parsed.workstreamId ?? null);
        const [row] = await db.insert(eventSupplierQuotes).values({ ...parsed, eventId, createdBy: actor ?? null, updatedBy: actor ?? null }).returning();
        await this.audit('event_ops.quote.created', actor, 'event_supplier_quote', row.id, { eventId, supplierId: row.supplierId, amountInCents: row.amountInCents });
        return row;
      }
      if (kind === 'commitments') {
        const parsed = insertEventSupplierCommitmentSchema.parse(payload);
        await this.assertSupplierBelongsToEvent(eventId, parsed.supplierId);
        await this.assertQuoteBelongsToEvent(eventId, parsed.quoteId ?? null);
        await this.assertWorkstreamBelongsToEvent(eventId, parsed.workstreamId ?? null);
        const [row] = await db.insert(eventSupplierCommitments).values({ ...parsed, eventId, paidAt: dateOrNull(parsed.paidAt), createdBy: actor ?? null, updatedBy: actor ?? null }).returning();
        await this.audit('event_ops.commitment.created', actor, 'event_supplier_commitment', row.id, { eventId, supplierId: row.supplierId, amountInCents: row.committedAmountInCents });
        return row;
      }
      if (kind === 'objectives') {
        const parsed = insertEventObjectiveSchema.parse(payload);
        const [row] = await db.insert(eventObjectives).values({ ...parsed, eventId, createdBy: actor ?? null, updatedBy: actor ?? null }).returning();
        await this.audit('event_ops.objective.created', actor, 'event_objective', row.id, { eventId, type: row.type, targetValue: row.targetValue });
        return row;
      }
      const parsed = insertEventBudgetLineSchema.parse(payload);
      await this.assertOptionalLinksBelongToEvent(eventId, parsed);
      const [row] = await db.insert(eventBudgetLines).values({ ...parsed, eventId, createdBy: actor ?? null, updatedBy: actor ?? null }).returning();
      await this.audit('event_ops.budget_line.created', actor, 'event_budget_line', row.id, { eventId, type: row.type, plannedAmountInCents: row.plannedAmountInCents, committedAmountInCents: row.committedAmountInCents, actualAmountInCents: row.actualAmountInCents });
      await this.emitBudgetThresholdIfNeeded(row);
      return row;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw zodToBadRequest(error);
    }
  }

  async updateEntity(eventId: string, kind: EntityKind, id: string, payload: unknown, actor?: Actor) {
    await this.ensureEvent(eventId);
    try {
      if (kind === 'workstreams') {
        await this.assertWorkstreamBelongsToEvent(eventId, id);
        const parsed = updateEventWorkstreamSchema.parse(payload);
        const [row] = await db.update(eventWorkstreams).set({ ...parsed, updatedBy: actor ?? null, updatedAt: new Date() }).where(eq(eventWorkstreams.id, id)).returning();
        await this.audit('event_ops.workstream.updated', actor, 'event_workstream', id, { eventId });
        return row;
      }
      if (kind === 'suppliers') {
        await this.assertSupplierBelongsToEvent(eventId, id);
        const parsed = updateEventSupplierCandidateSchema.parse(payload);
        await this.assertWorkstreamBelongsToEvent(eventId, parsed.workstreamId ?? null);
        const [row] = await db.update(eventSupplierCandidates).set({ ...parsed, selectedAt: parsed.status === EVENT_SUPPLIER_STATUS.SELECTED ? new Date() : undefined, updatedBy: actor ?? null, updatedAt: new Date() }).where(eq(eventSupplierCandidates.id, id)).returning();
        await this.audit('event_ops.supplier.updated', actor, 'event_supplier_candidate', id, { eventId, status: row.status });
        if (row.status === EVENT_SUPPLIER_STATUS.SELECTED) await this.emitSupplierSelected(row);
        return row;
      }
      if (kind === 'quotes') {
        await this.assertQuoteBelongsToEvent(eventId, id);
        const parsed = updateEventSupplierQuoteSchema.parse(payload);
        if (parsed.supplierId) await this.assertSupplierBelongsToEvent(eventId, parsed.supplierId);
        await this.assertWorkstreamBelongsToEvent(eventId, parsed.workstreamId ?? null);
        const [row] = await db.update(eventSupplierQuotes).set({ ...parsed, updatedBy: actor ?? null, updatedAt: new Date() }).where(eq(eventSupplierQuotes.id, id)).returning();
        await this.audit('event_ops.quote.updated', actor, 'event_supplier_quote', id, { eventId, status: row.status });
        return row;
      }
      if (kind === 'commitments') {
        await this.assertCommitmentBelongsToEvent(eventId, id);
        const parsed = updateEventSupplierCommitmentSchema.parse(payload);
        if (parsed.supplierId) await this.assertSupplierBelongsToEvent(eventId, parsed.supplierId);
        await this.assertQuoteBelongsToEvent(eventId, parsed.quoteId ?? null);
        await this.assertWorkstreamBelongsToEvent(eventId, parsed.workstreamId ?? null);
        const [row] = await db.update(eventSupplierCommitments).set({ ...parsed, paidAt: parsed.paidAt !== undefined ? dateOrNull(parsed.paidAt) : undefined, updatedBy: actor ?? null, updatedAt: new Date() }).where(eq(eventSupplierCommitments.id, id)).returning();
        await this.audit('event_ops.commitment.updated', actor, 'event_supplier_commitment', id, { eventId, status: row.status });
        return row;
      }
      if (kind === 'objectives') {
        await this.assertObjectiveBelongsToEvent(eventId, id);
        const parsed = updateEventObjectiveSchema.parse(payload);
        const [row] = await db.update(eventObjectives).set({ ...parsed, updatedBy: actor ?? null, updatedAt: new Date() }).where(eq(eventObjectives.id, id)).returning();
        await this.audit('event_ops.objective.updated', actor, 'event_objective', id, { eventId, status: row.status });
        return row;
      }
      await this.assertBudgetLineBelongsToEvent(eventId, id);
      const parsed = updateEventBudgetLineSchema.parse(payload);
      await this.assertOptionalLinksBelongToEvent(eventId, parsed);
      const [row] = await db.update(eventBudgetLines).set({ ...parsed, updatedBy: actor ?? null, updatedAt: new Date() }).where(eq(eventBudgetLines.id, id)).returning();
      await this.audit('event_ops.budget_line.updated', actor, 'event_budget_line', id, { eventId, type: row.type });
      await this.emitBudgetThresholdIfNeeded(row);
      return row;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw zodToBadRequest(error);
    }
  }

  async deleteEntity(eventId: string, kind: EntityKind, id: string, actor?: Actor) {
    await this.ensureEvent(eventId);
    await this.assertEntityBelongsToEvent(eventId, kind, id);
    switch (kind) {
      case 'workstreams':
        await db.delete(eventWorkstreams).where(eq(eventWorkstreams.id, id));
        break;
      case 'suppliers':
        await db.delete(eventSupplierCandidates).where(eq(eventSupplierCandidates.id, id));
        break;
      case 'quotes':
        await db.delete(eventSupplierQuotes).where(eq(eventSupplierQuotes.id, id));
        break;
      case 'commitments':
        await db.delete(eventSupplierCommitments).where(eq(eventSupplierCommitments.id, id));
        break;
      case 'objectives':
        await db.delete(eventObjectives).where(eq(eventObjectives.id, id));
        break;
      case 'budget-lines':
        await db.delete(eventBudgetLines).where(eq(eventBudgetLines.id, id));
        break;
      default:
        throw new BadRequestException('Type d’élément de pilotage invalide');
    }
    await this.audit(`event_ops.${kind.replace('-', '_')}.deleted`, actor, `event_${kind.replace('-', '_')}`, id, { eventId });
    return { success: true };
  }

  async exportCsv(eventId: string, actor?: Actor) {
    const operations = await this.getOperations(eventId);
    const lines = [['section', 'id', 'type', 'label', 'status', 'planned_amount', 'committed_amount', 'actual_amount', 'notes'].join(';')];
    for (const workstream of operations.workstreams) {
      lines.push(['workstream', workstream.id, workstream.category, workstream.name, workstream.status, '', '', '', workstream.description].map(csvEscape).join(';'));
    }
    for (const supplier of operations.suppliers) {
      lines.push(['supplier', supplier.id, supplier.category, supplier.name, supplier.status, '', '', '', supplier.notes].map(csvEscape).join(';'));
    }
    for (const quote of operations.quotes) {
      lines.push(['quote', quote.id, quote.supplierId, quote.title, quote.status, quote.amountInCents, '', '', quote.notes].map(csvEscape).join(';'));
    }
    for (const commitment of operations.commitments) {
      lines.push(['commitment', commitment.id, commitment.supplierId, commitment.title, commitment.status, '', commitment.committedAmountInCents, commitment.actualAmountInCents, commitment.notes].map(csvEscape).join(';'));
    }
    for (const objective of operations.objectives) {
      lines.push(['objective', objective.id, objective.type, objective.label, objective.status, objective.targetValue, objective.currentValue, '', objective.notes].map(csvEscape).join(';'));
    }
    for (const budgetLine of operations.budgetLines) {
      lines.push(['budget_line', budgetLine.id, budgetLine.type, budgetLine.label, budgetLine.status, budgetLine.plannedAmountInCents, budgetLine.committedAmountInCents, budgetLine.actualAmountInCents, budgetLine.notes].map(csvEscape).join(';'));
    }
    await this.audit('event_ops.exported', actor, 'event', eventId, { counts: operations.summary.counts });
    return lines.join('\n') + '\n';
  }

  private async getPlan(eventId: string) {
    const [plan] = await db.select().from(eventOperationPlans).where(eq(eventOperationPlans.eventId, eventId)).limit(1);
    return plan ?? null;
  }

  private buildSummary(input: {
    workstreams: EventWorkstream[];
    suppliers: EventSupplierCandidate[];
    quotes: EventSupplierQuote[];
    commitments: EventSupplierCommitment[];
    objectives: EventObjective[];
    budgetLines: EventBudgetLine[];
  }) {
    const plannedIncome = input.budgetLines.filter(line => line.type === EVENT_BUDGET_LINE_TYPE.INCOME).reduce((sum, line) => sum + cents(line.plannedAmountInCents), 0);
    const plannedExpense = input.budgetLines.filter(line => line.type === EVENT_BUDGET_LINE_TYPE.EXPENSE).reduce((sum, line) => sum + cents(line.plannedAmountInCents), 0);
    const committedIncome = input.budgetLines.filter(line => line.type === EVENT_BUDGET_LINE_TYPE.INCOME).reduce((sum, line) => sum + cents(line.committedAmountInCents), 0);
    const committedExpense = input.budgetLines.filter(line => line.type === EVENT_BUDGET_LINE_TYPE.EXPENSE).reduce((sum, line) => sum + cents(line.committedAmountInCents), 0)
      + input.commitments.filter(item => item.status !== EVENT_COMMITMENT_STATUS.CANCELLED).reduce((sum, item) => sum + cents(item.committedAmountInCents), 0);
    const actualIncome = input.budgetLines.filter(line => line.type === EVENT_BUDGET_LINE_TYPE.INCOME).reduce((sum, line) => sum + cents(line.actualAmountInCents), 0);
    const actualExpense = input.budgetLines.filter(line => line.type === EVENT_BUDGET_LINE_TYPE.EXPENSE).reduce((sum, line) => sum + cents(line.actualAmountInCents), 0)
      + input.commitments.reduce((sum, item) => sum + cents(item.actualAmountInCents), 0);
    const selectedSuppliers = input.suppliers.filter(supplier => supplier.status === EVENT_SUPPLIER_STATUS.SELECTED).length;
    const blockedWorkstreams = input.workstreams.filter(workstream => workstream.status === EVENT_WORKSTREAM_STATUS.BLOCKED).length;
    const achievedObjectives = input.objectives.filter(objective => objective.targetValue > 0 && objective.currentValue >= objective.targetValue).length;
    const expiredQuotes = input.quotes.filter(quote => quote.validUntil && quote.status !== 'accepted' && new Date(quote.validUntil) < new Date()).length;
    const warnings = [] as Array<{ type: string; message: string }>;
    if (plannedExpense > 0 && committedExpense > plannedExpense) warnings.push({ type: 'budget_overrun', message: 'Les dépenses engagées dépassent le budget prévisionnel.' });
    if (plannedIncome - plannedExpense < 0) warnings.push({ type: 'negative_planned_margin', message: 'La marge prévisionnelle est négative.' });
    if (actualIncome > 0 && actualIncome - actualExpense < 0) warnings.push({ type: 'negative_actual_margin', message: 'La marge réelle est négative.' });
    if (blockedWorkstreams > 0) warnings.push({ type: 'blocked_workstreams', message: `${blockedWorkstreams} lot(s) bloqué(s).` });
    if (expiredQuotes > 0) warnings.push({ type: 'expired_quotes', message: `${expiredQuotes} devis expiré(s).` });
    return {
      counts: {
        workstreams: input.workstreams.length,
        suppliers: input.suppliers.length,
        selectedSuppliers,
        quotes: input.quotes.length,
        commitments: input.commitments.length,
        objectives: input.objectives.length,
        achievedObjectives,
        budgetLines: input.budgetLines.length,
      },
      budget: {
        plannedIncome,
        plannedExpense,
        committedIncome,
        committedExpense,
        actualIncome,
        actualExpense,
        plannedMargin: plannedIncome - plannedExpense,
        committedMargin: committedIncome - committedExpense,
        actualMargin: actualIncome - actualExpense,
      },
      warnings,
    };
  }

  private async ensureEvent(eventId: string) {
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new NotFoundException('Événement introuvable');
    return event;
  }

  private async assertEntityBelongsToEvent(eventId: string, kind: EntityKind, id: string) {
    switch (kind) {
      case 'workstreams':
        await this.assertWorkstreamBelongsToEvent(eventId, id);
        return;
      case 'suppliers':
        await this.assertSupplierBelongsToEvent(eventId, id);
        return;
      case 'quotes':
        await this.assertQuoteBelongsToEvent(eventId, id);
        return;
      case 'commitments':
        await this.assertCommitmentBelongsToEvent(eventId, id);
        return;
      case 'objectives':
        await this.assertObjectiveBelongsToEvent(eventId, id);
        return;
      case 'budget-lines':
        await this.assertBudgetLineBelongsToEvent(eventId, id);
        return;
      default:
        throw new BadRequestException('Type d’élément de pilotage invalide');
    }
  }

  private async assertWorkstreamBelongsToEvent(eventId: string, id?: string | null) {
    if (!id) return;
    const [row] = await db.select({ id: eventWorkstreams.id }).from(eventWorkstreams).where(and(eq(eventWorkstreams.id, id), eq(eventWorkstreams.eventId, eventId))).limit(1);
    if (!row) throw new BadRequestException('Lot/poste introuvable pour cet événement');
  }

  private async assertSupplierBelongsToEvent(eventId: string, id: string) {
    const [row] = await db.select({ id: eventSupplierCandidates.id }).from(eventSupplierCandidates).where(and(eq(eventSupplierCandidates.id, id), eq(eventSupplierCandidates.eventId, eventId))).limit(1);
    if (!row) throw new BadRequestException('Prestataire introuvable pour cet événement');
  }

  private async assertQuoteBelongsToEvent(eventId: string, id?: string | null) {
    if (!id) return;
    const [row] = await db.select({ id: eventSupplierQuotes.id }).from(eventSupplierQuotes).where(and(eq(eventSupplierQuotes.id, id), eq(eventSupplierQuotes.eventId, eventId))).limit(1);
    if (!row) throw new BadRequestException('Devis introuvable pour cet événement');
  }

  private async assertCommitmentBelongsToEvent(eventId: string, id: string) {
    const [row] = await db.select({ id: eventSupplierCommitments.id }).from(eventSupplierCommitments).where(and(eq(eventSupplierCommitments.id, id), eq(eventSupplierCommitments.eventId, eventId))).limit(1);
    if (!row) throw new BadRequestException('Engagement fournisseur introuvable pour cet événement');
  }

  private async assertObjectiveBelongsToEvent(eventId: string, id: string) {
    const [row] = await db.select({ id: eventObjectives.id }).from(eventObjectives).where(and(eq(eventObjectives.id, id), eq(eventObjectives.eventId, eventId))).limit(1);
    if (!row) throw new BadRequestException('Objectif introuvable pour cet événement');
  }

  private async assertBudgetLineBelongsToEvent(eventId: string, id: string) {
    const [row] = await db.select({ id: eventBudgetLines.id }).from(eventBudgetLines).where(and(eq(eventBudgetLines.id, id), eq(eventBudgetLines.eventId, eventId))).limit(1);
    if (!row) throw new BadRequestException('Ligne budget introuvable pour cet événement');
  }

  private async assertOptionalLinksBelongToEvent(eventId: string, payload: Record<string, unknown>) {
    await Promise.all([
      this.assertWorkstreamBelongsToEvent(eventId, payload.workstreamId as string | null | undefined),
      payload.supplierId ? this.assertSupplierBelongsToEvent(eventId, String(payload.supplierId)) : Promise.resolve(),
      this.assertQuoteBelongsToEvent(eventId, payload.quoteId as string | null | undefined),
      payload.commitmentId ? this.assertCommitmentBelongsToEvent(eventId, String(payload.commitmentId)) : Promise.resolve(),
    ]);
  }

  private async audit(action: string, actor: Actor, entityType: string, entityId: string, metadata: Record<string, unknown>) {
    try {
      await this.auditService.record({ action, actorEmail: actor ?? null, entityType, entityId, metadata });
    } catch (error) {
      this.logger.warn(`Audit EventOps non bloquant impossible: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async emitAutomation(eventType: string, payload: Record<string, unknown>) {
    try {
      await this.automationsService.emitEvent(eventType, payload, { source: 'event_operations', eventId: payload.id ? `${eventType}:${String(payload.id)}` : undefined });
    } catch (error) {
      this.logger.warn(`Automation EventOps non bloquante impossible: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async emitSupplierSelected(row: EventSupplierCandidate) {
    await this.emitAutomation('event_ops.supplier.selected', { id: row.id, eventId: row.eventId, supplierName: row.name, workstreamId: row.workstreamId });
  }

  private async emitBudgetThresholdIfNeeded(row: EventBudgetLine) {
    if (row.type !== EVENT_BUDGET_LINE_TYPE.EXPENSE) return;
    const committedOrActual = Math.max(cents(row.committedAmountInCents), cents(row.actualAmountInCents));
    if (row.plannedAmountInCents > 0 && committedOrActual > row.plannedAmountInCents) {
      await this.emitAutomation('event_ops.budget.threshold_exceeded', {
        id: row.id,
        eventId: row.eventId,
        label: row.label,
        plannedAmountInCents: row.plannedAmountInCents,
        committedAmountInCents: row.committedAmountInCents,
        actualAmountInCents: row.actualAmountInCents,
      });
    }
  }
}
