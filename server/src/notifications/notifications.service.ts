import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DATABASE } from '../common/database/database.providers';
import { DrizzleDb } from '../common/database/types';
import { notifications, Notification, InsertNotification, UpdateNotification, NotificationMetadata } from '../../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(DATABASE) private db: DrizzleDb) {}

  /**
   * Create a new notification
   */
  async createNotification(data: InsertNotification): Promise<Notification> {
    try {
      const result = await this.db
        .insert(notifications)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .returning();

      this.logger.debug(`Notification créée: ${result[0]?.id}`);
      return result[0];
    } catch (error) {
      this.logger.error(`Erreur création notification: ${error}`);
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   */
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  /**
   * Get notifications grouped by project
   */
  async getNotificationsByProject(
    userId: string,
    projectId: string
  ): Promise<Notification[]> {
    return this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(
            sql`metadata->>'projectId'`,
            projectId
          )
        )
      )
      .orderBy(desc(notifications.createdAt));
  }

  /**
   * Get notifications grouped by offer
   */
  async getNotificationsByOffer(
    userId: string,
    offerId: string
  ): Promise<Notification[]> {
    return this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(
            sql`metadata->>'offerId'`,
            offerId
          )
        )
      )
      .orderBy(desc(notifications.createdAt));
  }

  /**
   * Get grouped notifications (organized by entity)
   * Returns notifications grouped by project, offer, or entity
   */
  async getGroupedNotifications(
    userId: string,
    groupBy: 'project' | 'offer' | 'entity' = 'project'
  ): Promise<Record<string, Notification[]>> {
    const userNotifications = await this.getNotificationsByUser(userId);
    const grouped: Record<string, Notification[]> = {};

    for (const notif of userNotifications) {
      let groupKey = 'ungrouped';
      const metadata = (notif.metadata as Record<string, unknown>) ?? {};

      if (groupBy === 'project' && metadata.projectId) {
        groupKey = String(metadata.projectId);
      } else if (groupBy === 'offer' && metadata.offerId) {
        groupKey = String(metadata.offerId);
      } else if (groupBy === 'entity' && notif.entityId) {
        groupKey = `${notif.entityType}:${notif.entityId}`;
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(notif);
    }

    return grouped;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Get unread count by project
   */
  async getUnreadCountByProject(
    userId: string,
    projectId: string
  ): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          eq(sql`metadata->>'projectId'`, projectId)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Get unread count by offer
   */
  async getUnreadCountByOffer(
    userId: string,
    offerId: string
  ): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          eq(sql`metadata->>'offerId'`, offerId)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning();

    return result[0];
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<number> {
    if (!notificationIds.length) return 0;

    const result = await this.db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(sql`${notifications.id} = ANY(${notificationIds})`)
      .returning();

    return result.length;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      )
      .returning();

    return result.length;
  }

  /**
   * Mark all notifications as read for a project
   */
  async markProjectAsRead(userId: string, projectId: string): Promise<number> {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          eq(sql`metadata->>'projectId'`, projectId)
        )
      )
      .returning();

    return result.length;
  }

  /**
   * Update notification metadata
   */
  async updateNotification(
    notificationId: string,
    data: UpdateNotification
  ): Promise<Notification> {
    const updateData: any = { updatedAt: new Date() };

    if (data.isRead !== undefined) {
      updateData.isRead = data.isRead;
    }

    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata;
    }

    const result = await this.db
      .update(notifications)
      .set(updateData)
      .where(eq(notifications.id, notificationId))
      .returning();

    return result[0];
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    const result = await this.db
      .delete(notifications)
      .where(eq(notifications.id, notificationId))
      .returning();

    return result.length > 0;
  }

  /**
   * Delete old notifications (older than X days)
   */
  async deleteOldNotifications(days: number = 30): Promise<number> {
    const result = await this.db
      .delete(notifications)
      .where(
        sql`${notifications.createdAt} < NOW() - INTERVAL '${days} days'`
      )
      .returning();

    this.logger.log(`Suppression de ${result.length} notifications anciennes`);
    return result.length;
  }

  /**
   * Search notifications with filters
   */
  async searchNotifications(
    userId: string,
    filters: {
      type?: string;
      isRead?: boolean;
      projectId?: string;
      offerId?: string;
      entityType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ notifications: Notification[]; total: number }> {
    const conditions = [eq(notifications.userId, userId)];

    if (filters.type) {
      conditions.push(eq(notifications.type, filters.type));
    }

    if (filters.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, filters.isRead));
    }

    if (filters.projectId) {
      conditions.push(eq(sql`metadata->>'projectId'`, filters.projectId));
    }

    if (filters.offerId) {
      conditions.push(eq(sql`metadata->>'offerId'`, filters.offerId));
    }

    if (filters.entityType) {
      conditions.push(eq(notifications.entityType, filters.entityType));
    }

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Get paginated results
    const notifs = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(filters.limit || 20)
      .offset(filters.offset || 0);

    return { notifications: notifs, total };
  }
}
