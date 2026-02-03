import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockStorage = {
  getAllIdeas: vi.fn(),
  updateIdeaStatus: vi.fn(),
  toggleIdeaFeatured: vi.fn(),
  transformIdeaToEvent: vi.fn(),
  updateIdea: vi.fn(),
  getAllEvents: vi.fn(),
  updateEvent: vi.fn(),
  updateEventStatus: vi.fn(),
  getEventInscriptions: vi.fn(),
  createInscription: vi.fn(),
  deleteInscription: vi.fn(),
  getAllAdmins: vi.fn(),
  getPendingAdmins: vi.fn(),
  createUser: vi.fn(),
  approveAdmin: vi.fn(),
  updateAdminRole: vi.fn(),
  updateAdminStatus: vi.fn(),
  updateAdminInfo: vi.fn(),
  deleteAdmin: vi.fn(),
  getVotesByIdea: vi.fn(),
  createVote: vi.fn(),
  deleteVote: vi.fn(),
};

const mockStorageService = {
  storage: mockStorage,
};

vi.mock('../../server/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Simulated AdminService
class AdminService {
  constructor(private storageService: any) {}

  async getAllIdeas(page = 1, limit = 20) {
    return this.storageService.storage.getAllIdeas({ page, limit });
  }

  async updateIdeaStatus(id: string, status: string) {
    return this.storageService.storage.updateIdeaStatus(id, status);
  }

  async getAllAdministrators() {
    return this.storageService.storage.getAllAdmins();
  }

  async createAdministrator(data: any, addedBy: string) {
    return this.storageService.storage.createUser({
      ...data,
      addedBy,
      status: 'pending',
      isActive: false,
    });
  }

  async updateAdministratorRole(email: string, role: string, currentUserEmail: string) {
    if (email === currentUserEmail) {
      throw new Error('Cannot modify your own role');
    }
    return this.storageService.storage.updateAdminRole(email, role);
  }

  async updateAdministratorStatus(email: string, isActive: boolean, currentUserEmail: string) {
    if (email === currentUserEmail) {
      throw new Error('Cannot modify your own status');
    }
    return this.storageService.storage.updateAdminStatus(email, isActive);
  }

  async deleteAdministrator(email: string, currentUserEmail: string) {
    if (email === currentUserEmail) {
      throw new Error('Cannot delete yourself');
    }
    return this.storageService.storage.deleteAdmin(email);
  }

  async approveAdministrator(email: string, role: string) {
    const validRoles = ['super_admin', 'ideas_reader', 'ideas_manager', 'events_reader', 'events_manager'];
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role');
    }
    return this.storageService.storage.approveAdmin(email, role);
  }

  async bulkCreateInscriptions(eventId: string, inscriptions: any[]) {
    const results = { success: 0, errors: 0, data: [] as any[] };
    for (const inscription of inscriptions) {
      try {
        const result = await this.storageService.storage.createInscription({
          ...inscription,
          eventId,
        });
        if (result.success) {
          results.success++;
          results.data.push(result.data);
        } else {
          results.errors++;
        }
      } catch {
        results.errors++;
      }
    }
    return results;
  }
}

describe('AdminService', () => {
  let adminService: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    adminService = new AdminService(mockStorageService);
  });

  describe('getAllIdeas', () => {
    it('should return all ideas for admin', async () => {
      const mockResult = {
        success: true,
        data: {
          data: [{ id: '1', title: 'Idea 1', status: 'pending' }],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      };
      mockStorage.getAllIdeas.mockResolvedValue(mockResult);

      const result = await adminService.getAllIdeas(1, 20);

      expect(mockStorage.getAllIdeas).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getAllAdministrators', () => {
    it('should return all administrators', async () => {
      const mockAdmins = [
        { email: 'admin1@example.com', role: 'super_admin' },
        { email: 'admin2@example.com', role: 'ideas_manager' },
      ];
      mockStorage.getAllAdmins.mockResolvedValue({ success: true, data: mockAdmins });

      const result = await adminService.getAllAdministrators();

      expect(result.data).toHaveLength(2);
    });
  });

  describe('createAdministrator', () => {
    it('should create administrator with pending status', async () => {
      const newAdmin = {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'Admin',
        role: 'ideas_reader',
      };
      mockStorage.createUser.mockResolvedValue({
        success: true,
        data: { ...newAdmin, status: 'pending', isActive: false },
      });

      const result = await adminService.createAdministrator(newAdmin, 'creator@example.com');

      expect(mockStorage.createUser).toHaveBeenCalledWith({
        ...newAdmin,
        addedBy: 'creator@example.com',
        status: 'pending',
        isActive: false,
      });
    });
  });

  describe('updateAdministratorRole', () => {
    it('should update role for other admin', async () => {
      mockStorage.updateAdminRole.mockResolvedValue({
        success: true,
        data: { email: 'other@example.com', role: 'super_admin' },
      });

      await adminService.updateAdministratorRole('other@example.com', 'super_admin', 'current@example.com');

      expect(mockStorage.updateAdminRole).toHaveBeenCalledWith('other@example.com', 'super_admin');
    });

    it('should prevent self role modification', async () => {
      await expect(
        adminService.updateAdministratorRole('current@example.com', 'ideas_reader', 'current@example.com')
      ).rejects.toThrow('Cannot modify your own role');
    });
  });

  describe('updateAdministratorStatus', () => {
    it('should update status for other admin', async () => {
      mockStorage.updateAdminStatus.mockResolvedValue({
        success: true,
        data: { email: 'other@example.com', isActive: false },
      });

      await adminService.updateAdministratorStatus('other@example.com', false, 'current@example.com');

      expect(mockStorage.updateAdminStatus).toHaveBeenCalledWith('other@example.com', false);
    });

    it('should prevent self status modification', async () => {
      await expect(
        adminService.updateAdministratorStatus('current@example.com', false, 'current@example.com')
      ).rejects.toThrow('Cannot modify your own status');
    });
  });

  describe('deleteAdministrator', () => {
    it('should delete other admin', async () => {
      mockStorage.deleteAdmin.mockResolvedValue({ success: true });

      await adminService.deleteAdministrator('other@example.com', 'current@example.com');

      expect(mockStorage.deleteAdmin).toHaveBeenCalledWith('other@example.com');
    });

    it('should prevent self deletion', async () => {
      await expect(
        adminService.deleteAdministrator('current@example.com', 'current@example.com')
      ).rejects.toThrow('Cannot delete yourself');
    });
  });

  describe('approveAdministrator', () => {
    it('should approve pending admin with valid role', async () => {
      mockStorage.approveAdmin.mockResolvedValue({
        success: true,
        data: { email: 'pending@example.com', status: 'active', role: 'ideas_manager' },
      });

      await adminService.approveAdministrator('pending@example.com', 'ideas_manager');

      expect(mockStorage.approveAdmin).toHaveBeenCalledWith('pending@example.com', 'ideas_manager');
    });

    it('should reject invalid role', async () => {
      await expect(
        adminService.approveAdministrator('pending@example.com', 'invalid_role')
      ).rejects.toThrow('Invalid role');
    });

    const validRoles = ['super_admin', 'ideas_reader', 'ideas_manager', 'events_reader', 'events_manager'];
    validRoles.forEach((role) => {
      it(`should accept ${role} role`, async () => {
        mockStorage.approveAdmin.mockResolvedValue({ success: true });
        
        await expect(adminService.approveAdministrator('test@example.com', role)).resolves.not.toThrow();
      });
    });
  });

  describe('bulkCreateInscriptions', () => {
    it('should create multiple inscriptions', async () => {
      const inscriptions = [
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
      ];
      mockStorage.createInscription.mockResolvedValue({
        success: true,
        data: { id: '1', eventId: '1' },
      });

      const result = await adminService.bulkCreateInscriptions('1', inscriptions);

      expect(mockStorage.createInscription).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(2);
      expect(result.errors).toBe(0);
    });

    it('should handle partial failures', async () => {
      const inscriptions = [
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
      ];
      mockStorage.createInscription
        .mockResolvedValueOnce({ success: true, data: { id: '1' } })
        .mockRejectedValueOnce(new Error('Duplicate'));

      const result = await adminService.bulkCreateInscriptions('1', inscriptions);

      expect(result.success).toBe(1);
      expect(result.errors).toBe(1);
    });
  });
});
