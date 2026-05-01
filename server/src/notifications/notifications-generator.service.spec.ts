import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationsGeneratorService } from './notifications-generator.service';
import { NotificationsService } from './notifications.service';
import type { Database } from '../common/database/database.providers';
import { members, memberTasks, events, admins } from '../../../shared/schema';

// Mock the schema module
vi.mock('../../../shared/schema', () => ({
  members: {
    id: {},
    email: {},
    firstName: {},
    lastName: {},
    status: {},
    subscriptionEndDate: {},
  },
  memberTasks: {
    id: {},
    title: {},
    description: {},
    assignedTo: {},
    status: {},
    dueDate: {},
    priority: {},
  },
  events: {
    id: {},
    title: {},
    location: {},
    date: {},
    status: {},
  },
  admins: {
    email: {},
    role: {},
    isActive: {},
  },
}));

describe('NotificationsGeneratorService', () => {
  let service: NotificationsGeneratorService;
  let notificationsService: {
    createNotification: ReturnType<typeof vi.fn>;
    searchNotifications: ReturnType<typeof vi.fn>;
  };
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Mock NotificationsService
    notificationsService = {
      createNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      searchNotifications: vi.fn().mockResolvedValue({ notifications: [], total: 0 }),
    };

    // Mock the database
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    service = new NotificationsGeneratorService(
      mockDb as unknown as Database,
      notificationsService as unknown as NotificationsService
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateMemberSubscriptionReminders', () => {
    it('should create notifications for members with expiring subscriptions', async () => {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Mock active admins
      const mockAdmins = [
        { email: 'admin1@test.com', isActive: true },
        { email: 'admin2@test.com', isActive: true },
      ];

      // Mock members with expiring subscriptions
      const mockMembers = [
        {
          email: 'member1@test.com',
          firstName: 'John',
          lastName: 'Doe',
          status: 'active',
          subscriptionEndDate: in7Days,
        },
      ];

      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: unknown) => ({
          where: vi.fn().mockResolvedValue(
            table === admins ? mockAdmins : mockMembers
          ),
        })),
      }));

      const result = await service.generateMemberSubscriptionReminders();

      expect(result).toBeGreaterThan(0);
      expect(notificationsService.createNotification).toHaveBeenCalled();
    });

    it('should not create duplicate notifications on same day', async () => {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const mockAdmins = [{ email: 'admin@test.com', isActive: true }];
      const mockMembers = [
        {
          email: 'member@test.com',
          firstName: 'John',
          lastName: 'Doe',
          status: 'active',
          subscriptionEndDate: in7Days,
        },
      ];

      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: unknown) => ({
          where: vi.fn().mockResolvedValue(
            table === admins ? mockAdmins : mockMembers
          ),
        })),
      }));

      // Mock existing notification from today
      notificationsService.searchNotifications = vi.fn().mockResolvedValue({
        notifications: [
          {
            id: 'notif-1',
            createdAt: new Date(),
            entityId: 'member@test.com',
          },
        ],
        total: 1,
      });

      const result = await service.generateMemberSubscriptionReminders();

      // Should skip creating notification because one exists from today
      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockRejectedValue(new Error('DB Error')),
        })),
      }));

      const result = await service.generateMemberSubscriptionReminders();

      expect(result).toBe(0);
    });

    it('should skip members without expiration date and with unsupported day thresholds', async () => {
      const now = new Date();
      const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      const mockAdmins = [{ email: 'admin@test.com', isActive: true }];
      const mockMembers = [
        {
          email: 'member-no-date@test.com',
          firstName: 'No',
          lastName: 'Date',
          status: 'active',
          subscriptionEndDate: null,
        },
        {
          email: 'member-5days@test.com',
          firstName: 'Five',
          lastName: 'Days',
          status: 'active',
          subscriptionEndDate: in5Days,
        },
      ];

      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: unknown) => ({
          where: vi.fn().mockResolvedValue(table === admins ? mockAdmins : mockMembers),
        })),
      }));

      const result = await service.generateMemberSubscriptionReminders();

      expect(result).toBe(0);
      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('should create notification when previous notification is from another day', async () => {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const mockAdmins = [{ email: 'admin@test.com', isActive: true }];
      const mockMembers = [
        {
          email: 'member@test.com',
          firstName: 'John',
          lastName: 'Doe',
          status: 'active',
          subscriptionEndDate: in7Days,
        },
      ];

      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: unknown) => ({
          where: vi.fn().mockResolvedValue(table === admins ? mockAdmins : mockMembers),
        })),
      }));

      notificationsService.searchNotifications = vi.fn().mockResolvedValue({
        notifications: [{ id: 'notif-old', createdAt: yesterday, entityId: 'member@test.com' }],
        total: 1,
      });

      const result = await service.generateMemberSubscriptionReminders();

      expect(result).toBe(1);
      expect(notificationsService.createNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateUpcomingTaskReminders', () => {
    it('should create notifications for upcoming tasks', async () => {
      const now = new Date();
      const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Important Task',
          description: 'Task description',
          assignedTo: 'user@test.com',
          status: 'pending',
          dueDate: in2Days,
          priority: 'high',
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockTasks),
        }),
      });

      const result = await service.generateUpcomingTaskReminders();

      expect(result).toBeGreaterThan(0);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user@test.com',
          type: 'task_reminder',
          entityType: 'task',
          entityId: 'task-1',
        })
      );
    });

    it('should not create duplicate task reminders on same day', async () => {
      const now = new Date();
      const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task',
          assignedTo: 'user@test.com',
          status: 'pending',
          dueDate: in2Days,
          priority: 'medium',
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockTasks),
        }),
      });

      notificationsService.searchNotifications = vi.fn().mockResolvedValue({
        notifications: [
          {
            id: 'notif-1',
            createdAt: new Date(),
            entityId: 'task-1',
          },
        ],
        total: 1,
      });

      const result = await service.generateUpcomingTaskReminders();

      expect(result).toBe(0);
    });

    it('should skip upcoming tasks without assigned user or due date', async () => {
      const now = new Date();
      const in2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

      const mockTasks = [
        {
          id: 'task-missing-assignee',
          title: 'Task without assignee',
          description: 'desc',
          assignedTo: null,
          status: 'todo',
          dueDate: in2Days,
          priority: 'low',
        },
        {
          id: 'task-missing-due',
          title: 'Task without due date',
          description: 'desc',
          assignedTo: 'user@test.com',
          status: 'todo',
          dueDate: null,
          priority: 'low',
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockTasks),
        }),
      });

      const result = await service.generateUpcomingTaskReminders();

      expect(result).toBe(0);
      expect(notificationsService.searchNotifications).not.toHaveBeenCalled();
      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('should return 0 when upcoming task reminder generation fails', async () => {
      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockRejectedValue(new Error('Upcoming tasks query failed')),
        })),
      }));

      const result = await service.generateUpcomingTaskReminders();

      expect(result).toBe(0);
    });
  });

  describe('generateOverdueTaskReminders', () => {
    it('should create notifications for overdue tasks', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockTasks = [
        {
          id: 'task-1',
          title: 'Overdue Task',
          description: 'Task description',
          assignedTo: 'user@test.com',
          status: 'pending',
          dueDate: yesterday,
          priority: 'high',
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockTasks),
        }),
      });

      const result = await service.generateOverdueTaskReminders();

      expect(result).toBeGreaterThan(0);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user@test.com',
          type: 'task_reminder',
          icon: '🚨',
        })
      );
    });

    it('should skip overdue tasks without assigned user or due date', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const mockTasks = [
        {
          id: 'overdue-missing-assignee',
          title: 'Overdue no assignee',
          description: null,
          assignedTo: null,
          status: 'todo',
          dueDate: yesterday,
          priority: 'medium',
        },
        {
          id: 'overdue-missing-due',
          title: 'Overdue no due',
          description: null,
          assignedTo: 'user@test.com',
          status: 'todo',
          dueDate: null,
          priority: 'medium',
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockTasks),
        }),
      });

      const result = await service.generateOverdueTaskReminders();

      expect(result).toBe(0);
      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('should skip duplicate overdue reminder created the same day', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const mockTasks = [
        {
          id: 'overdue-1',
          title: 'Overdue',
          description: 'desc',
          assignedTo: 'user@test.com',
          status: 'todo',
          dueDate: yesterday,
          priority: 'high',
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockTasks),
        }),
      });

      notificationsService.searchNotifications = vi.fn().mockResolvedValue({
        notifications: [{ id: 'today-notif', createdAt: new Date(), entityId: 'overdue-1' }],
        total: 1,
      });

      const result = await service.generateOverdueTaskReminders();

      expect(result).toBe(0);
      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('should return 0 when overdue task reminder generation fails', async () => {
      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockRejectedValue(new Error('Overdue tasks query failed')),
        })),
      }));

      const result = await service.generateOverdueTaskReminders();

      expect(result).toBe(0);
    });
  });

  describe('generateUpcomingEventReminders', () => {
    it('should create notifications for upcoming events', async () => {
      const now = new Date();
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const mockAdmins = [{ email: 'admin@test.com', isActive: true }];
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Important Event',
          location: 'Conference Room',
          date: in3Days,
          status: 'published',
        },
      ];

      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: unknown) => ({
          where: vi.fn().mockResolvedValue(
            table === events ? mockEvents : mockAdmins
          ),
        })),
      }));

      const result = await service.generateUpcomingEventReminders();

      expect(result).toBeGreaterThan(0);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin@test.com',
          type: 'event_update',
          entityType: 'event',
          entityId: 'event-1',
        })
      );
    });

    it('should only notify on specific days before event (7, 3, 1)', async () => {
      const now = new Date();
      const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      const mockAdmins = [{ email: 'admin@test.com', isActive: true }];
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Event',
          location: 'Location',
          date: in5Days,
          status: 'published',
        },
      ];

      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: unknown) => ({
          where: vi.fn().mockResolvedValue(
            table === events ? mockEvents : mockAdmins
          ),
        })),
      }));

      const result = await service.generateUpcomingEventReminders();

      // Should not create notification for 5 days (only 7, 3, 1 days)
      expect(result).toBe(0);
    });

    it('should skip duplicate event reminder created the same day', async () => {
      const now = new Date();
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const mockAdmins = [{ email: 'admin@test.com', isActive: true }];
      const mockEvents = [
        {
          id: 'event-same-day',
          title: 'Duplicate Event',
          location: 'HQ',
          date: in3Days,
          status: 'published',
        },
      ];

      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: unknown) => ({
          where: vi.fn().mockResolvedValue(table === events ? mockEvents : mockAdmins),
        })),
      }));

      notificationsService.searchNotifications = vi.fn().mockResolvedValue({
        notifications: [{ id: 'notif-today', createdAt: new Date(), entityId: 'event-same-day' }],
        total: 1,
      });

      const result = await service.generateUpcomingEventReminders();

      expect(result).toBe(0);
      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('should use fallback event location when location is missing', async () => {
      const now = new Date();
      const in1Day = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const mockAdmins = [{ email: 'admin@test.com', isActive: true }];
      const mockEvents = [
        {
          id: 'event-no-location',
          title: 'No Location Event',
          location: null,
          date: in1Day,
          status: 'published',
        },
      ];

      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: unknown) => ({
          where: vi.fn().mockResolvedValue(table === events ? mockEvents : mockAdmins),
        })),
      }));

      const result = await service.generateUpcomingEventReminders();

      expect(result).toBe(1);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'No Location Event - Lieu non spécifié',
        }),
      );
    });

    it('should return 0 when event reminder generation fails', async () => {
      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockRejectedValue(new Error('Events query failed')),
        })),
      }));

      const result = await service.generateUpcomingEventReminders();

      expect(result).toBe(0);
    });
  });

  describe('notifyNewIdea', () => {
    it('should notify admins about new idea', async () => {
      const mockAdmins = [
        { email: 'admin1@test.com', role: 'super_admin', isActive: true },
        { email: 'admin2@test.com', role: 'ideas_manager', isActive: true },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockAdmins),
        }),
      });

      await service.notifyNewIdea('idea-123', 'New Innovation', 'john@test.com');

      expect(notificationsService.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'idea_update',
          icon: '💡',
          entityType: 'idea',
          entityId: 'idea-123',
        })
      );
    });

    it('should not throw when notifyNewIdea fails', async () => {
      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockRejectedValue(new Error('Admins query failed')),
        })),
      }));

      await expect(
        service.notifyNewIdea('idea-fail', 'Broken Idea', 'proposer@test.com'),
      ).resolves.toBeUndefined();
    });
  });

  describe('notifyIdeaStatusChange', () => {
    it('should notify idea proposer about status change', async () => {
      await service.notifyIdeaStatusChange(
        'idea-123',
        'My Idea',
        'pending',
        'approved',
        'proposer@test.com'
      );

      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'proposer@test.com',
          type: 'idea_update',
          icon: '🔄',
          entityType: 'idea',
          entityId: 'idea-123',
        })
      );
    });

    it('should not throw when notifyIdeaStatusChange fails', async () => {
      notificationsService.createNotification = vi
        .fn()
        .mockRejectedValue(new Error('Notification send failed'));

      await expect(
        service.notifyIdeaStatusChange(
          'idea-fail',
          'Failing Idea',
          'pending',
          'rejected',
          'proposer@test.com',
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('generateAllNotifications', () => {
    it('should call all generation methods and return totals', async () => {
      vi.spyOn(service, 'generateMemberSubscriptionReminders').mockResolvedValue(2);
      vi.spyOn(service, 'generateUpcomingTaskReminders').mockResolvedValue(3);
      vi.spyOn(service, 'generateOverdueTaskReminders').mockResolvedValue(1);
      vi.spyOn(service, 'generateUpcomingEventReminders').mockResolvedValue(4);

      const result = await service.generateAllNotifications();

      expect(result).toEqual({
        memberSubscriptions: 2,
        upcomingTasks: 3,
        overdueTasks: 1,
        upcomingEvents: 4,
        total: 10,
      });
    });
  });
});
