import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { db } from '../../db';
import { logger } from '../../lib/logger';
import {
  FEDERATION_STATUS,
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

@Injectable()
export class FederationService {
  private handleZodError(error: unknown): never {
    if (error instanceof ZodError) {
      throw new BadRequestException(fromZodError(error).toString());
    }
    throw error;
  }

  private normalizeSyndicationDates<T extends { localDateOverride?: string | Date | null }>(data: T) {
    return {
      ...data,
      localDateOverride: typeof data.localDateOverride === 'string'
        ? new Date(data.localDateOverride)
        : data.localDateOverride,
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
      const validated = insertOrganizationRelationSchema.parse(data);
      if (validated.fromOrganizationId === validated.toOrganizationId) {
        throw new BadRequestException('Une organisation ne peut pas être liée à elle-même');
      }
      await Promise.all([
        this.getOrganizationOrThrow(validated.fromOrganizationId),
        this.getOrganizationOrThrow(validated.toOrganizationId),
      ]);
      const [created] = await db.insert(organizationRelations).values(validated).returning();
      return { success: true, data: created };
    } catch (error) {
      if ((error as any)?.code === '23505') throw new ConflictException('Cette relation existe déjà');
      return this.handleZodError(error);
    }
  }

  async updateRelation(id: string, data: unknown) {
    try {
      const validated = updateOrganizationRelationSchema.parse(data);
      const [updated] = await db.update(organizationRelations)
        .set({ ...validated, updatedAt: sql`NOW()` })
        .where(eq(organizationRelations.id, id))
        .returning();
      if (!updated) throw new NotFoundException('Relation introuvable');
      return { success: true, data: updated };
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
      return { success: true, data: created };
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

      return { success: true, data: created };
    } catch (error) {
      if ((error as any)?.code === '23505') throw new ConflictException('Cet événement est déjà publié vers au moins une organisation ciblée');
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

      return { success: true, data: updated };
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
