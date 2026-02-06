import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationsGeneratorService } from './notifications-generator.service';
import { NotificationsService } from './notifications.service';
import type { Database } from '../common/database/database.providers';
import { DATABASE } from '../common/database/database.providers';

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
  tasks: {
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
  let notificationsService: Partial<NotificationsService>;
  let mockDb: Partial<Database>;

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
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGeneratorService,
        { provide: NotificationsService, useValue: notificationsService },
        { provide: DATABASE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<NotificationsGeneratorService>(NotificationsGeneratorService);
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
        from: vi.fn().mockImplementation((table: any) => ({
          where: vi.fn().mockResolvedValue(
            table === 'admins' ? mockAdmins : mockMembers
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
        from: vi.fn().mockImplementation((table: any) => ({
          where: vi.fn().mockResolvedValue(
            table === 'admins' ? mockAdmins : mockMembers
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

      let callCount = 0;
      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockResolvedValue(
            callCount++ === 0 ? mockEvents : mockAdmins
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

      let callCount = 0;
      mockDb.select = vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockResolvedValue(
            callCount++ === 0 ? mockEvents : mockAdmins
          ),
        })),
      }));

      const result = await service.generateUpcomingEventReminders();

      // Should not create notification for 5 days (only 7, 3, 1 days)
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
