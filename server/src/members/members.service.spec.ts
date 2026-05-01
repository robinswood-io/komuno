import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { MembersService } from './members.service';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { emailNotificationService } from '../../email-notification-service';
import { DuplicateError } from '../../../shared/schema';
import * as sharedSchema from '../../../shared/schema';
import { db } from '../../db';
import { logger } from '../../lib/logger';
import { z } from 'zod';
import { pgTable, uuid } from 'drizzle-orm/pg-core';

vi.mock('../../email-notification-service', () => ({
  emailNotificationService: {
    notifyNewMemberProposal: vi.fn().mockResolvedValue(undefined),
  },
}));

type StorageInstanceMock = {
  proposeMember: ReturnType<typeof vi.fn>;
  createOrUpdateMember: ReturnType<typeof vi.fn>;
  createOwnershipHistoryEntry: ReturnType<typeof vi.fn>;
  assignMember: ReturnType<typeof vi.fn>;
  getMemberOwnershipHistory: ReturnType<typeof vi.fn>;
  getMembers: ReturnType<typeof vi.fn>;
  getMemberByEmail: ReturnType<typeof vi.fn>;
  getMemberActivities: ReturnType<typeof vi.fn>;
  getMemberDetails: ReturnType<typeof vi.fn>;
  updateMember: ReturnType<typeof vi.fn>;
  deleteMember: ReturnType<typeof vi.fn>;
  getSubscriptionsByMember: ReturnType<typeof vi.fn>;
  createSubscription: ReturnType<typeof vi.fn>;
  getAllTags: ReturnType<typeof vi.fn>;
  createTag: ReturnType<typeof vi.fn>;
  updateTag: ReturnType<typeof vi.fn>;
  deleteTag: ReturnType<typeof vi.fn>;
  getTagsByMember: ReturnType<typeof vi.fn>;
  assignTagToMember: ReturnType<typeof vi.fn>;
  removeTagFromMember: ReturnType<typeof vi.fn>;
  getTasksByMember: ReturnType<typeof vi.fn>;
  createTask: ReturnType<typeof vi.fn>;
  updateTask: ReturnType<typeof vi.fn>;
  deleteTask: ReturnType<typeof vi.fn>;
  getRelationsByMember: ReturnType<typeof vi.fn>;
  createRelation: ReturnType<typeof vi.fn>;
  deleteRelation: ReturnType<typeof vi.fn>;
  getAllRelations: ReturnType<typeof vi.fn>;
  getAllTasks: ReturnType<typeof vi.fn>;
  createTrackingMetric: ReturnType<typeof vi.fn>;
  getMemberContacts: ReturnType<typeof vi.fn>;
  createMemberContact: ReturnType<typeof vi.fn>;
  updateMemberContact: ReturnType<typeof vi.fn>;
  deleteMemberContact: ReturnType<typeof vi.fn>;
};

describe('MembersService', () => {
  let service: MembersService;
  let mockStorageService: { instance: StorageInstanceMock };

  beforeEach(() => {
    const schemaModule = sharedSchema as unknown as Record<string, unknown>;
    if (!schemaModule.assignMemberSchema) {
      schemaModule.assignMemberSchema = z.object({
        assignedTo: z.string().email(),
        note: z.string().max(500).optional(),
      });
    }
    if (!schemaModule.insertMemberContactSchema) {
      schemaModule.insertMemberContactSchema = z.object({
        memberEmail: z.string().email(),
        type: z.enum(['meeting', 'email', 'call', 'lunch', 'event']),
        subject: z.string().min(3).max(200),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description: z.string().min(1).max(3000),
        createdBy: z.string().email().optional(),
      });
    }
    if (!schemaModule.updateMemberContactSchema) {
      schemaModule.updateMemberContactSchema = z.object({
        subject: z.string().min(3).max(200).optional(),
        description: z.string().min(1).max(3000).optional(),
        type: z.enum(['meeting', 'email', 'call', 'lunch', 'event']).optional(),
      });
    }
    if (!schemaModule.subscriptionTypes) {
      schemaModule.subscriptionTypes = pgTable('subscription_types', {
        id: uuid('id').primaryKey(),
      });
    }

    mockStorageService = {
      instance: {
        proposeMember: vi.fn(),
        createOrUpdateMember: vi.fn(),
        createOwnershipHistoryEntry: vi.fn(),
        assignMember: vi.fn(),
        getMemberOwnershipHistory: vi.fn(),
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
        getAllRelations: vi.fn(),
        getAllTasks: vi.fn(),
        createTrackingMetric: vi.fn(),
        getMemberContacts: vi.fn(),
        createMemberContact: vi.fn(),
        updateMemberContact: vi.fn(),
        deleteMemberContact: vi.fn(),
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

      vi.spyOn(mockStorageService.instance, 'proposeMember').mockResolvedValue({
        success: false,
        error: new DuplicateError('Email already exists'),
      });

      await expect(service.proposeMember(memberData)).rejects.toThrow(ConflictException);
    });

    it('should continue even if tracking metric creation fails', async () => {
      const memberData = {
        firstName: 'Alice',
        lastName: 'Martin',
        email: 'alice.martin@example.com',
        proposedBy: 'proposer@example.com',
      };

      const mockMember = {
        id: 'member-456',
        ...memberData,
      };

      mockStorageService.instance.proposeMember.mockResolvedValue({
        success: true,
        data: mockMember,
      });

      mockStorageService.instance.createTrackingMetric.mockRejectedValue(new Error('metric failed'));

      const result = await service.proposeMember(memberData);

      expect(result.success).toBe(true);
      expect(emailNotificationService.notifyNewMemberProposal).toHaveBeenCalledWith(expect.objectContaining({
        email: memberData.email,
      }));
    });

    it('should throw BadRequestException on non-duplicate storage error', async () => {
      const memberData = {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        proposedBy: 'proposer@example.com',
      };

      vi.spyOn(mockStorageService.instance, 'proposeMember').mockResolvedValue({
        success: false,
        error: new Error('storage error'),
      });

      await expect(service.proposeMember(memberData)).rejects.toThrow(BadRequestException);
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

    it('should apply prospects pipeline filters', async () => {
      vi.spyOn(mockStorageService.instance, 'getMembers').mockResolvedValue({
        success: true,
        data: { data: [], total: 0, page: 1, limit: 20, pageCount: 0 },
      });

      await service.getMembers(
        1,
        20,
        'all',
        undefined,
        undefined,
        undefined,
        'En discussion',
        'Lyon',
        '69',
        'owner@example.com',
        true,
        false,
      );

      expect(mockStorageService.instance.getMembers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        prospectionStatus: 'En discussion',
        city: 'Lyon',
        department: '69',
        assignedTo: 'owner@example.com',
        onlyProspects: true,
      });
    });

    it('should apply excludeProspects filter without optional empty filters', async () => {
      vi.spyOn(mockStorageService.instance, 'getMembers').mockResolvedValue({
        success: true,
        data: { data: [], total: 0, page: 1, limit: 20, pageCount: 0 },
      });

      await service.getMembers(1, 20, 'all', '', undefined, undefined, 'all', '   ', 'all', 'all', false, true);

      expect(mockStorageService.instance.getMembers).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        excludeProspects: true,
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

  describe('createMember', () => {
    it('should default assignedTo to creator email when missing', async () => {
      const payload = {
        email: 'new.member@example.com',
        firstName: 'Nina',
        lastName: 'Durand',
      };
      const creatorEmail = 'admin@example.com';
      const createdMember = {
        id: 'member-created',
        ...payload,
        assignedTo: creatorEmail,
      };

      mockStorageService.instance.createOrUpdateMember.mockResolvedValue({
        success: true,
        data: createdMember,
      });
      mockStorageService.instance.createOwnershipHistoryEntry.mockResolvedValue({});

      const result = await service.createMember(payload, creatorEmail);

      expect(result).toEqual({ success: true, data: createdMember });
      expect(mockStorageService.instance.createOrUpdateMember).toHaveBeenCalledWith(expect.objectContaining({
        email: payload.email,
        assignedTo: creatorEmail,
        createdBy: creatorEmail,
      }));
      expect(mockStorageService.instance.createOwnershipHistoryEntry).toHaveBeenCalledWith({
        memberEmail: payload.email,
        action: 'created',
        adminEmail: creatorEmail,
        toEmail: creatorEmail,
      });
    });

    it('should throw ConflictException on duplicate member creation', async () => {
      const payload = {
        email: 'duplicate.member@example.com',
        firstName: 'Nina',
        lastName: 'Durand',
      };

      mockStorageService.instance.createOrUpdateMember.mockResolvedValue({
        success: false,
        error: new DuplicateError('duplicate'),
      });

      await expect(service.createMember(payload, 'admin@example.com')).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException on invalid payload', async () => {
      const payload = {
        email: 'invalid-email',
        firstName: 'N',
        lastName: 'D',
      };

      await expect(service.createMember(payload, 'admin@example.com')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on non-duplicate storage error', async () => {
      const payload = {
        email: 'broken.member@example.com',
        firstName: 'Nina',
        lastName: 'Durand',
      };

      mockStorageService.instance.createOrUpdateMember.mockResolvedValue({
        success: false,
        error: new Error('insert failed'),
      });

      await expect(service.createMember(payload, 'admin@example.com')).rejects.toThrow(BadRequestException);
    });

    it('should still return success when ownership history entry fails', async () => {
      const payload = {
        email: 'history.fail@example.com',
        firstName: 'Nina',
        lastName: 'Durand',
      };
      const creatorEmail = 'admin@example.com';
      const createdMember = {
        id: 'member-history-fail',
        ...payload,
      };

      mockStorageService.instance.createOrUpdateMember.mockResolvedValue({
        success: true,
        data: createdMember,
      });
      mockStorageService.instance.createOwnershipHistoryEntry.mockRejectedValue(
        new Error('history write failed'),
      );

      const result = await service.createMember(payload, creatorEmail);

      expect(result).toEqual({ success: true, data: createdMember });
    });
  });

  describe('getMemberOwnershipHistory', () => {
    it('should return ownership history when storage succeeds', async () => {
      const historyEntries = [
        {
          id: 'history-1',
          memberEmail: 'member@example.com',
          action: 'assigned',
          fromEmail: 'old-owner@example.com',
          toEmail: 'new-owner@example.com',
        },
      ];

      mockStorageService.instance.getMemberOwnershipHistory.mockResolvedValue({
        success: true,
        data: historyEntries,
      });

      const result = await service.getMemberOwnershipHistory('member@example.com');

      expect(result).toEqual({ success: true, data: historyEntries });
    });

    it('should throw BadRequestException when history retrieval fails', async () => {
      mockStorageService.instance.getMemberOwnershipHistory.mockResolvedValue({
        success: false,
        error: new Error('history error'),
      });

      await expect(service.getMemberOwnershipHistory('member@example.com')).rejects.toThrow(BadRequestException);
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

      expect(mockStorageService.instance.updateMember).toHaveBeenCalledWith(email, {});
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
      expect(mockStorageService.instance.updateMember).toHaveBeenCalledWith(email, {});
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
      notFoundError.name = 'NotFoundError';

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

    it('should rethrow non-zod errors from subscription creation', async () => {
      const email = 'user@example.com';
      const subscriptionData = {
        amountInCents: 50000,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };

      const storageError = new Error('db timeout');
      vi.spyOn(mockStorageService.instance, 'createSubscription').mockRejectedValue(storageError);

      await expect(service.createMemberSubscription(email, subscriptionData)).rejects.toBe(storageError);
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
      duplicateError.name = 'DuplicateError';

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
      notFoundError.name = 'NotFoundError';

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

    it('should throw BadRequestException when userEmail is missing for task creation', async () => {
      const email = 'user@example.com';
      const taskData = { title: 'Plan next call', priority: 'medium', taskType: 'call' };

      await expect(service.createMemberTask(email, taskData)).rejects.toThrow(BadRequestException);
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
      expect(mockStorageService.instance.updateTask).toHaveBeenCalledWith(taskId, {
        status: 'completed',
        completedBy: 'admin@example.com',
      });
    });

    it('should preserve completedBy when already provided in payload', async () => {
      const taskId = 'task-keep-completed-by';
      const updateData = { status: 'completed', completedBy: 'manager@example.com' as const };

      vi.spyOn(mockStorageService.instance, 'updateTask').mockResolvedValue({
        success: true,
        data: { id: taskId, ...updateData },
      });

      await service.updateTask(taskId, updateData, 'admin@example.com');

      expect(mockStorageService.instance.updateTask).toHaveBeenCalledWith(taskId, {
        status: 'completed',
        completedBy: 'manager@example.com',
      });
    });

    it('should handle dueDate null value', async () => {
      const taskId = 'task-1';
      const updateData = { dueDate: null };

      vi.spyOn(mockStorageService.instance, 'updateTask').mockResolvedValue({
        success: true,
        data: { id: taskId },
      });

      await service.updateTask(taskId, updateData);

      expect(mockStorageService.instance.updateTask).toHaveBeenCalledWith(taskId, {
        dueDate: undefined,
      });
    });

    it('should throw NotFoundException when updating missing task', async () => {
      const notFoundError = new Error('Task not found');
      notFoundError.name = 'NotFoundError';

      mockStorageService.instance.updateTask.mockResolvedValue({
        success: false,
        error: notFoundError,
      });

      await expect(service.updateTask('missing-task', { title: 'A valid title' }, 'admin@example.com'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when updating task fails', async () => {
      mockStorageService.instance.updateTask.mockResolvedValue({
        success: false,
        error: new Error('task update failed'),
      });

      await expect(service.updateTask('task-2', { title: 'A valid title' }, 'admin@example.com'))
        .rejects.toThrow(BadRequestException);
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

  describe('Member Contacts (Interactions)', () => {
    it('should retrieve interaction history for a member', async () => {
      const contacts = [{ id: 'c1', type: 'email', summary: 'Relance J+3' }];
      mockStorageService.instance.getMemberContacts.mockResolvedValue({
        success: true,
        data: contacts,
      });

      const result = await service.getMemberContacts('user@example.com');

      expect(result).toEqual({ success: true, data: contacts });
      expect(mockStorageService.instance.getMemberContacts).toHaveBeenCalledWith('user@example.com');
    });

    it('should throw NotFoundException when deleting a missing interaction', async () => {
      const notFoundError = new Error('Contact not found');
      notFoundError.name = 'NotFoundError';
      mockStorageService.instance.deleteMemberContact.mockResolvedValue({
        success: false,
        error: notFoundError,
      });

      await expect(service.deleteMemberContact('contact-unknown')).rejects.toThrow(NotFoundException);
    });

    it('should delete an interaction successfully', async () => {
      mockStorageService.instance.deleteMemberContact.mockResolvedValue({
        success: true,
      });

      await service.deleteMemberContact('contact-1');

      expect(mockStorageService.instance.deleteMemberContact).toHaveBeenCalledWith('contact-1');
    });

    it('should throw BadRequestException when deleting interaction fails with generic error', async () => {
      mockStorageService.instance.deleteMemberContact.mockResolvedValue({
        success: false,
        error: new Error('delete failed'),
      });

      await expect(service.deleteMemberContact('contact-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('Bulk operations - erreurs et cas limites', () => {
    it('should throw BadRequestException when bulkUpdateStatus receives empty emails', async () => {
      await expect(service.bulkUpdateStatus([], 'active')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when bulkUpdateStatus fails at database layer', async () => {
      const dbWithUpdate = db as unknown as {
        update: (...args: unknown[]) => {
          set: (...setArgs: unknown[]) => { where: (...whereArgs: unknown[]) => Promise<unknown> };
        };
      };

      const whereMock = vi.fn(async () => {
        throw new Error('db update failed');
      });
      const setMock = vi.fn(() => ({ where: whereMock }));
      vi.spyOn(dbWithUpdate, 'update').mockReturnValue({ set: setMock });

      await expect(service.bulkUpdateStatus(['a@example.com'], 'inactive')).rejects.toThrow(BadRequestException);
    });

    it('should assign tags only when missing and ignore per-member insert errors', async () => {
      const dbWithSelectInsert = db as unknown as {
        select: (...args: unknown[]) => {
          from: (...fromArgs: unknown[]) => {
            where: (...whereArgs: unknown[]) => { limit: (count: number) => Promise<unknown[]> };
          };
        };
        insert: (...args: unknown[]) => { values: (payload: unknown) => Promise<unknown> };
      };

      const limitMock = vi.fn<(count: number) => Promise<unknown[]>>()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([]);
      const whereMock = vi.fn(() => ({ limit: limitMock }));
      const fromMock = vi.fn(() => ({ where: whereMock }));
      const selectMock = vi.fn(() => ({ from: fromMock }));
      vi.spyOn(dbWithSelectInsert, 'select').mockImplementation(selectMock);

      const valuesMock = vi.fn<(payload: unknown) => Promise<unknown>>()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('insert failed'));
      const insertMock = vi.fn(() => ({ values: valuesMock }));
      vi.spyOn(dbWithSelectInsert, 'insert').mockImplementation(insertMock);

      const loggerWithInfo = logger as unknown as {
        info: (...args: unknown[]) => void;
      };
      const infoSpy = vi.spyOn(loggerWithInfo, 'info').mockImplementation(() => undefined);

      const result = await service.bulkAssignTag(
        ['first@example.com', 'second@example.com', 'third@example.com'],
        'tag-123',
      );

      expect(result).toEqual({ success: true, assigned: 1 });
      expect(valuesMock).toHaveBeenCalledTimes(2);
      expect(infoSpy).toHaveBeenCalledWith('Bulk tag assignment', { count: 1, tagId: 'tag-123' });
    });

    it('should throw BadRequestException when bulkDelete fails at database layer', async () => {
      const dbWithDelete = db as unknown as {
        delete: (...args: unknown[]) => {
          where: (...whereArgs: unknown[]) => {
            returning: (...returningArgs: unknown[]) => Promise<Array<{ email: string }>>;
          };
        };
      };

      const returningMock = vi.fn(async () => {
        throw new Error('delete failed');
      });
      const whereMock = vi.fn(() => ({ returning: returningMock }));
      const deleteMock = vi.fn(() => ({ where: whereMock }));
      vi.spyOn(dbWithDelete, 'delete').mockImplementation(deleteMock);

      await expect(service.bulkDelete(['x@example.com'])).rejects.toThrow(BadRequestException);
    });

    it('should return deleted count in bulkDelete success path', async () => {
      const dbWithDelete = db as unknown as {
        delete: (...args: unknown[]) => {
          where: (...whereArgs: unknown[]) => {
            returning: (...returningArgs: unknown[]) => Promise<Array<{ email: string }>>;
          };
        };
      };

      const returningMock = vi.fn(async () => [{ email: 'a@example.com' }, { email: 'b@example.com' }]);
      const whereMock = vi.fn(() => ({ returning: returningMock }));
      const deleteMock = vi.fn(() => ({ where: whereMock }));
      vi.spyOn(dbWithDelete, 'delete').mockImplementation(deleteMock);

      const loggerWithInfo = logger as unknown as {
        info: (...args: unknown[]) => void;
      };
      const infoSpy = vi.spyOn(loggerWithInfo, 'info').mockImplementation(() => undefined);

      const result = await service.bulkDelete(['a@example.com', 'b@example.com']);

      expect(result).toEqual({ success: true, deleted: 2 });
      expect(infoSpy).toHaveBeenCalledWith('Bulk member delete', { count: 2 });
    });

    it('should throw BadRequestException when bulkAssignSubscription receives empty emails', async () => {
      await expect(
        service.bulkAssignSubscription([], 'sub-quarterly', '2026-01-15', 'card', 'admin@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when bulkUpdateStatus receives empty status', async () => {
      await expect(service.bulkUpdateStatus(['a@example.com'], '')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when bulkAssignTag receives empty tagId', async () => {
      await expect(service.bulkAssignTag(['a@example.com'], '')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when bulkDelete receives empty emails', async () => {
      await expect(service.bulkDelete([])).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when subscription type is missing in bulkAssignSubscription', async () => {
      const dbWithSelect = db as unknown as {
        select: (...args: unknown[]) => {
          from: (...fromArgs: unknown[]) => {
            where: (...whereArgs: unknown[]) => { limit: (count: number) => Promise<unknown[]> };
          };
        };
      };

      const limitMock = vi.fn<(count: number) => Promise<unknown[]>>().mockResolvedValue([]);
      const whereMock = vi.fn(() => ({ limit: limitMock }));
      const fromMock = vi.fn(() => ({ where: whereMock }));
      const selectMock = vi.fn(() => ({ from: fromMock }));
      vi.spyOn(dbWithSelect, 'select').mockImplementation(selectMock);

      await expect(
        service.bulkAssignSubscription(
          ['missing@example.com'],
          'sub-not-found',
          '2026-01-15',
          undefined,
          'admin@example.com',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should assign monthly subscriptions and ignore per-member insert failures', async () => {
      const dbWithSelectInsert = db as unknown as {
        select: (...args: unknown[]) => {
          from: (...fromArgs: unknown[]) => {
            where: (...whereArgs: unknown[]) => {
              limit: (
                count: number,
              ) => Promise<Array<{ amountInCents: number; durationType: 'monthly' | 'quarterly' | 'yearly' }>>;
            };
          };
        };
        insert: (...args: unknown[]) => { values: (payload: unknown) => Promise<unknown> };
      };

      const limitMock = vi
        .fn<
          (count: number) => Promise<Array<{ amountInCents: number; durationType: 'monthly' | 'quarterly' | 'yearly' }>>
        >()
        .mockResolvedValue([{ amountInCents: 2500, durationType: 'monthly' }]);
      const whereMock = vi.fn(() => ({ limit: limitMock }));
      const fromMock = vi.fn(() => ({ where: whereMock }));
      const selectMock = vi.fn(() => ({ from: fromMock }));
      vi.spyOn(dbWithSelectInsert, 'select').mockImplementation(selectMock);

      const payloads: Array<Record<string, unknown>> = [];
      const valuesMock = vi
        .fn<(payload: unknown) => Promise<unknown>>()
        .mockImplementationOnce(async (payload) => {
          payloads.push(payload as Record<string, unknown>);
          return undefined;
        })
        .mockImplementationOnce(async (payload) => {
          payloads.push(payload as Record<string, unknown>);
          throw new Error('insert failed');
        });
      const insertMock = vi.fn(() => ({ values: valuesMock }));
      vi.spyOn(dbWithSelectInsert, 'insert').mockImplementation(insertMock);

      const loggerWithInfo = logger as unknown as {
        info: (...args: unknown[]) => void;
      };
      const infoSpy = vi.spyOn(loggerWithInfo, 'info').mockImplementation(() => undefined);

      const result = await service.bulkAssignSubscription(
        ['a@example.com', 'b@example.com'],
        'sub-monthly',
        '2026-01-15',
        undefined,
        'admin@example.com',
      );

      expect(result).toEqual({ success: true, assigned: 1 });
      expect(payloads[0]?.endDate).toBe('2026-02-15');
      expect(payloads[0]?.paymentMethod).toBeNull();
      expect(infoSpy).toHaveBeenCalledWith('Bulk subscription assignment', {
        count: 1,
        subscriptionTypeId: 'sub-monthly',
      });
    });

    it('should compute quarterly and yearly subscription end dates', async () => {
      const dbWithSelectInsert = db as unknown as {
        select: (...args: unknown[]) => {
          from: (...fromArgs: unknown[]) => {
            where: (...whereArgs: unknown[]) => {
              limit: (
                count: number,
              ) => Promise<Array<{ amountInCents: number; durationType: 'monthly' | 'quarterly' | 'yearly' }>>;
            };
          };
        };
        insert: (...args: unknown[]) => { values: (payload: unknown) => Promise<unknown> };
      };

      const limitMock = vi
        .fn<
          (count: number) => Promise<Array<{ amountInCents: number; durationType: 'monthly' | 'quarterly' | 'yearly' }>>
        >()
        .mockResolvedValueOnce([{ amountInCents: 5000, durationType: 'quarterly' }])
        .mockResolvedValueOnce([{ amountInCents: 9000, durationType: 'yearly' }]);
      const whereMock = vi.fn(() => ({ limit: limitMock }));
      const fromMock = vi.fn(() => ({ where: whereMock }));
      const selectMock = vi.fn(() => ({ from: fromMock }));
      vi.spyOn(dbWithSelectInsert, 'select').mockImplementation(selectMock);

      const payloads: Array<Record<string, unknown>> = [];
      const valuesMock = vi.fn<(payload: unknown) => Promise<unknown>>().mockImplementation(async (payload) => {
        payloads.push(payload as Record<string, unknown>);
        return undefined;
      });
      const insertMock = vi.fn(() => ({ values: valuesMock }));
      vi.spyOn(dbWithSelectInsert, 'insert').mockImplementation(insertMock);

      const quarterlyResult = await service.bulkAssignSubscription(
        ['q@example.com'],
        'sub-quarterly',
        '2026-01-15',
        'transfer',
        'admin@example.com',
      );

      const yearlyResult = await service.bulkAssignSubscription(
        ['y@example.com'],
        'sub-yearly',
        '2026-01-15',
        'card',
        'admin@example.com',
      );

      expect(quarterlyResult).toEqual({ success: true, assigned: 1 });
      expect(yearlyResult).toEqual({ success: true, assigned: 1 });
      expect(payloads[0]?.endDate).toBe('2026-04-15');
      expect(payloads[1]?.endDate).toBe('2027-01-15');
      expect(payloads[0]?.paymentMethod).toBe('transfer');
      expect(payloads[1]?.paymentMethod).toBe('card');
    });
  });

  describe('getAllTasks', () => {
    it('should return all tasks with forwarded filters', async () => {
      const tasks = [{ id: 'task-1', status: 'pending', assignedTo: 'owner@example.com' }];
      mockStorageService.instance.getAllTasks.mockResolvedValue({
        success: true,
        data: tasks,
      });

      const result = await service.getAllTasks({ status: 'pending', assignedTo: 'owner@example.com' });

      expect(mockStorageService.instance.getAllTasks).toHaveBeenCalledWith({
        status: 'pending',
        assignedTo: 'owner@example.com',
      });
      expect(result).toEqual({ success: true, data: tasks });
    });

    it('should throw BadRequestException when getAllTasks fails', async () => {
      mockStorageService.instance.getAllTasks.mockResolvedValue({
        success: false,
        error: new Error('all tasks failed'),
      });

      await expect(service.getAllTasks({ status: 'pending' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('Branches supplémentaires - erreurs et transitions', () => {
    it('should assign member successfully with validated payload', async () => {
      mockStorageService.instance.assignMember.mockResolvedValue({
        success: true,
      });

      const result = await service.assignMember(
        'member@example.com',
        { assignedTo: 'owner@example.com', note: 'handover' },
        'admin@example.com',
      );

      expect(result).toEqual({ success: true });
      expect(mockStorageService.instance.assignMember).toHaveBeenCalledWith(
        'member@example.com',
        'owner@example.com',
        'admin@example.com',
        'handover',
      );
    });

    it('should throw BadRequestException when assignMember storage fails', async () => {
      mockStorageService.instance.assignMember.mockResolvedValue({
        success: false,
        error: new Error('assign failed'),
      });

      await expect(
        service.assignMember(
          'member@example.com',
          { assignedTo: 'owner@example.com', note: 'handover' },
          'admin@example.com',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when assignMember payload is invalid', async () => {
      await expect(
        service.assignMember(
          'member@example.com',
          { assignedTo: 'not-an-email' },
          'admin@example.com',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create member contact successfully', async () => {
      mockStorageService.instance.createMemberContact.mockResolvedValue({
        success: true,
        data: { id: 'contact-1' },
      });

      const result = await service.createMemberContact(
        'member@example.com',
        {
          type: 'email',
          subject: 'Relance CRM',
          date: '2026-05-01',
          description: 'Un échange a été initié',
        },
        'admin@example.com',
      );

      expect(result).toEqual({ success: true, data: { id: 'contact-1' } });
    });

    it('should throw BadRequestException when createMemberContact storage fails', async () => {
      mockStorageService.instance.createMemberContact.mockResolvedValue({
        success: false,
        error: new Error('contact create failed'),
      });

      await expect(
        service.createMemberContact(
          'member@example.com',
          {
            type: 'call',
            subject: 'Appel de suivi',
            date: '2026-05-01',
            description: 'Compte-rendu succinct',
          },
          'admin@example.com',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update member contact and handle not found branch', async () => {
      mockStorageService.instance.updateMemberContact.mockResolvedValueOnce({
        success: true,
        data: { id: 'contact-ok', subject: 'Sujet MAJ' },
      });

      const updated = await service.updateMemberContact('contact-ok', { subject: 'Sujet MAJ' });
      expect(updated).toEqual({ success: true, data: { id: 'contact-ok', subject: 'Sujet MAJ' } });

      const notFoundError = new Error('Contact not found');
      notFoundError.name = 'NotFoundError';
      mockStorageService.instance.updateMemberContact.mockResolvedValueOnce({
        success: false,
        error: notFoundError,
      });

      await expect(service.updateMemberContact('contact-missing', { subject: 'Sujet MAJ' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when updateMemberContact fails with generic error', async () => {
      mockStorageService.instance.updateMemberContact.mockResolvedValue({
        success: false,
        error: new Error('update contact failed'),
      });

      await expect(service.updateMemberContact('contact-err', { subject: 'Sujet MAJ' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when getMemberActivities fails', async () => {
      mockStorageService.instance.getMemberActivities.mockResolvedValue({
        success: false,
        error: new Error('activities failed'),
      });

      await expect(service.getMemberActivities('member@example.com')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when getMemberDetails fails', async () => {
      mockStorageService.instance.getMemberDetails.mockResolvedValue({
        success: false,
        error: new Error('member details not found'),
      });

      await expect(service.getMemberDetails('missing@example.com')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when getAllTags fails', async () => {
      mockStorageService.instance.getAllTags.mockResolvedValue({
        success: false,
        error: new Error('tags read failed'),
      });

      await expect(service.getAllTags()).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when deleteTag fails', async () => {
      mockStorageService.instance.deleteTag.mockResolvedValue({
        success: false,
        error: new Error('delete tag failed'),
      });

      await expect(service.deleteTag('tag-404')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when getMemberTags fails', async () => {
      mockStorageService.instance.getTagsByMember.mockResolvedValue({
        success: false,
        error: new Error('member tags failed'),
      });

      await expect(service.getMemberTags('member@example.com')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when getMemberTasks fails', async () => {
      mockStorageService.instance.getTasksByMember.mockResolvedValue({
        success: false,
        error: new Error('tasks read failed'),
      });

      await expect(service.getMemberTasks('member@example.com')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when deleteTask fails', async () => {
      mockStorageService.instance.deleteTask.mockResolvedValue({
        success: false,
        error: new Error('task delete failed'),
      });

      await expect(service.deleteTask('task-404')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when getMemberRelations fails', async () => {
      mockStorageService.instance.getRelationsByMember.mockResolvedValue({
        success: false,
        error: new Error('relations read failed'),
      });

      await expect(service.getMemberRelations('member@example.com')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when deleteRelation fails', async () => {
      mockStorageService.instance.deleteRelation.mockResolvedValue({
        success: false,
        error: new Error('relation delete failed'),
      });

      await expect(service.deleteRelation('relation-404')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when getAllRelations fails', async () => {
      mockStorageService.instance.getAllRelations.mockResolvedValue({
        success: false,
        error: new Error('all relations failed'),
      });

      await expect(service.getAllRelations()).rejects.toThrow(BadRequestException);
    });
  });
});
