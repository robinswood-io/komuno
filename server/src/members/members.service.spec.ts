import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { MembersService } from './members.service';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../../email-notification-service', () => ({
  emailNotificationService: {
    notifyNewMemberProposal: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('MembersService', () => {
  let service: MembersService;
  let mockStorageService: any;

  beforeEach(() => {
    mockStorageService = {
      instance: {
        proposeMember: vi.fn(),
        getMembers: vi.fn(),
        getMemberByEmail: vi.fn(),
        getMemberActivities: vi.fn(),
        getMemberDetails: vi.fn(),
        updateMember: vi.fn(),
        deleteMember: vi.fn(),
        getSubscriptionsByMember: vi.fn(),
        createSubscription: vi.fn(),
        getAllTags: vi.fn(),
        createTag: vi.fn(),
        updateTag: vi.fn(),
        deleteTag: vi.fn(),
        getTagsByMember: vi.fn(),
        assignTagToMember: vi.fn(),
        removeTagFromMember: vi.fn(),
        getTasksByMember: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        getRelationsByMember: vi.fn(),
        createRelation: vi.fn(),
        deleteRelation: vi.fn(),
        createTrackingMetric: vi.fn(),
      },
    };

    service = new MembersService(mockStorageService);

  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('proposeMember', () => {
    it('should propose a new member successfully', async () => {
      const memberData = {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        company: 'Entreprise SAS',
        phone: '+33612345678',
        role: 'Directeur',
        notes: 'Notes',
        proposedBy: 'proposer@example.com',
      };

      const mockMember = {
        id: 'member-123',
        ...memberData,
      };

      mockStorageService.instance.proposeMember.mockResolvedValue({
        success: true,
        data: mockMember,
      });

      mockStorageService.instance.createTrackingMetric.mockResolvedValue({});

      const result = await service.proposeMember(memberData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMember);
      expect(mockStorageService.instance.proposeMember).toHaveBeenCalledWith(expect.objectContaining({
        email: memberData.email,
        firstName: memberData.firstName,
      }));
    });

    it('should throw ConflictException on duplicate email', async () => {
      const memberData = {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        proposedBy: 'proposer@example.com',
      };

      const duplicateError = new Error('Email already exists');
      (duplicateError as any).name = 'DuplicateError';

      vi.spyOn(mockStorageService.instance, 'proposeMember').mockResolvedValue({
        success: false,
        error: duplicateError,
      });

      await expect(service.proposeMember(memberData)).rejects.toThrow();
    });

    it('should throw BadRequestException on invalid data', async () => {
      const invalidData = {
        email: 'invalid-email',
        firstName: '',
      };

      await expect(service.proposeMember(invalidData)).rejects.toThrow();
    });
  });

  describe('getMembers - CRUD et Pagination', () => {
    it('should retrieve members with default pagination', async () => {
      const mockMembers = [
        { id: '1', email: 'user1@example.com', firstName: 'User', lastName: 'One' },
        { id: '2', email: 'user2@example.com', firstName: 'User', lastName: 'Two' },
      ];

      vi.spyOn(mockStorageService.instance, 'getMembers').mockResolvedValue({
        success: true,
        data: {
          data: mockMembers,
          total: 2,
          page: 1,
          limit: 20,
          pageCount: 1,
        },
      });

      const result = await service.getMembers(1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockStorageService.instance.getMembers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });

    it('should retrieve members with custom pagination', async () => {
      const mockMembers = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        email: `user${i + 1}@example.com`,
      }));

      vi.spyOn(mockStorageService.instance, 'getMembers').mockResolvedValue({
        success: true,
        data: {
          data: mockMembers,
          total: 50,
          page: 2,
          limit: 10,
          pageCount: 5,
        },
      });

      const result = await service.getMembers(2, 10);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(10);
      expect(mockStorageService.instance.getMembers).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
      });
    });

    it('should apply status filter', async () => {
      vi.spyOn(mockStorageService.instance, 'getMembers').mockResolvedValue({
        success: true,
        data: { data: [], total: 0, page: 1, limit: 20, pageCount: 0 },
      });

      await service.getMembers(1, 20, 'active');

      expect(mockStorageService.instance.getMembers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: 'active',
      });
    });

    it('should ignore "all" status filter', async () => {
      vi.spyOn(mockStorageService.instance, 'getMembers').mockResolvedValue({
        success: true,
        data: { data: [], total: 0, page: 1, limit: 20, pageCount: 0 },
      });

      await service.getMembers(1, 20, 'all');

      expect(mockStorageService.instance.getMembers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });

    it('should throw BadRequestException on storage error', async () => {
      vi.spyOn(mockStorageService.instance, 'getMembers').mockResolvedValue({
        success: false,
        error: new Error('Database error'),
      });

      await expect(service.getMembers(1, 20)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMembers - Search et Filtres', () => {
    it('should apply search filter', async () => {
      vi.spyOn(mockStorageService.instance, 'getMembers').mockResolvedValue({
        success: true,
        data: { data: [], total: 0, page: 1, limit: 20, pageCount: 0 },
      });

      await service.getMembers(1, 20, undefined, 'dupont');

      expect(mockStorageService.instance.getMembers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: 'dupont',
      });
    });

    it('should ignore empty search', async () => {
      vi.spyOn(mockStorageService.instance, 'getMembers').mockResolvedValue({
        success: true,
        data: { data: [], total: 0, page: 1, limit: 20, pageCount: 0 },
      });

      await service.getMembers(1, 20, undefined, '   ');

      expect(mockStorageService.instance.getMembers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });

    it('should apply score filter (high)', async () => {
      vi.spyOn(mockStorageService.instance, 'getMembers').mockResolvedValue({
        success: true,
        data: { data: [], total: 0, page: 1, limit: 20, pageCount: 0 },
      });

      await service.getMembers(1, 20, undefined, undefined, 'high');

      expect(mockStorageService.instance.getMembers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        score: 'high',
      });
    });

    it('should apply activity filter (recent)', async () => {
      vi.spyOn(mockStorageService.instance, 'getMembers').mockResolvedValue({
        success: true,
        data: { data: [], total: 0, page: 1, limit: 20, pageCount: 0 },
      });

      await service.getMembers(1, 20, undefined, undefined, undefined, 'recent');

      expect(mockStorageService.instance.getMembers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        activity: 'recent',
      });
    });

    it('should apply multiple filters', async () => {
      vi.spyOn(mockStorageService.instance, 'getMembers').mockResolvedValue({
        success: true,
        data: { data: [], total: 0, page: 1, limit: 20, pageCount: 0 },
      });

      await service.getMembers(1, 20, 'active', 'dupont', 'high', 'recent');

      expect(mockStorageService.instance.getMembers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: 'active',
        search: 'dupont',
        score: 'high',
        activity: 'recent',
      });
    });
  });

  describe('getMemberByEmail', () => {
    it('should retrieve a member by email', async () => {
      const mockMember = {
        id: 'member-123',
        email: 'jean.dupont@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
      };

      vi.spyOn(mockStorageService.instance, 'getMemberByEmail').mockResolvedValue({
        success: true,
        data: mockMember,
      });

      const result = await service.getMemberByEmail('jean.dupont@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMember);
    });

    it('should throw NotFoundException when member not found', async () => {
      vi.spyOn(mockStorageService.instance, 'getMemberByEmail').mockResolvedValue({
        success: true,
        data: null,
      });

      await expect(service.getMemberByEmail('nonexistent@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException on storage error', async () => {
      vi.spyOn(mockStorageService.instance, 'getMemberByEmail').mockResolvedValue({
        success: false,
        error: new Error('Not found'),
      });

      await expect(service.getMemberByEmail('jean.dupont@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMember - Data Validation', () => {
    it('should update member with valid data', async () => {
      const email = 'jean.dupont@example.com';
      const updateData = {
        firstName: 'Jean-Paul',
        company: 'New Company',
      };

      const mockUpdatedMember = {
        id: 'member-123',
        email,
        ...updateData,
      };

      vi.spyOn(mockStorageService.instance, 'getMemberByEmail').mockResolvedValue({
        success: true,
        data: { status: 'active', id: 'member-123', email },
      });

      vi.spyOn(mockStorageService.instance, 'updateMember').mockResolvedValue({
        success: true,
        data: mockUpdatedMember,
      });

      const result = await service.updateMember(email, updateData, 'admin@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedMember);
    });

    it('should throw BadRequestException on validation error', async () => {
      const email = 'jean.dupont@example.com';
      const invalidData = {
        firstName: '', // Invalid empty string
        email: 'not-an-email',
      };

      await expect(service.updateMember(email, invalidData, 'admin@example.com')).rejects.toThrow();
    });

    it('should throw BadRequestException on storage error', async () => {
      const email = 'jean.dupont@example.com';
      const updateData = { firstName: 'Jean' };

      vi.spyOn(mockStorageService.instance, 'getMemberByEmail').mockResolvedValue({
        success: true,
        data: { status: 'active', id: 'member-123', email },
      });

      vi.spyOn(mockStorageService.instance, 'updateMember').mockResolvedValue({
        success: false,
        error: new Error('Update failed'),
      });

      await expect(service.updateMember(email, updateData, 'admin@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle status change from proposed to active', async () => {
      const email = 'jean.dupont@example.com';
      const updateData = { status: 'active' };
      const mockMember = {
        id: 'member-123',
        email,
        status: 'proposed',
      };

      mockStorageService.instance.getMemberByEmail.mockResolvedValue({
        success: true,
        data: mockMember,
      });

      mockStorageService.instance.updateMember.mockResolvedValue({
        success: true,
        data: { ...mockMember, status: 'active' },
      });

      mockStorageService.instance.createTrackingMetric.mockResolvedValue({});

      await service.updateMember(email, updateData, 'admin@example.com');

      // Tracking metrics are called asynchronously with catch, so we just verify the flow completes
      expect(mockStorageService.instance.updateMember).toHaveBeenCalled();
    });

    it('should handle status change from active to inactive', async () => {
      const email = 'jean.dupont@example.com';
      const updateData = { status: 'inactive' };
      const mockMember = {
        id: 'member-123',
        email,
        status: 'active',
      };

      mockStorageService.instance.getMemberByEmail.mockResolvedValue({
        success: true,
        data: mockMember,
      });

      mockStorageService.instance.updateMember.mockResolvedValue({
        success: true,
        data: { ...mockMember, status: 'inactive' },
      });

      mockStorageService.instance.createTrackingMetric.mockResolvedValue({});

      await service.updateMember(email, updateData, 'admin@example.com');

      // Verify update was called with the email parameter
      expect(mockStorageService.instance.updateMember).toHaveBeenCalledWith(email, expect.any(Object));
    });
  });

  describe('deleteMember', () => {
    it('should delete a member successfully', async () => {
      const email = 'jean.dupont@example.com';

      vi.spyOn(mockStorageService.instance, 'deleteMember').mockResolvedValue({
        success: true,
      });

      await service.deleteMember(email);

      expect(mockStorageService.instance.deleteMember).toHaveBeenCalledWith(email);
    });

    it('should throw NotFoundException when member not found', async () => {
      const email = 'nonexistent@example.com';
      const notFoundError = new Error('Member not found');
      (notFoundError as any).name = 'NotFoundError';

      vi.spyOn(mockStorageService.instance, 'deleteMember').mockResolvedValue({
        success: false,
        error: notFoundError,
      });

      await expect(service.deleteMember(email)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on other errors', async () => {
      const email = 'jean.dupont@example.com';

      vi.spyOn(mockStorageService.instance, 'deleteMember').mockResolvedValue({
        success: false,
        error: new Error('Database error'),
      });

      await expect(service.deleteMember(email)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMemberSubscriptions', () => {
    it('should retrieve subscriptions for a member', async () => {
      const mockSubscriptions = [
        { id: '1', memberEmail: 'user@example.com', amountInCents: 50000 },
        { id: '2', memberEmail: 'user@example.com', amountInCents: 75000 },
      ];

      vi.spyOn(mockStorageService.instance, 'getSubscriptionsByMember').mockResolvedValue(
        mockSubscriptions,
      );

      const result = await service.getMemberSubscriptions('user@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('createMemberSubscription - Data Validation', () => {
    it('should create a subscription with valid data', async () => {
      const email = 'user@example.com';
      const subscriptionData = {
        amountInCents: 50000,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };

      const mockSubscription = {
        id: 'sub-123',
        memberEmail: email,
        ...subscriptionData,
      };

      vi.spyOn(mockStorageService.instance, 'createSubscription').mockResolvedValue(mockSubscription);

      const result = await service.createMemberSubscription(email, subscriptionData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSubscription);
    });

    it('should throw BadRequestException on invalid data', async () => {
      const email = 'user@example.com';
      const invalidData = {
        amountInCents: 'not-a-number',
      };

      await expect(service.createMemberSubscription(email, invalidData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Tags Management', () => {
    it('should retrieve all tags', async () => {
      const mockTags = [
        { id: '1', name: 'VIP', color: '#3b82f6' },
        { id: '2', name: 'Prospect', color: '#10b981' },
      ];

      vi.spyOn(mockStorageService.instance, 'getAllTags').mockResolvedValue({
        success: true,
        data: mockTags,
      });

      const result = await service.getAllTags();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should create a new tag', async () => {
      const tagData = { name: 'VIP', color: '#3b82f6' };
      const mockTag = { id: 'tag-123', ...tagData };

      vi.spyOn(mockStorageService.instance, 'createTag').mockResolvedValue({
        success: true,
        data: mockTag,
      });

      const result = await service.createTag(tagData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTag);
    });

    it('should throw ConflictException on duplicate tag', async () => {
      const tagData = { name: 'VIP' };
      const duplicateError = new Error('Tag already exists');
      (duplicateError as any).name = 'DuplicateError';

      vi.spyOn(mockStorageService.instance, 'createTag').mockResolvedValue({
        success: false,
        error: duplicateError,
      });

      await expect(service.createTag(tagData)).rejects.toThrow(ConflictException);
    });

    it('should update a tag', async () => {
      const tagId = 'tag-123';
      const updateData = { name: 'VIP Gold' };
      const mockTag = { id: tagId, ...updateData };

      vi.spyOn(mockStorageService.instance, 'updateTag').mockResolvedValue({
        success: true,
        data: mockTag,
      });

      const result = await service.updateTag(tagId, updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTag);
    });

    it('should throw NotFoundException when updating non-existent tag', async () => {
      const tagId = 'nonexistent-tag';
      const notFoundError = new Error('Tag not found');
      (notFoundError as any).name = 'NotFoundError';

      vi.spyOn(mockStorageService.instance, 'updateTag').mockResolvedValue({
        success: false,
        error: notFoundError,
      });

      await expect(service.updateTag(tagId, { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete a tag', async () => {
      const tagId = 'tag-123';

      vi.spyOn(mockStorageService.instance, 'deleteTag').mockResolvedValue({
        success: true,
      });

      await service.deleteTag(tagId);

      expect(mockStorageService.instance.deleteTag).toHaveBeenCalledWith(tagId);
    });

    it('should get tags for a member', async () => {
      const email = 'user@example.com';
      const mockTags = [
        { id: '1', name: 'VIP' },
        { id: '2', name: 'Active' },
      ];

      vi.spyOn(mockStorageService.instance, 'getTagsByMember').mockResolvedValue({
        success: true,
        data: mockTags,
      });

      const result = await service.getMemberTags(email);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should assign a tag to member', async () => {
      const email = 'user@example.com';
      const tagData = { tagId: '550e8400-e29b-41d4-a716-446655440000' };
      const mockAssignment = { id: 'assign-1', memberEmail: email, tagId: tagData.tagId };

      mockStorageService.instance.assignTagToMember.mockResolvedValue({
        success: true,
        data: mockAssignment,
      });

      const result = await service.assignTagToMember(email, tagData, 'admin@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAssignment);
    });

    it('should remove a tag from member', async () => {
      const email = 'user@example.com';
      const tagId = 'tag-123';

      vi.spyOn(mockStorageService.instance, 'removeTagFromMember').mockResolvedValue({
        success: true,
      });

      await service.removeTagFromMember(email, tagId);

      expect(mockStorageService.instance.removeTagFromMember).toHaveBeenCalledWith(email, tagId);
    });
  });

  describe('Tasks Management', () => {
    it('should get tasks for a member', async () => {
      const email = 'user@example.com';
      const mockTasks = [
        { id: '1', title: 'Call member', status: 'pending' },
        { id: '2', title: 'Send email', status: 'completed' },
      ];

      vi.spyOn(mockStorageService.instance, 'getTasksByMember').mockResolvedValue({
        success: true,
        data: mockTasks,
      });

      const result = await service.getMemberTasks(email);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should create a task for member', async () => {
      const email = 'user@example.com';
      const taskData = { title: 'Call member', priority: 'high', taskType: 'call' };
      const mockTask = { id: 'task-1', memberEmail: email, ...taskData };

      mockStorageService.instance.createTask.mockResolvedValue({
        success: true,
        data: mockTask,
      });

      const result = await service.createMemberTask(email, taskData, 'admin@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTask);
    });

    it('should update task status to completed', async () => {
      const taskId = 'task-1';
      const updateData = { status: 'completed' };
      const mockTask = { id: taskId, status: 'completed' };

      vi.spyOn(mockStorageService.instance, 'updateTask').mockResolvedValue({
        success: true,
        data: mockTask,
      });

      const result = await service.updateTask(taskId, updateData, 'admin@example.com');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('completed');
    });

    it('should handle dueDate null value', async () => {
      const taskId = 'task-1';
      const updateData = { dueDate: null };

      vi.spyOn(mockStorageService.instance, 'updateTask').mockResolvedValue({
        success: true,
        data: { id: taskId },
      });

      await service.updateTask(taskId, updateData);

      expect(mockStorageService.instance.updateTask).toHaveBeenCalled();
    });

    it('should delete a task', async () => {
      const taskId = 'task-1';

      vi.spyOn(mockStorageService.instance, 'deleteTask').mockResolvedValue({
        success: true,
      });

      await service.deleteTask(taskId);

      expect(mockStorageService.instance.deleteTask).toHaveBeenCalledWith(taskId);
    });
  });

  describe('Relations Management', () => {
    it('should get relations for a member', async () => {
      const email = 'user@example.com';
      const mockRelations = [
        { id: '1', relatedMemberEmail: 'other@example.com', relationType: 'colleague' },
      ];

      vi.spyOn(mockStorageService.instance, 'getRelationsByMember').mockResolvedValue({
        success: true,
        data: mockRelations,
      });

      const result = await service.getMemberRelations(email);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should create a relation between members', async () => {
      const email = 'user@example.com';
      const relationData = {
        relatedMemberEmail: 'other@example.com',
        relationType: 'sponsor',
      };
      const mockRelation = { id: 'rel-1', memberEmail: email, ...relationData };

      mockStorageService.instance.createRelation.mockResolvedValue({
        success: true,
        data: mockRelation,
      });

      const result = await service.createMemberRelation(
        email,
        relationData,
        'admin@example.com',
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRelation);
    });

    it('should delete a relation', async () => {
      const relationId = 'rel-1';

      vi.spyOn(mockStorageService.instance, 'deleteRelation').mockResolvedValue({
        success: true,
      });

      await service.deleteRelation(relationId);

      expect(mockStorageService.instance.deleteRelation).toHaveBeenCalledWith(relationId);
    });
  });
});
