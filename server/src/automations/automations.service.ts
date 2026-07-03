import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { and, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '../../db';
import { hasErrorCode } from '../common/utils/error-utils';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../common/storage/storage.service';
import { IntegrationsService } from '../integrations/integrations.service';
import {
  AUTOMATION_RUN_STATUS,
  AUTOMATION_STEP_STATUS,
  AUTOMATION_STEP_TYPE,
  AUTOMATION_WORKFLOW_STATUS,
  automationConditionSchema,
  automationDefinitionSchema,
  automationEvents,
  automationRuns,
  automationStepRuns,
  automationWorkflowVersions,
  automationWorkflows,
  insertAutomationEventSchema,
  insertAutomationWorkflowSchema,
  insertMemberTaskSchema,
  publishAutomationWorkflowSchema,
  updateAutomationWorkflowSchema,
  updateAutomationWorkflowStatusSchema,
  type AutomationDefinition,
  type AutomationStep,
} from '../../../shared/schema';

type JsonObject = Record<string, unknown>;
type Workflow = typeof automationWorkflows.$inferSelect;
type WorkflowVersion = typeof automationWorkflowVersions.$inferSelect;
type AutomationRun = typeof automationRuns.$inferSelect;
type AutomationEvent = typeof automationEvents.$inferSelect;

type EmitOptions = {
  eventId?: string;
  organizationId?: string | null;
  source?: string;
};

const SENSITIVE_KEY_PATTERN = /(password|secret|token|authorization|cookie|api[-_]?key|rawbody|signature)/i;

function stableStringify(value: unknown): string {
  if (value === undefined) return '"[undefined]"';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(typeof value === 'string' ? value : stableStringify(value)).digest('hex');
}

function maskSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : maskSensitive(item),
  ]));
}

function getPath(source: unknown, path: string): unknown {
  return path.split('.').filter(Boolean).reduce<unknown>((current, part) => {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current) && /^\d+$/.test(part)) return current[Number(part)];
    if (typeof current === 'object') return (current as Record<string, unknown>)[part];
    return undefined;
  }, source);
}

function renderTemplate(input: string, context: JsonObject): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, path: string) => {
    const value = getPath(context, path);
    if (value === undefined || value === null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  });
}

function renderValue<T = unknown>(input: T, context: JsonObject): T {
  if (typeof input === 'string') return renderTemplate(input, context) as T;
  if (Array.isArray(input)) return input.map((item) => renderValue(item, context)) as T;
  if (input && typeof input === 'object') {
    return Object.fromEntries(Object.entries(input as Record<string, unknown>).map(([key, value]) => [key, renderValue(value, context)])) as T;
  }
  return input;
}

function compareValues(actual: unknown, operator: string, expected?: unknown): boolean {
  switch (operator) {
    case 'exists':
      return actual !== undefined && actual !== null && actual !== '';
    case 'not_exists':
      return actual === undefined || actual === null || actual === '';
    case 'equals':
      return String(actual ?? '') === String(expected ?? '');
    case 'not_equals':
      return String(actual ?? '') !== String(expected ?? '');
    case 'contains':
      if (Array.isArray(actual)) return actual.map(String).includes(String(expected ?? ''));
      return String(actual ?? '').includes(String(expected ?? ''));
    case 'in':
      return Array.isArray(expected) && expected.map(String).includes(String(actual ?? ''));
    case 'gt':
      return Number(actual) > Number(expected);
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'lt':
      return Number(actual) < Number(expected);
    case 'lte':
      return Number(actual) <= Number(expected);
    default:
      return false;
  }
}

function buildContext(event: AutomationEvent): JsonObject {
  const data = (event.payload ?? {}) as JsonObject;
  return {
    event: {
      id: event.eventId,
      type: event.eventType,
      source: event.source,
      receivedAt: event.receivedAt,
      payload: data,
    },
    data,
    form: data,
    member: data,
    eventData: data,
  };
}

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly integrationsService: IntegrationsService,
    private readonly auditService: AuditService,
  ) {}

  private audit(input: Parameters<AuditService['record']>[0]) {
    void this.auditService.record(input);
  }

  private handleZodError(error: unknown): never {
    if (error instanceof ZodError) throw new BadRequestException(fromZodError(error).toString());
    throw error;
  }

  private safeWorkflow(workflow: Workflow) {
    return workflow;
  }

  private safeRun(run: AutomationRun) {
    return {
      ...run,
      input: maskSensitive(run.input),
      output: maskSensitive(run.output),
    };
  }

  async listWorkflows(filters: { status?: string; triggerType?: string } = {}) {
    const conditions = [];
    if (filters.status) conditions.push(eq(automationWorkflows.status, filters.status));
    if (filters.triggerType) conditions.push(eq(automationWorkflows.triggerType, filters.triggerType));
    const rows = await db.select().from(automationWorkflows)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(automationWorkflows.updatedAt))
      .limit(200);
    return { success: true, data: rows.map((row) => this.safeWorkflow(row)) };
  }

  async getWorkflow(id: string) {
    const [workflow] = await db.select().from(automationWorkflows).where(eq(automationWorkflows.id, id)).limit(1);
    if (!workflow) throw new NotFoundException('Workflow introuvable');
    const versions = await db.select().from(automationWorkflowVersions)
      .where(eq(automationWorkflowVersions.workflowId, workflow.id))
      .orderBy(desc(automationWorkflowVersions.version))
      .limit(20);
    return { success: true, data: { ...this.safeWorkflow(workflow), versions } };
  }

  async createWorkflow(body: unknown, userEmail?: string) {
    try {
      const validated = insertAutomationWorkflowSchema.parse(body);
      if (validated.triggerType !== validated.draftDefinition.trigger.type) {
        throw new BadRequestException('Le triggerType doit correspondre au trigger de la définition');
      }
      const [workflow] = await db.insert(automationWorkflows).values({
        organizationId: validated.organizationId ?? null,
        name: validated.name,
        description: validated.description ?? null,
        triggerType: validated.triggerType,
        draftDefinition: validated.draftDefinition,
        createdBy: userEmail ?? null,
        updatedBy: userEmail ?? null,
      }).returning();
      this.audit({
        actorEmail: userEmail ?? null,
        action: 'automations.workflow.create',
        entityType: 'automation_workflow',
        entityId: workflow.id,
        organizationId: workflow.organizationId,
        metadata: { triggerType: workflow.triggerType },
      });
      return { success: true, data: this.safeWorkflow(workflow) };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async updateWorkflow(id: string, body: unknown, userEmail?: string) {
    try {
      const currentWorkflow = await this.getWorkflowRow(id);
      const validated = updateAutomationWorkflowSchema.parse(body);
      const currentDefinition = automationDefinitionSchema.parse(currentWorkflow.draftDefinition);
      const nextDefinition = validated.draftDefinition ?? currentDefinition;
      const nextTriggerType = validated.triggerType ?? nextDefinition.trigger.type;
      if (nextDefinition.trigger.type !== nextTriggerType) {
        throw new BadRequestException('Le triggerType doit correspondre au trigger de la définition');
      }
      const patch: Partial<typeof automationWorkflows.$inferInsert> = {
        updatedBy: userEmail ?? null,
        updatedAt: sql`NOW()` as unknown as Date,
      };
      if (validated.name !== undefined) patch.name = validated.name;
      if (validated.description !== undefined) patch.description = validated.description ?? null;
      if (validated.organizationId !== undefined) patch.organizationId = validated.organizationId ?? null;
      if (nextTriggerType !== undefined) patch.triggerType = nextTriggerType;
      if (nextDefinition !== undefined) patch.draftDefinition = nextDefinition;
      const [workflow] = await db.update(automationWorkflows).set(patch).where(eq(automationWorkflows.id, id)).returning();
      this.audit({
        actorEmail: userEmail ?? null,
        action: 'automations.workflow.update',
        entityType: 'automation_workflow',
        entityId: workflow.id,
        organizationId: workflow.organizationId,
        metadata: { triggerType: workflow.triggerType },
      });
      return { success: true, data: this.safeWorkflow(workflow) };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async publishWorkflow(id: string, body: unknown, userEmail?: string) {
    try {
      const workflow = await this.getWorkflowRow(id);
      const parsed = publishAutomationWorkflowSchema.parse(body ?? {});
      const definition = automationDefinitionSchema.parse(parsed.definition ?? workflow.draftDefinition);
      if (definition.trigger.type !== workflow.triggerType) {
        throw new BadRequestException('La définition publiée ne correspond pas au trigger du workflow');
      }
      const nextVersion = workflow.currentVersion + 1;
      const definitionHash = sha256(definition);
      const [version] = await db.insert(automationWorkflowVersions).values({
        workflowId: workflow.id,
        version: nextVersion,
        triggerType: definition.trigger.type,
        definitionHash,
        definition,
        publishedBy: userEmail ?? null,
      }).returning();
      const [updated] = await db.update(automationWorkflows).set({
        currentVersion: nextVersion,
        draftDefinition: definition,
        updatedBy: userEmail ?? null,
        updatedAt: sql`NOW()`,
      }).where(eq(automationWorkflows.id, id)).returning();
      this.audit({
        actorEmail: userEmail ?? null,
        action: 'automations.workflow.publish',
        entityType: 'automation_workflow_version',
        entityId: version.id,
        organizationId: workflow.organizationId,
        metadata: { workflowId: workflow.id, version: nextVersion, triggerType: version.triggerType },
      });
      return { success: true, data: { workflow: this.safeWorkflow(updated), version } };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async updateWorkflowStatus(id: string, body: unknown, userEmail?: string) {
    try {
      const workflow = await this.getWorkflowRow(id);
      const { status } = updateAutomationWorkflowStatusSchema.parse(body);
      if (status === AUTOMATION_WORKFLOW_STATUS.ACTIVE && workflow.currentVersion <= 0) {
        throw new BadRequestException('Publiez une version avant activation');
      }
      const [updated] = await db.update(automationWorkflows).set({
        status,
        updatedBy: userEmail ?? null,
        updatedAt: sql`NOW()`,
      }).where(eq(automationWorkflows.id, id)).returning();
      this.audit({
        actorEmail: userEmail ?? null,
        action: `automations.workflow.${status}`,
        entityType: 'automation_workflow',
        entityId: updated.id,
        organizationId: updated.organizationId,
        metadata: { previousStatus: workflow.status, status },
      });
      return { success: true, data: this.safeWorkflow(updated) };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async listRuns(filters: { workflowId?: string; status?: string; limit?: number } = {}) {
    const conditions = [];
    if (filters.workflowId) conditions.push(eq(automationRuns.workflowId, filters.workflowId));
    if (filters.status) conditions.push(eq(automationRuns.status, filters.status));
    const rows = await db.select().from(automationRuns)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(automationRuns.createdAt))
      .limit(Math.min(Math.max(filters.limit ?? 50, 1), 200));
    return { success: true, data: rows.map((row) => this.safeRun(row)) };
  }

  async getRun(id: string) {
    const [run] = await db.select().from(automationRuns).where(eq(automationRuns.id, id)).limit(1);
    if (!run) throw new NotFoundException('Run introuvable');
    const steps = await db.select().from(automationStepRuns)
      .where(eq(automationStepRuns.runId, id))
      .orderBy(automationStepRuns.createdAt);
    return { success: true, data: { ...this.safeRun(run), steps: steps.map((step) => ({ ...step, input: maskSensitive(step.input), output: maskSensitive(step.output) })) } };
  }

  async emitEvent(eventType: string, payload: JsonObject = {}, options: EmitOptions = {}) {
    const sanitizedPayload = maskSensitive(payload) as JsonObject;
    const rawEventId = options.eventId ?? `${eventType}:${String(payload.id ?? sha256(payload)).slice(0, 180)}`;
    const eventId = `${options.organizationId ?? 'global'}:${rawEventId}`.slice(0, 240);
    const payloadHash = sha256(sanitizedPayload);
    const validatedEvent = insertAutomationEventSchema.parse({
      eventType,
      eventId,
      organizationId: options.organizationId ?? null,
      source: options.source ?? 'internal',
      payloadHash,
      payload: sanitizedPayload,
    });

    let event: AutomationEvent;
    try {
      [event] = await db.insert(automationEvents).values(validatedEvent).returning();
    } catch (error) {
      if (hasErrorCode(error, '23505')) {
        [event] = await db.select().from(automationEvents)
          .where(and(eq(automationEvents.eventType, eventType), eq(automationEvents.eventId, eventId)))
          .limit(1);
      } else {
        throw error;
      }
    }

    const workflows = await this.activeWorkflowsForEvent(eventType, event.organizationId);
    const results = [] as Array<{ workflowId: string; runId: string | null; status: string; duplicate: boolean }>;
    for (const workflow of workflows) {
      const version = await this.currentVersionForWorkflow(workflow);
      if (!version) continue;
      const result = await this.createRunForEvent(workflow, version, event);
      results.push(result);
      if (!result.duplicate && result.runId) {
        await this.executeRun(result.runId);
      }
    }
    return { success: true, data: { eventId: event.id, triggered: results } };
  }

  async testWorkflow(id: string, body: unknown, userEmail?: string) {
    const workflow = await this.getWorkflowRow(id);
    if (workflow.currentVersion <= 0) throw new BadRequestException('Publiez une version avant test');
    const payload = body && typeof body === 'object' && !Array.isArray(body) ? body as JsonObject : {};
    const result = await this.emitEvent(workflow.triggerType, { ...payload, test: true }, {
      eventId: `manual:${workflow.id}:${Date.now()}`,
      organizationId: workflow.organizationId,
      source: 'manual_test',
    });
    this.audit({
      actorEmail: userEmail ?? null,
      action: 'automations.workflow.test',
      entityType: 'automation_workflow',
      entityId: workflow.id,
      organizationId: workflow.organizationId,
      metadata: { triggerType: workflow.triggerType },
    });
    return result;
  }

  async runDue(limit = 20) {
    const rows = await db.select().from(automationRuns)
      .where(and(
        eq(automationRuns.status, AUTOMATION_RUN_STATUS.QUEUED),
        or(isNull(automationRuns.nextAttemptAt), lte(automationRuns.nextAttemptAt, new Date())),
      ))
      .orderBy(automationRuns.createdAt)
      .limit(Math.min(Math.max(limit, 1), 100));
    const results = [] as Array<{ runId: string; status: string }>;
    for (const run of rows) {
      const updated = await this.executeRun(run.id);
      results.push({ runId: updated.id, status: updated.status });
    }
    return { success: true, data: results };
  }

  private async getWorkflowRow(id: string) {
    const [workflow] = await db.select().from(automationWorkflows).where(eq(automationWorkflows.id, id)).limit(1);
    if (!workflow) throw new NotFoundException('Workflow introuvable');
    return workflow;
  }

  private async activeWorkflowsForEvent(eventType: string, organizationId?: string | null) {
    const organizationFilter = organizationId
      ? or(isNull(automationWorkflows.organizationId), eq(automationWorkflows.organizationId, organizationId))
      : undefined;
    const conditions = [
      eq(automationWorkflows.status, AUTOMATION_WORKFLOW_STATUS.ACTIVE),
      eq(automationWorkflows.triggerType, eventType),
      ...(organizationFilter ? [organizationFilter] : []),
    ];
    return await db.select().from(automationWorkflows).where(and(...conditions)).limit(100);
  }

  private async currentVersionForWorkflow(workflow: Workflow) {
    const [version] = await db.select().from(automationWorkflowVersions)
      .where(and(eq(automationWorkflowVersions.workflowId, workflow.id), eq(automationWorkflowVersions.version, workflow.currentVersion)))
      .limit(1);
    return version ?? null;
  }

  private async createRunForEvent(workflow: Workflow, version: WorkflowVersion, event: AutomationEvent) {
    const input = maskSensitive({ eventType: event.eventType, eventId: event.eventId, payload: event.payload }) as JsonObject;
    try {
      const [run] = await db.insert(automationRuns).values({
        workflowId: workflow.id,
        workflowVersionId: version.id,
        automationEventId: event.id,
        status: AUTOMATION_RUN_STATUS.QUEUED,
        input,
      }).returning();
      return { workflowId: workflow.id, runId: run.id, status: run.status, duplicate: false };
    } catch (error) {
      if (hasErrorCode(error, '23505')) {
        const [run] = await db.select().from(automationRuns)
          .where(and(eq(automationRuns.workflowVersionId, version.id), eq(automationRuns.automationEventId, event.id)))
          .limit(1);
        return { workflowId: workflow.id, runId: run?.id ?? null, status: run?.status ?? 'unknown', duplicate: true };
      }
      throw error;
    }
  }

  private nextRetryDate(attemptCount: number) {
    const delayMs = Math.min(60 * 60 * 1000, Math.pow(2, Math.max(0, attemptCount - 1)) * 60 * 1000);
    return new Date(Date.now() + delayMs);
  }

  private async executeRun(runId: string) {
    const [run] = await db.select().from(automationRuns).where(eq(automationRuns.id, runId)).limit(1);
    if (!run) throw new NotFoundException('Run introuvable');
    const [event] = run.automationEventId
      ? await db.select().from(automationEvents).where(eq(automationEvents.id, run.automationEventId)).limit(1)
      : [];
    const [version] = await db.select().from(automationWorkflowVersions).where(eq(automationWorkflowVersions.id, run.workflowVersionId)).limit(1);
    const [workflow] = await db.select().from(automationWorkflows).where(eq(automationWorkflows.id, run.workflowId)).limit(1);
    if (!event || !version || !workflow) throw new NotFoundException('Contexte de run introuvable');

    const attemptCount = run.attemptCount + 1;
    await db.update(automationRuns).set({
      status: AUTOMATION_RUN_STATUS.RUNNING,
      attemptCount,
      startedAt: run.startedAt ?? new Date(),
      updatedAt: sql`NOW()`,
    }).where(eq(automationRuns.id, run.id));

    const definition = automationDefinitionSchema.parse(version.definition);
    const context = buildContext(event);
    const stepOutputs: Record<string, unknown> = {};

    try {
      for (const step of definition.steps) {
        const result = await this.executeStep(run, workflow, event, step, context);
        stepOutputs[step.id] = result.output;
        context.steps = { ...(context.steps as JsonObject | undefined), [step.id]: result.output };
        if (result.halt) {
          const [updated] = await db.update(automationRuns).set({
            status: AUTOMATION_RUN_STATUS.SKIPPED,
            output: maskSensitive({ reason: result.reason, steps: stepOutputs }) as JsonObject,
            finishedAt: new Date(),
            updatedAt: sql`NOW()`,
          }).where(eq(automationRuns.id, run.id)).returning();
          return updated;
        }
      }
      const [updated] = await db.update(automationRuns).set({
        status: AUTOMATION_RUN_STATUS.SUCCEEDED,
        output: maskSensitive({ steps: stepOutputs }) as JsonObject,
        error: null,
        nextAttemptAt: null,
        finishedAt: new Date(),
        updatedAt: sql`NOW()`,
      }).where(eq(automationRuns.id, run.id)).returning();
      this.audit({
        actorEmail: null,
        action: 'automations.run.succeeded',
        entityType: 'automation_run',
        entityId: updated.id,
        organizationId: workflow.organizationId,
        metadata: { workflowId: workflow.id, version: version.version, eventType: event.eventType },
      });
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'automation_run_failed';
      this.logger.warn('Automation run failed', { runId: run.id, workflowId: workflow.id, error: message });
      const shouldRetry = attemptCount < run.maxAttempts;
      const [updated] = await db.update(automationRuns).set({
        status: shouldRetry ? AUTOMATION_RUN_STATUS.QUEUED : AUTOMATION_RUN_STATUS.FAILED,
        error: message,
        nextAttemptAt: shouldRetry ? this.nextRetryDate(attemptCount) : null,
        finishedAt: shouldRetry ? null : new Date(),
        updatedAt: sql`NOW()`,
      }).where(eq(automationRuns.id, run.id)).returning();
      this.audit({
        actorEmail: null,
        action: shouldRetry ? 'automations.run.retry_scheduled' : 'automations.run.failed',
        entityType: 'automation_run',
        entityId: updated.id,
        organizationId: workflow.organizationId,
        metadata: { workflowId: workflow.id, version: version.version, eventType: event.eventType, error: message },
      });
      return updated;
    }
  }

  private async executeStep(run: AutomationRun, workflow: Workflow, event: AutomationEvent, step: AutomationStep, context: JsonObject) {
    const renderedConfig = renderValue(step.config, context) as JsonObject;
    const [stepRun] = await db.insert(automationStepRuns).values({
      runId: run.id,
      stepId: step.id,
      stepType: step.type,
      status: AUTOMATION_STEP_STATUS.RUNNING,
      input: maskSensitive(renderedConfig) as JsonObject,
      startedAt: new Date(),
    }).returning();

    try {
      const output = await this.executeStepAction(workflow, event, step, renderedConfig, context);
      const status = output.halt ? AUTOMATION_STEP_STATUS.SKIPPED : AUTOMATION_STEP_STATUS.SUCCEEDED;
      await db.update(automationStepRuns).set({
        status,
        output: maskSensitive(output.output ?? {}) as JsonObject,
        finishedAt: new Date(),
      }).where(eq(automationStepRuns.id, stepRun.id));
      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'automation_step_failed';
      await db.update(automationStepRuns).set({
        status: AUTOMATION_STEP_STATUS.FAILED,
        error: message,
        finishedAt: new Date(),
      }).where(eq(automationStepRuns.id, stepRun.id));
      if (step.onError === 'continue') return { output: { error: message, continued: true }, halt: false };
      throw error;
    }
  }

  private async executeStepAction(workflow: Workflow, event: AutomationEvent, step: AutomationStep, config: JsonObject, context: JsonObject): Promise<{ output: JsonObject; halt?: boolean; reason?: string }> {
    if (step.type === AUTOMATION_STEP_TYPE.CONDITION) {
      const all = Array.isArray(config.all) ? config.all : [];
      const anyConditions = Array.isArray(config.any) ? config.any : [];
      const allOk = all.length === 0 || all.every((item) => this.evaluateCondition(item, context));
      const anyOk = anyConditions.length === 0 || anyConditions.some((item) => this.evaluateCondition(item, context));
      const passed = allOk && anyOk;
      return passed
        ? { output: { passed: true } }
        : { output: { passed: false }, halt: true, reason: `condition_failed:${step.id}` };
    }

    if (step.type === AUTOMATION_STEP_TYPE.WEBHOOK_EMIT) {
      const eventType = typeof config.eventType === 'string' ? config.eventType : `automation.${workflow.id}.${step.id}`;
      const data = config.data && typeof config.data === 'object' && !Array.isArray(config.data) ? config.data as JsonObject : { workflowId: workflow.id, runEventId: event.eventId };
      const result = await this.integrationsService.emitOutboundEvent(eventType, {
        workflowId: workflow.id,
        stepId: step.id,
        sourceEventType: event.eventType,
        sourceEventId: event.eventId,
        ...data,
      });
      return { output: { eventType, deliveries: result.data } };
    }

    if (step.type === AUTOMATION_STEP_TYPE.MEMBER_TASK_CREATE) {
      const task = insertMemberTaskSchema.parse({
        memberEmail: config.memberEmail,
        title: config.title,
        description: config.description,
        taskType: config.taskType ?? 'custom',
        status: config.status ?? 'todo',
        dueDate: config.dueDate,
        assignedTo: config.assignedTo,
        createdBy: config.createdBy ?? 'automation@komuno.local',
      });
      const result = await this.storageService.instance.createTask(task);
      if (!result.success) throw ('error' in result ? result.error : new Error('Task creation failed'));
      return { output: { taskId: result.data.id, memberEmail: result.data.memberEmail } };
    }

    if (step.type === AUTOMATION_STEP_TYPE.AUDIT_RECORD) {
      this.audit({
        actorEmail: null,
        action: typeof config.action === 'string' ? config.action : 'automations.step.audit_record',
        entityType: typeof config.entityType === 'string' ? config.entityType : 'automation_workflow',
        entityId: typeof config.entityId === 'string' ? config.entityId : workflow.id,
        organizationId: workflow.organizationId,
        metadata: {
          workflowId: workflow.id,
          stepId: step.id,
          sourceEventType: event.eventType,
          sourceEventId: event.eventId,
          ...(config.metadata && typeof config.metadata === 'object' && !Array.isArray(config.metadata) ? config.metadata as JsonObject : {}),
        },
      });
      return { output: { recorded: true } };
    }

    if (step.type === AUTOMATION_STEP_TYPE.NOOP) {
      return { output: { noop: true, message: typeof config.message === 'string' ? config.message : undefined } };
    }

    throw new BadRequestException(`Type d’étape non supporté: ${step.type}`);
  }

  private evaluateCondition(input: unknown, context: JsonObject) {
    const condition = automationConditionSchema.parse(input);
    const actual = getPath(context, condition.path);
    return compareValues(actual, condition.operator, condition.value);
  }
}
