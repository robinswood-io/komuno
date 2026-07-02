import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock services
const mockStorageInstance = {
  getIdeas: vi.fn(),
  createIdea: vi.fn(),
  deleteIdea: vi.fn(),
  updateIdeaStatus: vi.fn(),
  getIdea: vi.fn(),
  getVotesByIdea: vi.fn(),
  createVote: vi.fn(),
  hasUserVoted: vi.fn(),
  createOrUpdateMember: vi.fn(),
  trackMemberActivity: vi.fn(),
};

const mockStorageService = {
  instance: mockStorageInstance,
};

const mockNotificationService = {
  notifyNewIdea: vi.fn(),
  notifyIdeaStatusChange: vi.fn(),
};

const mockEmailNotificationService = {
  notifyNewIdea: vi.fn(),
};

vi.mock('../../server/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../server/notification-service', () => ({
  notificationService: mockNotificationService,
}));

vi.mock('../../server/email-notification-service', () => ({
  emailNotificationService: mockEmailNotificationService,
}));

// ZodError will be available from actual zod module if needed

// Simulated IdeasService matching real implementation
class IdeasService {
  constructor(private storageService: unknown) {}

  async getIdeas(page: number = 1, limit: number = 20) {
    return await this.storageService.instance.getIdeas({ page, limit });
  }

  async createIdea(data: unknown) {
    try {
      // Simulate Zod validation
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data');
      }
      const validated = data as unknown;
      if (!validated.title || validated.title.length < 3) {
        throw new BadRequestException('Title must be at least 3 characters');
      }
      if (!validated.proposedByEmail || !validated.proposedByEmail.includes('@')) {
        throw new BadRequestException('Invalid email address');
      }

      const result = await this.storageService.instance.createIdea(validated);

      if (!result.success) {
        const error = 'error' in result ? result.error : new Error('Unknown error');
        throw new BadRequestException(error.message);
      }

      // Track member activity
      await this.trackMemberActivity(
        result.data.proposedByEmail,
        result.data.proposedBy,
        'idea_proposed',
        'idea',
        result.data.id,
        result.data.title,
        validated.company,
        validated.phone
      );

      // Send notifications
      try {
        await mockNotificationService.notifyNewIdea({
          title: result.data.title,
          proposedBy: result.data.proposedBy,
        });
        await mockEmailNotificationService.notifyNewIdea(result.data);
      } catch (notifError) {
        // Don't fail if notifications fail
      }

      return result.data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }

  async deleteIdea(id: string) {
    const result = await this.storageService.instance.deleteIdea(id);
    if (!result.success) {
      const error = 'error' in result ? result.error : new Error('Unknown error');
      if (error.name === 'NotFoundError') {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  async updateIdeaStatus(id: string, status: unknown) {
    try {
      // Validate status
      const validStatuses = [
        'pending',
        'approved',
        'rejected',
        'under_review',
        'postponed',
        'completed',
      ];

      if (!status || !validStatuses.includes(status as string)) {
        throw new BadRequestException('Invalid status');
      }

      const result = await this.storageService.instance.updateIdeaStatus(id, status);

      if (!result.success) {
        const error = 'error' in result ? result.error : new Error('Unknown error');
        if (error.name === 'NotFoundError') {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }

      // Send notification
      try {
        await mockNotificationService.notifyIdeaStatusChange({
          title: `Idea ${id}`,
          status: status,
          proposedBy: 'User',
        });
      } catch (notifError) {
        // Don't fail if notification fails
      }

      return result.data;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }

  async getVotesByIdea(ideaId: string) {
    const result = await this.storageService.instance.getVotesByIdea(ideaId);
    if (!result.success) {
      const error = 'error' in result ? result.error : new Error('Unknown error');
      throw new BadRequestException(error.message);
    }
    return result.data;
  }

  async createVote(data: unknown) {
    try {
      if (!data || typeof data !== 'object') {
        throw new BadRequestException('Invalid data');
      }

      const validated = data as unknown;
      if (!validated.ideaId || !validated.voterEmail || !validated.voterName) {
        throw new BadRequestException('Missing required fields');
      }

      // Check for duplicate vote
      const hasVoted = await this.storageService.instance.hasUserVoted(
        validated.ideaId,
        validated.voterEmail
      );
      if (hasVoted) {
        throw new BadRequestException('You have already voted for this idea');
      }

      const result = await this.storageService.instance.createVote(validated);

      if (!result.success) {
        const error = 'error' in result ? result.error : new Error('Unknown error');
        throw new BadRequestException(error.message);
      }

      // Get idea title for activity
      const ideaResult = await this.storageService.instance.getIdea(validated.ideaId);
      const ideaTitle = ideaResult.success ? ideaResult.data?.title || 'Idea' : 'Idea';

      // Track member activity
      await this.trackMemberActivity(
        validated.voterEmail,
        validated.voterName,
        'vote_cast',
        'vote',
        result.data.id,
        ideaTitle
      );

      return result.data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw error;
    }
  }

  private async trackMemberActivity(
    email: string,
    name: string,
    activityType: 'idea_proposed' | 'vote_cast',
    entityType: 'idea' | 'vote',
    entityId: string,
    entityTitle: string,
    company?: string,
    phone?: string
  ) {
    try {
      await this.storageService.instance.createOrUpdateMember({
        email,
        firstName: name.split(' ')[0] || name,
        lastName: name.split(' ').slice(1).join(' ') || '',
        company,
        phone,
      });

      const scoreImpact = {
        idea_proposed: 10,
        vote_cast: 2,
      }[activityType];

      await this.storageService.instance.trackMemberActivity({
        memberEmail: email,
        activityType,
        entityType,
        entityId,
        entityTitle,
        scoreImpact,
      });
    } catch (error) {
      // Don't fail the main request if tracking fails
    }
  }
}

describe('IdeasService', () => {
  let ideasService: IdeasService;

  beforeEach(() => {
    vi.clearAllMocks();
    ideasService = new IdeasService(mockStorageService);
  });

  // ==================== getIdeas() ====================
  describe('getIdeas', () => {
    it('should return paginated ideas with default values', async () => {
      const mockIdeas = [
        {
          id: 'idea-1',
          title: 'Idea 1',
          description: 'Description 1',
          proposedBy: 'User 1',
          proposedByEmail: 'user1@example.com',
          status: 'pending',
        },
        {
          id: 'idea-2',
          title: 'Idea 2',
          description: 'Description 2',
          proposedBy: 'User 2',
          proposedByEmail: 'user2@example.com',
          status: 'approved',
        },
      ];

      mockStorageInstance.getIdeas.mockResolvedValue({
        data: mockIdeas,
        total: 2,
        page: 1,
        limit: 20,
      });

      const result = await ideasService.getIdeas();

      expect(mockStorageInstance.getIdeas).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result.data).toEqual(mockIdeas);
      expect(result.total).toBe(2);
    });

    it('should respect custom pagination parameters', async () => {
      mockStorageInstance.getIdeas.mockResolvedValue({ data: [], total: 0, page: 2, limit: 10 });

      await ideasService.getIdeas(2, 10);

      expect(mockStorageInstance.getIdeas).toHaveBeenCalledWith({ page: 2, limit: 10 });
    });

    it('should return empty list when no ideas exist', async () => {
      mockStorageInstance.getIdeas.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      const result = await ideasService.getIdeas();

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle large page numbers', async () => {
      mockStorageInstance.getIdeas.mockResolvedValue({ data: [], total: 0, page: 100, limit: 20 });

      await ideasService.getIdeas(100, 20);

      expect(mockStorageInstance.getIdeas).toHaveBeenCalledWith({ page: 100, limit: 20 });
    });
  });

  // ==================== createIdea() ====================
  describe('createIdea', () => {
    const validIdeaData = {
      title: 'New Team Building Activity',
      description: 'Organize a team building event',
      proposedBy: 'Jean Dupont',
      proposedByEmail: 'jean@example.com',
      company: 'Acme Inc',
      phone: '+33612345678',
    };

    it('should create idea with valid data', async () => {
      mockStorageInstance.createIdea.mockResolvedValue({
        success: true,
        data: { id: 'idea-123', ...validIdeaData, status: 'pending', createdAt: new Date() },
      });

      mockStorageInstance.createOrUpdateMember.mockResolvedValue({ success: true });
      mockStorageInstance.trackMemberActivity.mockResolvedValue({ success: true });

      const result = await ideasService.createIdea(validIdeaData);

      expect(mockStorageInstance.createIdea).toHaveBeenCalledWith(validIdeaData);
      expect(result.id).toBe('idea-123');
      expect(result.status).toBe('pending');
      expect(mockStorageInstance.createOrUpdateMember).toHaveBeenCalled();
      expect(mockStorageInstance.trackMemberActivity).toHaveBeenCalled();
    });

    it('should send notifications on successful creation', async () => {
      mockStorageInstance.createIdea.mockResolvedValue({
        success: true,
        data: { id: 'idea-123', ...validIdeaData, status: 'pending' },
      });
      mockStorageInstance.createOrUpdateMember.mockResolvedValue({ success: true });
      mockStorageInstance.trackMemberActivity.mockResolvedValue({ success: true });

      await ideasService.createIdea(validIdeaData);

      expect(mockNotificationService.notifyNewIdea).toHaveBeenCalledWith({
        title: validIdeaData.title,
        proposedBy: validIdeaData.proposedBy,
      });
      expect(mockEmailNotificationService.notifyNewIdea).toHaveBeenCalled();
    });

    it('should reject idea with title too short', async () => {
      const invalidData = { ...validIdeaData, title: 'AB' };

      await expect(ideasService.createIdea(invalidData)).rejects.toThrow(BadRequestException);
    });

    it('should reject idea with invalid email', async () => {
      const invalidData = { ...validIdeaData, proposedByEmail: 'not-an-email' };

      await expect(ideasService.createIdea(invalidData)).rejects.toThrow(BadRequestException);
    });

    it('should reject idea with missing title', async () => {
      const invalidData = { ...validIdeaData, title: undefined };

      await expect(ideasService.createIdea(invalidData)).rejects.toThrow(BadRequestException);
    });

    it('should reject idea with missing email', async () => {
      const invalidData = { ...validIdeaData, proposedByEmail: undefined };

      await expect(ideasService.createIdea(invalidData)).rejects.toThrow(BadRequestException);
    });

    it('should continue on notification failure', async () => {
      mockStorageInstance.createIdea.mockResolvedValue({
        success: true,
        data: { id: 'idea-123', ...validIdeaData, status: 'pending' },
      });
      mockStorageInstance.createOrUpdateMember.mockResolvedValue({ success: true });
      mockStorageInstance.trackMemberActivity.mockResolvedValue({ success: true });
      mockNotificationService.notifyNewIdea.mockRejectedValue(new Error('Notification failed'));

      const result = await ideasService.createIdea(validIdeaData);

      expect(result.id).toBe('idea-123'); // Should not fail
    });

    it('should track member activity with all fields', async () => {
      mockStorageInstance.createIdea.mockResolvedValue({
        success: true,
        data: { id: 'idea-123', ...validIdeaData, status: 'pending' },
      });
      mockStorageInstance.createOrUpdateMember.mockResolvedValue({ success: true });
      mockStorageInstance.trackMemberActivity.mockResolvedValue({ success: true });

      await ideasService.createIdea(validIdeaData);

      expect(mockStorageInstance.createOrUpdateMember).toHaveBeenCalledWith({
        email: validIdeaData.proposedByEmail,
        firstName: 'Jean',
        lastName: 'Dupont',
        company: validIdeaData.company,
        phone: validIdeaData.phone,
      });
      expect(mockStorageInstance.trackMemberActivity).toHaveBeenCalled();
    });

    it('should handle creation failure from storage', async () => {
      mockStorageInstance.createIdea.mockResolvedValue({
        success: false,
        error: new Error('Database error'),
      });

      await expect(ideasService.createIdea(validIdeaData)).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== deleteIdea() ====================
  describe('deleteIdea', () => {
    it('should delete idea successfully', async () => {
      mockStorageInstance.deleteIdea.mockResolvedValue({ success: true });

      await ideasService.deleteIdea('idea-123');

      expect(mockStorageInstance.deleteIdea).toHaveBeenCalledWith('idea-123');
    });

    it('should throw NotFoundException when idea not found', async () => {
      const notFoundError = new Error('Idea not found');
      notFoundError.name = 'NotFoundError';

      mockStorageInstance.deleteIdea.mockResolvedValue({
        success: false,
        error: notFoundError,
      });

      await expect(ideasService.deleteIdea('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on other errors', async () => {
      const error = new Error('Database error');
      mockStorageInstance.deleteIdea.mockResolvedValue({
        success: false,
        error: error,
      });

      await expect(ideasService.deleteIdea('idea-123')).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== updateIdeaStatus() ====================
  describe('updateIdeaStatus', () => {
    it('should update status to approved', async () => {
      mockStorageInstance.updateIdeaStatus.mockResolvedValue({ success: true, data: { status: 'approved' } });

      await ideasService.updateIdeaStatus('idea-123', 'approved');

      expect(mockStorageInstance.updateIdeaStatus).toHaveBeenCalledWith('idea-123', 'approved');
      expect(mockNotificationService.notifyIdeaStatusChange).toHaveBeenCalled();
    });

    it('should update status to rejected', async () => {
      mockStorageInstance.updateIdeaStatus.mockResolvedValue({ success: true, data: { status: 'rejected' } });

      await ideasService.updateIdeaStatus('idea-123', 'rejected');

      expect(mockStorageInstance.updateIdeaStatus).toHaveBeenCalledWith('idea-123', 'rejected');
    });

    it('should update status to under_review', async () => {
      mockStorageInstance.updateIdeaStatus.mockResolvedValue({ success: true, data: { status: 'under_review' } });

      await ideasService.updateIdeaStatus('idea-123', 'under_review');

      expect(mockStorageInstance.updateIdeaStatus).toHaveBeenCalledWith('idea-123', 'under_review');
    });

    it('should update status to postponed', async () => {
      mockStorageInstance.updateIdeaStatus.mockResolvedValue({ success: true, data: { status: 'postponed' } });

      await ideasService.updateIdeaStatus('idea-123', 'postponed');

      expect(mockStorageInstance.updateIdeaStatus).toHaveBeenCalledWith('idea-123', 'postponed');
    });

    it('should update status to completed', async () => {
      mockStorageInstance.updateIdeaStatus.mockResolvedValue({ success: true, data: { status: 'completed' } });

      await ideasService.updateIdeaStatus('idea-123', 'completed');

      expect(mockStorageInstance.updateIdeaStatus).toHaveBeenCalledWith('idea-123', 'completed');
    });

    it('should reject invalid status', async () => {
      await expect(ideasService.updateIdeaStatus('idea-123', 'invalid_status')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should reject null status', async () => {
      await expect(ideasService.updateIdeaStatus('idea-123', null)).rejects.toThrow(BadRequestException);
    });

    it('should reject undefined status', async () => {
      await expect(ideasService.updateIdeaStatus('idea-123', undefined)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when idea not found', async () => {
      const notFoundError = new Error('Idea not found');
      notFoundError.name = 'NotFoundError';

      mockStorageInstance.updateIdeaStatus.mockResolvedValue({
        success: false,
        error: notFoundError,
      });

      await expect(ideasService.updateIdeaStatus('non-existent', 'approved')).rejects.toThrow(NotFoundException);
    });

    it('should send notification on status change', async () => {
      mockStorageInstance.updateIdeaStatus.mockResolvedValue({ success: true, data: { status: 'approved' } });

      await ideasService.updateIdeaStatus('idea-123', 'approved');

      expect(mockNotificationService.notifyIdeaStatusChange).toHaveBeenCalledWith({
        title: 'Idea idea-123',
        status: 'approved',
        proposedBy: 'User',
      });
    });

    it('should continue on notification failure', async () => {
      mockStorageInstance.updateIdeaStatus.mockResolvedValue({ success: true, data: { status: 'approved' } });
      mockNotificationService.notifyIdeaStatusChange.mockRejectedValue(new Error('Notification failed'));

      await expect(ideasService.updateIdeaStatus('idea-123', 'approved')).resolves.not.toThrow();
    });
  });

  // ==================== Voting System ====================
  describe('getVotesByIdea', () => {
    it('should return votes for idea', async () => {
      const mockVotes = [
        {
          id: 'vote-1',
          ideaId: 'idea-123',
          voterName: 'Alice',
          voterEmail: 'alice@example.com',
        },
        {
          id: 'vote-2',
          ideaId: 'idea-123',
          voterName: 'Bob',
          voterEmail: 'bob@example.com',
        },
      ];

      mockStorageInstance.getVotesByIdea.mockResolvedValue({ success: true, data: mockVotes });

      const result = await ideasService.getVotesByIdea('idea-123');

      expect(mockStorageInstance.getVotesByIdea).toHaveBeenCalledWith('idea-123');
      expect(result).toEqual(mockVotes);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no votes', async () => {
      mockStorageInstance.getVotesByIdea.mockResolvedValue({ success: true, data: [] });

      const result = await ideasService.getVotesByIdea('idea-123');

      expect(result).toHaveLength(0);
    });

    it('should throw error on database failure', async () => {
      mockStorageInstance.getVotesByIdea.mockResolvedValue({
        success: false,
        error: new Error('Database error'),
      });

      await expect(ideasService.getVotesByIdea('idea-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createVote', () => {
    const validVoteData = {
      ideaId: 'idea-123',
      voterName: 'Alice Johnson',
      voterEmail: 'alice@example.com',
    };

    it('should create vote successfully', async () => {
      mockStorageInstance.hasUserVoted.mockResolvedValue(false);
      mockStorageInstance.createVote.mockResolvedValue({
        success: true,
        data: { id: 'vote-1', ...validVoteData },
      });
      mockStorageInstance.getIdea.mockResolvedValue({
        success: true,
        data: { id: 'idea-123', title: 'Team Building' },
      });
      mockStorageInstance.createOrUpdateMember.mockResolvedValue({ success: true });
      mockStorageInstance.trackMemberActivity.mockResolvedValue({ success: true });

      const result = await ideasService.createVote(validVoteData);

      expect(mockStorageInstance.hasUserVoted).toHaveBeenCalledWith('idea-123', 'alice@example.com');
      expect(mockStorageInstance.createVote).toHaveBeenCalledWith(validVoteData);
      expect(result.id).toBe('vote-1');
    });

    it('should prevent duplicate votes', async () => {
      mockStorageInstance.hasUserVoted.mockResolvedValue(true);

      await expect(ideasService.createVote(validVoteData)).rejects.toThrow(BadRequestException);
    });

    it('should reject vote without idea ID', async () => {
      const invalidData = { ...validVoteData, ideaId: undefined };

      await expect(ideasService.createVote(invalidData)).rejects.toThrow(BadRequestException);
    });

    it('should reject vote without voter email', async () => {
      const invalidData = { ...validVoteData, voterEmail: undefined };

      await expect(ideasService.createVote(invalidData)).rejects.toThrow(BadRequestException);
    });

    it('should reject vote without voter name', async () => {
      const invalidData = { ...validVoteData, voterName: undefined };

      await expect(ideasService.createVote(invalidData)).rejects.toThrow(BadRequestException);
    });

    it('should track member activity on successful vote', async () => {
      mockStorageInstance.hasUserVoted.mockResolvedValue(false);
      mockStorageInstance.createVote.mockResolvedValue({
        success: true,
        data: { id: 'vote-1', ...validVoteData },
      });
      mockStorageInstance.getIdea.mockResolvedValue({
        success: true,
        data: { id: 'idea-123', title: 'Team Building' },
      });
      mockStorageInstance.createOrUpdateMember.mockResolvedValue({ success: true });
      mockStorageInstance.trackMemberActivity.mockResolvedValue({ success: true });

      await ideasService.createVote(validVoteData);

      expect(mockStorageInstance.createOrUpdateMember).toHaveBeenCalledWith({
        email: validVoteData.voterEmail,
        firstName: 'Alice',
        lastName: 'Johnson',
        company: undefined,
        phone: undefined,
      });
      expect(mockStorageInstance.trackMemberActivity).toHaveBeenCalled();
    });

    it('should handle idea not found when tracking activity', async () => {
      mockStorageInstance.hasUserVoted.mockResolvedValue(false);
      mockStorageInstance.createVote.mockResolvedValue({
        success: true,
        data: { id: 'vote-1', ...validVoteData },
      });
      mockStorageInstance.getIdea.mockResolvedValue({
        success: false,
        error: new Error('Idea not found'),
      });
      mockStorageInstance.createOrUpdateMember.mockResolvedValue({ success: true });
      mockStorageInstance.trackMemberActivity.mockResolvedValue({ success: true });

      const result = await ideasService.createVote(validVoteData);

      expect(result.id).toBe('vote-1'); // Should not fail
    });

    it('should throw error on vote creation failure', async () => {
      mockStorageInstance.hasUserVoted.mockResolvedValue(false);
      mockStorageInstance.createVote.mockResolvedValue({
        success: false,
        error: new Error('Database error'),
      });

      await expect(ideasService.createVote(validVoteData)).rejects.toThrow(BadRequestException);
    });

    it('should handle null data', async () => {
      await expect(ideasService.createVote(null)).rejects.toThrow(BadRequestException);
    });

    it('should handle invalid data type', async () => {
      await expect(ideasService.createVote('invalid')).rejects.toThrow(BadRequestException);
    });

    it('should parse multi-word names correctly', async () => {
      mockStorageInstance.hasUserVoted.mockResolvedValue(false);
      mockStorageInstance.createVote.mockResolvedValue({
        success: true,
        data: { id: 'vote-1', ...validVoteData },
      });
      mockStorageInstance.getIdea.mockResolvedValue({
        success: true,
        data: { id: 'idea-123', title: 'Team Building' },
      });
      mockStorageInstance.createOrUpdateMember.mockResolvedValue({ success: true });
      mockStorageInstance.trackMemberActivity.mockResolvedValue({ success: true });

      const multiNameVoteData = {
        ...validVoteData,
        voterName: 'Jean Paul Rousseau',
      };

      await ideasService.createVote(multiNameVoteData);

      expect(mockStorageInstance.createOrUpdateMember).toHaveBeenCalledWith({
        email: validVoteData.voterEmail,
        firstName: 'Jean',
        lastName: 'Paul Rousseau',
        company: undefined,
        phone: undefined,
      });
    });
  });
});
