import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationsService } from './notifications.service';
import type { Database } from '../common/database/database.providers';
import { DATABASE } from '../common/database/database.providers';
import { notifications } from '../../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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
    } as any;

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

      jest
        .spyOn(service, 'getNotificationsByUser')
        .mockResolvedValue(mockNotifications as any);

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

      jest
        .spyOn(service, 'getNotificationsByUser')
        .mockResolvedValue(mockNotifications as any);

      const result = await service.getGroupedNotifications(userId, 'offer');

      expect(result).toHaveProperty('offer-1');
      expect(result).toHaveProperty('offer-2');
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

      const result = await service.searchNotifications(userId, {
        projectId,
      });

      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('total');
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
});
