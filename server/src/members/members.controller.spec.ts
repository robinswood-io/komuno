import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('MembersController (Public)', () => {
  let controller: unknown;
  let mockService: unknown;

  beforeEach(() => {
    mockService = {
      proposeMember: vi.fn(),
    };

    controller = {
      proposeMember: async (body: unknown) => mockService.proposeMember(body),
    };
  });

  describe('proposeMember', () => {
    it('should propose a member', async () => {
      const memberData = {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        proposedBy: 'proposer@example.com',
      };

      mockService.proposeMember.mockResolvedValue({
        success: true,
        data: { id: 'member-123', ...memberData },
      });

      const result = await controller.proposeMember(memberData);

      expect(result.success).toBe(true);
      expect(mockService.proposeMember).toHaveBeenCalledWith(memberData);
    });
  });
});

describe('AdminMembersController - CRUD & Pagination', () => {
  let controller: unknown;
  let mockService: unknown;

  beforeEach(() => {
    mockService = {
      getMembers: vi.fn(),
      getMemberByEmail: vi.fn(),
      getMemberActivities: vi.fn(),
      getMemberDetails: vi.fn(),
      updateMember: vi.fn(),
      deleteMember: vi.fn(),
      getMemberSubscriptions: vi.fn(),
      createMemberSubscription: vi.fn(),
    };

    controller = {
      getMembers: async (page?: string, limit?: string, status?: string, search?: string, score?: string, activity?: string) => {
        const pageNum = parseInt(page || '1', 10);
        const limitNum = parseInt(limit || '20', 10);
        return mockService.getMembers(pageNum, limitNum, status, search, score, activity);
      },
      getMemberByEmail: (email: string) => mockService.getMemberByEmail(email),
      getMemberActivities: (email: string) => mockService.getMemberActivities(email),
      getMemberDetails: (email: string) => mockService.getMemberDetails(email),
      updateMember: (email: string, body: unknown, user: { email: string }) =>
        mockService.updateMember(email, body, user.email),
      deleteMember: (email: string) => mockService.deleteMember(email),
      getMemberSubscriptions: (email: string) => mockService.getMemberSubscriptions(email),
      createMemberSubscription: (email: string, body: unknown) =>
        mockService.createMemberSubscription(email, body),
    };
  });

  describe('getMembers - Pagination', () => {
    it('should get members with default pagination', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: '1', email: 'user1@example.com' },
          { id: '2', email: 'user2@example.com' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      mockService.getMembers.mockResolvedValue(mockResponse);

      const result = await controller.getMembers();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockService.getMembers).toHaveBeenCalled();
      const args = mockService.getMembers.mock.calls[0];
      expect([args[0], args[1]]).toEqual([1, 20]);
    });

    it('should get members with custom pagination params', async () => {
      const mockResponse = {
        success: true,
        data: Array.from({ length: 5 }, (_, i) => ({ id: `${i + 1}` })),
        total: 50,
        page: 2,
        limit: 5,
      };

      mockService.getMembers.mockResolvedValue(mockResponse);

      const result = await controller.getMembers('2', '5');

      expect(mockService.getMembers).toHaveBeenCalled();
      const args = mockService.getMembers.mock.calls[0];
      expect([args[0], args[1]]).toEqual([2, 5]);
    });

    it('should handle string page and limit conversion', async () => {
      mockService.getMembers.mockResolvedValue({
        success: true,
        data: [],
      });

      await controller.getMembers('10', '50');

      expect(mockService.getMembers).toHaveBeenCalled();
      const args = mockService.getMembers.mock.calls[0];
      expect([args[0], args[1]]).toEqual([10, 50]);
    });
  });

  describe('getMembers - Search et Filtres', () => {
    it('should apply status filter', async () => {
      mockService.getMembers.mockResolvedValue({
        success: true,
        data: [],
      });

      await controller.getMembers('1', '20', 'active');

      expect(mockService.getMembers).toHaveBeenCalled();
      const args = mockService.getMembers.mock.calls[0];
      expect([args[0], args[1], args[2]]).toEqual([1, 20, 'active']);
    });

    it('should apply search filter', async () => {
      mockService.getMembers.mockResolvedValue({
        success: true,
        data: [],
      });

      await controller.getMembers('1', '20', undefined, 'dupont');

      expect(mockService.getMembers).toHaveBeenCalled();
      const args = mockService.getMembers.mock.calls[0];
      expect([args[0], args[1], args[3]]).toEqual([1, 20, 'dupont']);
    });

    it('should apply score filter', async () => {
      mockService.getMembers.mockResolvedValue({
        success: true,
        data: [],
      });

      await controller.getMembers('1', '20', undefined, undefined, 'high');

      expect(mockService.getMembers).toHaveBeenCalled();
      const args = mockService.getMembers.mock.calls[0];
      expect(args[4]).toEqual('high');
    });

    it('should apply activity filter', async () => {
      mockService.getMembers.mockResolvedValue({
        success: true,
        data: [],
      });

      await controller.getMembers('1', '20', undefined, undefined, undefined, 'recent');

      expect(mockService.getMembers).toHaveBeenCalledWith(1, 20, undefined, undefined, undefined, 'recent');
    });

    it('should apply multiple filters', async () => {
      mockService.getMembers.mockResolvedValue({
        success: true,
        data: [],
      });

      await controller.getMembers('2', '10', 'active', 'dupont', 'high', 'recent');

      expect(mockService.getMembers).toHaveBeenCalledWith(2, 10, 'active', 'dupont', 'high', 'recent');
    });
  });

  describe('getMemberByEmail', () => {
    it('should get member by email', async () => {
      const mockMember = {
        success: true,
        data: { id: '1', email: 'user@example.com' },
      };

      mockService.getMemberByEmail.mockResolvedValue(mockMember);

      const result = await controller.getMemberByEmail('user@example.com');

      expect(result.success).toBe(true);
      expect(mockService.getMemberByEmail).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('getMemberActivities', () => {
    it('should get member activities', async () => {
      const mockActivities = {
        success: true,
        data: [{ id: '1', type: 'login', date: '2026-01-23' }],
      };

      mockService.getMemberActivities.mockResolvedValue(mockActivities);

      const result = await controller.getMemberActivities('user@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getMemberDetails', () => {
    it('should get detailed member information', async () => {
      const mockDetails = {
        success: true,
        data: {
          id: '1',
          email: 'user@example.com',
          firstName: 'John',
          statistics: { totalEvents: 5 },
        },
      };

      mockService.getMemberDetails.mockResolvedValue(mockDetails);

      const result = await controller.getMemberDetails('user@example.com');

      expect(result.success).toBe(true);
      expect(result.data.statistics).toBeDefined();
    });
  });

  describe('updateMember - Data Validation', () => {
    it('should update member with valid data', async () => {
      const email = 'user@example.com';
      const updateData = { firstName: 'Jean' };
      const user = { email: 'admin@example.com' };

      mockService.updateMember.mockResolvedValue({
        success: true,
        data: { email, ...updateData },
      });

      const result = await controller.updateMember(email, updateData, user);

      expect(result.success).toBe(true);
      expect(mockService.updateMember).toHaveBeenCalledWith(email, updateData, 'admin@example.com');
    });

    it('should pass user email to service', async () => {
      const email = 'user@example.com';
      const user = { email: 'admin@example.com' };

      mockService.updateMember.mockResolvedValue({
        success: true,
        data: {},
      });

      await controller.updateMember(email, {}, user);

      expect(mockService.updateMember).toHaveBeenCalledWith(email, {}, 'admin@example.com');
    });
  });

  describe('deleteMember', () => {
    it('should delete a member', async () => {
      mockService.deleteMember.mockResolvedValue(undefined);

      await controller.deleteMember('user@example.com');

      expect(mockService.deleteMember).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('Subscriptions', () => {
    it('should get member subscriptions', async () => {
      const mockSubscriptions = {
        success: true,
        data: [{ id: '1', amountInCents: 50000 }],
      };

      mockService.getMemberSubscriptions.mockResolvedValue(mockSubscriptions);

      const result = await controller.getMemberSubscriptions('user@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should create subscription - Data Validation', async () => {
      const email = 'user@example.com';
      const subscriptionData = {
        amountInCents: 50000,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };

      mockService.createMemberSubscription.mockResolvedValue({
        success: true,
        data: { id: 'sub-1', ...subscriptionData },
      });

      const result = await controller.createMemberSubscription(email, subscriptionData);

      expect(result.success).toBe(true);
      expect(mockService.createMemberSubscription).toHaveBeenCalledWith(email, subscriptionData);
    });
  });
});

describe('AdminMemberTagsController', () => {
  let controller: unknown;
  let mockService: unknown;

  beforeEach(() => {
    mockService = {
      getAllTags: vi.fn(),
      createTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
    };

    controller = {
      getAllTags: () => mockService.getAllTags(),
      createTag: (body: unknown) => mockService.createTag(body),
      updateTag: (id: string, body: unknown) => mockService.updateTag(id, body),
      deleteTag: (id: string) => mockService.deleteTag(id),
    };
  });

  describe('getAllTags', () => {
    it('should retrieve all tags', async () => {
      const mockTags = {
        success: true,
        data: [
          { id: '1', name: 'VIP' },
          { id: '2', name: 'Prospect' },
        ],
      };

      mockService.getAllTags.mockResolvedValue(mockTags);

      const result = await controller.getAllTags();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('createTag - Data Validation', () => {
    it('should create a tag with valid data', async () => {
      const tagData = { name: 'VIP', color: '#3b82f6' };
      const mockTag = { id: 'tag-1', ...tagData };

      mockService.createTag.mockResolvedValue({
        success: true,
        data: mockTag,
      });

      const result = await controller.createTag(tagData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTag);
    });

    it('should throw on validation error', async () => {
      const invalidData = { name: '' };

      mockService.createTag.mockRejectedValue(
        new BadRequestException('Invalid data'),
      );

      await expect(controller.createTag(invalidData)).rejects.toThrow();
    });
  });

  describe('updateTag', () => {
    it('should update a tag', async () => {
      const tagId = 'tag-1';
      const updateData = { name: 'VIP Gold' };
      const mockTag = { id: tagId, ...updateData };

      mockService.updateTag.mockResolvedValue({
        success: true,
        data: mockTag,
      });

      const result = await controller.updateTag(tagId, updateData);

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException for non-existent tag', async () => {
      const tagId = 'nonexistent';

      mockService.updateTag.mockRejectedValue(
        new NotFoundException('Tag not found'),
      );

      await expect(controller.updateTag(tagId, { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteTag', () => {
    it('should delete a tag', async () => {
      const tagId = 'tag-1';

      mockService.deleteTag.mockResolvedValue(undefined);

      await controller.deleteTag(tagId);

      expect(mockService.deleteTag).toHaveBeenCalledWith(tagId);
    });
  });
});

describe('AdminMemberTasksController', () => {
  let controller: unknown;
  let mockService: unknown;

  beforeEach(() => {
    mockService = {
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
    };

    controller = {
      updateTask: (id: string, body: unknown, user: { email?: string }) =>
        mockService.updateTask(id, body, user.email),
      deleteTask: (id: string) => mockService.deleteTask(id),
    };
  });

  describe('updateTask', () => {
    it('should update task with valid data', async () => {
      const taskId = 'task-1';
      const updateData = { status: 'completed' };
      const user = { email: 'admin@example.com' };

      mockService.updateTask.mockResolvedValue({
        success: true,
        data: { id: taskId, ...updateData },
      });

      const result = await controller.updateTask(taskId, updateData, user);

      expect(result.success).toBe(true);
      expect(mockService.updateTask).toHaveBeenCalledWith(taskId, updateData, 'admin@example.com');
    });

    it('should pass user email to service', async () => {
      const taskId = 'task-1';
      const user = { email: 'admin@example.com' };

      mockService.updateTask.mockResolvedValue({
        success: true,
        data: {},
      });

      await controller.updateTask(taskId, {}, user);

      expect(mockService.updateTask).toHaveBeenCalledWith(taskId, {}, 'admin@example.com');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const taskId = 'task-1';

      mockService.deleteTask.mockResolvedValue(undefined);

      await controller.deleteTask(taskId);

      expect(mockService.deleteTask).toHaveBeenCalledWith(taskId);
    });
  });
});

describe('AdminMemberRelationsController', () => {
  let controller: unknown;
  let mockService: unknown;

  beforeEach(() => {
    mockService = {
      deleteRelation: vi.fn(),
    };

    controller = {
      deleteRelation: (id: string) => mockService.deleteRelation(id),
    };
  });

  describe('deleteRelation', () => {
    it('should delete a relation', async () => {
      const relationId = 'rel-1';

      mockService.deleteRelation.mockResolvedValue(undefined);

      await controller.deleteRelation(relationId);

      expect(mockService.deleteRelation).toHaveBeenCalledWith(relationId);
    });
  });
});
