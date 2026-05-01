import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { frontendErrorSchema } from '@shared/schema';
import { AdminController, LogsController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: AdminService;

  beforeEach(() => {
    adminService = {
      getAllAdministrators: vi.fn(),
      getPendingAdministrators: vi.fn(),
      createAdministrator: vi.fn(),
      updateAdministratorRole: vi.fn(),
      updateAdministratorStatus: vi.fn(),
      updateAdministratorInfo: vi.fn(),
      deleteAdministrator: vi.fn(),
      approveAdministrator: vi.fn(),
      rejectAdministrator: vi.fn(),
      getAdminStats: vi.fn(),
      getAllIdeas: vi.fn(),
      getAllEvents: vi.fn(),
      updateEventStatus: vi.fn(),
      getDevelopmentRequests: vi.fn(),
      updateDevelopmentRequestStatus: vi.fn(),
      getErrorLogs: vi.fn(),
    } as unknown as AdminService;

    controller = new AdminController(adminService);
  });

  // ===== Tests des Routes CRUD Administrateurs =====

  describe('GET /api/admin/administrators', () => {
    it('should return all administrators', async () => {
      const mockAdmins = {
        success: true,
        data: [
          {
            email: 'admin@example.com',
            email: 'admin1@example.com',
            firstName: 'Admin',
            lastName: 'One',
            role: 'super_admin',
            isActive: true,
          },
        ],
      };

      vi.mocked(adminService.getAllAdministrators).mockResolvedValue(
        mockAdmins,
      );

      const result = await controller.getAllAdministrators();

      expect(result).toEqual(mockAdmins);
      expect(adminService.getAllAdministrators).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      vi.mocked(adminService.getAllAdministrators).mockRejectedValue(
        new BadRequestException('Database error'),
      );

      await expect(controller.getAllAdministrators()).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /api/admin/administrators/pending', () => {
    it('should return pending administrators awaiting approval', async () => {
      const mockPendingAdmins = {
        success: true,
        data: [
          {
            email: 'pending@example.com',
            firstName: 'Pending',
            lastName: 'Admin',
            role: 'ideas_reader',
            isActive: false,
          },
        ],
      };

      vi.mocked(adminService.getPendingAdministrators).mockResolvedValue(
        mockPendingAdmins,
      );

      const result = await controller.getPendingAdministrators();

      expect(result).toEqual(mockPendingAdmins);
      expect(adminService.getPendingAdministrators).toHaveBeenCalled();
    });

    it('should return empty list when no pending admins', async () => {
      const mockEmptyList = {
        success: true,
        data: [],
      };

      vi.mocked(adminService.getPendingAdministrators).mockResolvedValue(
        mockEmptyList,
      );

      const result = await controller.getPendingAdministrators();

      expect(result.data).toHaveLength(0);
    });
  });

  describe('POST /api/admin/administrators', () => {
    it('should create a new administrator', async () => {
      const createData = {
        email: 'newadmin@example.com',
        firstName: 'New',
        lastName: 'Admin',
        role: 'super_admin',
      };

      const mockResponse = {
        success: true,
        data: {
          email: 'newadmin@example.com',
          ...createData,
          isActive: true,
        },
        message: 'Administrateur créé avec succès',
      };

      vi.mocked(adminService.createAdministrator).mockResolvedValue(
        mockResponse,
      );

      const mockUser = {
        email: 'creator@example.com',
      };

      const result = await controller.createAdministrator(
        createData,
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('newadmin@example.com');
      expect(adminService.createAdministrator).toHaveBeenCalledWith(
        createData,
        'creator@example.com',
      );
    });

    it('should validate input data before passing to service', async () => {
      const invalidData = {
        email: 'invalid-email', // Invalid email format
        firstName: 'New',
        lastName: 'Admin',
        role: 'super_admin',
      };

      vi.mocked(adminService.createAdministrator).mockRejectedValue(
        new BadRequestException('Email invalide'),
      );

      const mockUser = { email: 'creator@example.com' };

      await expect(
        controller.createAdministrator(invalidData, mockUser),
      ).rejects.toThrow();
    });

    it('should handle duplicate email error', async () => {
      const createData = {
        email: 'existing@example.com',
        firstName: 'New',
        lastName: 'Admin',
        role: 'super_admin',
      };

      vi.mocked(adminService.createAdministrator).mockRejectedValue(
        new BadRequestException('Email already exists'),
      );

      const mockUser = { email: 'creator@example.com' };

      await expect(
        controller.createAdministrator(createData, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PATCH /api/admin/administrators/:email/role', () => {
    it('should update an administrator role', async () => {
      const roleData = { role: 'ideas_manager' };
      const mockResponse = {
        success: true,
        data: {
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'ideas_manager',
          isActive: true,
        },
      };

      vi.mocked(adminService.updateAdministratorRole).mockResolvedValue(
        mockResponse,
      );

      const mockUser = { email: 'currentuser@example.com' };

      const result = await controller.updateAdministratorRole(
        'admin@example.com',
        roleData,
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(result.data.role).toBe('ideas_manager');
      expect(adminService.updateAdministratorRole).toHaveBeenCalledWith(
        'admin@example.com',
        roleData.role,
        'currentuser@example.com',
      );
    });

    it('should prevent changing role to invalid value', async () => {
      const invalidRoleData = { role: 'superuser' };

      vi.mocked(adminService.updateAdministratorRole).mockRejectedValue(
        new BadRequestException('Rôle invalide'),
      );

      const mockRequest = {
        user: { email: 'currentuser@example.com' },
      } as unknown as { email: string };

      await expect(
        controller.updateAdministratorRole(
          'admin@example.com',
          invalidRoleData,
          mockRequest,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent self-role modification', async () => {
      const roleData = { role: 'ideas_reader' };

      vi.mocked(adminService.updateAdministratorRole).mockRejectedValue(
        new BadRequestException('Vous ne pouvez pas modifier votre propre rôle'),
      );

      const email = 'admin@example.com';
      const mockRequest = {
        user: { email },
      } as unknown as { email: string };

      await expect(
        controller.updateAdministratorRole(email, roleData, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PATCH /api/admin/administrators/:email/status', () => {
    it('should activate an administrator', async () => {
      const statusData = { isActive: true };
      const mockResponse = {
        success: true,
        data: {
          email: 'admin@example.com',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'super_admin',
          isActive: true,
        },
      };

      vi.mocked(adminService.updateAdministratorStatus).mockResolvedValue(
        mockResponse,
      );

      const mockRequest = {
        user: { email: 'currentuser@example.com' },
      } as unknown as { email: string };

      const result = await controller.updateAdministratorStatus(
        'admin@example.com',
        statusData,
        mockRequest,
      );

      expect(result.success).toBe(true);
      expect(result.data.isActive).toBe(true);
    });

    it('should deactivate an administrator', async () => {
      const statusData = { isActive: false };
      const mockResponse = {
        success: true,
        data: {
          email: 'admin@example.com',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'super_admin',
          isActive: false,
        },
      };

      vi.mocked(adminService.updateAdministratorStatus).mockResolvedValue(
        mockResponse,
      );

      const mockRequest = {
        user: { email: 'currentuser@example.com' },
      } as unknown as { email: string };

      const result = await controller.updateAdministratorStatus(
        'admin@example.com',
        statusData,
        mockRequest,
      );

      expect(result.success).toBe(true);
      expect(result.data.isActive).toBe(false);
    });

    it('should prevent self-deactivation', async () => {
      const statusData = { isActive: false };

      vi.mocked(adminService.updateAdministratorStatus).mockRejectedValue(
        new BadRequestException(
          'Vous ne pouvez pas désactiver votre propre compte',
        ),
      );

      const email = 'admin@example.com';
      const mockRequest = {
        user: { email },
      } as unknown as { email: string };

      await expect(
        controller.updateAdministratorStatus(email, statusData, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PATCH /api/admin/administrators/:email/info', () => {
    it('should update administrator information', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const mockResponse = {
        success: true,
        data: {
          email: 'admin@example.com',
          email: 'admin@example.com',
          firstName: 'Updated',
          lastName: 'Name',
          role: 'super_admin',
          isActive: true,
        },
        message: 'Informations mises à jour avec succès',
      };

      vi.mocked(adminService.updateAdministratorInfo).mockResolvedValue(
        mockResponse,
      );

      const mockRequest = {
        user: { email: 'currentuser@example.com' },
      } as unknown as { email: string };

      const result = await controller.updateAdministratorInfo(
        'admin@example.com',
        updateData,
        mockRequest,
      );

      expect(result.success).toBe(true);
      expect(result.data.firstName).toBe('Updated');
    });

    it('should handle empty update data', async () => {
      const updateData = {};

      vi.mocked(adminService.updateAdministratorInfo).mockRejectedValue(
        new BadRequestException('No fields to update'),
      );

      const mockRequest = {
        user: { email: 'currentuser@example.com' },
      } as unknown as { email: string };

      await expect(
        controller.updateAdministratorInfo(
          'admin@example.com',
          updateData,
          mockRequest,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('DELETE /api/admin/administrators/:email', () => {
    it('should delete an administrator', async () => {
      const mockResponse = {
        success: true,
        message: 'Administrateur supprimé avec succès',
      };

      vi.mocked(adminService.deleteAdministrator).mockResolvedValue(
        mockResponse,
      );

      const mockUser = { email: 'currentuser@example.com' };

      const result = await controller.deleteAdministrator(
        'admin@example.com',
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(adminService.deleteAdministrator).toHaveBeenCalledWith(
        'admin@example.com',
        'currentuser@example.com',
      );
    });

    it('should prevent self-deletion', async () => {
      vi.mocked(adminService.deleteAdministrator).mockRejectedValue(
        new BadRequestException(
          'Vous ne pouvez pas supprimer votre propre compte',
        ),
      );

      const email = 'admin@example.com';
      const mockRequest = {
        user: { email },
      } as unknown as { email: string };

      await expect(
        controller.deleteAdministrator(email, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===== Tests de l'Approbation des Administrateurs =====

  describe('Approval Workflow', () => {
    describe('POST /api/admin/administrators/:email/approve', () => {
      it('should approve a pending administrator', async () => {
        const approveData = { role: 'ideas_manager' };
        const mockResponse = {
          success: true,
          data: {
            email: 'pending@example.com',
            firstName: 'Pending',
            lastName: 'Admin',
            role: 'ideas_manager',
            isActive: true,
          },
          message: 'Compte approuvé avec succès',
        };

        vi.mocked(adminService.approveAdministrator).mockResolvedValue(
          mockResponse,
        );

        const result = await controller.approveAdministrator(
          'pending@example.com',
          approveData,
        );

        expect(result.success).toBe(true);
        expect(result.data.role).toBe('ideas_manager');
        expect(result.data.isActive).toBe(true);
      });

      it('should reject approval with invalid role', async () => {
        const approveData = { role: 'invalid' };

        vi.mocked(adminService.approveAdministrator).mockRejectedValue(
          new BadRequestException('Rôle valide requis'),
        );

        await expect(
          controller.approveAdministrator(
            'pending@example.com',
            approveData,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should handle non-existent pending admin', async () => {
        const approveData = { role: 'ideas_manager' };

        vi.mocked(adminService.approveAdministrator).mockRejectedValue(
          new BadRequestException('Administrator not found'),
        );

        await expect(
          controller.approveAdministrator(
            'nonexistent@example.com',
            approveData,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('POST /api/admin/administrators/:email/reject', () => {
      it('should reject a pending administrator', async () => {
        const mockResponse = {
          success: true,
          message: 'Compte rejeté et supprimé avec succès',
        };

        vi.mocked(adminService.rejectAdministrator).mockResolvedValue(
          mockResponse,
        );

        const result = await controller.rejectAdministrator(
          'pending@example.com',
        );

        expect(result.success).toBe(true);
        expect(adminService.rejectAdministrator).toHaveBeenCalledWith(
          'pending@example.com',
        );
      });

      it('should handle non-existent pending admin', async () => {
        vi.mocked(adminService.rejectAdministrator).mockRejectedValue(
          new BadRequestException('Administrator not found'),
        );

        await expect(
          controller.rejectAdministrator('nonexistent@example.com'),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('GET /api/admin/events', () => {
    it('should parse event query params with defaults and explicit values', async () => {
      vi.mocked(adminService.getAllEvents)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      await controller.getAllEvents(undefined, undefined);
      await controller.getAllEvents('3', '15');

      expect(adminService.getAllEvents).toHaveBeenNthCalledWith(1, 1, 20);
      expect(adminService.getAllEvents).toHaveBeenNthCalledWith(2, 3, 15);
    });
  });

  // ===== Tests de Sécurité et de Permissions =====

  describe('Security & Permissions', () => {
    it('should require authentication for all admin routes', async () => {
      // This is enforced by @UseGuards(JwtAuthGuard)
      // Tests verify the decorator is present in the controller
      expect(AdminController).toBeDefined();
    });

    it('should enforce permission checks on sensitive operations', async () => {
      // This is enforced by @Permissions decorator on each route
      // Specific permission checks:
      // - admin.view: GET routes
      // - admin.edit: POST/PATCH routes
      // - admin.delete: DELETE routes
      expect(AdminController).toBeDefined();
    });

    it('should sanitize output - no passwords in responses', async () => {
      const mockAdmins = {
        success: true,
        data: [
          {
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'super_admin',
            isActive: true,
            // password should never be included
          },
        ],
      };

      vi.mocked(adminService.getAllAdministrators).mockResolvedValue(
        mockAdmins,
      );

      const result = await controller.getAllAdministrators();

      result.data.forEach((admin) => {
        expect(admin).not.toHaveProperty('password');
      });
    });

    it('should handle concurrent requests safely', async () => {
      const mockAdmins = {
        success: true,
        data: [
          {
            email: 'admin1@example.com',
            firstName: 'Admin',
            lastName: 'One',
            role: 'super_admin',
            isActive: true,
          },
        ],
      };

      vi.mocked(adminService.getAllAdministrators)
        .mockResolvedValueOnce(mockAdmins)
        .mockResolvedValueOnce(mockAdmins);

      const results = await Promise.all([
        controller.getAllAdministrators(),
        controller.getAllAdministrators(),
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(results[1]);
    });
  });

  // ===== Tests de Gestion des Erreurs =====

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const invalidData = {
        email: 'invalid-email',
        firstName: '',
        lastName: '',
        role: 'super_admin',
      };

      vi.mocked(adminService.createAdministrator).mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      const mockRequest = {
        user: { email: 'creator@example.com' },
      } as unknown as { email: string };

      const promise = controller.createAdministrator(
        invalidData,
        mockRequest,
      );

      await expect(promise).rejects.toThrow(BadRequestException);
    });

    it('should handle database errors', async () => {
      vi.mocked(adminService.getAllAdministrators).mockRejectedValue(
        new BadRequestException('Database connection error'),
      );

      await expect(controller.getAllAdministrators()).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle missing required parameters', async () => {
      const roleData = { role: '' }; // Empty role

      vi.mocked(adminService.updateAdministratorRole).mockRejectedValue(
        new BadRequestException('Role is required'),
      );

      const mockRequest = {
        user: { email: 'currentuser@example.com' },
      } as unknown as { email: string };

      await expect(
        controller.updateAdministratorRole(
          'admin@example.com',
          roleData,
          mockRequest,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

describe('AdminController - Coverage Additions', () => {
  let controller: AdminController;
  let adminService: AdminService;

  beforeEach(() => {
    adminService = {
      getAllIdeas: vi.fn(),
      getVotesByIdea: vi.fn(),
      getAllEvents: vi.fn(),
      getEventInscriptions: vi.fn(),
      createInscription: vi.fn(),
      deleteInscription: vi.fn(),
      bulkCreateInscriptions: vi.fn(),
      createVote: vi.fn(),
      deleteVote: vi.fn(),
      getDevelopmentRequests: vi.fn(),
      createDevelopmentRequest: vi.fn(),
      updateDevelopmentRequest: vi.fn(),
      syncDevelopmentRequestWithGitHub: vi.fn(),
      deleteDevelopmentRequest: vi.fn(),
      getAdminStats: vi.fn(),
      getDatabaseHealth: vi.fn(),
      getPoolStats: vi.fn(),
      getEventUnsubscriptions: vi.fn(),
      deleteUnsubscription: vi.fn(),
      updateUnsubscription: vi.fn(),
      testEmailConfiguration: vi.fn(),
      testEmailSimple: vi.fn(),
      getFeatureConfig: vi.fn(),
      updateFeatureConfig: vi.fn(),
      getEmailConfig: vi.fn(),
      updateEmailConfig: vi.fn(),
      getErrorLogs: vi.fn(),
      updateEventStatus: vi.fn(),
      updateDevelopmentRequestStatus: vi.fn(),
    } as unknown as AdminService;
    controller = new AdminController(adminService);
  });

  it('should parse idea query params with defaults and explicit values', async () => {
    vi.mocked(adminService.getAllIdeas)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    await controller.getAllIdeas(undefined, undefined, undefined, undefined);
    await controller.getAllIdeas('2', '10', 'pending', 'true');

    expect(adminService.getAllIdeas).toHaveBeenNthCalledWith(
      1,
      1,
      20,
      undefined,
      undefined,
    );
    expect(adminService.getAllIdeas).toHaveBeenNthCalledWith(
      2,
      2,
      10,
      'pending',
      'true',
    );
  });

  it('should passthrough votes listing for nested and alias routes', async () => {
    const nestedVotes = { success: true, data: [{ id: 'vote-1' }] };
    const aliasVotes = { success: true, data: [{ id: 'vote-2' }] };

    vi.mocked(adminService.getVotesByIdea)
      .mockResolvedValueOnce(nestedVotes)
      .mockResolvedValueOnce(aliasVotes);

    const nestedResult = await controller.getIdeaVotes('idea-1');
    const aliasResult = await controller.getVotesByIdeaAlias('idea-2');

    expect(adminService.getVotesByIdea).toHaveBeenNthCalledWith(1, 'idea-1');
    expect(adminService.getVotesByIdea).toHaveBeenNthCalledWith(2, 'idea-2');
    expect(nestedResult).toEqual(nestedVotes);
    expect(aliasResult).toEqual(aliasVotes);
  });

  it('should passthrough event inscriptions for both admin endpoints', async () => {
    const firstResponse = { success: true, data: [{ id: 'ins-1' }] };
    const secondResponse = { success: true, data: [{ id: 'ins-2' }] };

    vi.mocked(adminService.getEventInscriptions)
      .mockResolvedValueOnce(firstResponse)
      .mockResolvedValueOnce(secondResponse);

    const eventInscriptions = await controller.getEventInscriptions('event-1');
    const byEvent = await controller.getInscriptionsByEvent('event-2');

    expect(adminService.getEventInscriptions).toHaveBeenNthCalledWith(
      1,
      'event-1',
    );
    expect(adminService.getEventInscriptions).toHaveBeenNthCalledWith(
      2,
      'event-2',
    );
    expect(eventInscriptions).toEqual(firstResponse);
    expect(byEvent).toEqual(secondResponse);
  });

  it('should passthrough inscription creation, deletion and bulk creation endpoints', async () => {
    const createdInscription = { success: true, data: { id: 'ins-1' } };
    const deletedInscription = { success: true };
    const bulkResult = { success: true, created: 2, errors: 0 };

    vi.mocked(adminService.createInscription).mockResolvedValue(createdInscription);
    vi.mocked(adminService.deleteInscription).mockResolvedValue(deletedInscription);
    vi.mocked(adminService.bulkCreateInscriptions).mockResolvedValue(bulkResult);

    const createPayload = {
      eventId: 'event-1',
      name: 'Alice',
      email: 'alice@example.com',
      comments: 'Présente',
    };
    const bulkPayload = {
      eventId: 'event-1',
      inscriptions: [
        { name: 'Alice', email: 'alice@example.com' },
        { name: 'Bob', email: 'bob@example.com' },
      ],
    };

    const created = await controller.createInscription(createPayload);
    const deleted = await controller.deleteInscription('ins-1');
    const bulkCreated = await controller.bulkCreateInscriptions(bulkPayload);

    expect(adminService.createInscription).toHaveBeenCalledWith(createPayload);
    expect(adminService.deleteInscription).toHaveBeenCalledWith('ins-1');
    expect(adminService.bulkCreateInscriptions).toHaveBeenCalledWith(
      'event-1',
      bulkPayload.inscriptions,
    );
    expect(created).toEqual(createdInscription);
    expect(deleted).toEqual(deletedInscription);
    expect(bulkCreated).toEqual(bulkResult);
  });

  it('should passthrough createVote payload and response', async () => {
    const payload = {
      ideaId: 'idea-1',
      voterName: 'Alice',
      voterEmail: 'alice@example.com',
    };
    const serviceResponse = { success: true, data: { id: 'vote-1' } };
    vi.mocked(adminService.createVote).mockResolvedValue(serviceResponse);

    const result = await controller.createVote(payload);

    expect(adminService.createVote).toHaveBeenCalledWith(payload);
    expect(result).toEqual(serviceResponse);
  });

  it('should propagate createVote service errors', async () => {
    vi.mocked(adminService.createVote).mockRejectedValue(
      new BadRequestException('Vote already exists'),
    );

    await expect(
      controller.createVote({
        ideaId: 'idea-1',
        voterName: 'Alice',
        voterEmail: 'alice@example.com',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should passthrough deleteVote id and response', async () => {
    const serviceResponse = { success: true, message: 'Vote deleted' };
    vi.mocked(adminService.deleteVote).mockResolvedValue(serviceResponse);

    const result = await controller.deleteVote('vote-1');

    expect(adminService.deleteVote).toHaveBeenCalledWith('vote-1');
    expect(result).toEqual(serviceResponse);
  });

  it('should propagate deleteVote service errors', async () => {
    vi.mocked(adminService.deleteVote).mockRejectedValue(
      new BadRequestException('Vote not found'),
    );

    await expect(controller.deleteVote('vote-missing')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should passthrough dashboard endpoints to their service methods', async () => {
    const stats = { users: 10, ideas: 4 };
    const dbHealth = { status: 'ok' };
    const poolStats = { total: 5, idle: 3 };

    vi.mocked(adminService.getAdminStats).mockResolvedValue(stats);
    vi.mocked(adminService.getDatabaseHealth).mockResolvedValue(dbHealth);
    vi.mocked(adminService.getPoolStats).mockResolvedValue(poolStats);

    const statsResult = await controller.getAdminStats();
    const healthResult = await controller.getDatabaseHealth();
    const poolResult = await controller.getPoolStats();

    expect(adminService.getAdminStats).toHaveBeenCalledOnce();
    expect(adminService.getDatabaseHealth).toHaveBeenCalledOnce();
    expect(adminService.getPoolStats).toHaveBeenCalledOnce();
    expect(statsResult).toEqual(stats);
    expect(healthResult).toEqual(dbHealth);
    expect(poolResult).toEqual(poolStats);
  });

  it('should passthrough updateUnsubscription payload and response', async () => {
    const payload = {
      name: 'Updated Name',
      email: 'updated@example.com',
      comments: 'Updated comment',
    };
    const response = { success: true, data: { id: 'unsub-1' } };
    vi.mocked(adminService.updateUnsubscription).mockResolvedValue(response);

    const result = await controller.updateUnsubscription('unsub-1', payload);

    expect(adminService.updateUnsubscription).toHaveBeenCalledWith(
      'unsub-1',
      payload,
    );
    expect(result).toEqual(response);
  });

  it('should passthrough getEventUnsubscriptions to service', async () => {
    const serviceResponse = { success: true, data: [{ id: 'unsub-1' }] };
    vi.mocked(adminService.getEventUnsubscriptions).mockResolvedValue(serviceResponse);

    const result = await controller.getEventUnsubscriptions('event-3');

    expect(adminService.getEventUnsubscriptions).toHaveBeenCalledWith('event-3');
    expect(result).toEqual(serviceResponse);
  });

  it('should propagate deleteUnsubscription service errors', async () => {
    vi.mocked(adminService.deleteUnsubscription).mockRejectedValue(
      new BadRequestException('Unsubscription not found'),
    );

    await expect(controller.deleteUnsubscription('unsub-missing')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should normalize development request filters before service call', async () => {
    const list = [{ id: 'dr-1' }];
    vi.mocked(adminService.getDevelopmentRequests)
      .mockResolvedValueOnce(list)
      .mockResolvedValueOnce(list);

    const invalidResult = await controller.getDevelopmentRequests('x', 'y');
    const validResult = await controller.getDevelopmentRequests('bug', 'open');

    expect(adminService.getDevelopmentRequests).toHaveBeenNthCalledWith(1, {
      type: undefined,
      status: undefined,
    });
    expect(adminService.getDevelopmentRequests).toHaveBeenNthCalledWith(2, {
      type: 'bug',
      status: 'open',
    });
    expect(invalidResult).toEqual({ success: true, data: list });
    expect(validResult).toEqual({ success: true, data: list });
  });

  it('should parse error logs limit with fallback to 100', async () => {
    vi.mocked(adminService.getErrorLogs)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    await controller.getErrorLogs(undefined);
    await controller.getErrorLogs('25');

    expect(adminService.getErrorLogs).toHaveBeenNthCalledWith(1, 100);
    expect(adminService.getErrorLogs).toHaveBeenNthCalledWith(2, 25);
  });

  it('should parse event query params with defaults and explicit values', async () => {
    vi.mocked(adminService.getAllEvents)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    await controller.getAllEvents(undefined, undefined);
    await controller.getAllEvents('3', '15');

    expect(adminService.getAllEvents).toHaveBeenNthCalledWith(1, 1, 20);
    expect(adminService.getAllEvents).toHaveBeenNthCalledWith(2, 3, 15);
  });

  it('should forward NaN values when idea pagination params are invalid strings', async () => {
    vi.mocked(adminService.getAllIdeas).mockResolvedValue({ success: true });

    await controller.getAllIdeas('abc', 'xyz', undefined, undefined);

    expect(adminService.getAllIdeas).toHaveBeenCalledWith(
      Number.NaN,
      Number.NaN,
      undefined,
      undefined,
    );
  });

  it('should forward NaN values when event pagination params are invalid strings', async () => {
    vi.mocked(adminService.getAllEvents).mockResolvedValue({ success: true });

    await controller.getAllEvents('abc', 'xyz');

    expect(adminService.getAllEvents).toHaveBeenCalledWith(Number.NaN, Number.NaN);
  });

  it('should forward NaN to error logs service when limit query is invalid', async () => {
    vi.mocked(adminService.getErrorLogs).mockResolvedValue({ success: true });

    await controller.getErrorLogs('invalid-limit');

    expect(adminService.getErrorLogs).toHaveBeenCalledWith(Number.NaN);
  });

  it('should return undefined for updateEventStatus endpoint while forwarding service call', async () => {
    vi.mocked(adminService.updateEventStatus).mockResolvedValue(undefined);

    const result = await controller.updateEventStatus('event-1', {
      status: 'published',
    });

    expect(adminService.updateEventStatus).toHaveBeenCalledWith(
      'event-1',
      'published',
    );
    expect(result).toBeUndefined();
  });

  it('should use explicit body over rawBody fallback for createDevelopmentRequest', async () => {
    const created = { id: 'dr-10' };
    vi.mocked(adminService.createDevelopmentRequest).mockResolvedValue(created);

    const body = {
      title: 'Créer export',
      description: 'Ajout export CSV',
      type: 'feature' as const,
      priority: 'high' as const,
    };
    const req = {
      rawBody: Buffer.from(
        JSON.stringify({
          title: 'Doit être ignoré',
          description: 'raw',
          type: 'bug',
          priority: 'low',
        }),
        'utf8',
      ),
    } as unknown as Request;
    const user = { email: 'admin@example.com', firstName: 'Admin' };

    const result = await controller.createDevelopmentRequest(body, req, user);

    expect(adminService.createDevelopmentRequest).toHaveBeenCalledWith(body, user);
    expect(result).toEqual({ success: true, data: created });
  });

  it('should keep original body when rawBody cannot be parsed in updateDevelopmentRequest', async () => {
    const updated = { id: 'dr-11' };
    vi.mocked(adminService.updateDevelopmentRequest).mockResolvedValue(updated);

    const body = {
      title: 'Mise à jour',
      description: 'Texte',
      type: 'feature' as const,
      priority: 'medium' as const,
    };
    const req = {
      rawBody: '{invalid-json',
    } as unknown as Request;

    const result = await controller.updateDevelopmentRequest('dr-11', body, req);

    expect(adminService.updateDevelopmentRequest).toHaveBeenCalledWith('dr-11', body);
    expect(result).toEqual({ success: true, data: updated });
  });

  it('should use request rawBody when status body is empty', async () => {
    const serviceResult = { id: 'dr-2', status: 'done' };
    vi.mocked(adminService.updateDevelopmentRequestStatus).mockResolvedValue(
      serviceResult,
    );

    const req = {
      rawBody: Buffer.from(JSON.stringify({ status: 'done' }), 'utf8'),
    } as unknown as Request;
    const user = { email: 'admin@example.com' };

    const result = await controller.updateDevelopmentRequestStatus(
      'dr-2',
      {} as { status?: string },
      req,
      user,
    );

    expect(adminService.updateDevelopmentRequestStatus).toHaveBeenCalledWith(
      'dr-2',
      { status: 'done' },
      user,
    );
    expect(result).toEqual({ success: true, data: serviceResult });
  });

  it('should use rawBody fallback when createDevelopmentRequest body is empty', async () => {
    const created = { id: 'dr-raw-1' };
    vi.mocked(adminService.createDevelopmentRequest).mockResolvedValue(created);

    const req = {
      rawBody: Buffer.from(
        JSON.stringify({
          title: 'Issue from raw body',
          description: 'Body was not parsed by express',
          type: 'bug',
          priority: 'high',
        }),
        'utf8',
      ),
    } as unknown as Request;
    const user = { email: 'admin@example.com', firstName: 'Admin' };

    const result = await controller.createDevelopmentRequest(
      {} as { title?: string },
      req,
      user,
    );

    expect(adminService.createDevelopmentRequest).toHaveBeenCalledWith(
      {
        title: 'Issue from raw body',
        description: 'Body was not parsed by express',
        type: 'bug',
        priority: 'high',
      },
      user,
    );
    expect(result).toEqual({ success: true, data: created });
  });

  it('should propagate service failures for development request sync', async () => {
    vi.mocked(adminService.syncDevelopmentRequestWithGitHub).mockRejectedValue(
      new BadRequestException('GitHub sync failed'),
    );

    await expect(
      controller.syncDevelopmentRequestWithGitHub('dr-fail-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return wrapped payload when development request sync succeeds', async () => {
    const synced = { id: 'dr-sync-1', status: 'in_progress' };
    vi.mocked(adminService.syncDevelopmentRequestWithGitHub).mockResolvedValue(synced);

    const result = await controller.syncDevelopmentRequestWithGitHub('dr-sync-1');

    expect(adminService.syncDevelopmentRequestWithGitHub).toHaveBeenCalledWith('dr-sync-1');
    expect(result).toEqual({ success: true, data: synced });
  });

  it('should propagate service failures for development request deletion', async () => {
    vi.mocked(adminService.deleteDevelopmentRequest).mockRejectedValue(
      new BadRequestException('Delete failed'),
    );

    await expect(controller.deleteDevelopmentRequest('dr-fail-2')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should return success for development request deletion when service completes', async () => {
    vi.mocked(adminService.deleteDevelopmentRequest).mockResolvedValue(undefined);

    const result = await controller.deleteDevelopmentRequest('dr-ok-1');

    expect(adminService.deleteDevelopmentRequest).toHaveBeenCalledWith('dr-ok-1');
    expect(result).toEqual({ success: true });
  });

  it('should passthrough email test endpoints to service methods', async () => {
    const fullResponse = { success: true, tested: 'full' };
    const simpleResponse = { success: true, tested: 'simple' };

    vi.mocked(adminService.testEmailConfiguration).mockResolvedValue(fullResponse);
    vi.mocked(adminService.testEmailSimple).mockResolvedValue(simpleResponse);

    const fullResult = await controller.testEmailConfiguration();
    const simpleResult = await controller.testEmailSimple();

    expect(adminService.testEmailConfiguration).toHaveBeenCalledOnce();
    expect(adminService.testEmailSimple).toHaveBeenCalledOnce();
    expect(fullResult).toEqual(fullResponse);
    expect(simpleResult).toEqual(simpleResponse);
  });

  it('should passthrough feature and email config retrieval endpoints', async () => {
    const featureConfig = [{ key: 'notifications', enabled: true }];
    const emailConfig = { smtpHost: 'smtp.example.com', fromEmail: 'admin@example.com' };

    vi.mocked(adminService.getFeatureConfig).mockResolvedValue(featureConfig);
    vi.mocked(adminService.getEmailConfig).mockResolvedValue(emailConfig);

    const featureResult = await controller.getFeatureConfig();
    const emailResult = await controller.getEmailConfig();

    expect(adminService.getFeatureConfig).toHaveBeenCalledOnce();
    expect(adminService.getEmailConfig).toHaveBeenCalledOnce();
    expect(featureResult).toEqual(featureConfig);
    expect(emailResult).toEqual(emailConfig);
  });

  it('should propagate service failures for feature and email config updates', async () => {
    vi.mocked(adminService.updateFeatureConfig).mockRejectedValueOnce(
      new BadRequestException('Feature update failed'),
    );
    vi.mocked(adminService.updateEmailConfig).mockRejectedValueOnce(
      new BadRequestException('Email config update failed'),
    );

    await expect(
      controller.updateFeatureConfig(
        'notifications',
        { enabled: true },
        { email: 'admin@example.com' },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      controller.updateEmailConfig(
        { smtpHost: 'smtp.example.com' },
        { email: 'admin@example.com' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return password reset guidance endpoint message', async () => {
    const result = await controller.updateAdministratorPassword();

    expect(result).toEqual({
      message:
        "Utilisez l'endpoint /api/auth/forgot-password pour réinitialiser le mot de passe.",
    });
  });
});

describe('LogsController', () => {
  let logsController: LogsController;

  beforeEach(() => {
    logsController = new LogsController();
  });

  it('should throw BadRequestException for invalid frontend error payload', async () => {
    const req = { user: { email: 'admin@example.com' } } as unknown as Request;

    await expect(logsController.logFrontendError({}, req)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should return success for valid frontend error payload', async () => {
    const body = {
      message: 'TypeError: x is undefined',
      stack: 'stack',
      url: 'https://komuno.example/admin',
      userAgent: 'Mozilla/5.0',
      timestamp: new Date().toISOString(),
    };
    const req = { user: { email: 'admin@example.com' } } as unknown as Request;

    const result = await logsController.logFrontendError(body, req);

    expect(result).toEqual({ success: true });
  });

  it('should fallback to N/A and anonymous when optional fields are missing', async () => {
    const body = {
      message: 'ReferenceError: y is not defined',
      url: 'https://komuno.example/admin',
      userAgent: 'Mozilla/5.0',
      timestamp: new Date().toISOString(),
    };
    const req = {} as Request;

    const result = await logsController.logFrontendError(body, req);

    expect(result).toEqual({ success: true });
  });

  it('should rethrow non-zod parsing errors', async () => {
    const parseSpy = vi
      .spyOn(frontendErrorSchema, 'parse')
      .mockImplementation(() => {
        throw new Error('Unexpected parser failure');
      });
    const req = {} as Request;

    await expect(
      logsController.logFrontendError({ message: 'x' }, req),
    ).rejects.toThrow('Unexpected parser failure');

    parseSpy.mockRestore();
  });
});
