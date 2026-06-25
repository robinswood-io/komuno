import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { timingSafeEqual } from 'crypto';
import { and, asc, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { z, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '../../db';
import { logger } from '../../lib/logger';
import {
  EVENT_STATUS,
  FEDERATION_STATUS,
  FEDERATION_SYNC_STATUS,
  FEDERATION_VISIBILITY,
  ORGANIZATION_RELATION_TYPE,
  SYNDICATION_DIRECTION,
  SYNDICATION_STATUS,
  eventSyndications,
  events,
  insertEventSyndicationSchema,
  insertOrganizationNetworkSchema,
  insertOrganizationRelationSchema,
  insertOrganizationSchema,
  organizationNetworks,
  organizationRelations,
  organizations,
  updateEventSyndicationSchema,
  updateOrganizationNetworkSchema,
  updateOrganizationRelationSchema,
  updateOrganizationSchema,
} from '../../../shared/schema';

const federatedOrganizationPayloadSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(200),
  type: z.string().min(2).max(40),
  domain: z.string().max(255).optional().nullable(),
  instanceUrl: z.string().url().optional().nullable(),
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
  sourceInstanceUrl: z.string().url(),
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
    helloAssoLink: z.string().url().optional().nullable(),
    enableExternalRedirect: z.boolean().optional(),
    externalRedirectUrl: z.string().url().optional().nullable(),
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

const federatedRelationHandshakeSchema = z.object({
  protocolVersion: z.literal(1).default(1),
  senderInstanceUrl: z.string().url().optional().nullable(),
  sentAt: z.string().datetime().optional(),
  relation: z.object({
    fromOrganizationSlug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
    toOrganizationSlug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
    relationType: z.string().min(2).max(40).optional().nullable(),
  }),
});

type FederatedRelationHandshakePayload = z.infer<typeof federatedRelationHandshakeSchema>;

@Injectable()
export class FederationService {
  private federationSyncRunning = false;

  private handleZodError(error: unknown): never {
    if (error instanceof ZodError) {
      throw new BadRequestException(fromZodError(error).toString());
    }
    throw error;
  }

  private safeCompareToken(expected: string | null | undefined, received: string | undefined): boolean {
    if (!expected || !received) return false;
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  private normalizeInstanceUrl(value?: string | null): string | null {
    if (!value) return null;
    try {
      const url = new URL(value.startsWith('http') ? value : `https://${value}`);
      url.hash = '';
      url.search = '';
      return url.toString().replace(/\/$/, '').toLowerCase();
    } catch {
      return value.replace(/\/$/, '').toLowerCase();
    }
  }

  private getCurrentInstanceUrl(): string | null {
    return this.normalizeInstanceUrl(
      process.env.PUBLIC_APP_URL
      || process.env.NEXT_PUBLIC_APP_URL
      || process.env.APP_URL
      || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : null),
    );
  }

  private isRemoteInstance(targetInstanceUrl?: string | null, sourceInstanceUrl?: string | null): boolean {
    const target = this.normalizeInstanceUrl(targetInstanceUrl);
    if (!target) return false;
    const current = this.getCurrentInstanceUrl();
    if (current && target === current) return false;
    const source = this.normalizeInstanceUrl(sourceInstanceUrl);
    if (source && target === source) return false;
    return true;
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

  private withoutRelationSecret<T extends { federationToken?: string | null }>(relation: T) {
    const { federationToken, ...safeRelation } = relation;
    return {
      ...safeRelation,
      hasFederationToken: Boolean(federationToken),
    };
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
      if ((error as any)?.code === '23505') throw new ConflictException('Un réseau avec ce slug existe déjà');
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
      if ((error as any)?.code === '23505') throw new ConflictException('Une organisation avec ce slug existe déjà');
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
      hasFederationToken: sql<boolean>`${organizationRelations.federationToken} IS NOT NULL`,
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

  async createRelation(data: unknown) {
    try {
      const validated = this.normalizeRelationDates(insertOrganizationRelationSchema.parse(data));
      if (validated.fromOrganizationId === validated.toOrganizationId) {
        throw new BadRequestException('Une organisation ne peut pas être liée à elle-même');
      }
      await Promise.all([
        this.getOrganizationOrThrow(validated.fromOrganizationId),
        this.getOrganizationOrThrow(validated.toOrganizationId),
      ]);
      const [created] = await db.insert(organizationRelations).values(validated).returning();
      return { success: true, data: this.withoutRelationSecret(created) };
    } catch (error) {
      if ((error as any)?.code === '23505') throw new ConflictException('Cette relation existe déjà');
      return this.handleZodError(error);
    }
  }

  async updateRelation(id: string, data: unknown) {
    try {
      const validated = this.normalizeRelationDates(updateOrganizationRelationSchema.parse(data));
      const [updated] = await db.update(organizationRelations)
        .set({ ...validated, updatedAt: sql`NOW()` })
        .where(eq(organizationRelations.id, id))
        .returning();
      if (!updated) throw new NotFoundException('Relation introuvable');
      return { success: true, data: this.withoutRelationSecret(updated) };
    } catch (error) {
      return this.handleZodError(error);
    }
  }

  async getSyndications(options?: { status?: string; direction?: string; limit?: number }) {
    const conditions = [] as any[];
    if (options?.status && options.status !== 'all') conditions.push(eq(eventSyndications.status, options.status));
    if (options?.direction && options.direction !== 'all') conditions.push(eq(eventSyndications.direction, options.direction));

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
      const sync = await this.syncSyndicationBestEffort(created.id);
      return { success: true, data: created, sync: sync.data };
    } catch (error) {
      if ((error as any)?.code === '23505') throw new ConflictException('Cet événement a déjà été proposé à cette organisation');
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

      const syncResults = await Promise.all(created.map((row) => this.syncSyndicationBestEffort(row.id)));
      return { success: true, data: created, sync: syncResults.map((result) => result.data) };
    } catch (error) {
      if ((error as any)?.code === '23505') throw new ConflictException('Cet événement est déjà publié vers au moins une organisation ciblée');
      return this.handleZodError(error);
    }
  }

  private async getRelationForSyndication(sourceOrganizationId: string, targetOrganizationId: string, direction: string) {
    if (direction === SYNDICATION_DIRECTION.UPWARD) {
      return await this.assertRelationAllowed(targetOrganizationId, sourceOrganizationId);
    }
    return await this.assertRelationAllowed(sourceOrganizationId, targetOrganizationId);
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

    if (!relation.federationToken) {
      await this.markSyncFailed(syndication.id, relation.id, 'Jeton de fédération manquant sur la relation', targetInstanceUrl);
      return { success: false, data: { skipped: true, reason: 'missing_federation_token' } };
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
          'X-Komuno-Federation-Token': relation.federationToken,
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

    if (!relation.federationToken) {
      await this.markRelationSyncFailed(relation.id, 'Jeton de fédération manquant sur la relation');
      return { success: false, data: { skipped: true, reason: 'missing_federation_token', relationId } };
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
          'X-Komuno-Federation-Token': relation.federationToken,
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

  async syncFederationNow() {
    const [relations, syndications] = await Promise.all([
      this.syncActiveRelationHandshakes(),
      this.retryPendingSyndications(),
    ]);

    return {
      success: true,
      data: {
        relations,
        syndications,
        syncedAt: new Date().toISOString(),
      },
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
        syndications: result.data.syndications.length,
      });
    } catch (error) {
      logger.warn('[Federation] Synchronisation planifiée échouée', {
        error: error instanceof Error ? error.message : error,
      });
    } finally {
      this.federationSyncRunning = false;
    }
  }

  private statusForReceivedEvent(payload: FederatedEventPayload) {
    if (payload.status === SYNDICATION_STATUS.REVOKED) return EVENT_STATUS.CANCELLED;
    if (payload.status === SYNDICATION_STATUS.REJECTED) return EVENT_STATUS.DRAFT;
    if (payload.includeInAgenda || payload.status === SYNDICATION_STATUS.ACCEPTED || payload.status === SYNDICATION_STATUS.AUTO_ACCEPTED) {
      return Object.values(EVENT_STATUS).includes(payload.event.status as any)
        ? payload.event.status
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
      if (!this.safeCompareToken(relation.federationToken, providedToken)) {
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
    if (!this.safeCompareToken(relation.federationToken, providedToken)) {
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
    const conditions = [eq(eventSyndications.includeInAgenda, true)] as any[];
    if (organizationId) {
      conditions.push(or(
        eq(eventSyndications.targetOrganizationId, organizationId),
        eq(eventSyndications.sourceOrganizationId, organizationId),
      ));
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
