import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, asc, count, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { z, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '../../db';
import { hasErrorCode } from '../common/utils/error-utils';
import { logger } from '../../lib/logger';
import {
  EVENT_STATUS,
  FEDERATION_STATUS,
  FEDERATION_SYNC_STATUS,
  FEDERATION_VISIBILITY,
  ORGANIZATION_RELATION_TYPE,
  ORGANIZATION_TYPE,
  SURVEY_FORM_STATUS,
  SYNDICATION_DIRECTION,
  SYNDICATION_STATUS,
  eventSyndications,
  events,
  insertEventSyndicationSchema,
  insertOrganizationNetworkSchema,
  insertOrganizationRelationSchema,
  insertOrganizationSchema,
  insertSurveyFormSyndicationSchema,
  organizationNetworks,
  organizationRelations,
  organizations,
  surveyFormResponseSummaries,
  surveyFormSyndications,
  surveyForms,
  surveyQuestions,
  surveyResponses,
  updateEventSyndicationSchema,
  updateOrganizationNetworkSchema,
  updateOrganizationRelationSchema,
  updateOrganizationSchema,
  updateSurveyFormSyndicationSchema,
} from '../../../shared/schema';
import {
  AUTO_SHARE_EVENTS_TO_PARENT_PERMISSION,
  decryptFederationToken,
  encryptFederationToken,
  federationRelationPermissions,
  federationTokenFingerprintFromHash,
  getCurrentFederationInstanceUrl,
  hashFederationToken,
  hostFromFederationUrl,
  isAutoShareEventsToParentEnabledForRelation,
  isFederationOrganizationOnInstance,
  isRemoteFederationInstance,
  normalizeFederationInstanceUrl,
  safeCompareFederationRelationSecret,
  safeCompareFederationToken,
  withoutFederationRelationSecret,
} from './federation.utils';
import { AuditService } from '../audit/audit.service';
import { questionCatalogWithSnapshots, summarizeSurveyQuestion } from '../forms/forms.utils';

const isHttpUrl = (url: string | null | undefined) => {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const httpUrlSchema = z.string().url().refine(isHttpUrl, 'URL HTTP(S) requise');

const federatedOrganizationPayloadSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(200),
  type: z.string().min(2).max(40),
  domain: z.string().max(255).optional().nullable(),
  instanceUrl: httpUrlSchema.optional().nullable(),
});

const federatedEventPayloadSchema = z.object({
  protocolVersion: z.literal(1).default(1),
  direction: z.enum([
    SYNDICATION_DIRECTION.UPWARD,
    SYNDICATION_DIRECTION.DOWNWARD,
    SYNDICATION_DIRECTION.LATERAL,
  ]),
  status: z.enum([
    SYNDICATION_STATUS.DRAFT,
    SYNDICATION_STATUS.PROPOSED,
    SYNDICATION_STATUS.ACCEPTED,
    SYNDICATION_STATUS.REJECTED,
    SYNDICATION_STATUS.REVOKED,
    SYNDICATION_STATUS.AUTO_ACCEPTED,
  ]).default(SYNDICATION_STATUS.PROPOSED),
  includeInAgenda: z.boolean().default(false),
  sourceInstanceUrl: httpUrlSchema,
  sourceSyndicationId: z.string().max(120).optional().nullable(),
  sentAt: z.string().datetime().optional(),
  sourceOrganization: federatedOrganizationPayloadSchema,
  targetOrganization: federatedOrganizationPayloadSchema,
  event: z.object({
    id: z.string().min(1).max(120),
    title: z.string().min(3).max(200),
    description: z.string().max(5000).optional().nullable(),
    date: z.string().datetime(),
    location: z.string().max(200).optional().nullable(),
    maxParticipants: z.number().int().min(1).max(1000).optional().nullable(),
    helloAssoLink: httpUrlSchema.optional().nullable(),
    enableExternalRedirect: z.boolean().optional(),
    externalRedirectUrl: httpUrlSchema.optional().nullable(),
    showInscriptionsCount: z.boolean().optional(),
    showAvailableSeats: z.boolean().optional(),
    allowUnsubscribe: z.boolean().optional(),
    redUnsubscribeButton: z.boolean().optional(),
    buttonMode: z.enum(['subscribe', 'unsubscribe', 'both', 'custom']).optional(),
    customButtonText: z.string().max(50).optional().nullable(),
    status: z.string().max(40).optional(),
    updatedAt: z.string().datetime().optional().nullable(),
  }),
});

type FederatedEventPayload = z.infer<typeof federatedEventPayloadSchema>;

const federatedSurveyQuestionPayloadSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(2).max(500),
  description: z.string().max(1000).optional().nullable(),
  type: z.enum(['text', 'textarea', 'email', 'phone', 'number', 'date', 'select', 'radio', 'multiselect', 'checkbox', 'rating']),
  required: z.boolean().default(false),
  options: z.array(z.object({
    label: z.string().min(1).max(200),
    value: z.string().min(1).max(200),
  })).default([]),
  validation: z.record(z.string(), z.unknown()).default({}),
  orderIndex: z.number().int().min(0).default(0),
});

const federatedFormPayloadSchema = z.object({
  protocolVersion: z.literal(1).default(1),
  direction: z.enum([
    SYNDICATION_DIRECTION.UPWARD,
    SYNDICATION_DIRECTION.DOWNWARD,
    SYNDICATION_DIRECTION.LATERAL,
  ]),
  status: z.enum([
    SYNDICATION_STATUS.DRAFT,
    SYNDICATION_STATUS.PROPOSED,
    SYNDICATION_STATUS.ACCEPTED,
    SYNDICATION_STATUS.REJECTED,
    SYNDICATION_STATUS.REVOKED,
    SYNDICATION_STATUS.AUTO_ACCEPTED,
  ]).default(SYNDICATION_STATUS.PROPOSED),
  includeResponses: z.boolean().default(false),
  collectResponsesLocally: z.boolean().default(true),
  sourceInstanceUrl: httpUrlSchema,
  sourceSyndicationId: z.string().max(120).optional().nullable(),
  sentAt: z.string().datetime().optional(),
  sourceOrganization: federatedOrganizationPayloadSchema,
  targetOrganization: federatedOrganizationPayloadSchema,
  responseSummary: z.object({
    responseCount: z.number().int().min(0).default(0),
    lastResponseAt: z.string().datetime().optional().nullable(),
    responsesByDay: z.array(z.record(z.string(), z.unknown())).default([]),
    questionSummaries: z.array(z.record(z.string(), z.unknown())).default([]),
  }).optional().nullable(),
  form: z.object({
    id: z.string().min(1).max(120),
    slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/),
    title: z.string().min(3).max(200),
    description: z.string().max(3000).optional().nullable(),
    status: z.enum([SURVEY_FORM_STATUS.DRAFT, SURVEY_FORM_STATUS.PUBLISHED, SURVEY_FORM_STATUS.CLOSED]).default(SURVEY_FORM_STATUS.DRAFT),
    version: z.number().int().min(1).default(1),
    collectRespondentInfo: z.boolean().default(false),
    allowMultipleSubmissions: z.boolean().default(true),
    successMessage: z.string().max(1000).optional().nullable(),
    requireConsent: z.boolean().default(false),
    consentText: z.string().max(2000).optional().nullable(),
    retentionDays: z.number().int().min(1).max(3650).optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
    questions: z.array(federatedSurveyQuestionPayloadSchema).default([]),
  }),
});

type FederatedFormPayload = z.infer<typeof federatedFormPayloadSchema>;

const federatedRelationHandshakeSchema = z.object({
  protocolVersion: z.literal(1).default(1),
  senderInstanceUrl: httpUrlSchema.optional().nullable(),
  sentAt: z.string().datetime().optional(),
  relation: z.object({
    fromOrganizationSlug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
    toOrganizationSlug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
    relationType: z.string().min(2).max(40).optional().nullable(),
  }),
});

type FederatedRelationHandshakePayload = z.infer<typeof federatedRelationHandshakeSchema>;

const federationSettingsSchema = z.object({
  autoShareEventsToParent: z.boolean(),
});


@Injectable()
export class FederationService {
  private federationSyncRunning = false;

  constructor(private readonly auditService?: AuditService) {}

  private audit(input: Parameters<AuditService['record']>[0]) {
    void this.auditService?.record(input);
  }

  private handleZodError(error: unknown): never {
    if (error instanceof ZodError) {
      throw new BadRequestException(fromZodError(error).toString());
    }
    throw error;
  }

  private safeCompareToken(expected: string | null | undefined, received: string | undefined): boolean {
    return safeCompareFederationToken(expected, received);
  }

  private safeCompareRelationToken(
    relation: Pick<typeof organizationRelations.$inferSelect, 'federationToken' | 'federationTokenHash'>,
    received: string | undefined,
  ): boolean {
    return safeCompareFederationRelationSecret(relation, received);
  }

  private relationTokenPatch(token: string | null | undefined) {
    if (token === undefined) return {};
    if (token === null || token.trim() === '') {
      return {
        federationToken: null,
        federationTokenHash: null,
        federationTokenFingerprint: null,
        federationTokenRotatedAt: sql`NOW()`,
        federationTokenEncrypted: null,
        federationTokenEncryptionKeyId: null,
        federationTokenEncryptedAt: null,
      };
    }
    const normalized = token.trim();
    const hash = hashFederationToken(normalized);
    const encrypted = encryptFederationToken(normalized);
    if (!encrypted) {
      throw new BadRequestException('Clé de chiffrement des jetons de fédération indisponible. Configurez FEDERATION_TOKEN_ENCRYPTION_KEY ou SESSION_SECRET.');
    }
    return {
      federationToken: null,
      federationTokenHash: hash,
      federationTokenFingerprint: federationTokenFingerprintFromHash(hash),
      federationTokenRotatedAt: sql`NOW()`,
      federationTokenEncrypted: encrypted.encrypted,
      federationTokenEncryptionKeyId: encrypted.keyId,
      federationTokenEncryptedAt: sql`NOW()`,
    };
  }

  private normalizeInstanceUrl(value?: string | null): string | null {
    return normalizeFederationInstanceUrl(value);
  }

  private getCurrentInstanceUrl(): string | null {
    return getCurrentFederationInstanceUrl();
  }

  private isRemoteInstance(targetInstanceUrl?: string | null, sourceInstanceUrl?: string | null): boolean {
    return isRemoteFederationInstance(targetInstanceUrl, sourceInstanceUrl, this.getCurrentInstanceUrl());
  }

  private getRemoteInstanceUrlForRelation(
    fromOrganization: typeof organizations.$inferSelect,
    toOrganization: typeof organizations.$inferSelect,
  ): string | null {
    const current = this.getCurrentInstanceUrl();
    if (!current) return null;

    const candidates = [
      this.normalizeInstanceUrl(fromOrganization.instanceUrl),
      this.normalizeInstanceUrl(toOrganization.instanceUrl),
    ].filter((url): url is string => Boolean(url));

    return candidates.find((url) => url !== current) ?? null;
  }

  private hostFromUrl(value?: string | null): string | null {
    return hostFromFederationUrl(value);
  }

  private isOrganizationOnCurrentInstance(organization: typeof organizations.$inferSelect): boolean {
    return isFederationOrganizationOnInstance(organization, this.getCurrentInstanceUrl());
  }

  private relationPermissions(relation: Pick<typeof organizationRelations.$inferSelect, 'permissions'>): Record<string, unknown> {
    return federationRelationPermissions(relation);
  }

  private isAutoShareEventsToParentEnabled(relation: Pick<typeof organizationRelations.$inferSelect, 'permissions'>): boolean {
    return isAutoShareEventsToParentEnabledForRelation(relation);
  }

  private async getCurrentSectionParentRelation() {
    const activeRelations = await db.select().from(organizationRelations).where(and(
      eq(organizationRelations.relationType, ORGANIZATION_RELATION_TYPE.REGION_SECTION),
      eq(organizationRelations.status, 'active'),
    ));

    for (const relation of activeRelations) {
      const [parentOrganization, childOrganization] = await Promise.all([
        this.getOrganizationOrThrow(relation.fromOrganizationId),
        this.getOrganizationOrThrow(relation.toOrganizationId),
      ]);

      if (
        parentOrganization.type === ORGANIZATION_TYPE.REGION
        && childOrganization.type === ORGANIZATION_TYPE.SECTION
        && this.isOrganizationOnCurrentInstance(childOrganization)
      ) {
        return { relation, parentOrganization, childOrganization };
      }
    }

    return null;
  }

  private normalizeRelationDates<T extends { lastSyncAt?: string | Date | null }>(data: T) {
    return {
      ...data,
      lastSyncAt: typeof data.lastSyncAt === 'string'
        ? new Date(data.lastSyncAt)
        : data.lastSyncAt,
    };
  }

  private normalizeSyndicationDates<T extends { localDateOverride?: string | Date | null; lastSyncAttemptAt?: string | Date | null }>(data: T) {
    return {
      ...data,
      localDateOverride: typeof data.localDateOverride === 'string'
        ? new Date(data.localDateOverride)
        : data.localDateOverride,
      lastSyncAttemptAt: typeof data.lastSyncAttemptAt === 'string'
        ? new Date(data.lastSyncAttemptAt)
        : data.lastSyncAttemptAt,
    };
  }

  private normalizeFormSyndicationDates<T extends { lastSyncAttemptAt?: string | Date | null }>(data: T) {
    return {
      ...data,
      lastSyncAttemptAt: typeof data.lastSyncAttemptAt === 'string'
        ? new Date(data.lastSyncAttemptAt)
        : data.lastSyncAttemptAt,
    };
  }

  private async getOrganizationOrThrow(id: string) {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    if (!organization) throw new NotFoundException('Organisation introuvable');
    return organization;
  }

  private async getEventOrThrow(id: string) {
    const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!event) throw new NotFoundException('Événement introuvable');
    return event;
  }

  private async getFormOrThrow(id: string) {
    const [form] = await db.select().from(surveyForms).where(eq(surveyForms.id, id)).limit(1);
    if (!form) throw new NotFoundException('Formulaire introuvable');
    return form;
  }

  private async getFormQuestions(formId: string) {
    return await db.select().from(surveyQuestions).where(eq(surveyQuestions.formId, formId)).orderBy(asc(surveyQuestions.orderIndex), asc(surveyQuestions.createdAt));
  }

  private async ensureUniqueFederatedFormSlug(baseSlug: string, currentFormId?: string): Promise<string> {
    const normalized = baseSlug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'formulaire-federe';
    let candidate = normalized;
    let suffix = 2;

    while (true) {
      const [existing] = await db.select({ id: surveyForms.id }).from(surveyForms).where(eq(surveyForms.slug, candidate)).limit(1);
      if (!existing || existing.id === currentFormId) return candidate;
      candidate = `${normalized}-${suffix++}`.slice(0, 120);
    }
  }

  private async buildLocalFormResponseSummary(formId: string) {
    const questions = await this.getFormQuestions(formId);
    const responses = await db.select().from(surveyResponses).where(eq(surveyResponses.formId, formId)).orderBy(asc(surveyResponses.submittedAt));
    const questionCatalog = questionCatalogWithSnapshots(questions, responses);
    const byDayMap = new Map<string, number>();
    for (const response of responses) {
      const day = new Date(response.submittedAt).toISOString().slice(0, 10);
      byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
    }

    const questionSummaries = questionCatalog.map((question) => {
      const summary = summarizeSurveyQuestion(question, responses) as Record<string, unknown>;
      // Ne pas fédérer les exemples de réponses libres : ils peuvent contenir de la donnée personnelle.
      if (summary.chartType === 'text') delete summary.samples;
      return summary;
    });

    return {
      responseCount: responses.length,
      lastResponseAt: responses[responses.length - 1]?.submittedAt?.toISOString() ?? null,
      responsesByDay: Array.from(byDayMap.entries()).map(([date, count]) => ({ date, count })),
      questionSummaries,
    };
  }

  private async resolveOutboundFederationToken(relation: Pick<typeof organizationRelations.$inferSelect,
    'id'
    | 'federationToken'
    | 'federationTokenHash'
    | 'federationTokenFingerprint'
    | 'federationTokenEncrypted'
    | 'federationTokenEncryptionKeyId'
  >): Promise<string | null> {
    if (relation.federationTokenEncrypted) {
      const decrypted = decryptFederationToken(relation.federationTokenEncrypted);
      if (!decrypted) {
        logger.warn('[Federation] Jeton sortant chiffré indéchiffrable', {
          relationId: relation.id,
          keyId: relation.federationTokenEncryptionKeyId,
        });
        return null;
      }
      return decrypted;
    }

    if (!relation.federationToken) return null;

    const encrypted = encryptFederationToken(relation.federationToken);
    if (!encrypted) return relation.federationToken;

    const hash = relation.federationTokenHash ?? hashFederationToken(relation.federationToken);
    await db.update(organizationRelations).set({
      federationToken: null,
      federationTokenHash: hash,
      federationTokenFingerprint: relation.federationTokenFingerprint ?? federationTokenFingerprintFromHash(hash),
      federationTokenEncrypted: encrypted.encrypted,
      federationTokenEncryptionKeyId: encrypted.keyId,
      federationTokenEncryptedAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    }).where(eq(organizationRelations.id, relation.id));

    this.audit({
      actorEmail: null,
      action: 'federation.token.encrypt_legacy',
      entityType: 'organization_relation',
      entityId: relation.id,
      relationId: relation.id,
      metadata: {
        tokenFingerprint: relation.federationTokenFingerprint ?? federationTokenFingerprintFromHash(hash),
        keyId: encrypted.keyId,
      },
    });

    return relation.federationToken;
  }

  private withoutRelationSecret<T extends {
    federationToken?: string | null;
    federationTokenHash?: string | null;
    federationTokenEncrypted?: string | null;
    federationTokenEncryptionKeyId?: string | null;
  }>(relation: T) {
    return withoutFederationRelationSecret(relation);
  }

  async getOverview() {
    const [networkCount] = await db.select({ count: count() }).from(organizationNetworks);
    const [organizationCount] = await db.select({ count: count() }).from(organizations);
    const [relationCount] = await db.select({ count: count() }).from(organizationRelations);
    const [pendingUpward] = await db.select({ count: count() }).from(eventSyndications).where(and(
      eq(eventSyndications.direction, SYNDICATION_DIRECTION.UPWARD),
      eq(eventSyndications.status, SYNDICATION_STATUS.PROPOSED),
    ));
    const [pendingDownward] = await db.select({ count: count() }).from(eventSyndications).where(and(
      eq(eventSyndications.direction, SYNDICATION_DIRECTION.DOWNWARD),
      eq(eventSyndications.status, SYNDICATION_STATUS.PROPOSED),
    ));
    const [agendaItems] = await db.select({ count: count() }).from(eventSyndications).where(eq(eventSyndications.includeInAgenda, true));

    const recentSyndications = await this.getSyndications({ limit: 8 });

    return {
      success: true,
      data: {
        counts: {
          networks: networkCount.count,
          organizations: organizationCount.count,
          relations: relationCount.count,
          pendingUpward: pendingUpward.count,
          pendingDownward: pendingDownward.count,
          agendaItems: agendaItems.count,
        },
        recentSyndications: recentSyndications.data,
      },
    };
  }

  async getNetworks() {
    const data = await db.select().from(organizationNetworks).orderBy(asc(organizationNetworks.name));
    return { success: true, data };
  }

  async createNetwork(data: unknown) {
    try {
      const validated = insertOrganizationNetworkSchema.parse(data);
      const [created] = await db.insert(organizationNetworks).values(validated).returning();
      return { success: true, data: created };
    } catch (error) {
      if (hasErrorCode(error, '23505')) throw new ConflictException('Un réseau avec ce slug existe déjà');
      return this.handleZodError(error);
    }
  }

  async updateNetwork(id: string, data: unknown) {
    try {
      const validated = updateOrganizationNetworkSchema.parse(data);
      const [updated] = await db.update(organizationNetworks)
        .set({ ...validated, updatedAt: sql`NOW()` })
        .where(eq(organizationNetworks.id, id))
        .returning();
      if (!updated) throw new NotFoundException('Réseau introuvable');
      return { success: true, data: updated };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async getOrganizations() {
    const data = await db.select({
      id: organizations.id,
      networkId: organizations.networkId,
      parentOrganizationId: organizations.parentOrganizationId,
      slug: organizations.slug,
      name: organizations.name,
      type: organizations.type,
      domain: organizations.domain,
      instanceUrl: organizations.instanceUrl,
      brandingConfigId: organizations.brandingConfigId,
      isActive: organizations.isActive,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
      networkName: organizationNetworks.name,
      parentName: sql<string | null>`parent_org.name`,
    })
      .from(organizations)
      .leftJoin(organizationNetworks, eq(organizations.networkId, organizationNetworks.id))
      .leftJoin(sql`organizations AS parent_org`, sql`${organizations.parentOrganizationId} = parent_org.id`)
      .orderBy(asc(organizations.type), asc(organizations.name));

    return { success: true, data };
  }

  async createOrganization(data: unknown) {
    try {
      const validated = insertOrganizationSchema.parse(data);
      const [created] = await db.insert(organizations).values(validated).returning();
      return { success: true, data: created };
    } catch (error) {
      if (hasErrorCode(error, '23505')) throw new ConflictException('Une organisation avec ce slug existe déjà');
      return this.handleZodError(error);
    }
  }

  async updateOrganization(id: string, data: unknown) {
    try {
      const validated = updateOrganizationSchema.parse(data);
      const [updated] = await db.update(organizations)
        .set({ ...validated, updatedAt: sql`NOW()` })
        .where(eq(organizations.id, id))
        .returning();
      if (!updated) throw new NotFoundException('Organisation introuvable');
      return { success: true, data: updated };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async getRelations() {
    const fromOrg = sql`from_org`;
    const toOrg = sql`to_org`;
    const data = await db.select({
      id: organizationRelations.id,
      fromOrganizationId: organizationRelations.fromOrganizationId,
      toOrganizationId: organizationRelations.toOrganizationId,
      relationType: organizationRelations.relationType,
      status: organizationRelations.status,
      permissions: organizationRelations.permissions,
      syncEnabled: organizationRelations.syncEnabled,
      lastSyncAt: organizationRelations.lastSyncAt,
      syncStatus: organizationRelations.syncStatus,
      hasFederationToken: sql<boolean>`(${organizationRelations.federationToken} IS NOT NULL OR ${organizationRelations.federationTokenHash} IS NOT NULL)`,
      hasOutboundFederationToken: sql<boolean>`(${organizationRelations.federationToken} IS NOT NULL OR ${organizationRelations.federationTokenEncrypted} IS NOT NULL)`,
      federationTokenFingerprint: organizationRelations.federationTokenFingerprint,
      federationTokenRotatedAt: organizationRelations.federationTokenRotatedAt,
      federationTokenEncryptedAt: organizationRelations.federationTokenEncryptedAt,
      createdAt: organizationRelations.createdAt,
      updatedAt: organizationRelations.updatedAt,
      fromName: sql<string>`from_org.name`,
      toName: sql<string>`to_org.name`,
      fromType: sql<string>`from_org.type`,
      toType: sql<string>`to_org.type`,
    })
      .from(organizationRelations)
      .leftJoin(sql`organizations AS from_org`, sql`${organizationRelations.fromOrganizationId} = from_org.id`)
      .leftJoin(sql`organizations AS to_org`, sql`${organizationRelations.toOrganizationId} = to_org.id`)
      .orderBy(desc(organizationRelations.createdAt));
    void fromOrg; void toOrg;
    return { success: true, data };
  }

  async getFederationSettings() {
    const currentRelation = await this.getCurrentSectionParentRelation();
    if (!currentRelation) {
      return {
        success: true,
        data: {
          canConfigureAutoShare: false,
          autoShareEventsToParent: false,
          reason: 'no_current_section_parent_relation',
        },
      };
    }

    const { relation, parentOrganization, childOrganization } = currentRelation;
    return {
      success: true,
      data: {
        canConfigureAutoShare: true,
        autoShareEventsToParent: this.isAutoShareEventsToParentEnabled(relation),
        relation: {
          ...this.withoutRelationSecret(relation),
          parentName: parentOrganization.name,
          childName: childOrganization.name,
          parentSlug: parentOrganization.slug,
          childSlug: childOrganization.slug,
        },
      },
    };
  }

  async updateFederationSettings(data: unknown, userEmail?: string) {
    try {
      const validated = federationSettingsSchema.parse(data);
      const currentRelation = await this.getCurrentSectionParentRelation();
      if (!currentRelation) {
        throw new BadRequestException('Aucun lien mère-fille actif ne correspond à cette instance section');
      }

      const permissions = {
        ...this.relationPermissions(currentRelation.relation),
        [AUTO_SHARE_EVENTS_TO_PARENT_PERMISSION]: validated.autoShareEventsToParent,
      };

      const [updated] = await db.update(organizationRelations).set({
        permissions,
        updatedAt: sql`NOW()`,
      }).where(eq(organizationRelations.id, currentRelation.relation.id)).returning();

      this.audit({
        actorEmail: userEmail ?? null,
        action: 'federation.settings.update',
        entityType: 'organization_relation',
        entityId: updated.id,
        relationId: updated.id,
        metadata: { autoShareEventsToParent: validated.autoShareEventsToParent },
      });

      return {
        success: true,
        data: {
          canConfigureAutoShare: true,
          autoShareEventsToParent: this.isAutoShareEventsToParentEnabled(updated),
          relation: this.withoutRelationSecret(updated),
        },
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async createRelation(data: unknown, userEmail?: string) {
    try {
      const validated = this.normalizeRelationDates(insertOrganizationRelationSchema.parse(data));
      if (validated.fromOrganizationId === validated.toOrganizationId) {
        throw new BadRequestException('Une organisation ne peut pas être liée à elle-même');
      }
      await Promise.all([
        this.getOrganizationOrThrow(validated.fromOrganizationId),
        this.getOrganizationOrThrow(validated.toOrganizationId),
      ]);
      const permissions = {
        ...((validated.permissions ?? {}) as Record<string, unknown>),
        [AUTO_SHARE_EVENTS_TO_PARENT_PERMISSION]: (validated.permissions as Record<string, unknown> | undefined)?.[AUTO_SHARE_EVENTS_TO_PARENT_PERMISSION] ?? true,
      };
      const { federationToken, ...relationData } = validated;
      const [created] = await db.insert(organizationRelations).values({
        ...relationData,
        ...this.relationTokenPatch(federationToken),
        permissions,
      }).returning();
      this.audit({
        actorEmail: userEmail ?? null,
        action: 'federation.relation.create',
        entityType: 'organization_relation',
        entityId: created.id,
        relationId: created.id,
        metadata: {
          fromOrganizationId: created.fromOrganizationId,
          toOrganizationId: created.toOrganizationId,
          relationType: created.relationType,
          syncEnabled: created.syncEnabled,
          tokenRotated: Boolean(federationToken),
          tokenFingerprint: created.federationTokenFingerprint,
        },
      });
      return { success: true, data: this.withoutRelationSecret(created) };
    } catch (error) {
      if (hasErrorCode(error, '23505')) throw new ConflictException('Cette relation existe déjà');
      return this.handleZodError(error);
    }
  }

  async updateRelation(id: string, data: unknown, userEmail?: string) {
    try {
      const validated = this.normalizeRelationDates(updateOrganizationRelationSchema.parse(data));
      const { federationToken, ...relationPatch } = validated;
      const [updated] = await db.update(organizationRelations)
        .set({
          ...relationPatch,
          ...this.relationTokenPatch(federationToken),
          updatedAt: sql`NOW()`,
        })
        .where(eq(organizationRelations.id, id))
        .returning();
      if (!updated) throw new NotFoundException('Relation introuvable');
      this.audit({
        actorEmail: userEmail ?? null,
        action: federationToken !== undefined ? 'federation.relation.update_token' : 'federation.relation.update',
        entityType: 'organization_relation',
        entityId: updated.id,
        relationId: updated.id,
        metadata: {
          changedFields: Object.keys(relationPatch).filter((key) => key !== 'federationToken'),
          tokenRotated: federationToken !== undefined,
          tokenFingerprint: updated.federationTokenFingerprint,
        },
      });
      return { success: true, data: this.withoutRelationSecret(updated) };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async rotateRelationToken(id: string, data: unknown, userEmail?: string) {
    const [current] = await db.select().from(organizationRelations).where(eq(organizationRelations.id, id)).limit(1);
    if (!current) throw new NotFoundException('Relation introuvable');

    const body = (data ?? {}) as { federationToken?: string };
    const token = body.federationToken?.trim();
    if (!token || token.length < 16 || token.length > 512) {
      throw new BadRequestException('Un nouveau jeton de 16 à 512 caractères est requis. Il sera chiffré et ne sera pas ré-affiché.');
    }

    const patch = this.relationTokenPatch(token);
    const [updated] = await db.update(organizationRelations)
      .set({
        ...patch,
        syncStatus: FEDERATION_SYNC_STATUS.IDLE,
        updatedAt: sql`NOW()`,
      })
      .where(eq(organizationRelations.id, id))
      .returning();

    this.audit({
      actorEmail: userEmail ?? null,
      action: 'federation.token.replace',
      entityType: 'organization_relation',
      entityId: updated.id,
      relationId: updated.id,
      metadata: {
        tokenFingerprint: updated.federationTokenFingerprint,
        tokenLength: token.length,
        encrypted: Boolean(updated.federationTokenEncrypted),
        fromOrganizationId: updated.fromOrganizationId,
        toOrganizationId: updated.toOrganizationId,
        relationType: updated.relationType,
      },
    });

    return {
      success: true,
      data: {
        relation: this.withoutRelationSecret(updated),
        tokenLength: token.length,
        tokenFingerprint: updated.federationTokenFingerprint,
        tokenDisplayed: false,
        warning: 'Jeton remplacé et stocké chiffré. Le secret brut n’est jamais renvoyé ; vérifiez uniquement longueur/fingerprint.',
      },
    };
  }

  async getSyndications(options?: {
    status?: string;
    direction?: string;
    sourceOrganizationId?: string;
    targetOrganizationId?: string;
    syncStatus?: string;
    includeInAgenda?: string;
    limit?: number;
  }) {
    const conditions: SQL[] = [];
    if (options?.status && options.status !== 'all') conditions.push(eq(eventSyndications.status, options.status));
    if (options?.direction && options.direction !== 'all') conditions.push(eq(eventSyndications.direction, options.direction));
    if (options?.sourceOrganizationId && options.sourceOrganizationId !== 'all') conditions.push(eq(eventSyndications.sourceOrganizationId, options.sourceOrganizationId));
    if (options?.targetOrganizationId && options.targetOrganizationId !== 'all') conditions.push(eq(eventSyndications.targetOrganizationId, options.targetOrganizationId));
    if (options?.syncStatus && options.syncStatus !== 'all') conditions.push(eq(eventSyndications.syncStatus, options.syncStatus));
    if (options?.includeInAgenda === 'true') conditions.push(eq(eventSyndications.includeInAgenda, true));
    if (options?.includeInAgenda === 'false') conditions.push(eq(eventSyndications.includeInAgenda, false));

    const data = await db.select({
      id: eventSyndications.id,
      eventId: eventSyndications.eventId,
      sourceOrganizationId: eventSyndications.sourceOrganizationId,
      targetOrganizationId: eventSyndications.targetOrganizationId,
      direction: eventSyndications.direction,
      status: eventSyndications.status,
      includeInAgenda: eventSyndications.includeInAgenda,
      localTitleOverride: eventSyndications.localTitleOverride,
      localDescriptionOverride: eventSyndications.localDescriptionOverride,
      localDateOverride: eventSyndications.localDateOverride,
      localRegistrationUrlOverride: eventSyndications.localRegistrationUrlOverride,
      lastSyncedAt: eventSyndications.lastSyncedAt,
      targetInstanceUrl: eventSyndications.targetInstanceUrl,
      remoteEventId: eventSyndications.remoteEventId,
      remoteSyndicationId: eventSyndications.remoteSyndicationId,
      syncStatus: eventSyndications.syncStatus,
      syncError: eventSyndications.syncError,
      lastSyncAttemptAt: eventSyndications.lastSyncAttemptAt,
      syncAttempts: eventSyndications.syncAttempts,
      createdBy: eventSyndications.createdBy,
      reviewedBy: eventSyndications.reviewedBy,
      reviewedAt: eventSyndications.reviewedAt,
      createdAt: eventSyndications.createdAt,
      updatedAt: eventSyndications.updatedAt,
      eventTitle: events.title,
      eventDate: events.date,
      eventLocation: events.location,
      sourceName: sql<string>`source_org.name`,
      sourceType: sql<string>`source_org.type`,
      targetName: sql<string>`target_org.name`,
      targetType: sql<string>`target_org.type`,
    })
      .from(eventSyndications)
      .leftJoin(events, eq(eventSyndications.eventId, events.id))
      .leftJoin(sql`organizations AS source_org`, sql`${eventSyndications.sourceOrganizationId} = source_org.id`)
      .leftJoin(sql`organizations AS target_org`, sql`${eventSyndications.targetOrganizationId} = target_org.id`)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(eventSyndications.createdAt))
      .limit(options?.limit ?? 100);

    return { success: true, data };
  }

  private async assertRelationAllowed(parentOrSourceId: string, childOrTargetId: string) {
    const [relation] = await db.select().from(organizationRelations).where(and(
      eq(organizationRelations.fromOrganizationId, parentOrSourceId),
      eq(organizationRelations.toOrganizationId, childOrTargetId),
      eq(organizationRelations.status, 'active'),
    )).limit(1);
    if (!relation) {
      throw new BadRequestException('Aucune relation active ne permet cette fédération entre ces organisations');
    }
    return relation;
  }

  async autoShareEventToParent(eventId: string, userEmail?: string) {
    const event = await this.getEventOrThrow(eventId);
    if (event.isFederatedCopy || event.sourceInstanceUrl || event.sourceEventId) {
      return { success: true, data: { skipped: true, reason: 'federated_copy' } };
    }

    const currentRelation = await this.getCurrentSectionParentRelation();
    if (!currentRelation) {
      return { success: true, data: { skipped: true, reason: 'no_current_section_parent_relation' } };
    }

    const { relation, parentOrganization, childOrganization } = currentRelation;
    if (!this.isAutoShareEventsToParentEnabled(relation)) {
      return { success: true, data: { skipped: true, reason: 'auto_share_disabled' } };
    }

    if (event.organizationId && event.organizationId !== childOrganization.id) {
      return { success: true, data: { skipped: true, reason: 'event_not_owned_by_current_section' } };
    }

    const [existing] = await db.select().from(eventSyndications).where(and(
      eq(eventSyndications.eventId, event.id),
      eq(eventSyndications.sourceOrganizationId, childOrganization.id),
      eq(eventSyndications.targetOrganizationId, parentOrganization.id),
    )).limit(1);

    if (!existing && event.status !== EVENT_STATUS.PUBLISHED) {
      return { success: true, data: { skipped: true, reason: 'event_not_published' } };
    }

    if (existing?.status === SYNDICATION_STATUS.REJECTED || existing?.status === SYNDICATION_STATUS.REVOKED) {
      return { success: true, data: { skipped: true, reason: 'syndication_rejected_or_revoked', syndication: existing } };
    }

    const sourceFederationStatus = existing && (
      existing.status === SYNDICATION_STATUS.ACCEPTED
      || existing.status === SYNDICATION_STATUS.AUTO_ACCEPTED
      || existing.includeInAgenda
    ) ? FEDERATION_STATUS.ACCEPTED_BY_REGION : FEDERATION_STATUS.PROPOSED_TO_REGION;

    const syndication = await db.transaction(async (tx) => {
      await tx.update(events).set({
        organizationId: event.organizationId ?? childOrganization.id,
        federationVisibility: FEDERATION_VISIBILITY.PARENT_REGION,
        federationStatus: sourceFederationStatus,
        updatedAt: sql`NOW()`,
      }).where(eq(events.id, event.id));

      if (existing) {
        const [updated] = await tx.update(eventSyndications).set({
          status: existing.status,
          includeInAgenda: existing.includeInAgenda,
          syncStatus: FEDERATION_SYNC_STATUS.PENDING,
          syncError: null,
          targetInstanceUrl: this.normalizeInstanceUrl(parentOrganization.instanceUrl) ?? null,
          updatedAt: sql`NOW()`,
        }).where(eq(eventSyndications.id, existing.id)).returning();
        return updated;
      }

      const [created] = await tx.insert(eventSyndications).values({
        eventId: event.id,
        sourceOrganizationId: childOrganization.id,
        targetOrganizationId: parentOrganization.id,
        direction: SYNDICATION_DIRECTION.UPWARD,
        status: SYNDICATION_STATUS.PROPOSED,
        includeInAgenda: false,
        createdBy: userEmail ?? 'auto-share',
        targetInstanceUrl: this.normalizeInstanceUrl(parentOrganization.instanceUrl) ?? null,
        syncStatus: FEDERATION_SYNC_STATUS.PENDING,
      }).returning();
      return created;
    });

    this.audit({
      actorEmail: userEmail ?? null,
      action: 'federation.events.auto_share_to_parent',
      entityType: 'event_syndication',
      entityId: syndication.id,
      organizationId: childOrganization.id,
      relationId: relation.id,
      metadata: { eventId: event.id, targetOrganizationId: parentOrganization.id, existing: Boolean(existing) },
    });
    const sync = await this.syncSyndicationBestEffort(syndication.id);
    return { success: true, data: { syndication, sync: sync.data } };
  }

  async proposeEventUpward(eventId: string, data: unknown, userEmail?: string) {
    try {
      const event = await this.getEventOrThrow(eventId);
      const body = data as { sourceOrganizationId?: string; targetOrganizationId?: string };
      const sourceOrganizationId = body.sourceOrganizationId ?? event.organizationId;
      const targetOrganizationId = body.targetOrganizationId;

      if (!sourceOrganizationId || !targetOrganizationId) {
        throw new BadRequestException('sourceOrganizationId et targetOrganizationId sont requis');
      }
      await this.assertRelationAllowed(targetOrganizationId, sourceOrganizationId);

      const validated = insertEventSyndicationSchema.parse({
        eventId,
        sourceOrganizationId,
        targetOrganizationId,
        direction: SYNDICATION_DIRECTION.UPWARD,
        status: SYNDICATION_STATUS.PROPOSED,
        includeInAgenda: false,
        createdBy: userEmail,
      });

      const [created] = await db.transaction(async (tx) => {
        const [row] = await tx.insert(eventSyndications).values(this.normalizeSyndicationDates(validated)).returning();
        await tx.update(events).set({
          federationVisibility: FEDERATION_VISIBILITY.PARENT_REGION,
          federationStatus: FEDERATION_STATUS.PROPOSED_TO_REGION,
          updatedAt: sql`NOW()`,
        }).where(eq(events.id, eventId));
        return [row];
      });
      this.audit({
        actorEmail: userEmail ?? null,
        action: 'federation.events.propose_upward',
        entityType: 'event_syndication',
        entityId: created.id,
        organizationId: sourceOrganizationId,
        metadata: { eventId, targetOrganizationId },
      });
      const sync = await this.syncSyndicationBestEffort(created.id);
      return { success: true, data: created, sync: sync.data };
    } catch (error) {
      if (hasErrorCode(error, '23505')) throw new ConflictException('Cet événement a déjà été proposé à cette organisation');
      return this.handleZodError(error);
    }
  }

  async publishEventDownward(eventId: string, data: unknown, userEmail?: string) {
    try {
      const event = await this.getEventOrThrow(eventId);
      const body = data as { sourceOrganizationId?: string; targetOrganizationIds?: string[]; autoAccept?: boolean };
      const sourceOrganizationId = body.sourceOrganizationId ?? event.organizationId;
      const targetOrganizationIds = body.targetOrganizationIds ?? [];
      if (!sourceOrganizationId || !Array.isArray(targetOrganizationIds) || targetOrganizationIds.length === 0) {
        throw new BadRequestException('sourceOrganizationId et targetOrganizationIds sont requis');
      }

      for (const targetId of targetOrganizationIds) {
        await this.assertRelationAllowed(sourceOrganizationId, targetId);
      }

      const rows = targetOrganizationIds.map((targetOrganizationId) => this.normalizeSyndicationDates(insertEventSyndicationSchema.parse({
        eventId,
        sourceOrganizationId,
        targetOrganizationId,
        direction: SYNDICATION_DIRECTION.DOWNWARD,
        status: body.autoAccept ? SYNDICATION_STATUS.AUTO_ACCEPTED : SYNDICATION_STATUS.PROPOSED,
        includeInAgenda: Boolean(body.autoAccept),
        createdBy: userEmail,
      })));

      const created = await db.transaction(async (tx) => {
        const inserted = await tx.insert(eventSyndications).values(rows).returning();
        await tx.update(events).set({
          federationVisibility: targetOrganizationIds.length > 1 ? FEDERATION_VISIBILITY.CHILD_SECTIONS : FEDERATION_VISIBILITY.SELECTED_ORGANIZATIONS,
          federationStatus: FEDERATION_STATUS.PUBLISHED_TO_SECTIONS,
          updatedAt: sql`NOW()`,
        }).where(eq(events.id, eventId));
        return inserted;
      });

      this.audit({
        actorEmail: userEmail ?? null,
        action: 'federation.events.publish_downward',
        entityType: 'event',
        entityId: eventId,
        organizationId: sourceOrganizationId,
        metadata: { targetOrganizationIds, createdSyndicationIds: created.map((row) => row.id), autoAccept: Boolean(body.autoAccept) },
      });
      const syncResults = await Promise.all(created.map((row) => this.syncSyndicationBestEffort(row.id)));
      return { success: true, data: created, sync: syncResults.map((result) => result.data) };
    } catch (error) {
      if (hasErrorCode(error, '23505')) throw new ConflictException('Cet événement est déjà publié vers au moins une organisation ciblée');
      return this.handleZodError(error);
    }
  }

  private async getRelationForSyndication(sourceOrganizationId: string, targetOrganizationId: string, direction: string) {
    if (direction === SYNDICATION_DIRECTION.UPWARD) {
      return await this.assertRelationAllowed(targetOrganizationId, sourceOrganizationId);
    }
    return await this.assertRelationAllowed(sourceOrganizationId, targetOrganizationId);
  }

  async verifyFederationIngestContext(args: {
    token?: string;
    sourceOrganizationSlug: string;
    targetOrganizationSlug: string;
    direction: string;
    sourceInstanceUrl?: string | null;
  }) {
    const providedToken = args.token?.trim();
    if (!providedToken) throw new UnauthorizedException('Token de fédération manquant');

    const [sourceOrganization, targetOrganization] = await Promise.all([
      this.findOrganizationBySlugOrThrow(args.sourceOrganizationSlug, 'source'),
      this.findOrganizationBySlugOrThrow(args.targetOrganizationSlug, 'target'),
    ]);
    const relation = await this.getRelationForSyndication(sourceOrganization.id, targetOrganization.id, args.direction);
    if (!relation.syncEnabled) throw new ForbiddenException('Synchronisation désactivée sur cette relation');
    if (!this.safeCompareRelationToken(relation, providedToken)) {
      throw new UnauthorizedException('Token de fédération invalide');
    }
    const sourceInstanceUrl = this.normalizeInstanceUrl(args.sourceInstanceUrl) || this.normalizeInstanceUrl(sourceOrganization.instanceUrl);
    if (!sourceInstanceUrl) throw new BadRequestException('sourceInstanceUrl invalide');

    return { sourceOrganization, targetOrganization, relation, sourceInstanceUrl };
  }

  async getOutboundFederationTransport(args: {
    sourceOrganizationId: string;
    targetOrganizationId: string;
    direction: string;
  }) {
    const [targetOrganization] = await db.select().from(organizations).where(eq(organizations.id, args.targetOrganizationId)).limit(1);
    if (!targetOrganization) throw new NotFoundException('Organisation cible introuvable');
    const relation = await this.getRelationForSyndication(args.sourceOrganizationId, args.targetOrganizationId, args.direction);
    if (!relation.syncEnabled) throw new ForbiddenException('Synchronisation désactivée sur cette relation');
    const token = await this.resolveOutboundFederationToken(relation);
    if (!token) throw new BadRequestException('Jeton de fédération sortant manquant ou indéchiffrable sur la relation');
    const targetInstanceUrl = this.normalizeInstanceUrl(targetOrganization.instanceUrl);
    if (!targetInstanceUrl) throw new BadRequestException('URL d’instance cible invalide');
    return { relation, targetOrganization, targetInstanceUrl, token };
  }

  private buildFederatedEventPayload(args: {
    syndication: typeof eventSyndications.$inferSelect;
    event: typeof events.$inferSelect;
    sourceOrganization: typeof organizations.$inferSelect;
    targetOrganization: typeof organizations.$inferSelect;
  }): FederatedEventPayload {
    const sourceInstanceUrl = this.normalizeInstanceUrl(args.sourceOrganization.instanceUrl) || this.getCurrentInstanceUrl();
    if (!sourceInstanceUrl) {
      throw new BadRequestException('Impossible de déterminer l’URL de l’instance source');
    }

    return {
      protocolVersion: 1,
      direction: args.syndication.direction as FederatedEventPayload['direction'],
      status: args.syndication.status as FederatedEventPayload['status'],
      includeInAgenda: args.syndication.includeInAgenda,
      sourceInstanceUrl,
      sourceSyndicationId: args.syndication.id,
      sentAt: new Date().toISOString(),
      sourceOrganization: {
        slug: args.sourceOrganization.slug,
        name: args.sourceOrganization.name,
        type: args.sourceOrganization.type,
        domain: args.sourceOrganization.domain,
        instanceUrl: args.sourceOrganization.instanceUrl,
      },
      targetOrganization: {
        slug: args.targetOrganization.slug,
        name: args.targetOrganization.name,
        type: args.targetOrganization.type,
        domain: args.targetOrganization.domain,
        instanceUrl: args.targetOrganization.instanceUrl,
      },
      event: {
        id: args.event.id,
        title: args.event.title,
        description: args.event.description,
        date: args.event.date.toISOString(),
        location: args.event.location,
        maxParticipants: args.event.maxParticipants,
        helloAssoLink: args.event.helloAssoLink,
        enableExternalRedirect: args.event.enableExternalRedirect,
        externalRedirectUrl: args.event.externalRedirectUrl,
        showInscriptionsCount: args.event.showInscriptionsCount,
        showAvailableSeats: args.event.showAvailableSeats,
        allowUnsubscribe: args.event.allowUnsubscribe,
        redUnsubscribeButton: args.event.redUnsubscribeButton,
        buttonMode: args.event.buttonMode as FederatedEventPayload['event']['buttonMode'],
        customButtonText: args.event.customButtonText,
        status: args.event.status,
        updatedAt: args.event.updatedAt?.toISOString(),
      },
    };
  }

  private buildFederatedFormPayload(args: {
    syndication: typeof surveyFormSyndications.$inferSelect;
    form: typeof surveyForms.$inferSelect;
    questions: Array<typeof surveyQuestions.$inferSelect>;
    sourceOrganization: typeof organizations.$inferSelect;
    targetOrganization: typeof organizations.$inferSelect;
    responseSummary?: FederatedFormPayload['responseSummary'];
  }): FederatedFormPayload {
    const sourceInstanceUrl = this.normalizeInstanceUrl(args.sourceOrganization.instanceUrl) || this.getCurrentInstanceUrl();
    if (!sourceInstanceUrl) {
      throw new BadRequestException('Impossible de déterminer l’URL de l’instance source');
    }

    return {
      protocolVersion: 1,
      direction: args.syndication.direction as FederatedFormPayload['direction'],
      status: args.syndication.status as FederatedFormPayload['status'],
      includeResponses: args.syndication.includeResponses,
      collectResponsesLocally: args.syndication.collectResponsesLocally,
      responseSummary: args.syndication.includeResponses ? (args.responseSummary ?? null) : null,
      sourceInstanceUrl,
      sourceSyndicationId: args.syndication.id,
      sentAt: new Date().toISOString(),
      sourceOrganization: {
        slug: args.sourceOrganization.slug,
        name: args.sourceOrganization.name,
        type: args.sourceOrganization.type,
        domain: args.sourceOrganization.domain,
        instanceUrl: args.sourceOrganization.instanceUrl,
      },
      targetOrganization: {
        slug: args.targetOrganization.slug,
        name: args.targetOrganization.name,
        type: args.targetOrganization.type,
        domain: args.targetOrganization.domain,
        instanceUrl: args.targetOrganization.instanceUrl,
      },
      form: {
        id: args.form.id,
        slug: args.form.slug,
        title: args.form.title,
        description: args.form.description,
        status: args.form.status as FederatedFormPayload['form']['status'],
        version: args.form.version,
        collectRespondentInfo: args.form.collectRespondentInfo,
        allowMultipleSubmissions: args.form.allowMultipleSubmissions,
        successMessage: args.form.successMessage,
        requireConsent: args.form.requireConsent,
        consentText: args.form.consentText,
        retentionDays: args.form.retentionDays,
        expiresAt: args.form.expiresAt?.toISOString() ?? null,
        questions: args.questions.map((question) => ({
          id: question.id,
          label: question.label,
          description: question.description,
          type: question.type as FederatedFormPayload['form']['questions'][number]['type'],
          required: question.required,
          options: ((question.options ?? []) as Array<{ label?: string; value?: string }>).map((option) => ({
            label: String(option.label ?? option.value ?? ''),
            value: String(option.value ?? option.label ?? ''),
          })).filter((option) => option.label && option.value),
          validation: (question.validation ?? {}) as Record<string, unknown>,
          orderIndex: question.orderIndex,
        })),
      },
    };
  }

  private async markSyncFailed(syndicationId: string, relationId: string | null, error: string, targetInstanceUrl?: string | null) {
    const safeError = error.slice(0, 2000);
    await db.update(eventSyndications).set({
      syncStatus: FEDERATION_SYNC_STATUS.FAILED,
      syncError: safeError,
      targetInstanceUrl: targetInstanceUrl ?? undefined,
      lastSyncAttemptAt: sql`NOW()`,
      syncAttempts: sql`${eventSyndications.syncAttempts} + 1`,
      updatedAt: sql`NOW()`,
    }).where(eq(eventSyndications.id, syndicationId));

    if (relationId) {
      await db.update(organizationRelations).set({
        syncStatus: FEDERATION_SYNC_STATUS.FAILED,
        updatedAt: sql`NOW()`,
      }).where(eq(organizationRelations.id, relationId));
    }
  }

  private async markFormSyncFailed(syndicationId: string, relationId: string | null, error: string, targetInstanceUrl?: string | null) {
    const safeError = error.slice(0, 2000);
    await db.update(surveyFormSyndications).set({
      syncStatus: FEDERATION_SYNC_STATUS.FAILED,
      syncError: safeError,
      targetInstanceUrl: targetInstanceUrl ?? undefined,
      lastSyncAttemptAt: sql`NOW()`,
      syncAttempts: sql`${surveyFormSyndications.syncAttempts} + 1`,
      updatedAt: sql`NOW()`,
    }).where(eq(surveyFormSyndications.id, syndicationId));

    if (relationId) {
      await db.update(organizationRelations).set({
        syncStatus: FEDERATION_SYNC_STATUS.FAILED,
        updatedAt: sql`NOW()`,
      }).where(eq(organizationRelations.id, relationId));
    }
  }

  async syncSyndication(id: string) {
    const [syndication] = await db.select().from(eventSyndications).where(eq(eventSyndications.id, id)).limit(1);
    if (!syndication) throw new NotFoundException('Syndication introuvable');

    const [event, sourceOrganization, targetOrganization] = await Promise.all([
      this.getEventOrThrow(syndication.eventId),
      this.getOrganizationOrThrow(syndication.sourceOrganizationId),
      this.getOrganizationOrThrow(syndication.targetOrganizationId),
    ]);

    let relation: typeof organizationRelations.$inferSelect;
    try {
      relation = await this.getRelationForSyndication(
        syndication.sourceOrganizationId,
        syndication.targetOrganizationId,
        syndication.direction,
      );
    } catch (error) {
      await this.markSyncFailed(syndication.id, null, error instanceof Error ? error.message : 'Relation de fédération introuvable');
      throw error;
    }

    const targetInstanceUrl = this.normalizeInstanceUrl(syndication.targetInstanceUrl || targetOrganization.instanceUrl);
    const sourceInstanceUrl = this.normalizeInstanceUrl(sourceOrganization.instanceUrl) || this.getCurrentInstanceUrl();

    if (!targetInstanceUrl || !this.isRemoteInstance(targetInstanceUrl, sourceInstanceUrl)) {
      const [updated] = await db.update(eventSyndications).set({
        syncStatus: FEDERATION_SYNC_STATUS.LOCAL,
        syncError: null,
        targetInstanceUrl: targetInstanceUrl ?? null,
        updatedAt: sql`NOW()`,
      }).where(eq(eventSyndications.id, syndication.id)).returning();
      return { success: true, data: { skipped: true, reason: 'local_or_missing_target_instance', syndication: updated } };
    }

    if (!relation.syncEnabled) {
      await this.markSyncFailed(syndication.id, relation.id, 'La synchronisation est désactivée sur cette relation', targetInstanceUrl);
      return { success: false, data: { skipped: true, reason: 'relation_sync_disabled' } };
    }

    const outboundToken = await this.resolveOutboundFederationToken(relation);
    if (!outboundToken) {
      await this.markSyncFailed(syndication.id, relation.id, 'Jeton de fédération sortant manquant ou indéchiffrable sur la relation', targetInstanceUrl);
      return { success: false, data: { skipped: true, reason: 'missing_outbound_federation_token' } };
    }

    const payload = this.buildFederatedEventPayload({ syndication, event, sourceOrganization, targetOrganization });
    const endpoint = `${targetInstanceUrl}/api/federation/events/ingest`;

    await db.update(eventSyndications).set({
      syncStatus: FEDERATION_SYNC_STATUS.PENDING,
      syncError: null,
      targetInstanceUrl,
      lastSyncAttemptAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    }).where(eq(eventSyndications.id, syndication.id));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Komuno-Federation-Token': outboundToken,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const responseText = await response.text();
      if (!response.ok) {
        const errorMessage = `HTTP ${response.status} ${response.statusText}: ${responseText.slice(0, 500)}`;
        await this.markSyncFailed(syndication.id, relation.id, errorMessage, targetInstanceUrl);
        return { success: false, data: { endpoint, status: response.status, error: errorMessage } };
      }

      const responseBody = responseText ? JSON.parse(responseText) : {};
      const [updated] = await db.update(eventSyndications).set({
        syncStatus: FEDERATION_SYNC_STATUS.SYNCED,
        syncError: null,
        targetInstanceUrl,
        remoteEventId: responseBody?.data?.eventId ?? responseBody?.eventId ?? null,
        remoteSyndicationId: responseBody?.data?.syndicationId ?? responseBody?.syndicationId ?? null,
        lastSyncedAt: sql`NOW()`,
        lastSyncAttemptAt: sql`NOW()`,
        syncAttempts: sql`${eventSyndications.syncAttempts} + 1`,
        updatedAt: sql`NOW()`,
      }).where(eq(eventSyndications.id, syndication.id)).returning();

      await db.update(organizationRelations).set({
        syncStatus: FEDERATION_SYNC_STATUS.SYNCED,
        lastSyncAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      }).where(eq(organizationRelations.id, relation.id));

      this.audit({
        actorEmail: null,
        action: 'federation.events.sync',
        entityType: 'event_syndication',
        entityId: updated.id,
        organizationId: updated.targetOrganizationId,
        relationId: relation.id,
        metadata: { endpoint, remoteEventId: updated.remoteEventId, status: updated.status },
      });

      return { success: true, data: { endpoint, response: responseBody, syndication: updated } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue de synchronisation';
      await this.markSyncFailed(syndication.id, relation.id, errorMessage, targetInstanceUrl);
      return { success: false, data: { endpoint, error: errorMessage } };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async syncSyndicationBestEffort(id: string) {
    try {
      return await this.syncSyndication(id);
    } catch (error) {
      logger.warn('[Federation] Synchronisation inter-instance échouée', {
        syndicationId: id,
        error: error instanceof Error ? error.message : error,
      });
      return { success: false, data: { error: error instanceof Error ? error.message : 'Erreur inconnue' } };
    }
  }

  async getFormSyndications(options?: {
    status?: string;
    direction?: string;
    sourceOrganizationId?: string;
    targetOrganizationId?: string;
    syncStatus?: string;
    limit?: number;
  }) {
    const conditions: SQL[] = [];
    if (options?.status && options.status !== 'all') conditions.push(eq(surveyFormSyndications.status, options.status));
    if (options?.direction && options.direction !== 'all') conditions.push(eq(surveyFormSyndications.direction, options.direction));
    if (options?.sourceOrganizationId && options.sourceOrganizationId !== 'all') conditions.push(eq(surveyFormSyndications.sourceOrganizationId, options.sourceOrganizationId));
    if (options?.targetOrganizationId && options.targetOrganizationId !== 'all') conditions.push(eq(surveyFormSyndications.targetOrganizationId, options.targetOrganizationId));
    if (options?.syncStatus && options.syncStatus !== 'all') conditions.push(eq(surveyFormSyndications.syncStatus, options.syncStatus));

    const data = await db.select({
      id: surveyFormSyndications.id,
      formId: surveyFormSyndications.formId,
      sourceOrganizationId: surveyFormSyndications.sourceOrganizationId,
      targetOrganizationId: surveyFormSyndications.targetOrganizationId,
      direction: surveyFormSyndications.direction,
      status: surveyFormSyndications.status,
      includeResponses: surveyFormSyndications.includeResponses,
      collectResponsesLocally: surveyFormSyndications.collectResponsesLocally,
      localTitleOverride: surveyFormSyndications.localTitleOverride,
      localDescriptionOverride: surveyFormSyndications.localDescriptionOverride,
      lastSyncedAt: surveyFormSyndications.lastSyncedAt,
      targetInstanceUrl: surveyFormSyndications.targetInstanceUrl,
      remoteFormId: surveyFormSyndications.remoteFormId,
      remoteSyndicationId: surveyFormSyndications.remoteSyndicationId,
      syncStatus: surveyFormSyndications.syncStatus,
      syncError: surveyFormSyndications.syncError,
      lastSyncAttemptAt: surveyFormSyndications.lastSyncAttemptAt,
      syncAttempts: surveyFormSyndications.syncAttempts,
      createdBy: surveyFormSyndications.createdBy,
      reviewedBy: surveyFormSyndications.reviewedBy,
      reviewedAt: surveyFormSyndications.reviewedAt,
      createdAt: surveyFormSyndications.createdAt,
      updatedAt: surveyFormSyndications.updatedAt,
      formTitle: surveyForms.title,
      formSlug: surveyForms.slug,
      formStatus: surveyForms.status,
      formVersion: surveyForms.version,
      sourceName: sql<string>`source_org.name`,
      sourceType: sql<string>`source_org.type`,
      targetName: sql<string>`target_org.name`,
      targetType: sql<string>`target_org.type`,
      responseCount: sql<number>`COALESCE(summary.response_count, 0)::int`,
      lastResponseAt: sql<Date | null>`summary.last_response_at`,
    })
      .from(surveyFormSyndications)
      .leftJoin(surveyForms, eq(surveyFormSyndications.formId, surveyForms.id))
      .leftJoin(sql`organizations AS source_org`, sql`${surveyFormSyndications.sourceOrganizationId} = source_org.id`)
      .leftJoin(sql`organizations AS target_org`, sql`${surveyFormSyndications.targetOrganizationId} = target_org.id`)
      .leftJoin(sql`survey_form_response_summaries AS summary`, sql`${surveyFormSyndications.id} = summary.syndication_id`)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(surveyFormSyndications.createdAt))
      .limit(options?.limit ?? 100);

    return { success: true, data };
  }

  async proposeFormUpward(formId: string, data: unknown, userEmail?: string) {
    try {
      const form = await this.getFormOrThrow(formId);
      const body = data as { sourceOrganizationId?: string; targetOrganizationId?: string; includeResponses?: boolean };
      const sourceOrganizationId = body.sourceOrganizationId || form.organizationId;
      const targetOrganizationId = body.targetOrganizationId;
      if (!sourceOrganizationId || !targetOrganizationId) {
        throw new BadRequestException('sourceOrganizationId et targetOrganizationId sont requis');
      }
      await this.assertRelationAllowed(targetOrganizationId, sourceOrganizationId);

      const validated = insertSurveyFormSyndicationSchema.parse({
        formId,
        sourceOrganizationId,
        targetOrganizationId,
        direction: SYNDICATION_DIRECTION.UPWARD,
        status: SYNDICATION_STATUS.PROPOSED,
        includeResponses: Boolean(body.includeResponses),
        collectResponsesLocally: true,
        createdBy: userEmail,
      });

      const [created] = await db.transaction(async (tx) => {
        const [row] = await tx.insert(surveyFormSyndications).values(this.normalizeFormSyndicationDates(validated)).returning();
        await tx.update(surveyForms).set({
          federationVisibility: FEDERATION_VISIBILITY.PARENT_REGION,
          federationStatus: FEDERATION_STATUS.PROPOSED_TO_REGION,
          originOrganizationId: sourceOrganizationId,
          updatedAt: sql`NOW()`,
        }).where(eq(surveyForms.id, formId));
        return [row];
      });

      this.audit({
        actorEmail: userEmail ?? null,
        action: 'forms.federation.propose_upward',
        entityType: 'survey_form_syndication',
        entityId: created.id,
        organizationId: sourceOrganizationId,
        metadata: { formId, targetOrganizationId, includeResponses: created.includeResponses },
      });

      const sync = await this.syncFormSyndicationBestEffort(created.id);
      return { success: true, data: created, sync: sync.data };
    } catch (error) {
      if (hasErrorCode(error, '23505')) throw new ConflictException('Ce formulaire a déjà été proposé à cette organisation');
      return this.handleZodError(error);
    }
  }

  async publishFormDownward(formId: string, data: unknown, userEmail?: string) {
    try {
      const form = await this.getFormOrThrow(formId);
      const body = data as { sourceOrganizationId?: string; targetOrganizationIds?: string[]; autoAccept?: boolean; includeResponses?: boolean };
      const sourceOrganizationId = body.sourceOrganizationId || form.organizationId;
      const targetOrganizationIds = Array.isArray(body.targetOrganizationIds) ? body.targetOrganizationIds : [];
      if (!sourceOrganizationId || targetOrganizationIds.length === 0) {
        throw new BadRequestException('sourceOrganizationId et targetOrganizationIds sont requis');
      }

      for (const targetId of targetOrganizationIds) {
        await this.assertRelationAllowed(sourceOrganizationId, targetId);
      }

      const rows = targetOrganizationIds.map((targetOrganizationId) => this.normalizeFormSyndicationDates(insertSurveyFormSyndicationSchema.parse({
        formId,
        sourceOrganizationId,
        targetOrganizationId,
        direction: SYNDICATION_DIRECTION.DOWNWARD,
        status: body.autoAccept ? SYNDICATION_STATUS.AUTO_ACCEPTED : SYNDICATION_STATUS.PROPOSED,
        includeResponses: Boolean(body.includeResponses),
        collectResponsesLocally: true,
        createdBy: userEmail,
      })));

      const created = await db.transaction(async (tx) => {
        const inserted = await tx.insert(surveyFormSyndications).values(rows).returning();
        await tx.update(surveyForms).set({
          federationVisibility: FEDERATION_VISIBILITY.CHILD_SECTIONS,
          federationStatus: FEDERATION_STATUS.PUBLISHED_TO_SECTIONS,
          originOrganizationId: sourceOrganizationId,
          updatedAt: sql`NOW()`,
        }).where(eq(surveyForms.id, formId));
        return inserted;
      });

      this.audit({
        actorEmail: userEmail ?? null,
        action: 'forms.federation.publish_downward',
        entityType: 'survey_form',
        entityId: formId,
        organizationId: sourceOrganizationId,
        metadata: { targetOrganizationIds, createdSyndicationIds: created.map((row) => row.id), includeResponses: Boolean(body.includeResponses) },
      });

      const syncResults = await Promise.all(created.map((row) => this.syncFormSyndicationBestEffort(row.id)));
      return { success: true, data: created, sync: syncResults.map((result) => result.data) };
    } catch (error) {
      if (hasErrorCode(error, '23505')) throw new ConflictException('Ce formulaire est déjà publié vers au moins une organisation ciblée');
      return this.handleZodError(error);
    }
  }

  async updateFormSyndication(id: string, data: unknown, userEmail?: string) {
    try {
      const validated = updateSurveyFormSyndicationSchema.parse({ ...(data as Record<string, unknown>), reviewedBy: userEmail });
      const status = validated.status;
      const [updated] = await db.update(surveyFormSyndications)
        .set({
          ...this.normalizeFormSyndicationDates(validated),
          ...(status ? { reviewedAt: sql`NOW()` } : {}),
          updatedAt: sql`NOW()`,
          lastSyncedAt: sql`NOW()`,
        })
        .where(eq(surveyFormSyndications.id, id))
        .returning();

      if (!updated) throw new NotFoundException('Syndication formulaire introuvable');

      if (status === SYNDICATION_STATUS.ACCEPTED || status === SYNDICATION_STATUS.AUTO_ACCEPTED) {
        await db.update(surveyForms).set({
          federationStatus: updated.direction === SYNDICATION_DIRECTION.UPWARD
            ? FEDERATION_STATUS.ACCEPTED_BY_REGION
            : FEDERATION_STATUS.PUBLISHED_TO_SECTIONS,
          updatedAt: sql`NOW()`,
        }).where(eq(surveyForms.id, updated.formId));
      }

      this.audit({
        actorEmail: userEmail ?? null,
        action: 'forms.federation.syndication.update',
        entityType: 'survey_form_syndication',
        entityId: updated.id,
        organizationId: updated.targetOrganizationId,
        metadata: { status: updated.status, includeResponses: updated.includeResponses, collectResponsesLocally: updated.collectResponsesLocally },
      });

      const sync = await this.syncFormSyndicationBestEffort(updated.id);
      return { success: true, data: updated, sync: sync.data };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async revokeFormSyndication(id: string, userEmail?: string) {
    return await this.updateFormSyndication(id, { status: SYNDICATION_STATUS.REVOKED }, userEmail);
  }

  async syncFormSyndication(id: string) {
    const [syndication] = await db.select().from(surveyFormSyndications).where(eq(surveyFormSyndications.id, id)).limit(1);
    if (!syndication) throw new NotFoundException('Syndication formulaire introuvable');

    const [form, questions, sourceOrganization, targetOrganization] = await Promise.all([
      this.getFormOrThrow(syndication.formId),
      this.getFormQuestions(syndication.formId),
      this.getOrganizationOrThrow(syndication.sourceOrganizationId),
      this.getOrganizationOrThrow(syndication.targetOrganizationId),
    ]);

    let relation: typeof organizationRelations.$inferSelect;
    try {
      relation = await this.getRelationForSyndication(
        syndication.sourceOrganizationId,
        syndication.targetOrganizationId,
        syndication.direction,
      );
    } catch (error) {
      await this.markFormSyncFailed(syndication.id, null, error instanceof Error ? error.message : 'Relation de fédération introuvable');
      throw error;
    }

    const targetInstanceUrl = this.normalizeInstanceUrl(syndication.targetInstanceUrl || targetOrganization.instanceUrl);
    const sourceInstanceUrl = this.normalizeInstanceUrl(sourceOrganization.instanceUrl) || this.getCurrentInstanceUrl();

    if (!targetInstanceUrl || !this.isRemoteInstance(targetInstanceUrl, sourceInstanceUrl)) {
      const [updated] = await db.update(surveyFormSyndications).set({
        syncStatus: FEDERATION_SYNC_STATUS.LOCAL,
        syncError: null,
        targetInstanceUrl: targetInstanceUrl ?? null,
        updatedAt: sql`NOW()`,
      }).where(eq(surveyFormSyndications.id, syndication.id)).returning();
      return { success: true, data: { skipped: true, reason: 'local_or_missing_target_instance', syndication: updated } };
    }

    if (!relation.syncEnabled) {
      await this.markFormSyncFailed(syndication.id, relation.id, 'La synchronisation est désactivée sur cette relation', targetInstanceUrl);
      return { success: false, data: { skipped: true, reason: 'relation_sync_disabled' } };
    }

    const outboundToken = await this.resolveOutboundFederationToken(relation);
    if (!outboundToken) {
      await this.markFormSyncFailed(syndication.id, relation.id, 'Jeton de fédération sortant manquant ou indéchiffrable sur la relation', targetInstanceUrl);
      return { success: false, data: { skipped: true, reason: 'missing_outbound_federation_token' } };
    }

    const payload = this.buildFederatedFormPayload({
      syndication,
      form,
      questions,
      sourceOrganization,
      targetOrganization,
      responseSummary: syndication.includeResponses ? await this.buildLocalFormResponseSummary(form.id) : null,
    });
    const endpoint = `${targetInstanceUrl}/api/federation/forms/ingest`;

    await db.update(surveyFormSyndications).set({
      syncStatus: FEDERATION_SYNC_STATUS.PENDING,
      syncError: null,
      targetInstanceUrl,
      lastSyncAttemptAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    }).where(eq(surveyFormSyndications.id, syndication.id));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Komuno-Federation-Token': outboundToken,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const responseText = await response.text();
      if (!response.ok) {
        const errorMessage = `HTTP ${response.status} ${response.statusText}: ${responseText.slice(0, 500)}`;
        await this.markFormSyncFailed(syndication.id, relation.id, errorMessage, targetInstanceUrl);
        return { success: false, data: { endpoint, status: response.status, error: errorMessage } };
      }

      const responseBody = responseText ? JSON.parse(responseText) : {};
      const [updated] = await db.update(surveyFormSyndications).set({
        syncStatus: FEDERATION_SYNC_STATUS.SYNCED,
        syncError: null,
        targetInstanceUrl,
        remoteFormId: responseBody?.data?.formId ?? responseBody?.formId ?? null,
        remoteSyndicationId: responseBody?.data?.syndicationId ?? responseBody?.syndicationId ?? null,
        lastSyncedAt: sql`NOW()`,
        lastSyncAttemptAt: sql`NOW()`,
        syncAttempts: sql`${surveyFormSyndications.syncAttempts} + 1`,
        updatedAt: sql`NOW()`,
      }).where(eq(surveyFormSyndications.id, syndication.id)).returning();

      await db.update(organizationRelations).set({
        syncStatus: FEDERATION_SYNC_STATUS.SYNCED,
        lastSyncAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      }).where(eq(organizationRelations.id, relation.id));

      this.audit({
        actorEmail: null,
        action: 'forms.federation.sync',
        entityType: 'survey_form_syndication',
        entityId: updated.id,
        organizationId: updated.targetOrganizationId,
        relationId: relation.id,
        metadata: { endpoint, remoteFormId: updated.remoteFormId, includeResponses: updated.includeResponses },
      });

      return { success: true, data: { endpoint, response: responseBody, syndication: updated } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue de synchronisation formulaire';
      await this.markFormSyncFailed(syndication.id, relation.id, errorMessage, targetInstanceUrl);
      return { success: false, data: { endpoint, error: errorMessage } };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async syncFormSyndicationBestEffort(id: string) {
    try {
      return await this.syncFormSyndication(id);
    } catch (error) {
      logger.warn('[Federation] Synchronisation formulaire inter-instance échouée', {
        syndicationId: id,
        error: error instanceof Error ? error.message : error,
      });
      return { success: false, data: { error: error instanceof Error ? error.message : 'Erreur inconnue' } };
    }
  }

  async getFederatedFormResponseSummary(formId: string) {
    await this.getFormOrThrow(formId);
    const localSummary = await this.buildLocalFormResponseSummary(formId);
    const remoteSummaries = await db.select({
      id: surveyFormResponseSummaries.id,
      syndicationId: surveyFormResponseSummaries.syndicationId,
      formId: surveyFormResponseSummaries.formId,
      remoteFormId: surveyFormResponseSummaries.remoteFormId,
      sourceOrganizationId: surveyFormResponseSummaries.sourceOrganizationId,
      targetOrganizationId: surveyFormResponseSummaries.targetOrganizationId,
      sourceInstanceUrl: surveyFormResponseSummaries.sourceInstanceUrl,
      responseCount: surveyFormResponseSummaries.responseCount,
      lastResponseAt: surveyFormResponseSummaries.lastResponseAt,
      responsesByDay: surveyFormResponseSummaries.responsesByDay,
      questionSummaries: surveyFormResponseSummaries.questionSummaries,
      metadata: surveyFormResponseSummaries.metadata,
      updatedAt: surveyFormResponseSummaries.updatedAt,
      sourceName: sql<string>`source_org.name`,
      targetName: sql<string>`target_org.name`,
    })
      .from(surveyFormResponseSummaries)
      .leftJoin(sql`organizations AS source_org`, sql`${surveyFormResponseSummaries.sourceOrganizationId} = source_org.id`)
      .leftJoin(sql`organizations AS target_org`, sql`${surveyFormResponseSummaries.targetOrganizationId} = target_org.id`)
      .where(eq(surveyFormResponseSummaries.formId, formId))
      .orderBy(desc(surveyFormResponseSummaries.updatedAt));

    return { success: true, data: { formId, localSummary, remoteSummaries } };
  }

  private async markRelationSyncFailed(relationId: string, error: string) {
    logger.warn('[Federation] Handshake relation échoué', { relationId, error });
    await db.update(organizationRelations).set({
      syncStatus: FEDERATION_SYNC_STATUS.FAILED,
      updatedAt: sql`NOW()`,
    }).where(eq(organizationRelations.id, relationId));
  }

  async syncRelationHandshake(relationId: string) {
    const [relation] = await db.select().from(organizationRelations).where(eq(organizationRelations.id, relationId)).limit(1);
    if (!relation) throw new NotFoundException('Relation de fédération introuvable');

    const [fromOrganization, toOrganization] = await Promise.all([
      this.getOrganizationOrThrow(relation.fromOrganizationId),
      this.getOrganizationOrThrow(relation.toOrganizationId),
    ]);

    if (relation.status !== 'active') {
      return { success: true, data: { skipped: true, reason: 'relation_inactive', relationId } };
    }

    if (!relation.syncEnabled) {
      return { success: true, data: { skipped: true, reason: 'relation_sync_disabled', relationId } };
    }

    const outboundToken = await this.resolveOutboundFederationToken(relation);
    if (!outboundToken) {
      await this.markRelationSyncFailed(relation.id, 'Jeton de fédération sortant manquant ou indéchiffrable sur la relation');
      return { success: false, data: { skipped: true, reason: 'missing_outbound_federation_token', relationId } };
    }

    const remoteInstanceUrl = this.getRemoteInstanceUrlForRelation(fromOrganization, toOrganization);
    if (!remoteInstanceUrl) {
      const [updated] = await db.update(organizationRelations).set({
        syncStatus: FEDERATION_SYNC_STATUS.LOCAL,
        updatedAt: sql`NOW()`,
      }).where(eq(organizationRelations.id, relation.id)).returning();
      return { success: true, data: { skipped: true, reason: 'local_or_missing_remote_instance', relation: this.withoutRelationSecret(updated) } };
    }

    const payload: FederatedRelationHandshakePayload = {
      protocolVersion: 1,
      senderInstanceUrl: this.getCurrentInstanceUrl(),
      sentAt: new Date().toISOString(),
      relation: {
        fromOrganizationSlug: fromOrganization.slug,
        toOrganizationSlug: toOrganization.slug,
        relationType: relation.relationType,
      },
    };

    await db.update(organizationRelations).set({
      syncStatus: FEDERATION_SYNC_STATUS.PENDING,
      updatedAt: sql`NOW()`,
    }).where(eq(organizationRelations.id, relation.id));

    const endpoint = `${remoteInstanceUrl}/api/federation/relations/handshake`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Komuno-Federation-Token': outboundToken,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const responseText = await response.text();
      if (!response.ok) {
        const errorMessage = `HTTP ${response.status} ${response.statusText}: ${responseText.slice(0, 500)}`;
        await this.markRelationSyncFailed(relation.id, errorMessage);
        return { success: false, data: { endpoint, status: response.status, error: errorMessage } };
      }

      const responseBody = responseText ? JSON.parse(responseText) : {};
      const [updated] = await db.update(organizationRelations).set({
        syncStatus: FEDERATION_SYNC_STATUS.SYNCED,
        lastSyncAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      }).where(eq(organizationRelations.id, relation.id)).returning();

      return { success: true, data: { endpoint, response: responseBody, relation: this.withoutRelationSecret(updated) } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue de handshake fédération';
      await this.markRelationSyncFailed(relation.id, errorMessage);
      return { success: false, data: { endpoint, error: errorMessage } };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async syncRelationHandshakeBestEffort(relationId: string) {
    try {
      return await this.syncRelationHandshake(relationId);
    } catch (error) {
      logger.warn('[Federation] Handshake relation inter-instance échoué', {
        relationId,
        error: error instanceof Error ? error.message : error,
      });
      return { success: false, data: { relationId, error: error instanceof Error ? error.message : 'Erreur inconnue' } };
    }
  }

  private async syncActiveRelationHandshakes() {
    const relations = await db.select({ id: organizationRelations.id })
      .from(organizationRelations)
      .where(and(
        eq(organizationRelations.status, 'active'),
        eq(organizationRelations.syncEnabled, true),
      ));

    const results = [];
    for (const relation of relations) {
      results.push(await this.syncRelationHandshakeBestEffort(relation.id));
    }
    return results.map((result) => result.data);
  }

  private async autoShareEligibleEventsToParent(userEmail?: string) {
    const currentRelation = await this.getCurrentSectionParentRelation();
    if (!currentRelation || !this.isAutoShareEventsToParentEnabled(currentRelation.relation)) return [];

    const localEvents = await db.select({ id: events.id })
      .from(events)
      .where(and(
        sql`${events.date} > NOW()`,
        eq(events.status, EVENT_STATUS.PUBLISHED),
        eq(events.isFederatedCopy, false),
        or(
          eq(events.organizationId, currentRelation.childOrganization.id),
          sql`${events.organizationId} IS NULL`,
        ),
      ))
      .orderBy(asc(events.date))
      .limit(100);

    const results = [];
    for (const event of localEvents) {
      results.push(await this.autoShareEventToParent(event.id, userEmail ?? 'auto-share-cron'));
    }
    return results.map((result) => result.data);
  }

  private async retryPendingSyndications() {
    const syndications = await db.select({ id: eventSyndications.id })
      .from(eventSyndications)
      .where(and(
        inArray(eventSyndications.syncStatus, [
          FEDERATION_SYNC_STATUS.PENDING,
          FEDERATION_SYNC_STATUS.FAILED,
        ]),
        sql`${eventSyndications.syncAttempts} < 10`,
      ))
      .orderBy(asc(eventSyndications.updatedAt))
      .limit(25);

    const results = [];
    for (const syndication of syndications) {
      results.push(await this.syncSyndicationBestEffort(syndication.id));
    }
    return results.map((result) => result.data);
  }

  private async retryPendingFormSyndications() {
    const syndications = await db.select({ id: surveyFormSyndications.id })
      .from(surveyFormSyndications)
      .where(and(
        inArray(surveyFormSyndications.syncStatus, [
          FEDERATION_SYNC_STATUS.PENDING,
          FEDERATION_SYNC_STATUS.FAILED,
        ]),
        sql`${surveyFormSyndications.syncAttempts} < 10`,
      ))
      .orderBy(asc(surveyFormSyndications.updatedAt))
      .limit(25);

    const results = [];
    for (const syndication of syndications) {
      results.push(await this.syncFormSyndicationBestEffort(syndication.id));
    }
    return results.map((result) => result.data);
  }

  async syncFederationNow(options?: { autoShareBackfill?: boolean; actorEmail?: string }) {
    const relations = await this.syncActiveRelationHandshakes();
    const autoShared = options?.autoShareBackfill ? await this.autoShareEligibleEventsToParent(options.actorEmail) : [];
    const syndications = await this.retryPendingSyndications();
    const formSyndications = await this.retryPendingFormSyndications();
    const data = {
      relations,
      autoShared,
      syndications,
      formSyndications,
      syncedAt: new Date().toISOString(),
    };

    this.audit({
      actorEmail: options?.actorEmail ?? null,
      action: options?.autoShareBackfill ? 'federation.sync.backfill' : 'federation.sync.run',
      entityType: 'federation',
      metadata: {
        relations: relations.length,
        autoShared: autoShared.length,
        syndications: syndications.length,
        formSyndications: formSyndications.length,
        autoShareBackfill: Boolean(options?.autoShareBackfill),
      },
    });

    return {
      success: true,
      data,
    };
  }

  @Cron('*/5 * * * *', { name: 'federation-sync', timeZone: 'Europe/Paris' })
  async runFederationSyncCron() {
    if (process.env.FEDERATION_SYNC_CRON_DISABLED === 'true') return;
    if (this.federationSyncRunning) return;

    this.federationSyncRunning = true;
    try {
      const result = await this.syncFederationNow();
      logger.info('[Federation] Synchronisation planifiée terminée', {
        relations: result.data.relations.length,
        autoShared: result.data.autoShared.length,
        syndications: result.data.syndications.length,
        formSyndications: result.data.formSyndications.length,
      });
    } catch (error) {
      logger.warn('[Federation] Synchronisation planifiée échouée', {
        error: error instanceof Error ? error.message : error,
      });
    } finally {
      this.federationSyncRunning = false;
    }
  }

  private statusForReceivedEvent(payload: FederatedEventPayload): typeof EVENT_STATUS[keyof typeof EVENT_STATUS] {
    if (payload.status === SYNDICATION_STATUS.REVOKED) return EVENT_STATUS.CANCELLED;
    if (payload.status === SYNDICATION_STATUS.REJECTED) return EVENT_STATUS.DRAFT;
    if (payload.includeInAgenda || payload.status === SYNDICATION_STATUS.ACCEPTED || payload.status === SYNDICATION_STATUS.AUTO_ACCEPTED) {
      const allowedStatuses = Object.values(EVENT_STATUS) as string[];
      return payload.event.status && allowedStatuses.includes(payload.event.status)
        ? payload.event.status as typeof EVENT_STATUS[keyof typeof EVENT_STATUS]
        : EVENT_STATUS.PUBLISHED;
    }
    return EVENT_STATUS.DRAFT;
  }

  private async findOrganizationBySlugOrThrow(slug: string, role: 'source' | 'target') {
    const [organization] = await db.select().from(organizations).where(and(
      eq(organizations.slug, slug),
      eq(organizations.isActive, true),
    )).limit(1);
    if (!organization) {
      throw new BadRequestException(`Organisation ${role} introuvable localement : ${slug}. Créez explicitement l’organisation et sa relation avant toute synchronisation.`);
    }
    return organization;
  }

  async handshakeFederationRelation(data: unknown, token?: string) {
    try {
      const providedToken = token?.trim();
      if (!providedToken) throw new UnauthorizedException('Token de fédération manquant');
      const payload = federatedRelationHandshakeSchema.parse(data);

      const [fromOrganization, toOrganization] = await Promise.all([
        this.findOrganizationBySlugOrThrow(payload.relation.fromOrganizationSlug, 'source'),
        this.findOrganizationBySlugOrThrow(payload.relation.toOrganizationSlug, 'target'),
      ]);

      if (payload.senderInstanceUrl) {
        const sender = this.normalizeInstanceUrl(payload.senderInstanceUrl);
        const allowedSenders = [
          this.normalizeInstanceUrl(fromOrganization.instanceUrl),
          this.normalizeInstanceUrl(toOrganization.instanceUrl),
        ];
        if (sender && !allowedSenders.includes(sender)) {
          throw new BadRequestException(`Instance émettrice non liée à cette relation : ${payload.senderInstanceUrl}`);
        }
      }

      const conditions = [
        eq(organizationRelations.fromOrganizationId, fromOrganization.id),
        eq(organizationRelations.toOrganizationId, toOrganization.id),
        eq(organizationRelations.status, 'active'),
      ];
      if (payload.relation.relationType) {
        conditions.push(eq(organizationRelations.relationType, payload.relation.relationType));
      }

      const [relation] = await db.select().from(organizationRelations).where(and(...conditions)).limit(1);
      if (!relation) {
        throw new BadRequestException('Relation de fédération active introuvable pour ce handshake');
      }
      if (!relation.syncEnabled) throw new ForbiddenException('Synchronisation désactivée sur cette relation');
      if (!this.safeCompareRelationToken(relation, providedToken)) {
        throw new UnauthorizedException('Token de fédération invalide');
      }

      const [updated] = await db.update(organizationRelations).set({
        syncStatus: FEDERATION_SYNC_STATUS.SYNCED,
        lastSyncAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      }).where(eq(organizationRelations.id, relation.id)).returning();

      return {
        success: true,
        data: {
          relation: this.withoutRelationSecret(updated),
          receivedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async ingestFederatedEvent(data: unknown, token?: string) {
    try {
      const providedToken = token?.trim();
      if (!providedToken) throw new UnauthorizedException('Token de fédération manquant');
      const payload = federatedEventPayloadSchema.parse(data);

      const [sourceOrganization, targetOrganization] = await Promise.all([
      this.findOrganizationBySlugOrThrow(payload.sourceOrganization.slug, 'source'),
      this.findOrganizationBySlugOrThrow(payload.targetOrganization.slug, 'target'),
    ]);

    const relation = await this.getRelationForSyndication(
      sourceOrganization.id,
      targetOrganization.id,
      payload.direction,
    );

    if (!relation.syncEnabled) throw new ForbiddenException('Synchronisation désactivée sur cette relation');
    if (!this.safeCompareRelationToken(relation, providedToken)) {
      throw new UnauthorizedException('Token de fédération invalide');
    }

    const sourceInstanceUrl = this.normalizeInstanceUrl(payload.sourceInstanceUrl);
    if (!sourceInstanceUrl) throw new BadRequestException('sourceInstanceUrl invalide');

    const eventValues = {
      title: payload.event.title,
      description: payload.event.description ?? null,
      date: new Date(payload.event.date),
      location: payload.event.location ?? null,
      maxParticipants: payload.event.maxParticipants ?? null,
      helloAssoLink: payload.event.helloAssoLink ?? null,
      enableExternalRedirect: payload.event.enableExternalRedirect ?? false,
      externalRedirectUrl: payload.event.externalRedirectUrl ?? null,
      showInscriptionsCount: payload.event.showInscriptionsCount ?? true,
      showAvailableSeats: payload.event.showAvailableSeats ?? true,
      allowUnsubscribe: payload.event.allowUnsubscribe ?? false,
      redUnsubscribeButton: payload.event.redUnsubscribeButton ?? false,
      buttonMode: payload.event.buttonMode ?? 'subscribe',
      customButtonText: payload.event.customButtonText ?? null,
      organizationId: targetOrganization.id,
      originOrganizationId: sourceOrganization.id,
      sourceEventId: payload.event.id,
      sourceInstanceUrl,
      federationVisibility: FEDERATION_VISIBILITY.SELECTED_ORGANIZATIONS,
      federationStatus: FEDERATION_STATUS.IMPORTED,
      isFederatedCopy: true,
      status: this.statusForReceivedEvent(payload),
      updatedAt: sql`NOW()`,
    };

    const [existingEvent] = await db.select().from(events).where(and(
      eq(events.sourceInstanceUrl, sourceInstanceUrl),
      eq(events.sourceEventId, payload.event.id),
    )).limit(1);

    const [localEvent] = existingEvent
      ? await db.update(events).set(eventValues).where(eq(events.id, existingEvent.id)).returning()
      : await db.insert(events).values({ ...eventValues, createdAt: sql`NOW()` }).returning();

    const [existingSyndication] = await db.select().from(eventSyndications).where(and(
      eq(eventSyndications.eventId, localEvent.id),
      eq(eventSyndications.sourceOrganizationId, sourceOrganization.id),
      eq(eventSyndications.targetOrganizationId, targetOrganization.id),
    )).limit(1);

    const syndicationValues = {
      eventId: localEvent.id,
      sourceOrganizationId: sourceOrganization.id,
      targetOrganizationId: targetOrganization.id,
      direction: payload.direction,
      status: payload.status,
      includeInAgenda: payload.includeInAgenda,
      targetInstanceUrl: this.normalizeInstanceUrl(payload.targetOrganization.instanceUrl) ?? this.getCurrentInstanceUrl(),
      remoteEventId: payload.event.id,
      remoteSyndicationId: payload.sourceSyndicationId ?? null,
      syncStatus: FEDERATION_SYNC_STATUS.RECEIVED,
      syncError: null,
      lastSyncedAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    };

    const [localSyndication] = existingSyndication
      ? await db.update(eventSyndications).set(syndicationValues).where(eq(eventSyndications.id, existingSyndication.id)).returning()
      : await db.insert(eventSyndications).values({ ...syndicationValues, createdAt: sql`NOW()` }).returning();

    await db.update(organizationRelations).set({
      syncStatus: FEDERATION_SYNC_STATUS.RECEIVED,
      lastSyncAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    }).where(eq(organizationRelations.id, relation.id));

      return {
        success: true,
        data: {
          eventId: localEvent.id,
          syndicationId: localSyndication.id,
          status: localSyndication.status,
          createdEvent: !existingEvent,
        },
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  private statusForReceivedForm(payload: FederatedFormPayload) {
    if (payload.status === SYNDICATION_STATUS.REVOKED) return SURVEY_FORM_STATUS.CLOSED;
    if (
      (payload.status === SYNDICATION_STATUS.ACCEPTED || payload.status === SYNDICATION_STATUS.AUTO_ACCEPTED)
      && payload.form.status === SURVEY_FORM_STATUS.PUBLISHED
    ) {
      return SURVEY_FORM_STATUS.PUBLISHED;
    }
    return SURVEY_FORM_STATUS.DRAFT;
  }

  async ingestFederatedForm(data: unknown, token?: string) {
    try {
      const providedToken = token?.trim();
      if (!providedToken) throw new UnauthorizedException('Token de fédération manquant');
      const payload = federatedFormPayloadSchema.parse(data);

      const [sourceOrganization, targetOrganization] = await Promise.all([
        this.findOrganizationBySlugOrThrow(payload.sourceOrganization.slug, 'source'),
        this.findOrganizationBySlugOrThrow(payload.targetOrganization.slug, 'target'),
      ]);

      const relation = await this.getRelationForSyndication(
        sourceOrganization.id,
        targetOrganization.id,
        payload.direction,
      );

      if (!relation.syncEnabled) throw new ForbiddenException('Synchronisation désactivée sur cette relation');
      if (!this.safeCompareRelationToken(relation, providedToken)) {
        throw new UnauthorizedException('Token de fédération invalide');
      }

      const sourceInstanceUrl = this.normalizeInstanceUrl(payload.sourceInstanceUrl);
      if (!sourceInstanceUrl) throw new BadRequestException('sourceInstanceUrl invalide');

      const [existingForm] = await db.select().from(surveyForms).where(and(
        eq(surveyForms.sourceInstanceUrl, sourceInstanceUrl),
        eq(surveyForms.sourceFormId, payload.form.id),
      )).limit(1);

      const localSlug = existingForm?.slug ?? await this.ensureUniqueFederatedFormSlug(payload.form.slug);
      const receivedStatus = this.statusForReceivedForm(payload);
      const expiresAt = payload.form.expiresAt ? new Date(payload.form.expiresAt) : null;
      const formValues = {
        slug: localSlug,
        title: payload.form.title,
        description: payload.form.description ?? null,
        status: receivedStatus,
        version: payload.form.version,
        organizationId: targetOrganization.id,
        originOrganizationId: sourceOrganization.id,
        sourceFormId: payload.form.id,
        sourceInstanceUrl,
        federationVisibility: FEDERATION_VISIBILITY.SELECTED_ORGANIZATIONS,
        federationStatus: FEDERATION_STATUS.IMPORTED,
        isFederatedCopy: true,
        canonicalFormId: null,
        collectRespondentInfo: payload.form.collectRespondentInfo,
        allowMultipleSubmissions: payload.form.allowMultipleSubmissions,
        successMessage: payload.form.successMessage ?? null,
        requireConsent: payload.form.requireConsent,
        consentText: payload.form.consentText ?? null,
        retentionDays: payload.form.retentionDays ?? null,
        expiresAt,
        publishedAt: receivedStatus === SURVEY_FORM_STATUS.PUBLISHED ? sql`NOW()` : null,
        closedAt: receivedStatus === SURVEY_FORM_STATUS.CLOSED ? sql`NOW()` : null,
        updatedAt: sql`NOW()`,
      };

      const [localForm, localSyndication] = await db.transaction(async (tx) => {
        const [form] = existingForm
          ? await tx.update(surveyForms).set(formValues).where(eq(surveyForms.id, existingForm.id)).returning()
          : await tx.insert(surveyForms).values({ ...formValues, createdAt: sql`NOW()` }).returning();

        await tx.delete(surveyQuestions).where(eq(surveyQuestions.formId, form.id));
        if (payload.form.questions.length > 0) {
          await tx.insert(surveyQuestions).values(payload.form.questions.map((question, index) => ({
            id: question.id,
            formId: form.id,
            label: question.label,
            description: question.description ?? null,
            type: question.type,
            required: question.required,
            options: question.options,
            validation: question.validation,
            orderIndex: question.orderIndex ?? index,
          })));
        }

        const [existingSyndication] = await tx.select().from(surveyFormSyndications).where(and(
          eq(surveyFormSyndications.formId, form.id),
          eq(surveyFormSyndications.sourceOrganizationId, sourceOrganization.id),
          eq(surveyFormSyndications.targetOrganizationId, targetOrganization.id),
        )).limit(1);

        const syndicationValues = {
          formId: form.id,
          sourceOrganizationId: sourceOrganization.id,
          targetOrganizationId: targetOrganization.id,
          direction: payload.direction,
          status: payload.status,
          includeResponses: payload.includeResponses,
          collectResponsesLocally: payload.collectResponsesLocally,
          targetInstanceUrl: this.normalizeInstanceUrl(payload.targetOrganization.instanceUrl) ?? this.getCurrentInstanceUrl(),
          remoteFormId: payload.form.id,
          remoteSyndicationId: payload.sourceSyndicationId ?? null,
          syncStatus: FEDERATION_SYNC_STATUS.RECEIVED,
          syncError: null,
          lastSyncedAt: sql`NOW()`,
          updatedAt: sql`NOW()`,
        };

        const [syndication] = existingSyndication
          ? await tx.update(surveyFormSyndications).set(syndicationValues).where(eq(surveyFormSyndications.id, existingSyndication.id)).returning()
          : await tx.insert(surveyFormSyndications).values({ ...syndicationValues, createdAt: sql`NOW()` }).returning();

        if (payload.includeResponses && payload.responseSummary) {
          const [existingSummary] = await tx.select().from(surveyFormResponseSummaries).where(and(
            eq(surveyFormResponseSummaries.sourceInstanceUrl, sourceInstanceUrl),
            eq(surveyFormResponseSummaries.remoteFormId, payload.form.id),
            eq(surveyFormResponseSummaries.targetOrganizationId, targetOrganization.id),
          )).limit(1);

          const summaryValues = {
            syndicationId: syndication.id,
            formId: form.id,
            remoteFormId: payload.form.id,
            sourceOrganizationId: sourceOrganization.id,
            targetOrganizationId: targetOrganization.id,
            sourceInstanceUrl,
            responseCount: payload.responseSummary.responseCount,
            lastResponseAt: payload.responseSummary.lastResponseAt ? new Date(payload.responseSummary.lastResponseAt) : null,
            responsesByDay: payload.responseSummary.responsesByDay,
            questionSummaries: payload.responseSummary.questionSummaries,
            metadata: {
              direction: payload.direction,
              status: payload.status,
              receivedAt: new Date().toISOString(),
            },
            updatedAt: sql`NOW()`,
          };

          if (existingSummary) {
            await tx.update(surveyFormResponseSummaries).set(summaryValues).where(eq(surveyFormResponseSummaries.id, existingSummary.id));
          } else {
            await tx.insert(surveyFormResponseSummaries).values({ ...summaryValues, createdAt: sql`NOW()` });
          }
        }

        return [form, syndication];
      });

      await db.update(organizationRelations).set({
        syncStatus: FEDERATION_SYNC_STATUS.RECEIVED,
        lastSyncAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      }).where(eq(organizationRelations.id, relation.id));

      this.audit({
        actorEmail: null,
        action: 'forms.federation.ingest',
        entityType: 'survey_form',
        entityId: localForm.id,
        organizationId: targetOrganization.id,
        relationId: relation.id,
        metadata: {
          sourceFormId: payload.form.id,
          sourceInstanceUrl,
          syndicationId: localSyndication.id,
          status: localSyndication.status,
          includeResponses: payload.includeResponses,
          createdForm: !existingForm,
        },
      });

      return {
        success: true,
        data: {
          formId: localForm.id,
          syndicationId: localSyndication.id,
          status: localSyndication.status,
          createdForm: !existingForm,
          receivedResponsesSummary: Boolean(payload.includeResponses && payload.responseSummary),
        },
      };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async updateSyndication(id: string, data: unknown, userEmail?: string) {
    try {
      const validated = updateEventSyndicationSchema.parse({ ...(data as Record<string, unknown>), reviewedBy: userEmail });
      const status = validated.status;
      const includeInAgenda = validated.includeInAgenda ?? (status === SYNDICATION_STATUS.ACCEPTED || status === SYNDICATION_STATUS.AUTO_ACCEPTED ? true : undefined);
      const [updated] = await db.update(eventSyndications)
        .set({
          ...this.normalizeSyndicationDates(validated),
          ...(includeInAgenda !== undefined ? { includeInAgenda } : {}),
          ...(status ? { reviewedAt: sql`NOW()` } : {}),
          updatedAt: sql`NOW()`,
          lastSyncedAt: sql`NOW()`,
        })
        .where(eq(eventSyndications.id, id))
        .returning();

      if (!updated) throw new NotFoundException('Syndication introuvable');

      if (status === SYNDICATION_STATUS.ACCEPTED || status === SYNDICATION_STATUS.AUTO_ACCEPTED) {
        await db.update(events).set({
          federationStatus: updated.direction === SYNDICATION_DIRECTION.UPWARD
            ? FEDERATION_STATUS.ACCEPTED_BY_REGION
            : FEDERATION_STATUS.PUBLISHED_TO_SECTIONS,
          updatedAt: sql`NOW()`,
        }).where(eq(events.id, updated.eventId));
      }

      this.audit({
        actorEmail: userEmail ?? null,
        action: 'federation.events.syndication.update',
        entityType: 'event_syndication',
        entityId: updated.id,
        organizationId: updated.targetOrganizationId,
        metadata: { status: updated.status, includeInAgenda: updated.includeInAgenda, eventId: updated.eventId },
      });

      const sync = await this.syncSyndicationBestEffort(updated.id);
      return { success: true, data: updated, sync: sync.data };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async revokeSyndication(id: string, userEmail?: string) {
    return await this.updateSyndication(id, { status: SYNDICATION_STATUS.REVOKED, includeInAgenda: false }, userEmail);
  }

  async getFederatedAgenda(organizationId?: string) {
    const conditions: SQL[] = [eq(eventSyndications.includeInAgenda, true)];
    if (organizationId) {
      const organizationCondition = or(
        eq(eventSyndications.targetOrganizationId, organizationId),
        eq(eventSyndications.sourceOrganizationId, organizationId),
      );
      if (organizationCondition) conditions.push(organizationCondition);
    }

    const data = await db.select({
      syndicationId: eventSyndications.id,
      direction: eventSyndications.direction,
      status: eventSyndications.status,
      sourceOrganizationId: eventSyndications.sourceOrganizationId,
      targetOrganizationId: eventSyndications.targetOrganizationId,
      eventId: events.id,
      title: sql<string>`COALESCE(${eventSyndications.localTitleOverride}, ${events.title})`,
      description: sql<string | null>`COALESCE(${eventSyndications.localDescriptionOverride}, ${events.description})`,
      date: sql<Date>`COALESCE(${eventSyndications.localDateOverride}, ${events.date})`,
      location: events.location,
      sourceName: sql<string>`source_org.name`,
      targetName: sql<string>`target_org.name`,
    })
      .from(eventSyndications)
      .innerJoin(events, eq(eventSyndications.eventId, events.id))
      .leftJoin(sql`organizations AS source_org`, sql`${eventSyndications.sourceOrganizationId} = source_org.id`)
      .leftJoin(sql`organizations AS target_org`, sql`${eventSyndications.targetOrganizationId} = target_org.id`)
      .where(and(...conditions))
      .orderBy(sql`COALESCE(${eventSyndications.localDateOverride}, ${events.date})`);

    return { success: true, data };
  }
}
