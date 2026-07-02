import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationsService } from './notifications.service';
import type { Database } from '../common/database/database.providers';
import { DATABASE } from '../common/database/database.providers';
import { eq, and, desc, sql } from 'drizzle-orm';

// Mock the schema module
vi.mock('../../../shared/schema', () => ({
  notifications: {
    id: {},
    userId: {},
    type: {},
    title: {},
    body: {},
    icon: {},
    isRead: {},
    metadata: {},
    entityType: {},
    entityId: {},
    relatedProjectId: {},
    relatedOfferId: {},
    createdAt: {},
    updatedAt: {},
  },
}));

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockDb: Partial<Database>;

  beforeEach(async () => {
    // Mock the database
    mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'notif-1',
              userId: 'user-123',
              type: 'idea_update',
              title: 'Test Notification',
              body: 'Test body',
              isRead: false,
              metadata: { projectId: 'proj-1' },
              entityType: 'idea',
              entityId: 'idea-1',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: 'notif-1', isRead: true },
            ]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'notif-1' }]),
        }),
      }),
    } as unknown;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: DATABASE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a new notification', async () => {
      const notificationData = {
        userId: 'user-123',
        type: 'idea_update',
        title: 'Test Notification',
        body: 'Test body',
        metadata: { projectId: 'proj-1' },
      };

      const result = await service.createNotification(notificationData);

      expect(result).toBeDefined();
      expect(result.id).toBe('notif-1');
      expect(result.userId).toBe('user-123');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should handle errors during creation', async () => {
      mockDb.insert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('DB Error')),
        }),
      });

      const notificationData = {
        userId: 'user-123',
        type: 'idea_update',
        title: 'Test',
        body: 'Test',
      };

      await expect(
        service.createNotification(notificationData)
      ).rejects.toThrow('DB Error');
    });
  });

  describe('getNotificationsByUser', () => {
    it('should fetch all notifications for a user', async () => {
      const userId = 'user-123';

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                id: 'notif-1',
                userId,
                type: 'idea_update',
                title: 'Test',
                body: 'Test body',
                isRead: false,
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      });

      const result = await service.getNotificationsByUser(userId);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(userId);
    });
  });

  describe('getNotificationsByProject / getNotificationsByOffer', () => {
    it('should fetch notifications filtered by project', async () => {
      const userId = 'user-123';
      const projectId = 'project-42';

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([{ id: 'notif-p1', userId }]),
          }),
        }),
      });

      const result = await service.getNotificationsByProject(userId, projectId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-p1');
    });

    it('should fetch notifications filtered by offer', async () => {
      const userId = 'user-123';
      const offerId = 'offer-42';

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([{ id: 'notif-o1', userId }]),
          }),
        }),
      });

      const result = await service.getNotificationsByOffer(userId, offerId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-o1');
    });
  });

  describe('getGroupedNotifications', () => {
    it('should group notifications by project', async () => {
      const userId = 'user-123';
      const mockNotifications = [
        {
          id: 'notif-1',
          userId,
          type: 'idea_update',
          title: 'Update 1',
          body: 'Body 1',
          isRead: false,
          metadata: { projectId: 'proj-1' },
          entityId: 'idea-1',
          entityType: 'idea',
          createdAt: new Date(),
        },
        {
          id: 'notif-2',
          userId,
          type: 'event_update',
          title: 'Update 2',
          body: 'Body 2',
          isRead: true,
          metadata: { projectId: 'proj-1' },
          entityId: 'event-1',
          entityType: 'event',
          createdAt: new Date(),
        },
        {
          id: 'notif-3',
          userId,
          type: 'idea_update',
          title: 'Update 3',
          body: 'Body 3',
          isRead: false,
          metadata: { projectId: 'proj-2' },
          entityId: 'idea-2',
          entityType: 'idea',
          createdAt: new Date(),
        },
      ];

      vi
        .spyOn(service, 'getNotificationsByUser')
        .mockResolvedValue(mockNotifications as unknown);

      const result = await service.getGroupedNotifications(userId, 'project');

      expect(result).toHaveProperty('proj-1');
      expect(result).toHaveProperty('proj-2');
      expect(result['proj-1']).toHaveLength(2);
      expect(result['proj-2']).toHaveLength(1);
    });

    it('should group notifications by offer', async () => {
      const userId = 'user-123';
      const mockNotifications = [
        {
          id: 'notif-1',
          userId,
          type: 'offer_update',
          title: 'Update 1',
          body: 'Body 1',
          isRead: false,
          metadata: { offerId: 'offer-1' },
          entityId: 'offer-1',
          entityType: 'offer',
          createdAt: new Date(),
        },
        {
          id: 'notif-2',
          userId,
          type: 'offer_update',
          title: 'Update 2',
          body: 'Body 2',
          isRead: true,
          metadata: { offerId: 'offer-2' },
          entityId: 'offer-2',
          entityType: 'offer',
          createdAt: new Date(),
        },
      ];

      vi
        .spyOn(service, 'getNotificationsByUser')
        .mockResolvedValue(mockNotifications as unknown);

      const result = await service.getGroupedNotifications(userId, 'offer');

      expect(result).toHaveProperty('offer-1');
      expect(result).toHaveProperty('offer-2');
    });

    it('should group by entity and fallback to ungrouped for missing fields', async () => {
      const userId = 'user-123';
      const mockNotifications = [
        {
          id: 'notif-1',
          userId,
          type: 'idea_update',
          title: 'Entity update',
          body: 'Body 1',
          isRead: false,
          metadata: {},
          entityType: 'idea',
          entityId: 'idea-77',
          createdAt: new Date(),
        },
        {
          id: 'notif-2',
          userId,
          type: 'misc',
          title: 'No entity and no metadata',
          body: 'Body 2',
          isRead: false,
          metadata: undefined,
          entityType: undefined,
          entityId: undefined,
          createdAt: new Date(),
        },
      ];

      vi.spyOn(service, 'getNotificationsByUser').mockResolvedValue(
        mockNotifications as unknown as Awaited<ReturnType<typeof service.getNotificationsByUser>>,
      );

      const result = await service.getGroupedNotifications(userId, 'entity');

      expect(result).toHaveProperty('idea:idea-77');
      expect(result).toHaveProperty('ungrouped');
      expect(result['idea:idea-77']).toHaveLength(1);
      expect(result.ungrouped).toHaveLength(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notificationId = 'notif-1';

      const result = await service.markAsRead(notificationId);

      expect(result).toBeDefined();
      expect(result.isRead).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should return undefined when no row is updated', async () => {
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.markAsRead('missing-id');

      expect(result).toBeUndefined();
    });
  });

  describe('markMultipleAsRead', () => {
    it('should mark multiple notifications as read', async () => {
      const notificationIds = ['notif-1', 'notif-2', 'notif-3'];

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: 'notif-1', isRead: true },
              { id: 'notif-2', isRead: true },
              { id: 'notif-3', isRead: true },
            ]),
          }),
        }),
      });

      const result = await service.markMultipleAsRead(notificationIds);

      expect(result).toBe(3);
    });

    it('should return 0 for empty array', async () => {
      const result = await service.markMultipleAsRead([]);
      expect(result).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const notificationId = 'notif-1';

      const result = await service.deleteNotification(notificationId);

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should return false when no notification is deleted', async () => {
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.deleteNotification('missing-id');

      expect(result).toBe(false);
    });
  });

  describe('markAllAsRead / markProjectAsRead / updateNotification', () => {
    it('should mark all unread notifications as read for a user', async () => {
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]),
          }),
        }),
      });

      const result = await service.markAllAsRead('user-123');

      expect(result).toBe(2);
    });

    it('should mark project notifications as read for a user', async () => {
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'n1' }]),
          }),
        }),
      });

      const result = await service.markProjectAsRead('user-123', 'project-1');

      expect(result).toBe(1);
    });

    it('should update notification with metadata only', async () => {
      const updated = {
        id: 'notif-1',
        isRead: false,
        metadata: { projectId: 'project-1', extra: 'yes' },
      };

      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      });

      const result = await service.updateNotification('notif-1', {
        metadata: { projectId: 'project-1', extra: 'yes' } as unknown as import('../../../shared/schema').NotificationMetadata,
      });

      expect(result).toEqual(updated);
    });

    it('should update notification with isRead only', async () => {
      const updated = { id: 'notif-1', isRead: true, metadata: { offerId: 'offer-1' } };
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      });

      const result = await service.updateNotification('notif-1', { isRead: true });

      expect(result.isRead).toBe(true);
    });
  });

  describe('searchNotifications', () => {
    it('should search with type filter', async () => {
      const userId = 'user-123';

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([
                  { id: 'notif-1', type: 'idea_update' },
                ]),
              }),
            }),
          }),
        }),
      });

      const result = await service.searchNotifications(userId, {
        type: 'idea_update',
      });

      expect(result.notifications).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('should search with project filter', async () => {
      const userId = 'user-123';
      const projectId = 'proj-1';

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([
                  { id: 'notif-1', projectId },
                ]),
              }),
            }),
          }),
        }),
      });

      const result = await service.searchNotifications(userId, {
        projectId,
      });

      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('total');
    });

    it('should return total=0 when count query is empty and honor explicit limit/offset', async () => {
      mockDb.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        });

      const result = await service.searchNotifications('user-123', {
        entityType: 'idea',
        entityId: 'idea-1',
        isRead: false,
        limit: 5,
        offset: 10,
      });

      expect(result.total).toBe(0);
      expect(result.notifications).toEqual([]);
    });

    it('should search with offerId filter', async () => {
      const userId = 'user-123';
      const offerId = 'offer-99';

      mockDb.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([
                    { id: 'notif-o1', type: 'offer_update' },
                    { id: 'notif-o2', type: 'offer_update' },
                  ]),
                }),
              }),
            }),
          }),
        });

      const result = await service.searchNotifications(userId, { offerId });

      expect(result.total).toBe(2);
      expect(result.notifications).toHaveLength(2);
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      const userId = 'user-123';

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(5);
    });

    it('should return 0 when count query has no rows', async () => {
      const userId = 'user-123';

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(0);
    });
  });

  describe('getUnreadCountByProject / getUnreadCountByOffer', () => {
    it('should return unread count by project', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

      const result = await service.getUnreadCountByProject('user-123', 'project-1');
      expect(result).toBe(3);
    });

    it('should return unread count by offer with fallback to 0', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getUnreadCountByOffer('user-123', 'offer-1');
      expect(result).toBe(0);
    });
  });

  describe('deleteOldNotifications', () => {
    it('should delete notifications older than specified days', async () => {
      mockDb.delete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: 'notif-1' },
            { id: 'notif-2' },
          ]),
        }),
      });

      const result = await service.deleteOldNotifications(30);

      expect(result).toBe(2);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return aggregated statistics', async () => {
      mockDb.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([{ count: 10 }]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 4 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([
              { type: 'idea_update', count: 7 },
              { type: 'offer_update', count: 3 },
            ]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([
                  { day: '2026-04-30', count: 2 },
                  { day: '2026-04-29', count: 1 },
                ]),
              }),
            }),
          }),
        });

      const result = await service.getStatistics();

      expect(result).toEqual({
        total: 10,
        unread: 4,
        read: 6,
        byType: {
          idea_update: 7,
          offer_update: 3,
        },
        byDay: {
          '2026-04-30': 2,
          '2026-04-29': 1,
        },
      });
    });

    it('should rethrow when statistics query fails', async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockRejectedValue(new Error('stats query failed')),
      });

      await expect(service.getStatistics()).rejects.toThrow('stats query failed');
    });
  });
});
