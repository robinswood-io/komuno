import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage = {
  getMembers: vi.fn(),
  getMemberById: vi.fn(),
  createMember: vi.fn(),
  updateMember: vi.fn(),
  deleteMember: vi.fn(),
  createMemberSubscription: vi.fn(),
  getMemberSubscriptions: vi.fn(),
  createMemberTag: vi.fn(),
  getMemberTags: vi.fn(),
  assignMemberTag: vi.fn(),
  removeMemberTag: vi.fn(),
  createMemberTask: vi.fn(),
  getMemberTasks: vi.fn(),
  createMemberRelation: vi.fn(),
  getMemberRelations: vi.fn(),
  createTrackingMetric: vi.fn(),
};

const mockStorageService = { storage: mockStorage };

vi.mock('../../server/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

class MembersService {
  constructor(private storageService: unknown) {}

  async proposeMember(data: unknown) {
    if (!data.firstName || !data.lastName || !data.email) {
      throw new Error('First name, last name, and email are required');
    }
    const result = await this.storageService.storage.createMember(data);
    if (result.success) {
      await this.storageService.storage.createTrackingMetric({
        entityType: 'member',
        entityId: result.data.id,
        metricType: 'proposal',
        value: 1,
      });
    }
    return result;
  }

  async getMembers(page = 1, limit = 20, status?: string, search?: string) {
    return this.storageService.storage.getMembers({ page, limit, status, search });
  }

  async createMemberSubscription(data: unknown) {
    if (!data.memberId || !data.startDate) {
      throw new Error('Member ID and start date are required');
    }
    return this.storageService.storage.createMemberSubscription(data);
  }

  async createMemberTag(data: unknown) {
    if (!data.name) {
      throw new Error('Tag name is required');
    }
    return this.storageService.storage.createMemberTag(data);
  }

  async assignMemberTag(memberId: string, tagId: string) {
    return this.storageService.storage.assignMemberTag({ memberId, tagId });
  }

  async createMemberTask(data: unknown) {
    if (!data.memberId || !data.title) {
      throw new Error('Member ID and title are required');
    }
    return this.storageService.storage.createMemberTask(data);
  }

  async createMemberRelation(data: unknown) {
    if (!data.memberId || !data.relatedMemberId || !data.relationType) {
      throw new Error('Member IDs and relation type are required');
    }
    if (data.memberId === data.relatedMemberId) {
      throw new Error('Cannot create relation with self');
    }
    return this.storageService.storage.createMemberRelation(data);
  }
}

describe('MembersService', () => {
  let membersService: MembersService;

  beforeEach(() => {
    vi.clearAllMocks();
    membersService = new MembersService(mockStorageService);
  });

  describe('proposeMember', () => {
    it('should create member and track metric', async () => {
      const memberData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        company: 'Acme Inc',
      };
      mockStorage.createMember.mockResolvedValue({ success: true, data: { id: '1', ...memberData } });
      mockStorage.createTrackingMetric.mockResolvedValue({ success: true });

      const result = await membersService.proposeMember(memberData);

      expect(mockStorage.createMember).toHaveBeenCalledWith(memberData);
      expect(mockStorage.createTrackingMetric).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should reject member without required fields', async () => {
      await expect(membersService.proposeMember({ firstName: 'John' }))
        .rejects.toThrow('First name, last name, and email are required');
    });
  });

  describe('getMembers', () => {
    it('should return paginated members', async () => {
      const mockMembers = [
        { id: '1', firstName: 'John', lastName: 'Doe', status: 'active' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', status: 'pending' },
      ];
      mockStorage.getMembers.mockResolvedValue({ success: true, data: { data: mockMembers, total: 2 } });

      const result = await membersService.getMembers(1, 20);

      expect(mockStorage.getMembers).toHaveBeenCalledWith({ page: 1, limit: 20, status: undefined, search: undefined });
      expect(result.data.data).toHaveLength(2);
    });

    it('should filter by status and search', async () => {
      mockStorage.getMembers.mockResolvedValue({ success: true, data: { data: [], total: 0 } });

      await membersService.getMembers(1, 20, 'active', 'john');

      expect(mockStorage.getMembers).toHaveBeenCalledWith({ page: 1, limit: 20, status: 'active', search: 'john' });
    });
  });

  describe('createMemberSubscription', () => {
    it('should create subscription with valid data', async () => {
      const subscription = { memberId: '1', startDate: new Date(), endDate: new Date(), type: 'annual' };
      mockStorage.createMemberSubscription.mockResolvedValue({ success: true, data: { id: '1', ...subscription } });

      const result = await membersService.createMemberSubscription(subscription);

      expect(result.success).toBe(true);
    });

    it('should reject subscription without member ID', async () => {
      await expect(membersService.createMemberSubscription({ startDate: new Date() }))
        .rejects.toThrow('Member ID and start date are required');
    });
  });

  describe('createMemberTag', () => {
    it('should create tag with valid name', async () => {
      const tag = { name: 'VIP', color: '#FFD700' };
      mockStorage.createMemberTag.mockResolvedValue({ success: true, data: { id: '1', ...tag } });

      const result = await membersService.createMemberTag(tag);

      expect(result.success).toBe(true);
    });

    it('should reject tag without name', async () => {
      await expect(membersService.createMemberTag({ color: '#FFD700' }))
        .rejects.toThrow('Tag name is required');
    });
  });

  describe('assignMemberTag', () => {
    it('should assign tag to member', async () => {
      mockStorage.assignMemberTag.mockResolvedValue({ success: true });

      await membersService.assignMemberTag('member-1', 'tag-1');

      expect(mockStorage.assignMemberTag).toHaveBeenCalledWith({ memberId: 'member-1', tagId: 'tag-1' });
    });
  });

  describe('createMemberTask', () => {
    it('should create task with valid data', async () => {
      const task = { memberId: '1', title: 'Follow up call', dueDate: new Date() };
      mockStorage.createMemberTask.mockResolvedValue({ success: true, data: { id: '1', ...task } });

      const result = await membersService.createMemberTask(task);

      expect(result.success).toBe(true);
    });

    it('should reject task without member ID', async () => {
      await expect(membersService.createMemberTask({ title: 'Task' }))
        .rejects.toThrow('Member ID and title are required');
    });
  });

  describe('createMemberRelation', () => {
    it('should create relation between members', async () => {
      const relation = { memberId: '1', relatedMemberId: '2', relationType: 'mentor' };
      mockStorage.createMemberRelation.mockResolvedValue({ success: true, data: { id: '1', ...relation } });

      const result = await membersService.createMemberRelation(relation);

      expect(result.success).toBe(true);
    });

    it('should reject self-relation', async () => {
      await expect(membersService.createMemberRelation({ memberId: '1', relatedMemberId: '1', relationType: 'mentor' }))
        .rejects.toThrow('Cannot create relation with self');
    });

    it('should reject relation without required fields', async () => {
      await expect(membersService.createMemberRelation({ memberId: '1' }))
        .rejects.toThrow('Member IDs and relation type are required');
    });
  });
});
