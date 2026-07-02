import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { z, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '../../db';
import { AuditService } from '../audit/audit.service';
import { AutomationsService } from '../automations/automations.service';
import { FederationService } from '../federation/federation.service';
import {
  FEDERATION_STATUS,
  FEDERATION_VISIBILITY,
  TRAINING_INTEREST_STATUS,
  TRAINING_PROGRAM_STATUS,
  TRAINING_SESSION_STATUS,
  TRAINING_SYNC_DIRECTION,
  TRAINING_SYNC_STATUS,
  SYNDICATION_DIRECTION,
  insertTrainingProgramSchema,
  insertTrainingSessionSchema,
  insertTrainingSyncRunSchema,
  submitTrainingInterestSchema,
  trainingInterests,
  trainingPrograms,
  trainingSessions,
  trainingSyncRuns,
  organizations,
  updateTrainingInterestStatusSchema,
  updateTrainingProgramSchema,
  updateTrainingSessionSchema,
} from '../../../shared/schema';

type TrainingProgram = typeof trainingPrograms.$inferSelect;
type TrainingSession = typeof trainingSessions.$inferSelect;
type TrainingInterest = typeof trainingInterests.$inferSelect;

type ListTrainingFilters = {
  status?: string;
  search?: string;
  includeArchived?: boolean;
};

type ListInterestFilters = {
  trainingId?: string;
  sessionId?: string;
  status?: string;
  sourceOrganizationId?: string;
  limit?: number;
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'formation';
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[";\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function zodToBadRequest(error: unknown) {
  if (error instanceof ZodError) {
    return new BadRequestException(fromZodError(error).message);
  }
  return error;
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}

const federatedOrganizationSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(200),
  type: z.string().min(2).max(40),
  domain: z.string().max(255).optional().nullable(),
  instanceUrl: z.string().url().optional().nullable(),
});

const federatedTrainingCatalogPayloadSchema = z.object({
  protocolVersion: z.literal(1).default(1),
  direction: z.literal(SYNDICATION_DIRECTION.DOWNWARD),
  sourceInstanceUrl: z.string().url(),
  sentAt: z.string().datetime(),
  sourceOrganization: federatedOrganizationSchema,
  targetOrganization: federatedOrganizationSchema,
  training: z.object({
    id: z.string().uuid(),
    slug: z.string().min(3).max(140),
    title: z.string().min(3).max(220),
    description: z.string().max(5000).optional().nullable(),
    category: z.string().max(160).optional().nullable(),
    audience: z.string().max(240).optional().nullable(),
    objectives: z.array(z.string().max(240)).default([]),
    status: z.string(),
    version: z.number().int().min(1),
    sessions: z.array(z.object({
      id: z.string().uuid(),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime().optional().nullable(),
      locationName: z.string().max(240).optional().nullable(),
      locationAddress: z.string().max(500).optional().nullable(),
      city: z.string().max(160).optional().nullable(),
      capacity: z.number().int().min(1).optional().nullable(),
      status: z.string(),
    })).default([]),
  }),
});

const federatedTrainingInterestPayloadSchema = z.object({
  protocolVersion: z.literal(1).default(1),
  direction: z.literal(SYNDICATION_DIRECTION.UPWARD),
  sourceInstanceUrl: z.string().url(),
  sentAt: z.string().datetime(),
  sourceOrganization: federatedOrganizationSchema,
  targetOrganization: federatedOrganizationSchema,
  canonicalTrainingId: z.string().uuid(),
  canonicalTrainingSourceInstanceUrl: z.string().url().optional().nullable(),
  interest: z.object({
    id: z.string().uuid(),
    sessionSourceId: z.string().uuid().optional().nullable(),
    respondentName: z.string().min(2).max(200),
    respondentEmail: z.string().email().max(240),
    company: z.string().max(200).optional().nullable(),
    phone: z.string().max(80).optional().nullable(),
    memberEmail: z.string().email().optional().nullable(),
    consentAccepted: z.literal(true),
    message: z.string().max(2000).optional().nullable(),
    status: z.string(),
    createdAt: z.string().datetime(),
  }),
});

@Injectable()
export class TrainingsService {
  private readonly logger = new Logger(TrainingsService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly automationsService: AutomationsService,
    private readonly federationService: FederationService,
  ) {}

  private async audit(action: string, actor: string | undefined, entityType: string, entityId: string, details: Record<string, unknown> = {}) {
    try {
      await this.auditService.record({
        action,
        actorEmail: actor || 'system',
        entityType,
        entityId,
        metadata: details,
      });
    } catch (error) {
      this.logger.warn(`Audit trainings failed for ${action}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async emitAutomationEvent(type: string, payload: Record<string, unknown>) {
    try {
      await this.automationsService.emitEvent(type, payload as any, {
        source: 'trainings',
        eventId: payload.id ? `${type}:${String(payload.id)}` : undefined,
      });
    } catch (error) {
      this.logger.warn(`Automation event ${type} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listPrograms(filters: ListTrainingFilters = {}) {
    const conditions = [];
    if (filters.status) {
      conditions.push(eq(trainingPrograms.status, filters.status));
    } else if (!filters.includeArchived) {
      conditions.push(sql`${trainingPrograms.status} != ${TRAINING_PROGRAM_STATUS.ARCHIVED}`);
    }
    if (filters.search) {
      const like = `%${filters.search}%`;
      conditions.push(or(ilike(trainingPrograms.title, like), ilike(trainingPrograms.category, like), ilike(trainingPrograms.audience, like))!);
    }

    const programs = await db
      .select()
      .from(trainingPrograms)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(trainingPrograms.updatedAt));

    return this.attachProgramDetails(programs);
  }

  async listPublicPrograms() {
    const now = new Date();
    const programs = await db
      .selectDistinct({ program: trainingPrograms })
      .from(trainingPrograms)
      .innerJoin(trainingSessions, eq(trainingSessions.trainingId, trainingPrograms.id))
      .where(and(
        eq(trainingPrograms.status, TRAINING_PROGRAM_STATUS.PUBLISHED),
        eq(trainingSessions.status, TRAINING_SESSION_STATUS.SCHEDULED),
        sql`${trainingSessions.startsAt} >= ${now}`,
      ))
      .orderBy(asc(trainingPrograms.title));

    return this.attachProgramDetails(programs.map(row => row.program), true);
  }

  async getProgram(id: string) {
    const [program] = await db.select().from(trainingPrograms).where(eq(trainingPrograms.id, id)).limit(1);
    if (!program) throw new NotFoundException('Formation introuvable');
    const [details] = await this.attachProgramDetails([program]);
    return details;
  }

  async createProgram(payload: unknown, actor?: string) {
    try {
      const parsed = insertTrainingProgramSchema.parse(payload);
      const slug = parsed.slug || slugify(parsed.title);
      const [created] = await db.insert(trainingPrograms).values({
        ...parsed,
        slug,
        createdBy: actor,
        updatedBy: actor,
        originOrganizationId: parsed.originOrganizationId ?? parsed.organizationId ?? null,
        federationStatus: parsed.federationStatus ?? FEDERATION_STATUS.LOCAL_ONLY,
        federationVisibility: parsed.federationVisibility ?? FEDERATION_VISIBILITY.LOCAL,
      }).returning();
      await this.audit('training.created', actor, 'training_program', created.id, { title: created.title, status: created.status });
      await this.emitAutomationEvent('training.created', { id: created.id, title: created.title, status: created.status });
      return this.getProgram(created.id);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Une formation avec ce slug existe déjà');
      throw zodToBadRequest(error);
    }
  }

  async updateProgram(id: string, payload: unknown, actor?: string) {
    const existing = await this.ensureProgram(id);
    try {
      const parsed = updateTrainingProgramSchema.parse(payload);
      const update: Partial<typeof trainingPrograms.$inferInsert> = {
        ...parsed,
        updatedBy: actor,
        version: existing.version + 1,
        updatedAt: new Date(),
      };
      if (parsed.title && !parsed.slug) update.slug = existing.slug;
      const [updated] = await db.update(trainingPrograms).set(update).where(eq(trainingPrograms.id, id)).returning();
      await this.audit('training.updated', actor, 'training_program', id, { title: updated.title, status: updated.status });
      return this.getProgram(id);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Une formation avec ce slug existe déjà');
      throw zodToBadRequest(error);
    }
  }

  async publishProgram(id: string, actor?: string) {
    await this.ensureProgram(id);
    const [updated] = await db.update(trainingPrograms).set({
      status: TRAINING_PROGRAM_STATUS.PUBLISHED,
      updatedBy: actor,
      updatedAt: new Date(),
      version: sql`${trainingPrograms.version} + 1` as unknown as number,
    }).where(eq(trainingPrograms.id, id)).returning();
    await this.audit('training.published', actor, 'training_program', id, { title: updated.title });
    return this.getProgram(id);
  }

  async archiveProgram(id: string, actor?: string) {
    await this.ensureProgram(id);
    const [updated] = await db.update(trainingPrograms).set({
      status: TRAINING_PROGRAM_STATUS.ARCHIVED,
      updatedBy: actor,
      updatedAt: new Date(),
      version: sql`${trainingPrograms.version} + 1` as unknown as number,
    }).where(eq(trainingPrograms.id, id)).returning();
    await this.audit('training.archived', actor, 'training_program', id, { title: updated.title });
    return this.getProgram(id);
  }

  async createSession(trainingId: string, payload: unknown, actor?: string) {
    await this.ensureProgram(trainingId);
    try {
      const input = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
      const parsed = insertTrainingSessionSchema.parse({ ...input, trainingId });
      if (parsed.endsAt && new Date(parsed.endsAt) <= new Date(parsed.startsAt)) {
        throw new BadRequestException('La date de fin doit être après la date de début');
      }
      const [created] = await db.insert(trainingSessions).values({
        ...parsed,
        startsAt: new Date(parsed.startsAt),
        endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      }).returning();
      await db.update(trainingPrograms).set({ updatedAt: new Date(), version: sql`${trainingPrograms.version} + 1` as unknown as number }).where(eq(trainingPrograms.id, trainingId));
      await this.audit('training.session.created', actor, 'training_session', created.id, { trainingId, startsAt: created.startsAt });
      await this.emitAutomationEvent('training.session.created', { id: created.id, trainingId, startsAt: created.startsAt?.toISOString() });
      return created;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (isUniqueViolation(error)) throw new ConflictException('Cette date existe déjà pour cette formation');
      throw zodToBadRequest(error);
    }
  }

  async updateSession(sessionId: string, payload: unknown, actor?: string) {
    const [existing] = await db.select().from(trainingSessions).where(eq(trainingSessions.id, sessionId)).limit(1);
    if (!existing) throw new NotFoundException('Date de formation introuvable');
    try {
      const parsed = updateTrainingSessionSchema.parse(payload);
      const startsAt = parsed.startsAt ? new Date(parsed.startsAt) : existing.startsAt;
      const endsAt = parsed.endsAt ? new Date(parsed.endsAt) : parsed.endsAt === null ? null : existing.endsAt;
      if (endsAt && endsAt <= startsAt) {
        throw new BadRequestException('La date de fin doit être après la date de début');
      }
      const [updated] = await db.update(trainingSessions).set({
        ...parsed,
        startsAt,
        endsAt,
        updatedAt: new Date(),
      }).where(eq(trainingSessions.id, sessionId)).returning();
      await db.update(trainingPrograms).set({ updatedAt: new Date(), version: sql`${trainingPrograms.version} + 1` as unknown as number }).where(eq(trainingPrograms.id, existing.trainingId));
      await this.audit('training.session.updated', actor, 'training_session', sessionId, { trainingId: existing.trainingId, status: updated.status });
      return updated;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw zodToBadRequest(error);
    }
  }

  async submitInterest(payload: unknown) {
    try {
      const parsed = submitTrainingInterestSchema.parse(payload);
      const program = await this.ensureProgram(parsed.trainingId);
      if (program.status !== TRAINING_PROGRAM_STATUS.PUBLISHED) {
        throw new BadRequestException('Cette formation n’est pas ouverte aux manifestations d’intérêt');
      }

      const sessionIds = parsed.interestWithoutSession ? [null] : parsed.sessionIds;
      const created: TrainingInterest[] = [];
      const skipped: Array<{ sessionId: string | null; reason: string }> = [];

      for (const sessionId of sessionIds) {
        if (sessionId) {
          const [session] = await db
            .select()
            .from(trainingSessions)
            .where(and(
              eq(trainingSessions.id, sessionId),
              eq(trainingSessions.trainingId, parsed.trainingId),
              eq(trainingSessions.status, TRAINING_SESSION_STATUS.SCHEDULED),
            ))
            .limit(1);
          if (!session) {
            skipped.push({ sessionId, reason: 'session_unavailable' });
            continue;
          }
        }

        const duplicateConditions = [
          eq(trainingInterests.trainingId, parsed.trainingId),
          eq(trainingInterests.respondentEmail, parsed.respondentEmail),
          parsed.sourceOrganizationId ? eq(trainingInterests.sourceOrganizationId, parsed.sourceOrganizationId) : isNull(trainingInterests.sourceOrganizationId),
          sessionId ? eq(trainingInterests.sessionId, sessionId) : isNull(trainingInterests.sessionId),
        ];
        const [duplicate] = await db.select().from(trainingInterests).where(and(...duplicateConditions)).limit(1);
        if (duplicate) {
          skipped.push({ sessionId, reason: 'duplicate' });
          continue;
        }

        try {
          const [interest] = await db.insert(trainingInterests).values({
            trainingId: parsed.trainingId,
            sessionId,
            respondentName: parsed.respondentName,
            respondentEmail: parsed.respondentEmail,
            company: parsed.company ?? null,
            phone: parsed.phone ?? null,
            memberEmail: parsed.memberEmail ?? null,
            sourceOrganizationId: parsed.sourceOrganizationId ?? null,
            consentAccepted: parsed.consentAccepted,
            message: parsed.message ?? null,
            status: TRAINING_INTEREST_STATUS.NEW,
          }).returning();
          created.push(interest);
          await this.emitAutomationEvent('training.interest.created', {
            id: interest.id,
            trainingId: interest.trainingId,
            sessionId: interest.sessionId,
            respondentEmail: interest.respondentEmail,
            sourceOrganizationId: interest.sourceOrganizationId,
          });
        } catch (error) {
          if (isUniqueViolation(error)) skipped.push({ sessionId, reason: 'duplicate' });
          else throw error;
        }
      }

      if (created.length === 0 && skipped.every(item => item.reason === 'duplicate')) {
        return { created: [], skipped, duplicate: true };
      }

      await this.audit('training.interest.created', 'public', 'training_program', parsed.trainingId, {
        createdCount: created.length,
        skippedCount: skipped.length,
        sessions: sessionIds,
      });

      return { created, skipped, duplicate: false };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw zodToBadRequest(error);
    }
  }

  async listInterests(filters: ListInterestFilters = {}) {
    const limit = Math.min(Math.max(filters.limit || 200, 1), 1000);
    const conditions = [];
    if (filters.trainingId) conditions.push(eq(trainingInterests.trainingId, filters.trainingId));
    if (filters.sessionId) conditions.push(eq(trainingInterests.sessionId, filters.sessionId));
    if (filters.status) conditions.push(eq(trainingInterests.status, filters.status));
    if (filters.sourceOrganizationId) conditions.push(eq(trainingInterests.sourceOrganizationId, filters.sourceOrganizationId));

    const rows = await db
      .select({ interest: trainingInterests, program: trainingPrograms, session: trainingSessions })
      .from(trainingInterests)
      .innerJoin(trainingPrograms, eq(trainingPrograms.id, trainingInterests.trainingId))
      .leftJoin(trainingSessions, eq(trainingSessions.id, trainingInterests.sessionId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(trainingInterests.createdAt))
      .limit(limit);

    return rows.map(row => ({ ...row.interest, training: row.program, session: row.session }));
  }

  async updateInterestStatus(id: string, payload: unknown, actor?: string) {
    try {
      const parsed = updateTrainingInterestStatusSchema.parse(payload);
      const [updated] = await db.update(trainingInterests).set({ status: parsed.status, updatedAt: new Date() }).where(eq(trainingInterests.id, id)).returning();
      if (!updated) throw new NotFoundException('Manifestation d’intérêt introuvable');
      await this.audit('training.interest.status_changed', actor, 'training_interest', id, { status: parsed.status });
      await this.emitAutomationEvent('training.interest.status_changed', { id, trainingId: updated.trainingId, status: parsed.status });
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw zodToBadRequest(error);
    }
  }

  async exportInterestsCsv(filters: ListInterestFilters = {}, actor?: string) {
    const rows = await this.listInterests({ ...filters, limit: filters.limit || 1000 });
    const header = [
      'interest_id',
      'created_at',
      'status',
      'training_title',
      'session_starts_at',
      'session_city',
      'respondent_name',
      'respondent_email',
      'company',
      'phone',
      'member_email',
      'source_organization_id',
      'consent_accepted',
      'message',
    ];
    const lines = [header.join(';')];
    for (const row of rows) {
      lines.push([
        row.id,
        row.createdAt,
        row.status,
        row.training?.title,
        row.session?.startsAt,
        row.session?.city,
        row.respondentName,
        row.respondentEmail,
        row.company,
        row.phone,
        row.memberEmail,
        row.sourceOrganizationId,
        row.consentAccepted,
        row.message,
      ].map(csvEscape).join(';'));
    }
    await this.audit('training.interests.exported', actor, 'training_interest', 'export', {
      count: rows.length,
      filters,
    });
    return lines.join('\n') + '\n';
  }

  async listSyncRuns(limit = 50) {
    return db.select().from(trainingSyncRuns).orderBy(desc(trainingSyncRuns.startedAt)).limit(Math.min(Math.max(limit, 1), 200));
  }

  async recordLocalSyncRun(payload: unknown, actor?: string) {
    try {
      const parsed = insertTrainingSyncRunSchema.parse({
        direction: TRAINING_SYNC_DIRECTION.DOWNSTREAM_CATALOG,
        status: TRAINING_SYNC_STATUS.SUCCESS,
        metadata: { mode: 'local_foundation', note: 'Explicit federation primitives ready; no remote relation executed from this endpoint.' },
        ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload as Record<string, unknown> : {}),
      });
      const [run] = await db.insert(trainingSyncRuns).values({ ...parsed, finishedAt: new Date() }).returning();
      await this.audit('training.sync.run_recorded', actor, 'training_sync_run', run.id, { direction: run.direction, status: run.status });
      return run;
    } catch (error) {
      throw zodToBadRequest(error);
    }
  }


  async syncCatalogDownward(trainingId: string, body: unknown, actor?: string) {
    const input = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
    const targetOrganizationId = typeof input.targetOrganizationId === 'string' ? input.targetOrganizationId : undefined;
    const sourceOrganizationId = typeof input.sourceOrganizationId === 'string' ? input.sourceOrganizationId : undefined;
    if (!targetOrganizationId) throw new BadRequestException('targetOrganizationId est requis');

    const program = await this.ensureProgram(trainingId);
    const sourceOrgId = sourceOrganizationId ?? program.organizationId ?? program.originOrganizationId;
    if (!sourceOrgId) throw new BadRequestException('sourceOrganizationId est requis pour synchroniser une formation');
    const sourceOrganization = await this.getOrganizationOrThrow(sourceOrgId);
    const transport = await this.federationService.getOutboundFederationTransport({
      sourceOrganizationId: sourceOrgId,
      targetOrganizationId,
      direction: SYNDICATION_DIRECTION.DOWNWARD,
    });
    const details = await this.getProgram(trainingId) as TrainingProgram & { sessions: TrainingSession[] };
    const sourceInstanceUrl = sourceOrganization.instanceUrl || process.env.PUBLIC_APP_URL || process.env.APP_URL;
    if (!sourceInstanceUrl) throw new BadRequestException('URL de l’instance source indisponible');

    const payload = {
      protocolVersion: 1,
      direction: SYNDICATION_DIRECTION.DOWNWARD,
      sourceInstanceUrl,
      sentAt: new Date().toISOString(),
      sourceOrganization: this.organizationPayload(sourceOrganization),
      targetOrganization: this.organizationPayload(transport.targetOrganization),
      training: {
        id: details.id,
        slug: details.slug,
        title: details.title,
        description: details.description,
        category: details.category,
        audience: details.audience,
        objectives: details.objectives ?? [],
        status: details.status,
        version: details.version,
        sessions: details.sessions.map(session => ({
          id: session.id,
          startsAt: session.startsAt instanceof Date ? session.startsAt.toISOString() : new Date(session.startsAt).toISOString(),
          endsAt: session.endsAt ? (session.endsAt instanceof Date ? session.endsAt.toISOString() : new Date(session.endsAt).toISOString()) : null,
          locationName: session.locationName,
          locationAddress: session.locationAddress,
          city: session.city,
          capacity: session.capacity,
          status: session.status,
        })),
      },
    };

    const endpoint = `${transport.targetInstanceUrl.replace(/\/$/, '')}/api/federation/trainings/catalog/ingest`;
    const runValues = {
      direction: TRAINING_SYNC_DIRECTION.DOWNSTREAM_CATALOG,
      status: TRAINING_SYNC_STATUS.RUNNING,
      sourceOrganizationId: sourceOrgId,
      targetOrganizationId,
      relationId: transport.relation.id,
      metadata: { endpoint, trainingId },
    };
    const [run] = await db.insert(trainingSyncRuns).values(runValues).returning();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Komuno-Federation-Token': transport.token },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const responseText = await response.text();
      if (!response.ok) throw new Error(responseText || `HTTP ${response.status}`);
      const [updatedRun] = await db.update(trainingSyncRuns).set({
        status: TRAINING_SYNC_STATUS.SUCCESS,
        pushedCount: 1,
        finishedAt: new Date(),
        metadata: { endpoint, trainingId, responseStatus: response.status },
      }).where(eq(trainingSyncRuns.id, run.id)).returning();
      await this.audit('training.sync.catalog_downward', actor, 'training_sync_run', updatedRun.id, { trainingId, targetOrganizationId });
      return updatedRun;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const [failedRun] = await db.update(trainingSyncRuns).set({
        status: TRAINING_SYNC_STATUS.FAILED,
        errorCount: 1,
        error: message.slice(0, 2000),
        finishedAt: new Date(),
        metadata: { endpoint, trainingId },
      }).where(eq(trainingSyncRuns.id, run.id)).returning();
      return failedRun;
    }
  }

  async ingestFederatedCatalog(data: unknown, token?: string) {
    try {
      if (!token?.trim()) throw new UnauthorizedException('Token de fédération manquant');
      const payload = federatedTrainingCatalogPayloadSchema.parse(data);
      const context = await this.federationService.verifyFederationIngestContext({
        token,
        sourceOrganizationSlug: payload.sourceOrganization.slug,
        targetOrganizationSlug: payload.targetOrganization.slug,
        direction: payload.direction,
        sourceInstanceUrl: payload.sourceInstanceUrl,
      });

      const [existing] = await db.select().from(trainingPrograms).where(and(
        eq(trainingPrograms.sourceInstanceUrl, context.sourceInstanceUrl),
        eq(trainingPrograms.sourceTrainingId, payload.training.id),
      )).limit(1);
      const slug = existing?.slug ?? await this.ensureUniqueTrainingSlug(payload.training.slug);
      const programValues = {
        organizationId: context.targetOrganization.id,
        originOrganizationId: context.sourceOrganization.id,
        sourceInstanceUrl: context.sourceInstanceUrl,
        sourceTrainingId: payload.training.id,
        slug,
        title: payload.training.title,
        description: payload.training.description ?? null,
        category: payload.training.category ?? null,
        audience: payload.training.audience ?? null,
        objectives: payload.training.objectives ?? [],
        status: payload.training.status === TRAINING_PROGRAM_STATUS.PUBLISHED ? TRAINING_PROGRAM_STATUS.PUBLISHED : TRAINING_PROGRAM_STATUS.DRAFT,
        federationVisibility: FEDERATION_VISIBILITY.SELECTED_ORGANIZATIONS,
        federationStatus: FEDERATION_STATUS.IMPORTED,
        version: payload.training.version,
        isFederatedCopy: true,
        canonicalTrainingId: payload.training.id,
        updatedAt: new Date(),
      };

      const [program] = existing
        ? await db.update(trainingPrograms).set(programValues).where(eq(trainingPrograms.id, existing.id)).returning()
        : await db.insert(trainingPrograms).values(programValues).returning();

      for (const session of payload.training.sessions) {
        const [existingSession] = await db.select().from(trainingSessions).where(and(
          eq(trainingSessions.trainingId, program.id),
          eq(trainingSessions.sourceSessionId, session.id),
        )).limit(1);
        const sessionValues = {
          trainingId: program.id,
          sourceSessionId: session.id,
          startsAt: new Date(session.startsAt),
          endsAt: session.endsAt ? new Date(session.endsAt) : null,
          locationName: session.locationName ?? null,
          locationAddress: session.locationAddress ?? null,
          city: session.city ?? null,
          capacity: session.capacity ?? null,
          status: session.status,
          updatedAt: new Date(),
        };
        if (existingSession) {
          await db.update(trainingSessions).set(sessionValues).where(eq(trainingSessions.id, existingSession.id));
        } else {
          await db.insert(trainingSessions).values(sessionValues);
        }
      }

      const [run] = await db.insert(trainingSyncRuns).values({
        direction: TRAINING_SYNC_DIRECTION.DOWNSTREAM_CATALOG,
        status: TRAINING_SYNC_STATUS.SUCCESS,
        sourceOrganizationId: context.sourceOrganization.id,
        targetOrganizationId: context.targetOrganization.id,
        relationId: context.relation.id,
        pulledCount: 1,
        metadata: { sourceTrainingId: payload.training.id },
        finishedAt: new Date(),
      }).returning();
      await this.audit('training.sync.catalog_ingested', 'federation', 'training_program', program.id, { runId: run.id, sourceTrainingId: payload.training.id });
      return { success: true, data: { trainingId: program.id, created: !existing, runId: run.id } };
    } catch (error) {
      throw zodToBadRequest(error);
    }
  }

  async syncInterestUpward(interestId: string, body: unknown, actor?: string) {
    const input = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
    const targetOrganizationId = typeof input.targetOrganizationId === 'string' ? input.targetOrganizationId : undefined;
    const sourceOrganizationId = typeof input.sourceOrganizationId === 'string' ? input.sourceOrganizationId : undefined;
    if (!targetOrganizationId) throw new BadRequestException('targetOrganizationId est requis');

    const [row] = await db.select({ interest: trainingInterests, program: trainingPrograms, session: trainingSessions })
      .from(trainingInterests)
      .innerJoin(trainingPrograms, eq(trainingPrograms.id, trainingInterests.trainingId))
      .leftJoin(trainingSessions, eq(trainingSessions.id, trainingInterests.sessionId))
      .where(eq(trainingInterests.id, interestId))
      .limit(1);
    if (!row) throw new NotFoundException('Manifestation d’intérêt introuvable');
    if (!row.interest.consentAccepted) throw new BadRequestException('Consentement requis pour remonter l’intérêt à la région');
    const sourceOrgId = sourceOrganizationId ?? row.interest.sourceOrganizationId ?? row.program.organizationId;
    if (!sourceOrgId) throw new BadRequestException('sourceOrganizationId est requis pour synchroniser cet intérêt');
    const sourceOrganization = await this.getOrganizationOrThrow(sourceOrgId);
    const transport = await this.federationService.getOutboundFederationTransport({
      sourceOrganizationId: sourceOrgId,
      targetOrganizationId,
      direction: SYNDICATION_DIRECTION.UPWARD,
    });
    const sourceInstanceUrl = sourceOrganization.instanceUrl || process.env.PUBLIC_APP_URL || process.env.APP_URL;
    if (!sourceInstanceUrl) throw new BadRequestException('URL de l’instance source indisponible');
    const canonicalTrainingId = row.program.sourceTrainingId ?? row.program.id;
    const payload = {
      protocolVersion: 1,
      direction: SYNDICATION_DIRECTION.UPWARD,
      sourceInstanceUrl,
      sentAt: new Date().toISOString(),
      sourceOrganization: this.organizationPayload(sourceOrganization),
      targetOrganization: this.organizationPayload(transport.targetOrganization),
      canonicalTrainingId,
      canonicalTrainingSourceInstanceUrl: row.program.sourceInstanceUrl,
      interest: {
        id: row.interest.id,
        sessionSourceId: row.session?.sourceSessionId ?? row.session?.id ?? null,
        respondentName: row.interest.respondentName,
        respondentEmail: row.interest.respondentEmail,
        company: row.interest.company,
        phone: row.interest.phone,
        memberEmail: row.interest.memberEmail,
        consentAccepted: row.interest.consentAccepted,
        message: row.interest.message,
        status: row.interest.status,
        createdAt: (row.interest.createdAt instanceof Date ? row.interest.createdAt : new Date(row.interest.createdAt)).toISOString(),
      },
    };
    const endpoint = `${transport.targetInstanceUrl.replace(/\/$/, '')}/api/federation/trainings/interests/ingest`;
    const [run] = await db.insert(trainingSyncRuns).values({
      direction: TRAINING_SYNC_DIRECTION.UPSTREAM_INTERESTS,
      status: TRAINING_SYNC_STATUS.RUNNING,
      sourceOrganizationId: sourceOrgId,
      targetOrganizationId,
      relationId: transport.relation.id,
      metadata: { endpoint, interestId, canonicalTrainingId },
    }).returning();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Komuno-Federation-Token': transport.token },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const responseText = await response.text();
      if (!response.ok) throw new Error(responseText || `HTTP ${response.status}`);
      await db.update(trainingInterests).set({ syncedToRegionAt: new Date(), updatedAt: new Date() }).where(eq(trainingInterests.id, interestId));
      const [updatedRun] = await db.update(trainingSyncRuns).set({
        status: TRAINING_SYNC_STATUS.SUCCESS,
        pushedCount: 1,
        finishedAt: new Date(),
        metadata: { endpoint, interestId, canonicalTrainingId, responseStatus: response.status },
      }).where(eq(trainingSyncRuns.id, run.id)).returning();
      await this.audit('training.sync.interest_upward', actor, 'training_sync_run', updatedRun.id, { interestId, targetOrganizationId });
      return updatedRun;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const [failedRun] = await db.update(trainingSyncRuns).set({
        status: TRAINING_SYNC_STATUS.FAILED,
        errorCount: 1,
        error: message.slice(0, 2000),
        finishedAt: new Date(),
        metadata: { endpoint, interestId, canonicalTrainingId },
      }).where(eq(trainingSyncRuns.id, run.id)).returning();
      return failedRun;
    }
  }

  async ingestFederatedInterest(data: unknown, token?: string) {
    try {
      if (!token?.trim()) throw new UnauthorizedException('Token de fédération manquant');
      const payload = federatedTrainingInterestPayloadSchema.parse(data);
      const context = await this.federationService.verifyFederationIngestContext({
        token,
        sourceOrganizationSlug: payload.sourceOrganization.slug,
        targetOrganizationSlug: payload.targetOrganization.slug,
        direction: payload.direction,
        sourceInstanceUrl: payload.sourceInstanceUrl,
      });
      const [training] = await db.select().from(trainingPrograms).where(or(
        eq(trainingPrograms.id, payload.canonicalTrainingId),
        and(
          eq(trainingPrograms.sourceTrainingId, payload.canonicalTrainingId),
          payload.canonicalTrainingSourceInstanceUrl
            ? eq(trainingPrograms.sourceInstanceUrl, payload.canonicalTrainingSourceInstanceUrl)
            : isNull(trainingPrograms.sourceInstanceUrl),
        ),
      )).limit(1);
      if (!training) throw new NotFoundException('Formation canonique introuvable pour cette remontée');

      const [session] = payload.interest.sessionSourceId
        ? await db.select().from(trainingSessions).where(and(
          eq(trainingSessions.trainingId, training.id),
          or(eq(trainingSessions.sourceSessionId, payload.interest.sessionSourceId), eq(trainingSessions.id, payload.interest.sessionSourceId))!,
        )).limit(1)
        : [];

      const [existing] = await db.select().from(trainingInterests).where(and(
        eq(trainingInterests.sourceInstanceUrl, context.sourceInstanceUrl),
        eq(trainingInterests.sourceInterestId, payload.interest.id),
      )).limit(1);
      const values = {
        trainingId: training.id,
        sessionId: session?.id ?? null,
        respondentName: payload.interest.respondentName,
        respondentEmail: payload.interest.respondentEmail,
        company: payload.interest.company ?? null,
        phone: payload.interest.phone ?? null,
        memberEmail: payload.interest.memberEmail ?? null,
        sourceOrganizationId: context.sourceOrganization.id,
        sourceInstanceUrl: context.sourceInstanceUrl,
        sourceInterestId: payload.interest.id,
        consentAccepted: true,
        message: payload.interest.message ?? null,
        status: payload.interest.status,
        updatedAt: new Date(),
      };
      const [interest] = existing
        ? await db.update(trainingInterests).set(values).where(eq(trainingInterests.id, existing.id)).returning()
        : await db.insert(trainingInterests).values(values).returning();

      const [run] = await db.insert(trainingSyncRuns).values({
        direction: TRAINING_SYNC_DIRECTION.UPSTREAM_INTERESTS,
        status: TRAINING_SYNC_STATUS.SUCCESS,
        sourceOrganizationId: context.sourceOrganization.id,
        targetOrganizationId: context.targetOrganization.id,
        relationId: context.relation.id,
        pulledCount: 1,
        metadata: { sourceInterestId: payload.interest.id, canonicalTrainingId: payload.canonicalTrainingId },
        finishedAt: new Date(),
      }).returning();
      await this.audit('training.sync.interest_ingested', 'federation', 'training_interest', interest.id, { runId: run.id, sourceInterestId: payload.interest.id });
      return { success: true, data: { interestId: interest.id, created: !existing, runId: run.id } };
    } catch (error) {
      throw zodToBadRequest(error);
    }
  }

  private async getOrganizationOrThrow(id: string) {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    if (!organization) throw new NotFoundException('Organisation introuvable');
    return organization;
  }

  private organizationPayload(organization: typeof organizations.$inferSelect) {
    return {
      slug: organization.slug,
      name: organization.name,
      type: organization.type,
      domain: organization.domain,
      instanceUrl: organization.instanceUrl,
    };
  }

  private async ensureUniqueTrainingSlug(baseSlug: string) {
    const base = slugify(baseSlug || 'formation');
    for (let index = 0; index < 50; index += 1) {
      const candidate = index === 0 ? base : `${base}-${index + 1}`;
      const [existing] = await db.select({ id: trainingPrograms.id }).from(trainingPrograms).where(eq(trainingPrograms.slug, candidate)).limit(1);
      if (!existing) return candidate;
    }
    return `${base}-${Date.now()}`;
  }

  private async ensureProgram(id: string) {
    const [program] = await db.select().from(trainingPrograms).where(eq(trainingPrograms.id, id)).limit(1);
    if (!program) throw new NotFoundException('Formation introuvable');
    return program;
  }

  private async attachProgramDetails(programs: TrainingProgram[], publicOnly = false) {
    if (programs.length === 0) return [];
    const ids = programs.map(program => program.id);
    const sessionConditions = [inArray(trainingSessions.trainingId, ids)];
    if (publicOnly) {
      sessionConditions.push(eq(trainingSessions.status, TRAINING_SESSION_STATUS.SCHEDULED));
      sessionConditions.push(sql`${trainingSessions.startsAt} >= ${new Date()}`);
    }
    const sessions = await db
      .select()
      .from(trainingSessions)
      .where(and(...sessionConditions))
      .orderBy(asc(trainingSessions.startsAt));
    const interestCounts = await db
      .select({ trainingId: trainingInterests.trainingId, count: sql<number>`count(*)::int` })
      .from(trainingInterests)
      .where(inArray(trainingInterests.trainingId, ids))
      .groupBy(trainingInterests.trainingId);

    const sessionsByTraining = new Map<string, TrainingSession[]>();
    for (const session of sessions) {
      const list = sessionsByTraining.get(session.trainingId) || [];
      list.push(session);
      sessionsByTraining.set(session.trainingId, list);
    }
    const countsByTraining = new Map(interestCounts.map(row => [row.trainingId, row.count]));
    return programs.map(program => ({
      ...program,
      sessions: sessionsByTraining.get(program.id) || [],
      interestCount: countsByTraining.get(program.id) || 0,
    }));
  }
}
