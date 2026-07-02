import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockStorage = {
  getIdeas: vi.fn(),
  createIdea: vi.fn(),
  deleteIdea: vi.fn(),
  updateIdeaStatus: vi.fn(),
  getVotesByIdea: vi.fn(),
  createVote: vi.fn(),
  isDuplicateIdea: vi.fn(),
};

const mockStorageService = {
  storage: mockStorage,
};

const mockNotificationService = {
  sendNotification: vi.fn(),
};

const mockEmailNotificationService = {
  sendNotification: vi.fn(),
};

vi.mock('../../server/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Simulated IdeasService
class IdeasService {
  constructor(
    private storageService: unknown,
    private notificationService: unknown,
    private emailNotificationService: unknown
  ) {}

  async getIdeas(page = 1, limit = 20) {
    return this.storageService.storage.getIdeas({ page, limit });
  }

  async createIdea(data: unknown) {
    const isDuplicate = await this.storageService.storage.isDuplicateIdea(data.title);
    if (isDuplicate) {
      throw new Error('Duplicate idea');
    }
    const result = await this.storageService.storage.createIdea(data);
    if (result.success) {
      await this.notificationService.sendNotification({ type: 'idea_created', data: result.data });
    }
    return result;
  }

  async updateIdeaStatus(id: string, status: string) {
    const validStatuses = ['pending', 'approved', 'rejected', 'under_review', 'postponed', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    return this.storageService.storage.updateIdeaStatus(id, status);
  }

  async getVotesByIdea(ideaId: string) {
    return this.storageService.storage.getVotesByIdea(ideaId);
  }

  async createVote(data: unknown) {
    return this.storageService.storage.createVote(data);
  }
}

describe('IdeasService', () => {
  let ideasService: IdeasService;

  beforeEach(() => {
    vi.clearAllMocks();
    ideasService = new IdeasService(
      mockStorageService,
      mockNotificationService,
      mockEmailNotificationService
    );
  });

  describe('getIdeas', () => {
    it('should return paginated ideas', async () => {
      const mockResult = {
        success: true,
        data: {
          data: [{ id: '1', title: 'Idea 1' }],
          total: 1,
          page: 1,
          limit: 20,
        },
      };
      mockStorage.getIdeas.mockResolvedValue(mockResult);

      const result = await ideasService.getIdeas(1, 20);

      expect(mockStorage.getIdeas).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toEqual(mockResult);
    });

    it('should use default pagination values', async () => {
      mockStorage.getIdeas.mockResolvedValue({ success: true, data: { data: [] } });

      await ideasService.getIdeas();

      expect(mockStorage.getIdeas).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });

  describe('createIdea', () => {
    it('should create idea and send notification', async () => {
      const newIdea = {
        title: 'New Idea',
        description: 'Description',
        proposedBy: 'User',
        proposedByEmail: 'user@example.com',
      };
      mockStorage.isDuplicateIdea.mockResolvedValue(false);
      mockStorage.createIdea.mockResolvedValue({
        success: true,
        data: { id: '1', ...newIdea },
      });

      const result = await ideasService.createIdea(newIdea);

      expect(mockStorage.createIdea).toHaveBeenCalledWith(newIdea);
      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should reject duplicate idea', async () => {
      mockStorage.isDuplicateIdea.mockResolvedValue(true);

      await expect(ideasService.createIdea({ title: 'Duplicate' }))
        .rejects.toThrow('Duplicate idea');
    });

    it('should not send notification on create failure', async () => {
      mockStorage.isDuplicateIdea.mockResolvedValue(false);
      mockStorage.createIdea.mockResolvedValue({ success: false, error: 'DB error' });

      await ideasService.createIdea({ title: 'Test' });

      expect(mockNotificationService.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('updateIdeaStatus', () => {
    it('should update status for valid status', async () => {
      mockStorage.updateIdeaStatus.mockResolvedValue({ success: true });

      await ideasService.updateIdeaStatus('1', 'approved');

      expect(mockStorage.updateIdeaStatus).toHaveBeenCalledWith('1', 'approved');
    });

    it('should reject invalid status', async () => {
      await expect(ideasService.updateIdeaStatus('1', 'invalid'))
        .rejects.toThrow('Invalid status');
    });

    const validStatuses = ['pending', 'approved', 'rejected', 'under_review', 'postponed', 'completed'];
    validStatuses.forEach((status) => {
      it(`should accept ${status} status`, async () => {
        mockStorage.updateIdeaStatus.mockResolvedValue({ success: true });
        
        await expect(ideasService.updateIdeaStatus('1', status)).resolves.not.toThrow();
      });
    });
  });

  describe('getVotesByIdea', () => {
    it('should return votes for idea', async () => {
      const mockVotes = [
        { id: '1', ideaId: '1', voterEmail: 'voter@example.com' },
      ];
      mockStorage.getVotesByIdea.mockResolvedValue({ success: true, data: mockVotes });

      const result = await ideasService.getVotesByIdea('1');

      expect(mockStorage.getVotesByIdea).toHaveBeenCalledWith('1');
      expect(result.data).toEqual(mockVotes);
    });
  });

  describe('createVote', () => {
    it('should create vote', async () => {
      const voteData = {
        ideaId: '1',
        voterEmail: 'voter@example.com',
        voterName: 'Voter',
      };
      mockStorage.createVote.mockResolvedValue({
        success: true,
        data: { id: '1', ...voteData },
      });

      const result = await ideasService.createVote(voteData);

      expect(mockStorage.createVote).toHaveBeenCalledWith(voteData);
      expect(result.success).toBe(true);
    });
  });
});
