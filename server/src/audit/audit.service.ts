import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  businessAuditLogs,
  insertBusinessAuditLogSchema,
} from '../../../shared/schema';

export type AuditActionInput = {
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  organizationId?: string | null;
  relationId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  async record(input: AuditActionInput) {
    try {
      const validated = insertBusinessAuditLogSchema.parse({
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        organizationId: input.organizationId ?? null,
        relationId: input.relationId ?? null,
        metadata: input.metadata ?? {},
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
      const [created] = await db.insert(businessAuditLogs).values({
        actorEmail: validated.actorEmail ?? null,
        action: validated.action,
        entityType: validated.entityType,
        entityId: validated.entityId ?? null,
        organizationId: validated.organizationId ?? null,
        relationId: validated.relationId ?? null,
        metadata: validated.metadata ?? {},
        ipAddress: validated.ipAddress ?? null,
        userAgent: validated.userAgent ?? null,
      }).returning();
      return created;
    } catch (error) {
      this.logger.warn(`Audit log non bloquant impossible à écrire: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async list(options?: {
    action?: string;
    entityType?: string;
    entityId?: string;
    actorEmail?: string;
    limit?: number;
  }) {
    const conditions = [] as any[];
    if (options?.action) conditions.push(eq(businessAuditLogs.action, options.action));
    if (options?.entityType) conditions.push(eq(businessAuditLogs.entityType, options.entityType));
    if (options?.entityId) conditions.push(eq(businessAuditLogs.entityId, options.entityId));
    if (options?.actorEmail) conditions.push(eq(businessAuditLogs.actorEmail, options.actorEmail));
    const limit = Math.max(1, Math.min(options?.limit ?? 100, 200));

    const rows = await db.select().from(businessAuditLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(businessAuditLogs.createdAt))
      .limit(limit);

    const [total] = await db.select({ count: sql<number>`count(*)::int` })
      .from(businessAuditLogs)
      .where(conditions.length ? and(...conditions) : undefined);

    return { success: true, data: { rows, total: total?.count ?? rows.length, limit } };
  }
}
